"""Flask API: virtual sensor stream + live dashboard + crop prediction."""

import json
import math
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import joblib
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

BASE_DIR = Path(__file__).resolve().parent
# Centralized AI service layout (post-cleanup):
#   gaas/ai-service/crop-prediction/   — crop dataset + greenhouse sensor stream
#   gaas/ai-service/yield-prediction/  — trained sklearn pipeline + meta
YIELD_MODEL_DIR = BASE_DIR / "yield-prediction"
YIELD_MODEL_PATH = YIELD_MODEL_DIR / "yield_model.pkl"
YIELD_META_PATH = YIELD_MODEL_DIR / "yield_model_meta.json"
CROP_DATA_PATH = BASE_DIR / "crop-prediction" / "Crop_recommendation.csv"
SENSOR_DATA_PATH = BASE_DIR / "crop-prediction" / "greenhouse_sensors.csv"

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
TARGET = "label"

# Raw CSV columns expected for greenhouse sensor file
SENSOR_COLS = [
    "hum_sht",
    "tempc_sht",
    "soil_moisture",
    "soil_temp",
    "ph1_soil",
    "soil_conductivity",
]

_label_encoder = LabelEncoder()
_model = None
_sensor_df = None
_sensor_index = 0


def _load_sensor_dataframe():
    """Load and validate sensor CSV; return non-empty DataFrame or raise."""
    if not SENSOR_DATA_PATH.is_file():
        raise FileNotFoundError(f"Sensor dataset not found: {SENSOR_DATA_PATH}")

    df = pd.read_csv(SENSOR_DATA_PATH)
    df.columns = [str(c).strip() for c in df.columns]

    missing = [c for c in SENSOR_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"Sensor CSV missing columns: {missing}. Found: {list(df.columns)}")

    for col in SENSOR_COLS:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=SENSOR_COLS).reset_index(drop=True)
    if len(df) == 0:
        raise ValueError("Sensor dataset is empty after cleaning (all NaN).")
    return df


def train_model():
    global _model
    if not CROP_DATA_PATH.is_file():
        raise FileNotFoundError(f"Crop dataset not found: {CROP_DATA_PATH}")
    df = pd.read_csv(CROP_DATA_PATH)
    for col in FEATURES:
        if col not in df.columns:
            raise ValueError(f"Crop CSV missing column: {col}")
        df[col] = pd.to_numeric(df[col], errors="coerce")
    if TARGET not in df.columns:
        raise ValueError(f"Crop CSV missing target: {TARGET}")
    df = df.dropna(subset=FEATURES + [TARGET])
    if len(df) == 0:
        raise ValueError("Crop dataset empty after cleaning.")
    X = df[FEATURES]
    y = _label_encoder.fit_transform(df[TARGET])
    _model = RandomForestClassifier(n_estimators=200, random_state=42)
    _model.fit(X, y)


def _build_model_input_row(row) -> pd.DataFrame:
    """Single row DataFrame with columns exactly matching FEATURES (training order)."""
    values = [
        90.0,
        40.0,
        40.0,
        float(row["tempc_sht"]),
        float(row["hum_sht"]),
        float(row["ph1_soil"]),
        100.0,
    ]
    return pd.DataFrame([values], columns=FEATURES)


try:
    _sensor_df = _load_sensor_dataframe()
except Exception as startup_err:
    _sensor_df = pd.DataFrame()
    print(f"[crop_api] Sensor load failed: {startup_err}")

try:
    train_model()
except Exception as startup_err:
    _model = None
    print(f"[crop_api] Model train failed: {startup_err}")


app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=False,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
)


@app.get("/health")
def health():
    ok = _model is not None and _sensor_df is not None and len(_sensor_df) > 0
    return jsonify(
        {
            "ok": ok,
            "service": "crop_api",
            "sensor_rows": 0 if _sensor_df is None else len(_sensor_df),
            "model_loaded": _model is not None,
        }
    )


