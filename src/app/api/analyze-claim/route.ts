import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { getDecision, RawClaim } from '@/lib/fraudModel';
import {
  AnalyzeClaimRequest,
  GeminiAnalysisResult,
  buildPolicyRules,
  buildAnalysisPrompt,
  getSystemPrompt,
  evaluateSTP,
} from '@/lib/claimAnalysis';
import { createClient } from '@supabase/supabase-js';

// Service-role Supabase client for server-side writes — bypasses RLS
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (serviceKey && serviceKey !== 'your-supabase-service-role-key-here' && serviceKey.length > 20) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
  }
  console.warn('[analyze-claim] SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key.');
  return createClient(url, anonKey);
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body: AnalyzeClaimRequest = await req.json();
    const {
      claimId,
      policyContext,
      incidentDate,
      description,
      claimType,
      claimedAmount,
      location,
      documentFiles,
      damagePhotoBase64,
      damageMimeType,
      dynamicPolicyRules,
    } = body;

    if (!claimId || !policyContext || !incidentDate || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Helper to write step progress to Supabase in real-time
    const setStep = async (step: string) => {
      const { error } = await supabase
        .from('claims')
        .update({ processing_step: step, updated_at: new Date().toISOString() })
        .eq('id', claimId);
      if (error) console.error(`[analyze-claim] setStep(${step}) error:`, error.message);
    };

    // ── Step 1: Mark PROCESSING + doc_verification ─────────────────────────
    await supabase
      .from('claims')
      .update({ status: 'PROCESSING', processing_step: 'doc_verification', updated_at: new Date().toISOString() })
      .eq('id', claimId);

    // ── Step 2: Fetch dynamic policy rules from DB if not provided ─────────
    let resolvedDynamicRules = dynamicPolicyRules;
    if (!resolvedDynamicRules) {
      const { data: rulesData } = await supabase
        .from('policy_rules')
        .select('markdown_content, title')
        .eq('is_active', true)
        .in('policy_type', [policyContext.policyType, 'global'])
        .order('policy_type', { ascending: false });

      if (rulesData && rulesData.length > 0) {
        resolvedDynamicRules = rulesData
          .map((r: any) => `## ${r.title}\n${r.markdown_content}`)
          .join('\n\n');
      }
    }

    // ── Step 3: Build policy rules and prompts ─────────────────────────────
    const policyRules = buildPolicyRules(policyContext);
    const userPrompt = buildAnalysisPrompt(
      incidentDate,
      description,
      claimType,
      claimedAmount,
      location,
      policyRules,
      resolvedDynamicRules,
    );
    const systemPrompt = getSystemPrompt(policyContext.policyType);

    // ── Doc verification done — advance to AI Damage Analysis ─────────────
    await setStep('ai_damage');

    // ── Step 4: Build Gemini parts with inlineData for docs/images ─────────
    const geminiParts: Part[] = [
      { text: `${systemPrompt}\n\n${userPrompt}` },
    ];

    // Attach damage photo if provided
    if (damagePhotoBase64 && damageMimeType) {
      // Strip data URI prefix if present
      const cleanBase64 = damagePhotoBase64.replace(/^data:[^;]+;base64,/, '');
      geminiParts.push({
        inlineData: {
          mimeType: damageMimeType as any,
          data: cleanBase64,
        },
      });
    }

    // Attach each document file
    for (const doc of documentFiles) {
      if (doc.base64 && doc.mimeType) {
        const cleanBase64 = doc.base64.replace(/^data:[^;]+;base64,/, '');
        geminiParts.push({
          inlineData: {
            mimeType: doc.mimeType as any,
            data: cleanBase64,
          },
        });
      }
    }

    // Append strict JSON output instruction
    geminiParts.push({
      text: `\n\nIMPORTANT: Return ONLY a valid JSON object with no markdown fences, no explanation. The JSON must contain exactly these fields: summary, estimatedCostINR, severity, confidenceScore, fraudScore, policyComplianceScore, fraudFlags, policyFlags, rulesPassed, rulesFailed, claimantMessage, requiresEscalation, escalationReason, ocrExtracted, imageDescriptionMatch, recommendedDecision, dateComparisonResult, dateMismatchDetected.`,
    });

    // ── Step 5: Call Gemini 1.5 Flash directly via SDK ─────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const geminiApiResult = await model.generateContent(geminiParts);
    const rawContent = geminiApiResult.response.text();

    // ── Step 6: Parse Gemini JSON response ────────────────────────────────
    let geminiResult: GeminiAnalysisResult;
    try {
      const cleaned = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      geminiResult = JSON.parse(cleaned);
    } catch {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        geminiResult = JSON.parse(jsonMatch[0]);
      } else {
        console.error('[analyze-claim] Gemini raw response:', rawContent.slice(0, 500));
        throw new Error('Gemini returned non-JSON response');
      }
    }

    // ── Advance to Policy Verification step ───────────────────────────────
    await setStep('policy_verification');

    // ── Step 7: Run fraudModel ML pipeline ────────────────────────────────
    const incidentDateObj = new Date(incidentDate);
    const rawClaim: RawClaim = {
      incident_date: incidentDate,
      incident_month: incidentDateObj.getMonth() + 1,
      incident_day: incidentDateObj.getDate(),
      total_claim_amount: claimedAmount,
      incident_type: claimType,
      incident_severity: geminiResult.severity === 'HIGH' ? 'Major Damage'
        : geminiResult.severity === 'MEDIUM' ? 'Minor Damage' : 'Trivial Damage',
      property_damage: geminiResult.fraudFlags?.length > 0 ? 'YES' : 'NO',
      police_report_available: (geminiResult.rulesPassed || []).some((r: string) =>
        r.toLowerCase().includes('fir') || r.toLowerCase().includes('police'),
      ) ? 'YES' : 'NO',
      authorities_contacted: geminiResult.fraudFlags?.length > 0 ? 'Police' : 'None',
    };

    const mlResult = getDecision(rawClaim, geminiResult.policyComplianceScore > 0.6);

    // ── Advance to Fraud Check step ───────────────────────────────────────
    await setStep('fraud_check');

    // ── Step 8: Combine Gemini + ML into final scores ─────────────────────
    const mlFraudWeight = 0.35;
    const geminiFraudWeight = 0.65;
    const combinedFraudScore = parseFloat(
      (geminiResult.fraudScore * geminiFraudWeight + mlResult.fraud_score * mlFraudWeight).toFixed(3),
    );

    const combinedConfidence = parseFloat(
      ((geminiResult.confidenceScore + mlResult.confidence) / 2).toFixed(3),
    );

    // ── Step 9: STP Deterministic Wrapper ─────────────────────────────────
    const stpDecision = evaluateSTP(
      combinedConfidence,
      geminiResult.estimatedCostINR,
      combinedFraudScore,
    );

    const requiresEscalation =
      !stpDecision.isEligible && (
        geminiResult.requiresEscalation ||
        mlResult.decision === 'ESCALATED' ||
        combinedFraudScore > 0.4 ||
        geminiResult.dateMismatchDetected === true
      );

    const finalStatus = stpDecision.isEligible ? 'APPROVED' : (requiresEscalation ? 'ESCALATED' : 'APPROVED');

    const escalationReason = requiresEscalation
      ? [
          geminiResult.escalationReason,
          geminiResult.dateMismatchDetected ? `Date mismatch detected: ${geminiResult.dateComparisonResult}` : '',
          mlResult.risk_band === 'HIGH' ? `ML model flagged HIGH risk band (score: ${(mlResult.fraud_score * 100).toFixed(0)}%)` : '',
          stpDecision.reason,
        ]
          .filter(Boolean)
          .join(' | ')
      : '';

    const stpStatus = stpDecision.isEligible ? 'STP' : 'Manual';
    const processingTimeSec = Math.round((Date.now() - startTime) / 1000);

    // ── Advance to Decision step ──────────────────────────────────────────
    await setStep('decision');

    // ── Step 10: Update claim in Supabase with FULL analysis results ───────
    const updatePayload: Record<string, any> = {
      status: finalStatus,
      processing_step: 'completed',
      fraud_score: combinedFraudScore,
      confidence_score: combinedConfidence,
      rules_triggered: geminiResult.rulesPassed || [],
      rules_failed: geminiResult.rulesFailed || [],
      escalation_reason: escalationReason || null,
      ocr_extracted: geminiResult.ocrExtracted || {},
      processing_time_sec: processingTimeSec,
      updated_at: new Date().toISOString(),
      gemini_summary: geminiResult.summary || null,
      estimated_cost_inr: geminiResult.estimatedCostINR || null,
      severity: geminiResult.severity || null,
      gemini_recommendation: geminiResult.recommendedDecision || null,
      stp_status: stpStatus,
    };

    const { error: updateError } = await supabase
      .from('claims')
      .update(updatePayload)
      .eq('id', claimId);

    if (updateError) {
      console.error('[analyze-claim] Supabase update error:', updateError.message);
    }

    // ── Step 11: Return full analysis to client ────────────────────────────
    return NextResponse.json({
      success: true,
      claimId,
      finalStatus,
      gemini: geminiResult,
      ml: {
        fraudScore: mlResult.fraud_score,
        securityScore: mlResult.security_score,
        riskBand: mlResult.risk_band,
        confidence: mlResult.confidence,
        fraudFlag: mlResult.fraud_flag,
      },
      combined: {
        fraudScore: combinedFraudScore,
        confidenceScore: combinedConfidence,
        requiresEscalation,
        escalationReason,
        recommendedDecision: finalStatus,
        stpStatus,
        stpDecision,
      },
      processingTimeSec,
    });
  } catch (err: any) {
    console.error('[analyze-claim] Pipeline error:', err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? 'Analysis failed', success: false },
      { status: 500 },
    );
  }
}
