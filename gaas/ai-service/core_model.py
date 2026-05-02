"""SoilAnalysisCore ML pipeline for crop recommendation."""

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, MinMaxScaler, StandardScaler
from sklearn.tree import DecisionTreeRegressor

DATASET_PATH = Path(__file__).resolve().parent / "crop-prediction" / "Crop_recommendation.csv"


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

    def load_dataset(self, file_obj=None):
        if file_obj is None:
            with open(DATASET_PATH, "rb") as f:
                return self._load_dataset_from_file(f)
        return self._load_dataset_from_file(file_obj)

    def _load_dataset_from_file(self, file_obj):
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
        return {"crop": str(crop)}
