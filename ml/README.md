# ML Fraud Pipeline

Place the following files in this directory:

- `security_score.py` — Final layer of the ML fraud pipeline. Takes a raw claim dict → returns a security_score (0.0–1.0).
- `insurance_fraud_claims.csv` — Training dataset for the fraud detection model.

## Model Artifacts (generated after training)

After running the training notebook, save model artifacts here:

- `models/fraud_model.pkl` — Trained RandomForestClassifier / BalancedRF
- `models/scaler.pkl` — Fitted StandardScaler (optional)

## Serving the Model

To serve the trained model as an API endpoint (for the TypeScript decision engine to call):

```bash
# Example using FastAPI
uvicorn serve:app --host 0.0.0.0 --port 8000
```

The TypeScript stub in `src/lib/fraudModel.ts` is pre-wired to call `FRAUD_MODEL_API_URL`.
Set the environment variable to point at your running Python endpoint:

```
FRAUD_MODEL_API_URL=http://localhost:8000/score
```
