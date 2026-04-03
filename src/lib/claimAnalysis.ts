/**
 * claimAnalysis.ts — Enhanced with:
 * - Dynamic policy rules injection from admin Markdown
 * - Strict JSON responseSchema enforcement
 * - Fraud date-comparison prompt
 * - STP deterministic wrapper
 */

import type { AIResponse, STPDecision } from './types';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface PolicyContext {
  policyNumber: string;
  policyType: 'motor' | 'health' | 'property';
  coverageAmount: number;
  startDate: string;
  endDate: string;
  deductible: number;
  maxClaims: number;
  policyName: string;
}

export interface GeminiAnalysisResult extends AIResponse {}

export interface AnalyzeClaimRequest {
  claimId: string;
  policyContext: PolicyContext;
  incidentDate: string;
  description: string;
  claimType: string;
  claimedAmount: number;
  location: string;
  documentFiles: Array<{ name: string; base64: string; mimeType: string }>;
  damagePhotoBase64?: string;
  damageMimeType?: string;
  /** Dynamic admin-defined policy rules in Markdown — injected into Gemini prompt */
  dynamicPolicyRules?: string;
}

// ─────────────────────────────────────────────
// STP DETERMINISTIC WRAPPER
// ─────────────────────────────────────────────

/**
 * Straight-Through Processing: auto-approves claims that meet ALL three criteria:
 * 1. AI confidence > 0.8
 * 2. Estimated damage < ₹10,000
 * 3. Fraud risk < 0.2
 *
 * This is a DETERMINISTIC wrapper around the probabilistic AI output.
 * Even if Gemini says "looks great", we enforce hard numeric rules.
 */
export function evaluateSTP(
  confidenceScore: number,
  estimatedCostINR: number,
  fraudScore: number,
): STPDecision {
  const confidenceAboveThreshold = confidenceScore > 0.8;
  const damageBelow10k = estimatedCostINR < 10000;
  const fraudRiskBelow02 = fraudScore < 0.2;

  const isEligible = confidenceAboveThreshold && damageBelow10k && fraudRiskBelow02;

  let reason = '';
  if (isEligible) {
    reason = `Auto-approved via STP: confidence ${(confidenceScore * 100).toFixed(0)}%, damage ₹${estimatedCostINR.toLocaleString('en-IN')}, fraud risk ${(fraudScore * 100).toFixed(0)}%`;
  } else {
    const reasons: string[] = [];
    if (!confidenceAboveThreshold) reasons.push(`confidence ${(confidenceScore * 100).toFixed(0)}% < 80%`);
    if (!damageBelow10k) reasons.push(`damage ₹${estimatedCostINR.toLocaleString('en-IN')} ≥ ₹10,000`);
    if (!fraudRiskBelow02) reasons.push(`fraud risk ${(fraudScore * 100).toFixed(0)}% ≥ 20%`);
    reason = `STP bypassed: ${reasons.join(', ')}`;
  }

  return {
    isEligible,
    decision: isEligible ? 'AUTO_APPROVED' : 'MANUAL_REVIEW',
    reason,
    conditions: { confidenceAboveThreshold, damageBelow10k, fraudRiskBelow02 },
  };
}

// ─────────────────────────────────────────────
// POLICY RULES BUILDER
// ─────────────────────────────────────────────

export function buildPolicyRules(policy: PolicyContext): string {
  const policyStart = new Date(policy.startDate);
  const policyEnd = new Date(policy.endDate);
  const incidentDateRef = new Date();
  const isActive = incidentDateRef >= policyStart && incidentDateRef <= policyEnd;

  return `
POLICY TERMS:
- Policy Number: ${policy.policyNumber}
- Policy Name: ${policy.policyName}
- Policy Type: ${policy.policyType.toUpperCase()} Insurance
- Coverage Amount: ₹${policy.coverageAmount.toLocaleString('en-IN')}
- Deductible: ₹${policy.deductible.toLocaleString('en-IN')}
- Policy Start Date: ${policy.startDate}
- Policy End Date: ${policy.endDate}
- Policy Status: ${isActive ? 'ACTIVE' : 'EXPIRED/INACTIVE'}
- Max Claims Allowed: ${policy.maxClaims}

COMPLIANCE RULES TO CHECK:
1. Incident date must fall within policy start and end dates.
2. Claimed amount must not exceed coverage amount (₹${policy.coverageAmount.toLocaleString('en-IN')}).
3. Deductible of ₹${policy.deductible.toLocaleString('en-IN')} applies — net payout = claimed amount minus deductible.
4. Claim type must be covered under ${policy.policyType.toUpperCase()} insurance.
5. Policy must be ACTIVE at the time of the incident.
`.trim();
}

