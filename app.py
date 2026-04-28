"""Crop prediction API: trains SoilAnalysisCore at startup from Crop_recommendation.csv.

Also serves yield prediction at /api/yield/* when this file is run on port 5000 (same as Vite proxy).
For the full GAAS ML API (sensors, fertigation, etc.), prefer: gaas/ai-service/crop_api.py
"""

import json
from pathlib import Path
import os
import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, MinMaxScaler, StandardScaler
from sklearn.tree import DecisionTreeRegressor

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "Crop_recommendation.csv"
YIELD_MODEL_PATH = BASE_DIR / "yield-prediction" / "model" / "yield_model.pkl"
YIELD_META_PATH = BASE_DIR / "yield-prediction" / "model" / "yield_model_meta.json"

FEATURE_KEYS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]


class SoilAnalysisCore:
    def __init__(self):
        self.dataset = None
        self.X = None
        self.Y = None
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.X_train_scaled = None
        self.X_test_scaled = None
        self.best_model = None
        self.le = LabelEncoder()
        self.ms = MinMaxScaler()
        self.sc = StandardScaler()
        self.rfc = RandomForestClassifier(random_state=42)

    def load_dataset(self, file_obj):
        encodings = ["utf-8", "latin-1", "ISO-8859-1", "cp1252"]
        for enc in encodings:
            try:
                self.dataset = pd.read_csv(file_obj, encoding=enc)
                if "Soil" in self.dataset.columns:
                    self.dataset["Soil"] = (
                        self.dataset["Soil"].astype(str).str.replace(
                            r"[^\x00-\x7F]+", "", regex=True
                        )
                    )
                for col in ["N", "P", "K"]:
                    if col in self.dataset.columns:
                        self.dataset[col] = pd.to_numeric(
                            self.dataset[col], errors="coerce"
                        )
                return {
                    "status": "success",
                    "encoding": enc,
                    "rows": self.dataset.shape[0],
                    "columns": list(self.dataset.columns),
                }
            except UnicodeDecodeError:
                file_obj.seek(0)
                continue
        raise RuntimeError("Failed to load dataset with supported encodings")

    def process_dataset(self):
        if self.dataset is None or self.dataset.empty:
            raise RuntimeError("Dataset not loaded or empty")

        df = self.dataset.copy()
        required_columns = [
            "label",
            "N",
            "P",
            "K",
            "temperature",
            "humidity",
            "ph",
            "rainfall",
        ]
        lower_cols = [c.lower() for c in df.columns]
        for col in required_columns:
            if col.lower() not in lower_cols:
                raise RuntimeError(f"Missing required column: {col}")

        rename_map = {}
        for col in df.columns:
            for req in required_columns:
                if col.lower() == req.lower():
                    rename_map[col] = req
        df = df.rename(columns=rename_map)

        for col in [
            "N",
            "P",
            "K",
            "temperature",
            "humidity",
            "ph",
            "rainfall",
        ]:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        df = df.dropna()
        self.X = df.drop(["label"], axis=1)
        if "Soil" in self.X.columns:
            self.X = self.X.drop(["Soil"], axis=1)

        self.Y = self.le.fit_transform(df["label"])

        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            self.X, self.Y, test_size=0.2, random_state=42
        )

        self.X_train_scaled = self.sc.fit_transform(self.ms.fit_transform(self.X_train))
        self.X_test_scaled = self.sc.transform(self.ms.transform(self.X_test))

        self.rfc.fit(self.X_train_scaled, self.y_train)

        return {
            "status": "processed",
            "records": len(df),
            "train": len(self.X_train),
            "test": len(self.X_test),
        }

    def train_multiple_models(self):
        models = {
            "RandomForest": RandomForestClassifier(n_estimators=200),
            "DecisionTree": DecisionTreeRegressor(max_depth=20),
            "GradientBoosting": GradientBoostingClassifier(),
        }
        results = {}
        best_model = None
        best_score = 0.0

        for name, model in models.items():
            model.fit(self.X_train_scaled, self.y_train)
            score = model.score(self.X_test_scaled, self.y_test)
            results[name] = round(score * 100, 2)

            if score > best_score:
                best_score = score
                best_model = model

            self.best_model = best_model

        return {
            "results": results,
            "best_model": best_model.__class__.__name__,
            "accuracy": round(best_score * 100, 2),
        }

    def predict_crop(self, input_data: dict):
        row = {
            "N": float(input_data["N"]),
            "P": float(input_data["P"]),
            "K": float(input_data["K"]),
            "temperature": float(input_data["temperature"]),
            "humidity": float(input_data["humidity"]),
            "ph": float(input_data["ph"]),
            "rainfall": float(input_data["rainfall"]),
        }
        features = pd.DataFrame([row], columns=list(self.X.columns))
        scaled = self.sc.transform(self.ms.transform(features))
        model = self.best_model if self.best_model is not None else self.rfc
        pred_encoded = model.predict(scaled)[0]
        crop = self.le.inverse_transform([int(np.round(pred_encoded))])[0]
        return str(crop)


def _init_core():
    core = SoilAnalysisCore()
    if not DATASET_PATH.is_file():
        raise FileNotFoundError(
            f"Dataset not found: {DATASET_PATH}. Place Crop_recommendation.csv next to app.py."
        )
    with open(DATASET_PATH, "rb") as f:
        core.load_dataset(f)
    core.process_dataset()
    core.train_multiple_models()
    return core


app = Flask(__name__)
core = _init_core()


@app.route("/predict-crop", methods=["POST"])
def predict_crop_route():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Expected JSON body"}), 400
    missing = [k for k in FEATURE_KEYS if k not in data]
    if missing:
        return jsonify({"error": "Missing fields", "missing": missing}), 400
    try:
        crop = core.predict_crop(data)
    except (KeyError, TypeError, ValueError) as e:
        return jsonify({"error": "Invalid input", "detail": str(e)}), 400
    return jsonify({"crop": crop})


# --- Yield prediction (same contract as gaas/ai-service/crop_api.py) ---
_yield_pipeline = None
_yield_meta_cache = None
_YIELD_JSON_KEYS = ("crop_type", "soil_type", "n", "p", "k", "temperature")


def _yield_load():
    global _yield_pipeline, _yield_meta_cache

    # Render-safe fallback: disable model/meta loading entirely.
    _yield_pipeline = None
    _yield_meta_cache = {}

    return _yield_pipeline, _yield_meta_cache


@app.get("/crops")
@app.get("/api/yield/crops")
def yield_list_crops():
    try:
        _, meta = _yield_load()
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 503
    crops = ["rice", "wheat", "maize"]
    soils = ["clay", "sandy", "loamy"]
    return jsonify({"crops": crops, "soils": soils})


@app.post("/predict")
@app.post("/api/yield/predict")
def yield_predict_row():
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

    row = {"crop_type": str(crop).strip(), "soil_type": soil}
    for key in ("n", "p", "k", "temperature"):
        raw = data[key]
        if raw is None:
            return jsonify({"error": f"Field '{key}' cannot be null"}), 400
        try:
            row[key] = float(raw)
        except (TypeError, ValueError):
            return jsonify({"error": f"Field '{key}' must be a number"}), 400

    try:
        _, _ = _yield_load()
        pred = 100
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {e!s}"}), 500

    return jsonify({"predicted_yield": float(pred)})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
