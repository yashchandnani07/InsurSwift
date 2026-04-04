"""
security_score.py
=================
Final layer of the ML fraud pipeline.
Takes a raw claim dict → returns a security_score (0.0 – 1.0).

  0.0  = definite fraud   (HIGH RISK)
  1.0  = clean claim      (LOW RISK)

Drop this file next to your training notebook and import it.
"""

import numpy as np
import pandas as pd
import joblib
import os
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier


# ─────────────────────────────────────────────
# 1.  TARGET-ENCODING MAPS  (copied from your notebook)
# ─────────────────────────────────────────────

ENCODING_MAPS = {
    "auto_make": {
        '3 Series':0.95,'RSX':0.91,'Malibu':0.90,'Wrangler':0.88,'Pathfinder':0.87,
        'Ultima':0.86,'Camry':0.855,'Corolla':0.85,'CRV':0.85,'Legacy':0.84,'Neon':0.83,
        '95':0.81,'TL':0.80,'93':0.80,'MDX':0.78,'Accord':0.77,'Grand Cherokee':0.76,
        'Escape':0.75,'E4000':0.74,'A3':0.73,'Highlander':0.72,'Passat':0.72,'92x':0.71,
        'Jetta':0.71,'Fusion':0.71,'Forrestor':0.71,'Maxima':0.70,'Impreza':0.70,'X5':0.69,
        'RAM':0.67,'M5':0.66,'A5':0.65,'Civic':0.64,'F150':0.63,'Tahaoe':0.62,'C300':0.61,
        'ML350':0.60,'Silverado':0.59,'X6':0.56,
        'Jeep':0.84,'Nissan':0.82,'Toyota':0.81,'Accura':0.80,'Saab':0.77,'Suburu':0.76,
        'Dodge':0.75,'Honda':0.74,'Chevrolet':0.73,'BMW':0.72,'Volkswagen':0.71,'Audi':0.69,
        'Ford':0.69,'Mercedes':0.66,
    },
    "police_report_available": {'NO':0.77, 'YES':0.74},
    "property_damage":         {'NO':0.76, 'YES':0.74},
    "incident_city": {
        'Northbrook':0.78,'Riverwood':0.77,'Northbend':0.76,'Springfield':0.75,
        'Hillsdale':0.74,'Columbus':0.73,'Arlington':0.71,
    },
    "incident_state": {'WV':0.82,'NY':0.77,'VA':0.76,'PA':0.73,'SC':0.70,'NC':0.69,'OH':0.56},
    "authorities_contacted": {
        'None':0.94,'Police':0.79,'Fire':0.73,'Ambulance':0.70,'Other':0.68
    },
    "incident_severity": {
        'Trivial Damage':0.94,'Minor Damage':0.89,'Total Loss':0.87,'Major Damage':0.39
    },
    "collision_type": {'Rear Collision':0.78,'Side Collision':0.74,'Front Collision':0.72},
    "incident_type": {
        'Vehicle Theft':0.91,'Parked Car':0.90,
        'Multi-vehicle Collision':0.72,'Single Vehicle Collision':0.70,
    },
    "insured_relationship": {
        'husband':0.79,'own-child':0.78,'unmarried':0.75,
        'not-in-family':0.74,'wife':0.72,'other-relative':0.70,
    },
    "insured_hobbies": {
        'camping':0.91,'kayaking':0.90,'golf':0.89,'dancing':0.88,'bungie-jumping':0.84,
        'movies':0.83,'basketball':0.82,'exercise':0.81,'sleeping':0.805,'video-games':0.80,
        'skydiving':0.78,'paintball':0.77,'hiking':0.76,'base-jumping':0.73,'reading':0.73,
        'polo':0.72,'board-games':0.70,'yachting':0.69,'cross-fit':0.25,'chess':0.17,
    },
    "insured_occupation": {
        'other-service':0.84,'priv-house-serv':0.84,'adm-clerical':0.83,
        'handlers-cleaners':0.79,'prof-specialty':0.78,'protective-serv':0.77,
        'machine-op-inspct':0.76,'armed-forces':0.75,'sales':0.72,'tech-support':0.71,
        'transport-moving':0.705,'craft-repair':0.70,'farming-fishing':0.69,'exec-managerial':0.63,
    },
    "insured_education_level": {
        'Masters':0.78,'High School':0.77,'Associate':0.76,
        'JD':0.74,'College':0.73,'MD':0.72,'PhD':0.71,
    },
    "insured_sex":   {'FEMALE':0.76,'MALE':0.73},
    "policy_csl":    {'500/1000':0.78,'100/300':0.74,'250/500':0.73},
    "policy_state":  {'IL':0.77,'IN':0.745,'OH':0.74},
}

