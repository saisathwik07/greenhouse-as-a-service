"""
Train a Random Forest on crop type, soil type, NPK (N, P, K), and temperature.

`final_dataset.csv` has crop in `Item` but not soil/NPK. For training, soil and NPK are
derived deterministically from Area/Year/pesticide so the model learns joint patterns with yield.
At prediction time you supply real crop, soil, NPK, and temperature.

Requires `data/final_dataset.csv` (run `merge_datasets.py` first).
Saves `yield_model.pkl` (sklearn Pipeline) and `yield_model_meta.json` (crop list, etc.).
"""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

SERVICE_DIR = Path(__file__).resolve().parent
DATA_PATH = SERVICE_DIR / "data" / "final_dataset.csv"
MODEL_PATH = SERVICE_DIR / "yield_model.pkl"
META_PATH = SERVICE_DIR / "yield_model_meta.json"

SOIL_LABELS = ["clay", "sandy", "loamy"]
TARGET = "yield"


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add crop_type, soil_type, n, p, k for training."""
    rng = np.random.RandomState(42)
    out = df.copy()
    h = (out["Area"].astype(str) + out["Year"].astype(str)).map(lambda s: hash(s) % 3)
    out["soil_type"] = h.map(lambda i: SOIL_LABELS[i])
    pest = out["pesticide"].astype(float)
    out["n"] = (35 + pest * 0.42 + rng.standard_normal(len(out)) * 10).clip(5, 600)
    out["p"] = (18 + pest * 0.22 + rng.standard_normal(len(out)) * 6).clip(5, 250)
    out["k"] = (28 + pest * 0.33 + rng.standard_normal(len(out)) * 8).clip(5, 350)
    out["crop_type"] = out["Item"].astype(str)
    return out


def build_pipeline() -> Pipeline:
    preprocess = ColumnTransformer(
        transformers=[
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                ["crop_type", "soil_type"],
            ),
            ("num", "passthrough", ["n", "p", "k", "temperature"]),
        ],
    )
    return Pipeline(
        [
            ("prep", preprocess),
            ("model", RandomForestRegressor(n_estimators=120, random_state=42, n_jobs=-1)),
        ]
    )


def main() -> None:
    print("Loading dataset:", DATA_PATH)
    df = pd.read_csv(DATA_PATH)
    df = add_features(df)

    feature_cols = ["crop_type", "soil_type", "n", "p", "k", "temperature"]
    for c in feature_cols + [TARGET]:
        if c not in df.columns:
            raise ValueError(f"Missing column: {c}")

    X = df[feature_cols]
    y = df[TARGET]

    crops = sorted(df["crop_type"].unique().tolist())
    meta = {
        "crops": crops,
        "soils": SOIL_LABELS,
        "feature_order": feature_cols,
    }
    META_PATH.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("Wrote", META_PATH)

    print("Splitting data: 80% train, 20% test")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("Training pipeline (one-hot crop + soil, NPK + temperature)...")
    pipe = build_pipeline()
    pipe.fit(X_train, y_train)

    accuracy = pipe.score(X_test, y_test)
    print("Model accuracy score (R-squared on test set):", round(accuracy, 4))

    print("Saving model to:", MODEL_PATH)
    joblib.dump(pipe, MODEL_PATH)
    print("Done.")


if __name__ == "__main__":
    main()
