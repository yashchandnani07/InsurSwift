/**
 * fraudModel.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * TypeScript stub that mirrors the Python `security_score.py` pipeline.
 *
 * Current behaviour: runs the full encoding + risk-band logic in-process
 * using the same maps and thresholds as the Python model.
 *
 * To swap in the real trained .pkl model, replace the body of
 * `getSecurityScore()` with a fetch() call to your Python endpoint:
 *
 *   const res = await fetch(process.env.FRAUD_MODEL_API_URL!, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(rawClaim),
 *   });
 *   return res.json() as SecurityScoreResult;
 *
 * The return shape is identical to the Python dict so the decision engine
 * needs zero changes when you make that swap.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────
// 1.  TYPES
// ─────────────────────────────────────────────

export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH';

/** Raw claim fields accepted by the scoring function (string values OK). */
export interface RawClaim {
  months_as_customer?: number | string;
  age?: number | string;
  policy_state?: string;
  policy_csl?: string;
  policy_deductable?: number | string;
  policy_annual_premium?: number | string;
  umbrella_limit?: number | string;
  insured_zip?: number | string;
  insured_sex?: string;
  insured_education_level?: string;
  insured_occupation?: string;
  insured_hobbies?: string;
  insured_relationship?: string;
  'capital-gains'?: number | string;
  'capital-loss'?: number | string;
  incident_type?: string;
  collision_type?: string;
  incident_severity?: string;
  authorities_contacted?: string;
  incident_state?: string;
  incident_city?: string;
  number_of_vehicles_involved?: number | string;
  property_damage?: string;
  bodily_injuries?: number | string;
  witnesses?: number | string;
  police_report_available?: string;
  total_claim_amount?: number | string;
  injury_claim?: number | string;
  property_claim?: number | string;
  vehicle_claim?: number | string;
  auto_make?: string;
  auto_year?: number | string;
  /** Derived from incident_date if not supplied directly */
  incident_month?: number | string;
  /** Derived from incident_date if not supplied directly */
  incident_day?: number | string;
  /** ISO date string — used to derive incident_month / incident_day */
  incident_date?: string;
  [key: string]: unknown;
}