@app.get("/sensor-data")
def sensor_data():
    global _sensor_index
    try:
        if _sensor_df is None or len(_sensor_df) == 0:
            return jsonify({"error": "Sensor data not loaded"}), 500
        time.sleep(2)
        row = _sensor_df.iloc[_sensor_index]
        _sensor_index = (_sensor_index + 1) % len(_sensor_df)
        return jsonify(
            {
                "humidity": float(row["hum_sht"]),
                "temperature": float(row["tempc_sht"]),
                "soil_moisture": float(row["soil_moisture"]),
                "soil_temp": float(row["soil_temp"]),
                "ph": float(row["ph1_soil"]),
                "conductivity": float(row["soil_conductivity"]),
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/live-data")
def live_data():
    global _sensor_index
    try:
        if _model is None:
            return jsonify({"error": "ML model not loaded"}), 500
        if _sensor_df is None or len(_sensor_df) == 0:
            return jsonify({"error": "Sensor data not loaded or empty"}), 500

        n = len(_sensor_df)
        row = _sensor_df.iloc[_sensor_index]
        _sensor_index = (_sensor_index + 1) % n

        input_df = _build_model_input_row(row)
        pred = _model.predict(input_df)
        pred_idx = int(pred[0])
        crop = _label_encoder.inverse_transform([pred_idx])[0]

        if float(row["soil_moisture"]) < 40:
            pump = "ON"
            alert = "Low Moisture"
        else:
            pump = "OFF"
            alert = "Normal"

        return jsonify(
            {
                "temperature": float(row["tempc_sht"]),
                "humidity": float(row["hum_sht"]),
                "soil_moisture": float(row["soil_moisture"]),
                "ph": float(row["ph1_soil"]),
                "prediction": str(crop),
                "soil_temp": float(row["soil_temp"]),
                "conductivity": float(row["soil_conductivity"]),
                "pump_status": pump,
                "alert": alert,
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _baseline_temp_hum():
    """Use latest sensor row when available for demo AI endpoints."""
    if _sensor_df is not None and len(_sensor_df) > 0:
        row = _sensor_df.iloc[-1]
        return float(row["tempc_sht"]), float(row["hum_sht"])
    return 24.0, 65.0


@app.get("/api/ai/predict")
def api_ai_predict():
    """24h temperature forecast demo — matches AIPage chart shape."""
    try:
        base_t, _ = _baseline_temp_hum()
        now = datetime.now(timezone.utc)
        labels = []
        values = []
        for h in range(24):
            t = now + timedelta(hours=h)
            labels.append(f"slot {t.strftime('%H:%M')}")
            # gentle diurnal curve + noise placeholder
            values.append(round(base_t + 3.0 * math.sin(h / 24.0 * 6.28) + (h % 5) * 0.1, 2))
        return jsonify(
            {
                "model": "Demo · 24h temperature projection",
                "labels": labels,
                "values": values,
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/api/ai/anomaly")
def api_ai_anomaly():
    """Sample anomaly rows — matches AIPage table."""
    try:
        base_t, base_h = _baseline_temp_hum()
        now = datetime.now(timezone.utc)
        rows = [
            {
                "timestamp": (now - timedelta(minutes=12)).isoformat(),
                "sensor": "temperature",
                "value": round(base_t + 4.2, 2),
                "expectedRange": f"{base_t - 2:.1f}–{base_t + 2:.1f} °C",
                "severity": "medium",
            },
            {
                "timestamp": (now - timedelta(hours=1, minutes=3)).isoformat(),
                "sensor": "humidity",
                "value": round(min(99.0, base_h + 18.0), 2),
                "expectedRange": f"{base_h - 10:.0f}–{base_h + 10:.0f} %",
                "severity": "high",
            },
            {
                "timestamp": (now - timedelta(hours=3)).isoformat(),
                "sensor": "soil_moisture",
                "value": 28.5,
                "expectedRange": "40–80 %",
                "severity": "low",
            },
        ]
        return jsonify({"model": "Demo · threshold-based anomaly scan", "rows": rows})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/api/ai/clustering")
def api_ai_clustering():
    """Sample clusters — matches AIPage bar chart + cards."""
    try:
        base_t, base_h = _baseline_temp_hum()
        return jsonify(
            {
                "model": "Demo · k-means on recent readings",
                "clusters": [
                    {"name": "Stable zone", "count": 42, "avgTemp": round(base_t, 1), "avgHumidity": round(base_h, 1)},
                    {"name": "Warm / dry", "count": 18, "avgTemp": round(base_t + 2.3, 1), "avgHumidity": round(base_h - 8.0, 1)},
                    {"name": "Cool / moist", "count": 27, "avgTemp": round(base_t - 1.8, 1), "avgHumidity": round(base_h + 6.0, 1)},
                ],
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Matches gaas/backend Express `/api/fertilizer/recommend` + frontend `api.post("/fertilizer/recommend")`
_FERTILIZERS = [
    {
        "fertilizer": "NPK 19-19-19",
        "description": "Balanced growth formula",
        "dosageMlPerL": 5,
        "phRange": (5.5, 7.5),
        "ecRange": (0.5, 2.5),
    },
    {
        "fertilizer": "Urea (46-0-0)",
        "description": "High nitrogen for leafy growth",
        "dosageMlPerL": 3,
        "phRange": (5.0, 7.0),
        "ecRange": (0.5, 2.0),
    },
    {
        "fertilizer": "DAP (18-46-0)",
        "description": "Phosphorus-rich for root development",
        "dosageMlPerL": 4,
        "phRange": (6.0, 7.5),
        "ecRange": (1.0, 2.5),
    },
    {
        "fertilizer": "MOP (0-0-60)",
        "description": "Potassium for fruit quality",
        "dosageMlPerL": 3,
        "phRange": (5.5, 7.0),
        "ecRange": (0.8, 2.0),
    },
    {
        "fertilizer": "Calcium Nitrate",
        "description": "Prevents blossom end rot",
        "dosageMlPerL": 4,
        "phRange": (5.5, 7.0),
        "ecRange": (0.5, 2.0),
    },
]


def _in_range(val: float, bounds: tuple[float, float]) -> bool:
    return bounds[0] <= val <= bounds[1]


def _fertilizer_recommendations_json():
    """Shared handler: pH + EC scoring — same contract as GAAS Node backend."""
    try:
        data = request.get_json(silent=True) or {}
        ph = float(data.get("ph", 6.5))
        ec = float(data.get("ec", 1.5))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid ph or ec"}), 400

    recommendations = []
    for f in _FERTILIZERS:
        match = 50
        if _in_range(ph, f["phRange"]):
            match += 25
        if _in_range(ec, f["ecRange"]):
            match += 25
        recommendations.append(
            {
                "fertilizer": f["fertilizer"],
                "description": f["description"],
                "match": match,
                "dosageMlPerL": f["dosageMlPerL"],
            }
        )
    recommendations.sort(key=lambda x: x["match"], reverse=True)
    return jsonify({"recommendations": recommendations})


@app.post("/api/fertilizer/recommend")
def api_fertilizer_recommend():
    return _fertilizer_recommendations_json()


@app.post("/fertilizer/recommend")
def fertilizer_recommend_no_api_prefix():
    """Alias if a client resolves the path without /api."""
    return _fertilizer_recommendations_json()


_yield_pipeline = None
_yield_meta_cache = None

_YIELD_JSON_KEYS = ("crop_type", "soil_type", "n", "p", "k", "temperature")


def _yield_load():
    """Load yield prediction sklearn pipeline + meta from yield-prediction project."""
    global _yield_pipeline, _yield_meta_cache
    if _yield_pipeline is None:
        if not YIELD_MODEL_PATH.is_file():
            raise FileNotFoundError(
                f"Yield model not found at {YIELD_MODEL_PATH}. "
                "Run: cd gaas/ai-service/yield-prediction && python train.py"
            )
        _yield_pipeline = joblib.load(YIELD_MODEL_PATH)
    if _yield_meta_cache is None:
        if not YIELD_META_PATH.is_file():
            raise FileNotFoundError(f"Yield meta not found at {YIELD_META_PATH}")
        _yield_meta_cache = json.loads(YIELD_META_PATH.read_text(encoding="utf-8"))
    return _yield_pipeline, _yield_meta_cache


@app.get("/crops")
@app.get("/api/yield/crops")
def yield_list_crops():
    """Crop and soil labels for the yield prediction UI."""
    try:
        _, meta = _yield_load()
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 503
    return jsonify({"crops": meta["crops"], "soils": meta["soils"]})


@app.post("/predict")
@app.post("/api/yield/predict")
def yield_predict_row():
    """
    ML yield prediction. Also exposed as /api/yield/predict so the Vite dev server can
    proxy /api/* to Flask without the browser calling 127.0.0.1:5000 directly.
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be JSON"}), 400

    missing = [k for k in _YIELD_JSON_KEYS if k not in data]
    if missing:
        return jsonify({"error": f"Missing field(s): {', '.join(missing)}"}), 400

    try:
        _, meta = _yield_load()
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 503

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

    row = {
        "crop_type": str(crop).strip(),
        "soil_type": soil,
    }
    for key in ("n", "p", "k", "temperature"):
        raw = data[key]
        if raw is None:
            return jsonify({"error": f"Field '{key}' cannot be null"}), 400
        try:
            row[key] = float(raw)
        except (TypeError, ValueError):
            return jsonify({"error": f"Field '{key}' must be a number"}), 400

    try:
        pipe, _ = _yield_load()
        X = pd.DataFrame([row], columns=list(_YIELD_JSON_KEYS))
        pred = pipe.predict(X)[0]
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {e!s}"}), 500

    return jsonify({"predicted_yield": float(pred)})


@app.post("/predict-crop")
def predict_crop():
    try:
        if _model is None:
            return jsonify({"error": "ML model not loaded"}), 500
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({"error": "JSON body required"}), 400
        missing = [k for k in FEATURES if k not in data]
        if missing:
            return jsonify({"error": f"Missing keys: {missing}"}), 400
        row = [float(data[k]) for k in FEATURES]
        input_df = pd.DataFrame([row], columns=FEATURES)
        pred_idx = int(_model.predict(input_df)[0])
        crop = _label_encoder.inverse_transform([pred_idx])[0]
        return jsonify({"crop": str(crop)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