# Columns the model was trained on (after drops)
FEATURE_COLUMNS = [
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
]


# ─────────────────────────────────────────────
# 2.  PREPROCESSING FUNCTION
# ─────────────────────────────────────────────

def preprocess_claim(raw: dict) -> pd.DataFrame:
    """
    Accepts a raw claim dict (string fields intact),
    applies all target-encoding maps, and returns a
    single-row DataFrame ready for model.predict().
    """
    df = pd.DataFrame([raw])

    # Parse dates if present and extract month/day
    for date_col in ['incident_date', 'policy_bind_date']:
        if date_col in df.columns:
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')

    if 'incident_date' in df.columns:
        df['incident_month'] = df['incident_date'].dt.month
        df['incident_day']   = df['incident_date'].dt.day

    # Replace '?' with NaN then fill defaults
    df = df.replace('?', np.nan)
    if 'collision_type'         in df.columns: df['collision_type'].fillna('Rear Collision', inplace=True)
    if 'property_damage'        in df.columns: df['property_damage'].fillna('NO', inplace=True)
    if 'police_report_available'in df.columns: df['police_report_available'].fillna('NO', inplace=True)
    if 'authorities_contacted'  in df.columns: df['authorities_contacted'].fillna('None', inplace=True)

    # Apply target-encoding maps
    for col, mapping in ENCODING_MAPS.items():
        if col in df.columns:
            df[col] = df[col].map(mapping).fillna(0.75)   # 0.75 = neutral fallback

    # Drop columns the model never saw
    drop_cols = ['policy_number','policy_bind_date','incident_date',
                 'incident_location','auto_model','_c39','fraud_reported']
    df.drop(columns=[c for c in drop_cols if c in df.columns], inplace=True)

    # Ensure all expected feature columns are present (fill 0 if missing)
    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = 0

    return df[FEATURE_COLUMNS].astype(float)


# ─────────────────────────────────────────────
# 3.  SCORE FUNCTION  ← this is what you call
# ─────────────────────────────────────────────

def get_security_score(
    raw_claim: dict,
    model,
    scaler: StandardScaler = None,
) -> dict:
    """
    Parameters
    ----------
    raw_claim : dict
        One claim's raw fields (string values ok).
    model : fitted sklearn classifier
        Your trained RandomForestClassifier / BalancedRF.
    scaler : StandardScaler (optional)
        Pass the fitted scaler if you used one during training.

    Returns
    -------
    dict with keys:
        security_score  float  0.0 (fraud) → 1.0 (clean)
        fraud_score     float  0.0 (clean) → 1.0 (fraud)
        fraud_flag      bool   True if fraud_score > 0.5
        risk_band       str    "LOW" | "MEDIUM" | "HIGH"
        confidence      float  model's max class probability
        raw_proba       list   [p_fraud, p_clean]
    """
    X = preprocess_claim(raw_claim)

    if scaler is not None:
        X_scaled = scaler.transform(X)
    else:
        X_scaled = X.values

    # Probabilities: model predicts [fraud=0, clean=1]
    proba = model.predict_proba(X_scaled)[0]

    # fraud_reported was encoded: Y=0 (fraud), N=1 (not fraud)
    # So proba[0] = P(fraud), proba[1] = P(clean)
    p_fraud = float(proba[0])
    p_clean = float(proba[1])

    security_score = round(p_clean, 4)   # high = safe
    fraud_score    = round(p_fraud, 4)   # high = risky
    confidence     = round(max(proba), 4)

    if fraud_score < 0.30:
        risk_band = "LOW"
    elif fraud_score < 0.65:
        risk_band = "MEDIUM"
    else:
        risk_band = "HIGH"

    return {
        "security_score": security_score,   # → feeds your decision engine
        "fraud_score":    fraud_score,
        "fraud_flag":     fraud_score > 0.5,
        "risk_band":      risk_band,
        "confidence":     confidence,
        "raw_proba":      list(proba),
    }


