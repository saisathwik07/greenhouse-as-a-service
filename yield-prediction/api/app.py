"""
Flask API for yield prediction using model/yield_model.pkl (sklearn Pipeline).

Run from project root (port 5001 matches Vite proxy default):
  pip install -r requirements.txt
  flask --app api.app run --port 5001
"""

import json
from pathlib import Path

import joblib
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = PROJECT_ROOT / "model" / "yield_model.pkl"
META_PATH = PROJECT_ROOT / "model" / "yield_model_meta.json"

app = Flask(__name__)
CORS(app)

_model = None
_meta = None


def get_meta():
    global _meta
    if _meta is None:
        if not META_PATH.exists():
            raise FileNotFoundError(
                f"Missing {META_PATH}. Run model/train.py first."
            )
        _meta = json.loads(META_PATH.read_text(encoding="utf-8"))
    return _meta


def get_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Trained model not found at {MODEL_PATH}. Run model/train.py first."
            )
        _model = joblib.load(MODEL_PATH)
    return _model


# JSON body keys expected from the client
JSON_KEYS = (
    "crop_type",
    "soil_type",
    "n",
    "p",
    "k",
    "temperature",
)
# DataFrame columns (same as training)
COL_NAMES = ("crop_type", "soil_type", "n", "p", "k", "temperature")


@app.get("/health")
def health():
    return jsonify({"status": "ok", "project": "yield-prediction"})


@app.get("/crops")
def crops():
    try:
        meta = get_meta()
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 500
    return jsonify({"crops": meta["crops"], "soils": meta["soils"]})


@app.get("/")
def root():
    return jsonify(
        {
            "message": "Yield prediction API",
            "endpoints": ["/health", "/crops", "/predict"],
        }
    )


@app.post("/predict")
def predict():
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be JSON"}), 400

    missing = [k for k in JSON_KEYS if k not in data]
    if missing:
        return jsonify({"error": f"Missing field(s): {', '.join(missing)}"}), 400

    try:
        meta = get_meta()
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 500

    soils = set(meta["soils"])
    crop = data["crop_type"]
    soil = data["soil_type"]
    if crop is None or str(crop).strip() == "":
        return jsonify({"error": "crop_type is required"}), 400
    if soil is None or str(soil).strip() == "":
        return jsonify({"error": "soil_type is required"}), 400
    soil = str(soil).strip().lower()
    if soil not in soils:
        return jsonify(
            {"error": f"soil_type must be one of: {', '.join(sorted(soils))}"}
        ), 400

    row = {}
    row["crop_type"] = str(crop).strip()
    row["soil_type"] = soil

    for key in ("n", "p", "k", "temperature"):
        raw = data[key]
        if raw is None:
            return jsonify({"error": f"Field '{key}' cannot be null"}), 400
        try:
            row[key] = float(raw)
        except (TypeError, ValueError):
            return jsonify({"error": f"Field '{key}' must be a number"}), 400

    try:
        model = get_model()
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 500

    try:
        X = pd.DataFrame([row], columns=list(COL_NAMES))
        pred = model.predict(X)[0]
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {e!s}"}), 500

    return jsonify({"predicted_yield": float(pred)})


if __name__ == "__main__":
    app.run(debug=True, port=5001)
