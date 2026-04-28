from flask import Flask, jsonify, request
import random
from datetime import datetime, timedelta

from core_model import SoilAnalysisCore

app = Flask(__name__)

core = SoilAnalysisCore()
core.load_dataset()
core.process_dataset()
core.train_multiple_models()

_CROP_KEYS = ("N", "P", "K", "temperature", "humidity", "ph", "rainfall")


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "gaas-ai-service"})


@app.get("/predict")
def predict():
    row = request.args.get("row", "row1")
    bag = request.args.get("bag", "bag1")
    labels = []
    values = []
    now = datetime.utcnow()
    for i in range(24):
        point = now + timedelta(hours=i)
        labels.append(point.strftime("%Y-%m-%d %H:%M"))
        values.append(round(22 + random.random() * 8, 2))
    return jsonify({"model": "LSTM-placeholder", "row": row, "bag": bag, "labels": labels, "values": values})


@app.get("/anomaly")
def anomaly():
    return jsonify(
        {
            "model": "IsolationForest-style",
            "rows": [
                {"timestamp": "2026-04-01T07:20:00Z", "sensor": "temperature", "value": 35.8, "expectedRange": "22-30", "severity": "high"},
                {"timestamp": "2026-04-01T09:10:00Z", "sensor": "soil_moisture", "value": 28.4, "expectedRange": "35-70", "severity": "medium"},
            ],
        }
    )


@app.get("/clustering")
def clustering():
    return jsonify(
        {
            "model": "KMeans-style",
            "clusters": [
                {"name": "Optimal Zone", "count": 2180, "avgTemp": 24.6, "avgHumidity": 68.0},
                {"name": "Stress Zone", "count": 620, "avgTemp": 31.1, "avgHumidity": 52.4},
                {"name": "Overwatered Zone", "count": 440, "avgTemp": 22.0, "avgHumidity": 80.1},
            ],
        }
    )


FERTILIZER_DB = [
    {"name": "NPK 20-20-20", "bestFor": ["Tomato", "Maize", "Chili"], "phRange": [5.5, 7.0], "dosageMlPerL": 2.5, "description": "Balanced macro-nutrient formula"},
    {"name": "Calcium Nitrate", "bestFor": ["Tomato", "Lettuce", "Chili"], "phRange": [5.0, 6.5], "dosageMlPerL": 1.5, "description": "Prevents blossom end rot"},
    {"name": "Potassium Sulfate", "bestFor": ["Tomato", "Chili", "Rice"], "phRange": [5.5, 7.5], "dosageMlPerL": 1.0, "description": "Improves fruit quality"},
    {"name": "DAP", "bestFor": ["Wheat", "Rice", "Maize"], "phRange": [6.0, 7.5], "dosageMlPerL": 2.0, "description": "High phosphorus for roots"},
    {"name": "Urea 46-0-0", "bestFor": ["Rice", "Wheat", "Maize"], "phRange": [5.5, 7.0], "dosageMlPerL": 1.8, "description": "High nitrogen for leafy growth"},
]


@app.post("/fertilizer/recommend")
def fertilizer_recommend():
    data = request.get_json(silent=True) or {}
    crop = data.get("cropType", "Tomato")
    ph = float(data.get("ph", 6.5))

    results = []
    for fert in FERTILIZER_DB:
        score = 0
        if crop in fert["bestFor"]:
            score += 50
        if fert["phRange"][0] <= ph <= fert["phRange"][1]:
            score += 50
        results.append({"fertilizer": fert["name"], "match": score, "dosageMlPerL": fert["dosageMlPerL"], "description": fert["description"]})

    results.sort(key=lambda x: x["match"], reverse=True)
    return jsonify({"recommendations": results[:3]})


@app.post("/predict-crop")
def predict_crop():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Expected JSON body"}), 400
    missing = [k for k in _CROP_KEYS if k not in data]
    if missing:
        return jsonify({"error": "Missing fields", "missing": missing}), 400
    try:
        result = core.predict_crop(data)
        return jsonify({"crop": result["crop"]})
    except (KeyError, TypeError, ValueError) as e:
        return jsonify({"error": "Invalid input", "detail": str(e)}), 400


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