// ─────────────────────────────────────────────
// CLAIM-TYPE-SPECIFIC SYSTEM PROMPTS
// ─────────────────────────────────────────────

const MOTOR_SYSTEM_PROMPT = `You are an expert motor insurance claims adjuster and fraud detection specialist with 20 years of experience in the Indian insurance market. You analyze vehicle damage claims with precision, cross-referencing photographic evidence, repair estimates, FIR copies, and RC books against policy terms.

Your expertise includes:
- Identifying staged accidents, inflated repair estimates, and pre-existing damage
- Detecting date mismatches between FIR dates, repair bills, and incident dates
- Recognizing duplicate or recycled damage photographs
- Assessing whether damage severity matches the claimed amount
- Verifying vehicle details (make, model, year) against RC book
- Checking if the incident type (collision, theft, natural calamity) is covered under the policy
- Estimating fair market repair costs in Indian Rupees for Indian vehicles

Red flags you watch for:
- Repair bills dated BEFORE the incident date (critical fraud indicator)
- Hospital/garage bills with dates that don't match the incident timeline
- Damage inconsistent with the described accident type
- Claims filed immediately after policy inception (within 30 days)
- Unusually round claim amounts
- Missing FIR for theft or major accidents
- Damage photos showing rust/wear inconsistent with a recent accident

CRITICAL DATE VERIFICATION TASK: For every document uploaded, extract the date printed on it and compare it against the incident date provided. If any bill, receipt, or report is dated BEFORE the incident date, flag it as a critical fraud indicator with dateMismatchDetected: true.`;

const HEALTH_SYSTEM_PROMPT = `You are an expert health insurance claims adjuster and medical fraud detection specialist with 20 years of experience in the Indian healthcare and insurance sector. You analyze hospitalization claims, surgical claims, and OPD claims with clinical precision.

Your expertise includes:
- Verifying hospital bills, discharge summaries, and prescriptions for authenticity
- Detecting inflated medical bills, unnecessary procedures, and ghost treatments
- Cross-checking diagnosis codes with treatment costs and duration of stay
- Identifying pre-existing condition exclusions and waiting period violations
- Verifying that the treating hospital is a network hospital (if applicable)
- Estimating fair medical costs for procedures in Indian hospitals (INR)
- Checking for duplicate claims across insurers

Red flags you watch for:
- Hospital bills with dates BEFORE the incident/admission date (critical fraud indicator)
- Discharge summary dates not matching billing dates
- Procedures claimed that are excluded under the policy
- Claims filed during the waiting period for specific conditions
- Unusually short hospital stays for major surgeries
- Prescriptions without proper doctor registration numbers
- Treatment costs significantly above standard rates for the region

CRITICAL DATE VERIFICATION TASK: For every document uploaded, extract the date printed on it and compare it against the incident date provided. If any bill, prescription, or report is dated BEFORE the incident date, flag it as a critical fraud indicator with dateMismatchDetected: true.`;

const PROPERTY_SYSTEM_PROMPT = `You are an expert property insurance claims adjuster and fraud detection specialist with 20 years of experience in Indian property insurance. You analyze fire, flood, theft, and natural disaster claims with meticulous attention to detail.

Your expertise includes:
- Assessing structural damage from photographs and repair estimates
- Detecting arson indicators, staged burglaries, and inflated inventory claims
- Cross-referencing FIR copies, fire brigade reports, and municipal records
- Verifying that damaged items were present in the property before the incident
- Estimating fair replacement/repair costs for Indian properties and assets (INR)
- Checking for claims filed after policy cancellation notices
- Identifying claims for items not covered under the policy schedule

Red flags you watch for:
- Claims filed shortly before policy expiry or after premium default
- Damage inconsistent with the described cause (e.g., flood damage in a non-flood zone)
- Repair estimates from contractors with no verifiable credentials
- Missing FIR for theft or burglary claims
- Inventory lists with suspiciously high-value items not previously declared
- Photographs showing damage inconsistent with the claimed cause
- Multiple claims for the same property in a short period
- Receipts or invoices dated BEFORE the incident date (critical fraud indicator)

CRITICAL DATE VERIFICATION TASK: For every document uploaded, extract the date printed on it and compare it against the incident date provided. If any receipt, invoice, or report is dated BEFORE the incident date, flag it as a critical fraud indicator with dateMismatchDetected: true.`;

