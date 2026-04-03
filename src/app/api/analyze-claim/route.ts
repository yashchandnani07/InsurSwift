import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
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
  let supabase: ReturnType<typeof getServiceClient> | null = null;
  let claimId: string | null = null;

  try {
    const body: AnalyzeClaimRequest = await req.json();
    const {
      claimId: cId,
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

    claimId = cId;

    if (!claimId || !policyContext || !incidentDate || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    supabase = getServiceClient();

    // Helper to write step progress to Supabase in real-time
    const setStep = async (step: string) => {
      const { error } = await supabase!
        .from('claims')
        .update({ processing_step: step, updated_at: new Date().toISOString() })
        .eq('id', claimId);
      if (error) console.error(`[analyze-claim] setStep(${step}) error:`, error.message);
    };

    // Helper to write error state to Supabase so the UI can surface it
    const setError = async (step: string, message: string) => {
      console.error(`[analyze-claim] Pipeline failed at step "${step}": ${message}`);
      const { error } = await supabase!
        .from('claims')
        .update({
          processing_step: 'failed',
          error_step: step,
          error_message: message,
          status: 'PROCESSING', // keep as PROCESSING so it doesn't look decided
          updated_at: new Date().toISOString(),
        })
        .eq('id', claimId);
      if (error) console.error(`[analyze-claim] setError DB write failed:`, error.message);
    };

    // ── Step 1: Mark PROCESSING + doc_verification ─────────────────────────
    await supabase
      .from('claims')
      .update({
        status: 'PROCESSING',
        processing_step: 'doc_verification',
        error_message: null,
        error_step: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimId);

    // ── Step 2: Fetch dynamic policy rules from DB if not provided ─────────
    let resolvedDynamicRules = dynamicPolicyRules;
    try {
      if (!resolvedDynamicRules) {
        const { data: rulesData, error: rulesError } = await supabase
          .from('policy_rules')
          .select('markdown_content, title')
          .eq('is_active', true)
          .in('policy_type', [policyContext.policyType, 'global'])
          .order('policy_type', { ascending: false });

        if (rulesError) {
          console.warn('[analyze-claim] Could not fetch policy rules:', rulesError.message);
        } else if (rulesData && rulesData.length > 0) {
          resolvedDynamicRules = rulesData
            .map((r: any) => `## ${r.title}\n${r.markdown_content}`)
            .join('\n\n');
        }
      }
    } catch (rulesErr: any) {
      // Non-fatal: continue without dynamic rules
      console.warn('[analyze-claim] Policy rules fetch threw:', rulesErr?.message);
    }

    // ── Step 3: Build policy rules and prompts ─────────────────────────────
    let policyRules: string;
    let userPrompt: string;
    let systemPrompt: string;
    try {
      policyRules = buildPolicyRules(policyContext);
      userPrompt = buildAnalysisPrompt(
        incidentDate,
        description,
        claimType,
        claimedAmount,
        location,
        policyRules,
        resolvedDynamicRules,
      );
      systemPrompt = getSystemPrompt(policyContext.policyType);
    } catch (promptErr: any) {
      await setError('doc_verification', `Failed to build analysis prompt: ${promptErr?.message ?? 'Unknown error'}`);
      return NextResponse.json({ error: promptErr?.message ?? 'Prompt build failed', success: false }, { status: 500 });
    }

    // ── Doc verification done — advance to AI Damage Analysis ─────────────
    await setStep('ai_damage');

    // ── Step 4: Build prompt content for Groq ─────────────────────────────
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}

IMPORTANT: Return ONLY a valid JSON object with no markdown fences, no explanation. The JSON must contain exactly these fields: summary, estimatedCostINR, severity, confidenceScore, fraudScore, policyComplianceScore, fraudFlags, policyFlags, rulesPassed, rulesFailed, claimantMessage, requiresEscalation, escalationReason, ocrExtracted, imageDescriptionMatch, recommendedDecision, dateComparisonResult, dateMismatchDetected.`;

    // ── Step 5: Call Groq via OpenAI-compatible SDK ────────────────────────
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      await setError('ai_damage', 'GROQ_API_KEY is not configured on the server.');
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured', success: false }, { status: 500 });
    }

    let rawContent: string;
    try {
      const client = new OpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });

      const groqResponse = await client.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'user', content: fullPrompt },
        ],
      });

      rawContent = groqResponse.choices[0]?.message?.content ?? '';
    } catch (groqErr: any) {
      const msg = groqErr?.message ?? 'Groq API call failed';
      await setError('ai_damage', `AI Analysis failed: ${msg}`);
      return NextResponse.json({ error: msg, success: false }, { status: 500 });
    }

    // ── Step 6: Parse Groq JSON response ──────────────────────────────────
    let geminiResult: GeminiAnalysisResult;
    try {
      const cleaned = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      geminiResult = JSON.parse(cleaned);
    } catch {
      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          geminiResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON object found in Gemini response');
        }
      } catch (parseErr: any) {
        console.error('[analyze-claim] Gemini raw response:', rawContent.slice(0, 500));
        const msg = `AI returned an unparseable response. Raw preview: "${rawContent.slice(0, 120)}"`;
        await setError('ai_damage', msg);
        return NextResponse.json({ error: msg, success: false }, { status: 500 });
      }
    }

    // ── Advance to Policy Verification step ───────────────────────────────
    await setStep('policy_verification');

    // ── Step 7: Run fraudModel ML pipeline ────────────────────────────────
    let mlResult: ReturnType<typeof getDecision>;
    try {
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
      mlResult = getDecision(rawClaim, geminiResult.policyComplianceScore > 0.6);
    } catch (mlErr: any) {
      const msg = `Fraud model failed: ${mlErr?.message ?? 'Unknown error'}`;
      await setError('policy_verification', msg);
      return NextResponse.json({ error: msg, success: false }, { status: 500 });
    }

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
      error_message: null,
      error_step: null,
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
    const msg = err?.message ?? 'Analysis failed';
    console.error('[analyze-claim] Unhandled pipeline error:', msg);
    // Write error to Supabase if we have enough context
    if (supabase && claimId) {
      try {
        await supabase
          .from('claims')
          .update({
            processing_step: 'failed',
            error_step: 'unknown',
            error_message: `Unexpected error: ${msg}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', claimId);
      } catch (dbErr) {
        console.error('[analyze-claim] Could not write error to DB:', dbErr);
      }
    }
    return NextResponse.json(
      { error: msg, success: false },
      { status: 500 },
    );
  }
}