/** Output schema — identical to the Python get_security_score() return dict. */
export interface SecurityScoreResult {
  /** 0.0 = definite fraud (HIGH RISK) → 1.0 = clean claim (LOW RISK) */
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
// 2.  TARGET-ENCODING MAPS  (mirrored from security_score.py)
// ─────────────────────────────────────────────

const ENCODING_MAPS: Record<string, Record<string, number>> = {
  auto_make: {
    '3 Series': 0.95, RSX: 0.91, Malibu: 0.90, Wrangler: 0.88, Pathfinder: 0.87,
    Ultima: 0.86, Camry: 0.855, Corolla: 0.85, CRV: 0.85, Legacy: 0.84, Neon: 0.83,
    '95': 0.81, TL: 0.80, '93': 0.80, MDX: 0.78, Accord: 0.77, 'Grand Cherokee': 0.76,
    Escape: 0.75, E4000: 0.74, A3: 0.73, Highlander: 0.72, Passat: 0.72, '92x': 0.71,
    Jetta: 0.71, Fusion: 0.71, Forrestor: 0.71, Maxima: 0.70, Impreza: 0.70, X5: 0.69,
    RAM: 0.67, M5: 0.66, A5: 0.65, Civic: 0.64, F150: 0.63, Tahaoe: 0.62, C300: 0.61,
    ML350: 0.60, Silverado: 0.59, X6: 0.56,
    Jeep: 0.84, Nissan: 0.82, Toyota: 0.81, Accura: 0.80, Saab: 0.77, Suburu: 0.76,
    Dodge: 0.75, Honda: 0.74, Chevrolet: 0.73, BMW: 0.72, Volkswagen: 0.71, Audi: 0.69,
    Ford: 0.69, Mercedes: 0.66,
  },
  police_report_available: { NO: 0.77, YES: 0.74 },
  property_damage:         { NO: 0.76, YES: 0.74 },
  incident_city: {
    Northbrook: 0.78, Riverwood: 0.77, Northbend: 0.76, Springfield: 0.75,
    Hillsdale: 0.74, Columbus: 0.73, Arlington: 0.71,
  },
  incident_state: { WV: 0.82, NY: 0.77, VA: 0.76, PA: 0.73, SC: 0.70, NC: 0.69, OH: 0.56 },
  authorities_contacted: {
    None: 0.94, Police: 0.79, Fire: 0.73, Ambulance: 0.70, Other: 0.68,
  },
  incident_severity: {
    'Trivial Damage': 0.94, 'Minor Damage': 0.89, 'Total Loss': 0.87, 'Major Damage': 0.39,
  },
  collision_type: { 'Rear Collision': 0.78, 'Side Collision': 0.74, 'Front Collision': 0.72 },
  incident_type: {
    'Vehicle Theft': 0.91, 'Parked Car': 0.90,
    'Multi-vehicle Collision': 0.72, 'Single Vehicle Collision': 0.70,
  },
  insured_relationship: {
    husband: 0.79, 'own-child': 0.78, unmarried: 0.75,
    'not-in-family': 0.74, wife: 0.72, 'other-relative': 0.70,
  },
  insured_hobbies: {
    camping: 0.91, kayaking: 0.90, golf: 0.89, dancing: 0.88, 'bungie-jumping': 0.84,
    movies: 0.83, basketball: 0.82, exercise: 0.81, sleeping: 0.805, 'video-games': 0.80,
    skydiving: 0.78, paintball: 0.77, hiking: 0.76, 'base-jumping': 0.73, reading: 0.73,
    polo: 0.72, 'board-games': 0.70, yachting: 0.69, 'cross-fit': 0.25, chess: 0.17,
  },
  insured_occupation: {
    'other-service': 0.84, 'priv-house-serv': 0.84, 'adm-clerical': 0.83,
    'handlers-cleaners': 0.79, 'prof-specialty': 0.78, 'protective-serv': 0.77,
    'machine-op-inspct': 0.76, 'armed-forces': 0.75, sales: 0.72, 'tech-support': 0.71,
    'transport-moving': 0.705, 'craft-repair': 0.70, 'farming-fishing': 0.69, 'exec-managerial': 0.63,
  },
  insured_education_level: {
    Masters: 0.78, 'High School': 0.77, Associate: 0.76,
    JD: 0.74, College: 0.73, MD: 0.72, PhD: 0.71,
  },
  insured_sex:  { FEMALE: 0.76, MALE: 0.73 },
  policy_csl:   { '500/1000': 0.78, '100/300': 0.74, '250/500': 0.73 },
  policy_state: { IL: 0.77, IN: 0.745, OH: 0.74 },
};

/** Neutral fallback when a categorical value is not in the encoding map. */
const NEUTRAL_FALLBACK = 0.75;

/** All feature columns the model was trained on (order matters for a real model). */
const FEATURE_COLUMNS: string[] = [
  'months_as_customer', 'age', 'policy_state', 'policy_csl',
  'policy_deductable', 'policy_annual_premium', 'umbrella_limit',
  'insured_zip', 'insured_sex', 'insured_education_level',
  'insured_occupation', 'insured_hobbies', 'insured_relationship',
  'capital-gains', 'capital-loss', 'incident_type', 'collision_type',
  'incident_severity', 'authorities_contacted', 'incident_state',
  'incident_city', 'number_of_vehicles_involved', 'property_damage',
  'bodily_injuries', 'witnesses', 'police_report_available',
  'total_claim_amount', 'injury_claim', 'property_claim', 'vehicle_claim',
  'auto_make', 'auto_year', 'incident_month', 'incident_day',
];

// ─────────────────────────────────────────────
// 3.  PREPROCESSING  (mirrors preprocess_claim() in security_score.py)
// ─────────────────────────────────────────────

function preprocessClaim(raw: RawClaim): Record<string, number> {
  const claim: Record<string, unknown> = { ...raw };

  // Derive incident_month / incident_day from incident_date if present
  if (claim.incident_date && typeof claim.incident_date === 'string') {
    const d = new Date(claim.incident_date);
    if (!isNaN(d.getTime())) {
      if (claim.incident_month === undefined) claim.incident_month = d.getMonth() + 1;
      if (claim.incident_day   === undefined) claim.incident_day   = d.getDate();
    }
  }

  // Replace '?' with undefined (NaN equivalent), then apply defaults
  for (const key of Object.keys(claim)) {
    if (claim[key] === '?') claim[key] = undefined;
  }
  if (!claim.collision_type)          claim.collision_type          = 'Rear Collision';
  if (!claim.property_damage)         claim.property_damage         = 'NO';
  if (!claim.police_report_available) claim.police_report_available = 'NO';
  if (!claim.authorities_contacted)   claim.authorities_contacted   = 'None';

  // Apply target-encoding maps
  for (const [col, mapping] of Object.entries(ENCODING_MAPS)) {
    const val = claim[col];
    if (val !== undefined && val !== null) {
      claim[col] = mapping[String(val)] ?? NEUTRAL_FALLBACK;
    }
  }

  // Build the final feature vector (fill 0 for any missing column)
  const features: Record<string, number> = {};
  for (const col of FEATURE_COLUMNS) {
    const raw = claim[col];
    features[col] = raw !== undefined && raw !== null && raw !== '' ? Number(raw) : 0;
  }
  return features;
}

// ─────────────────────────────────────────────
// 4.  RISK-BAND THRESHOLDS  (from security_score.py)
// ─────────────────────────────────────────────

function getRiskBand(fraudScore: number): RiskBand {
  if (fraudScore < 0.30) return 'LOW';
  if (fraudScore < 0.65) return 'MEDIUM';
  return 'HIGH';
}

// ─────────────────────────────────────────────
// 5.  HEURISTIC SCORER  (in-process stub — replace body with API call)
// ─────────────────────────────────────────────

/**
 * Derives a deterministic fraud probability from the encoded feature vector.
 *
 * This is a weighted-average heuristic that produces scores consistent with
 * the Python model's encoding maps.  It is NOT a trained classifier — it is
 * a placeholder so the decision engine works end-to-end before the Python
 * endpoint is deployed.
 *
 * Replace this function body with a fetch() to your Python /score endpoint
 * and the rest of the codebase stays unchanged.
 */
function computeFraudProbabilityHeuristic(features: Record<string, number>): number {
  // Weights reflect feature importance order from a typical RF on this dataset
  const weightedFeatures: Array<[string, number]> = [
    ['incident_severity',        0.18],
    ['insured_hobbies',          0.10],
    ['incident_type',            0.09],
    ['authorities_contacted',    0.08],
    ['auto_make',                0.07],
    ['insured_occupation',       0.06],
    ['collision_type',           0.06],
    ['incident_state',           0.05],
    ['insured_relationship',     0.05],
    ['police_report_available',  0.05],
    ['property_damage',          0.04],
    ['incident_city',            0.04],
    ['insured_education_level',  0.03],
    ['insured_sex',              0.03],
    ['policy_csl',               0.03],
    ['policy_state',             0.02],
    ['insured_hobbies',          0.02],  // double-weighted intentionally
  ];

  let weightedSum = 0;
  let totalWeight = 0;
  for (const [col, w] of weightedFeatures) {
    const v = features[col];
    if (v !== undefined && v > 0) {
      weightedSum += v * w;
      totalWeight += w;
    }
  }

  // encodedValue is P(clean); invert to get P(fraud)
  const pClean = totalWeight > 0 ? weightedSum / totalWeight : NEUTRAL_FALLBACK;
  return Math.max(0, Math.min(1, 1 - pClean));
}

// ─────────────────────────────────────────────
// 6.  PUBLIC API
// ─────────────────────────────────────────────

/**
 * Main scoring function — mirrors Python `get_security_score()`.
 *
 * @param rawClaim  Raw claim object (string categorical values are fine).
 * @returns         SecurityScoreResult with the same keys as the Python dict.
 *
 * ── To swap in the real model ──────────────────────────────────────────────
 * Replace the function body with:
 *
 *   const res = await fetch(process.env.FRAUD_MODEL_API_URL!, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(rawClaim),
 *   });
 *   return res.json() as SecurityScoreResult;
 * ───────────────────────────────────────────────────────────────────────────
 */
export function getSecurityScore(rawClaim: RawClaim): SecurityScoreResult {
  const features  = preprocessClaim(rawClaim);
  const pFraud    = computeFraudProbabilityHeuristic(features);
  const pClean    = 1 - pFraud;

  const fraudScore    = parseFloat(pFraud.toFixed(4));
  const securityScore = parseFloat(pClean.toFixed(4));
  const confidence    = parseFloat(Math.max(pFraud, pClean).toFixed(4));

  return {
    security_score: securityScore,
    fraud_score:    fraudScore,
    fraud_flag:     fraudScore > 0.5,
    risk_band:      getRiskBand(fraudScore),
    confidence,
    raw_proba:      [fraudScore, securityScore],
  };
}

// ─────────────────────────────────────────────
// 7.  DECISION ENGINE HELPER  (mirrors section 7 of security_score.py)
// ─────────────────────────────────────────────

export type Decision = 'APPROVED' | 'ESCALATED';

export interface DecisionResult extends SecurityScoreResult {
  decision: Decision;
  requires_human: boolean;
}

/**
 * Combines rule-engine flags with the ML score to produce a final decision.
 * Mirrors the combiner logic documented in security_score.py §7.
 */
export function getDecision(
  rawClaim: RawClaim,
  rulesPassed: boolean,
): DecisionResult {
  const scoreResult = getSecurityScore(rawClaim);
  const { fraud_score, confidence } = scoreResult;

  let decision: Decision;
  if (rulesPassed && fraud_score < 0.20 && confidence > 0.85) {
    decision = 'APPROVED';
  } else {
    decision = 'ESCALATED';
  }

  return {
    ...scoreResult,
    decision,
    requires_human: decision !== 'APPROVED',
  };
}