export function getSystemPrompt(policyType: 'motor' | 'health' | 'property'): string {
  switch (policyType) {
    case 'motor': return MOTOR_SYSTEM_PROMPT;
    case 'health': return HEALTH_SYSTEM_PROMPT;
    case 'property': return PROPERTY_SYSTEM_PROMPT;
    default: return MOTOR_SYSTEM_PROMPT;
  }
}

// ─────────────────────────────────────────────
// USER PROMPT BUILDER — with dynamic rules injection + strict JSON schema
// ─────────────────────────────────────────────

export function buildAnalysisPrompt(
  incidentDate: string,
  description: string,
  claimType: string,
  claimedAmount: number,
  location: string,
  policyRules: string,
  dynamicPolicyRules?: string,
): string {
  const dynamicRulesSection = dynamicPolicyRules
    ? `\n\nADMIN-DEFINED POLICY RULES (HIGHEST PRIORITY — these override defaults):\n${dynamicPolicyRules}\n`
    : '';

  return `Analyze this insurance claim for fraud and policy compliance.

Incident Date: ${incidentDate}
Incident Location: ${location}
Claim Type: ${claimType}
Claimed Amount: ₹${claimedAmount.toLocaleString('en-IN')}
Description: ${description}

${policyRules}
${dynamicRulesSection}

MANDATORY TASKS:
1. Verify if the images/documents match the description and claimed incident.
2. Estimate the fair repair/replacement cost in Indian Rupees (INR/₹) based on the evidence.
3. Assess the severity (LOW, MEDIUM, or HIGH).
4. Provide a confidenceScore (0.0 to 1.0) for your overall assessment.
5. FRAUD DATE CHECK (CRITICAL): For EVERY document in the images, extract the date printed on it. Compare each document date against the incident date (${incidentDate}). If ANY document is dated BEFORE the incident date, this is a critical fraud indicator. Set dateMismatchDetected: true and describe the mismatch in dateComparisonResult. Also check for: duplicate images, inconsistent details, staged incidents, or inflated amounts. Provide a fraudScore (0.0 to 1.0, where 1.0 is highly suspicious).
6. Policy Compliance: Check if the incident date falls within the policy period, if the claimed amount is within coverage limits, and if the claim type is covered. Provide a policyComplianceScore (0.0 to 1.0, where 1.0 is fully compliant).
7. OCR Extraction: Extract key fields from each document (dates, amounts, names, registration numbers, diagnosis codes, etc.) and return them in ocrExtracted as an object keyed by document name.
8. Rules Check: List which compliance rules passed (rulesPassed) and which failed (rulesFailed).
9. Summarize findings in a "summary" field, specifically mentioning any fraud or policy issues found.
10. Write a "claimantMessage" in plain, empathetic language (no technical jargon) explaining the outcome to the policyholder.
11. Set "requiresEscalation" to true if fraudScore > 0.4 OR policyComplianceScore < 0.6 OR severity is HIGH OR dateMismatchDetected is true.
12. Set "escalationReason" explaining why escalation is needed (empty string if not escalated).
13. Set "recommendedDecision" to "APPROVED" only if fraudScore < 0.3 AND policyComplianceScore > 0.7 AND severity is not HIGH AND dateMismatchDetected is false. Otherwise "ESCALATED".
14. Set "imageDescriptionMatch" to true if visual evidence matches the described incident.

You MUST return ONLY a valid JSON object with EXACTLY these fields (no markdown, no explanation, just JSON):
{
  "summary": "string",
  "estimatedCostINR": 0,
  "severity": "LOW",
  "confidenceScore": 0.0,
  "fraudScore": 0.0,
  "policyComplianceScore": 0.0,
  "fraudFlags": [],
  "policyFlags": [],
  "rulesPassed": [],
  "rulesFailed": [],
  "claimantMessage": "string",
  "requiresEscalation": false,
  "escalationReason": "string",
  "ocrExtracted": {},
  "imageDescriptionMatch": true,
  "recommendedDecision": "APPROVED",
  "dateComparisonResult": "string describing date comparison findings",
  "dateMismatchDetected": false
}`;
}