# ─────────────────────────────────────────────
# 4.  SAVE & LOAD HELPERS
# ─────────────────────────────────────────────

def save_model(model, scaler=None, path="./models"):
    """Persist the trained model (and optional scaler) to disk."""
    os.makedirs(path, exist_ok=True)
    joblib.dump(model, os.path.join(path, "fraud_model.pkl"))
    if scaler:
        joblib.dump(scaler, os.path.join(path, "scaler.pkl"))
    print(f"Model saved to {path}/fraud_model.pkl")


def load_model(path="./models"):
    """Reload model + scaler from disk."""
    model  = joblib.load(os.path.join(path, "fraud_model.pkl"))
    scaler_path = os.path.join(path, "scaler.pkl")
    scaler = joblib.load(scaler_path) if os.path.exists(scaler_path) else None
    return model, scaler


# ─────────────────────────────────────────────
# 5.  BATCH SCORING  (for testing on the full dataset)
# ─────────────────────────────────────────────

def score_dataframe(df: pd.DataFrame, model, scaler=None) -> pd.DataFrame:
    """
    Run get_security_score() across every row of a DataFrame.
    Returns the original df with score columns appended.
    """
    results = []
    for _, row in df.iterrows():
        result = get_security_score(row.to_dict(), model, scaler)
        results.append(result)

    scores_df = pd.DataFrame(results)
    return pd.concat([df.reset_index(drop=True), scores_df], axis=1)


# ─────────────────────────────────────────────
# 6.  QUICK DEMO  (run this cell after training)
# ─────────────────────────────────────────────
"""
# ── After your training notebook runs model_o / model_u ──

# Save the model once after training:
save_model(model_o, scaler=sc)   # sc = your StandardScaler

# ── In your API / decision engine ──
model, scaler = load_model()

# One raw claim from an API request:
sample_claim = {
    "months_as_customer": 328,
    "age": 48,
    "policy_state": "OH",
    "policy_csl": "250/500",
    "policy_deductable": 1000,
    "policy_annual_premium": 1406.91,
    "umbrella_limit": 0,
    "insured_zip": 466132,
    "insured_sex": "MALE",
    "insured_education_level": "MD",
    "insured_occupation": "craft-repair",
    "insured_hobbies": "sleeping",
    "insured_relationship": "husband",
    "capital-gains": 0,
    "capital-loss": 0,
    "incident_type": "Single Vehicle Collision",
    "collision_type": "Side Collision",
    "incident_severity": "Major Damage",
    "authorities_contacted": "Police",
    "incident_state": "SC",
    "incident_city": "Columbus",
    "number_of_vehicles_involved": 1,
    "property_damage": "YES",
    "bodily_injuries": 1,
    "witnesses": 2,
    "police_report_available": "YES",
    "total_claim_amount": 71610,
    "injury_claim": 6510,
    "property_claim": 13020,
    "vehicle_claim": 52080,
    "auto_make": "Saab",
    "auto_year": 2004,
    "incident_month": 1,
    "incident_day": 6,
}

result = get_security_score(sample_claim, model, scaler)
print(result)

# Example output:
# {
#   "security_score": 0.83,   ← goes to your decision engine
#   "fraud_score":    0.17,
#   "fraud_flag":     False,
#   "risk_band":      "LOW",
#   "confidence":     0.83,
#   "raw_proba":      [0.17, 0.83]
# }
"""


# ─────────────────────────────────────────────
# 7.  HOW THIS CONNECTS TO YOUR DECISION ENGINE
# ─────────────────────────────────────────────
"""
Decision engine receives:

    score_result = get_security_score(claim, model, scaler)

    security_score = score_result["security_score"]
    fraud_score    = score_result["fraud_score"]
    risk_band      = score_result["risk_band"]

Then your combiner logic:

    if rules_passed and fraud_score < 0.20 and confidence > 0.85:
        decision = "APPROVED"
    elif fraud_score > 0.65 or risk_band == "HIGH":
        decision = "ESCALATED"
    else:
        decision = "ESCALATED"   # always escalate uncertainty

Final API response:
    {
        "decision":       decision,
        "security_score": security_score,
        "fraud_score":    fraud_score,
        "risk_band":      risk_band,
        "confidence":     confidence,
        "requires_human": decision != "APPROVED"
    }
"""
