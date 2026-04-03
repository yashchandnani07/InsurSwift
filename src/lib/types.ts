/**
 * types.ts
 * Central TypeScript interfaces for InsureSwift
 */

// ─────────────────────────────────────────────
// USER & AUTH
// ─────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'claimant' | 'adjuster';
  created_at: string;
  avatar_url?: string;
}

// ─────────────────────────────────────────────
// POLICY RULES (Dynamic — editable by admin)
// ─────────────────────────────────────────────

export interface PolicyRules {
  id: string;
  policy_type: 'motor' | 'health' | 'property' | 'global';
  title: string;
  /** Markdown content injected directly into Gemini system prompt */
  markdown_content: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// CLAIM
// ─────────────────────────────────────────────

export type ClaimStatus =
  | 'SUBMITTED' |'PROCESSING' |'APPROVED' |'REJECTED' |'ESCALATED' |'PENDING_REVIEW';

export type ClaimSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type STPStatus = 'STP' | 'Manual' | 'Pending';

export interface Claim {
  id: string;
  user_id: string;
  policy_id: string | null;
  policy_number: string;
  policy_type: 'motor' | 'health' | 'property';
  claim_type: string;
  claimed_amount: number;
  status: ClaimStatus;
  incident_date: string;
  location: string;
  description: string;
  documents_uploaded: string[];
  damage_photo: string | null;
  submitted_at: string;
  updated_at: string;
  decided_by: string | null;
  decided_at: string | null;
  rejection_reason: string | null;
  // AI Analysis fields
  fraud_score: number | null;
  confidence_score: number | null;
  rules_triggered: string[];
  rules_failed: string[];
  escalation_reason: string | null;
  ocr_extracted: Record<string, Record<string, string>> | null;
  processing_time_sec: number | null;
  gemini_summary: string | null;
  estimated_cost_inr: number | null;
  severity: ClaimSeverity | null;
  gemini_recommendation: 'APPROVED' | 'ESCALATED' | null;
  stp_status: STPStatus | null;
}

// ─────────────────────────────────────────────
// AI RESPONSE (Gemini structured output)
// ─────────────────────────────────────────────

export interface AIResponse {
  /** Short summary of findings */
  summary: string;
  /** Estimated repair/replacement cost in INR */
  estimatedCostINR: number;
  /** LOW | MEDIUM | HIGH */
  severity: ClaimSeverity;
  /** 0.0–1.0 confidence in the overall assessment */
  confidenceScore: number;
  /** 0.0–1.0 fraud suspicion (1.0 = highly suspicious) */
  fraudScore: number;
  /** 0.0–1.0 policy compliance (1.0 = fully compliant) */
  policyComplianceScore: number;
  /** Specific fraud flags raised */
  fraudFlags: string[];
  /** Specific policy compliance flags */
  policyFlags: string[];
  /** Rules that passed */
  rulesPassed: string[];
  /** Rules that failed */
  rulesFailed: string[];
  /** Plain-language decision for the claimant */
  claimantMessage: string;
  /** Whether this claim should be escalated for human review */
  requiresEscalation: boolean;
  /** Reason for escalation (if any) */
  escalationReason: string;
  /** OCR-extracted fields from documents */
  ocrExtracted: Record<string, Record<string, string>>;
  /** Whether images match the description */
  imageDescriptionMatch: boolean;
  /** Recommended decision: APPROVED | ESCALATED */
  recommendedDecision: 'APPROVED' | 'ESCALATED';
  /** Date comparison result: bill dates vs incident date */
  dateComparisonResult?: string;
  /** Whether any document dates are suspicious */
  dateMismatchDetected?: boolean;
}

// ─────────────────────────────────────────────
// FRAUD MODEL OUTPUT
// ─────────────────────────────────────────────

export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH';

export interface FraudModelOutput {
  /** 0.0 = definite fraud → 1.0 = clean claim */
  security_score: number;
  /** 0.0 = clean → 1.0 = fraud */
  fraud_score: number;
  /** True when fraud_score > 0.5 */
  fraud_flag: boolean;
  risk_band: RiskBand;
  /** Model's max class probability */
  confidence: number;
  /** [p_fraud, p_clean] */
  raw_proba: [number, number];
}

// ─────────────────────────────────────────────
// STP (Straight-Through Processing) DECISION
// ─────────────────────────────────────────────

export interface STPDecision {
  /** Whether STP conditions were met */
  isEligible: boolean;
  /** Final decision from STP wrapper */
  decision: 'AUTO_APPROVED' | 'MANUAL_REVIEW';
  /** Reason STP was triggered or bypassed */
  reason: string;
  /** Conditions checked */
  conditions: {
    confidenceAboveThreshold: boolean;
    damageBelow10k: boolean;
    fraudRiskBelow02: boolean;
  };
}

// ─────────────────────────────────────────────
// ANALYSIS PIPELINE RESULT
// ─────────────────────────────────────────────

export interface AnalysisPipelineResult {
  success: boolean;
  claimId: string;
  finalStatus: ClaimStatus;
  gemini: AIResponse;
  ml: {
    fraudScore: number;
    securityScore: number;
    riskBand: RiskBand;
    confidence: number;
    fraudFlag: boolean;
  };
  combined: {
    fraudScore: number;
    confidenceScore: number;
    requiresEscalation: boolean;
    escalationReason: string;
    recommendedDecision: ClaimStatus;
    stpStatus: STPStatus;
    stpDecision?: STPDecision;
  };
  processingTimeSec: number;
}
