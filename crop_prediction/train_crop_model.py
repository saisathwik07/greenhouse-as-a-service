"""
Train a DecisionTreeClassifier on Crop_recommendation1.csv.

Features: N, P, K, temperature, humidity, rainfall
Target: label

Usage (from this folder):
  pip install -r requirements.txt
  python train_crop_model.py
"""

import pickle
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

# Prefer CSV next to project root, then alternate path
_ROOT = Path(__file__).resolve().parent.parent
_CSV_CANDIDATES = [
    _ROOT / "Crop_recommendation1.csv",
    Path(r"e:\only_cropassist\Crop_recommendation1.csv"),
]
CSV_PATH = next((p for p in _CSV_CANDIDATES if p.is_file()), _CSV_CANDIDATES[0])
MODEL_FILE = Path(__file__).resolve().parent / "model.pkl"

FEATURE_COLS = ["N", "P", "K", "temperature", "humidity", "rainfall"]


def main():
    if not CSV_PATH.is_file():
        raise FileNotFoundError(f"CSV not found: {CSV_PATH}")

    df = pd.read_csv(CSV_PATH, encoding="latin-1")

    missing = [c for c in FEATURE_COLS + ["label"] if c not in df.columns]
    if missing:
        raise ValueError(f"CSV missing required columns: {missing}")

    X = df[FEATURE_COLS]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = DecisionTreeClassifier(random_state=42)
    model.fit(X_train, y_train)

    train_acc = model.score(X_train, y_train)
    test_acc = model.score(X_test, y_test)

    print(f"Train accuracy: {train_acc:.4f}")
    print(f"Test accuracy:  {test_acc:.4f}")

    with open(MODEL_FILE, "wb") as f:
        pickle.dump(model, f)
    print(f"Saved model to: {MODEL_FILE}")


if __name__ == "__main__":
    main()
