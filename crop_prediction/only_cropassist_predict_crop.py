"""
Extracted from e:\\only_cropassist\\core_app.py — SoilAnalysisCore.predict_crop (lines 175–196).

Original app route: app.py POST /prediction -> core.predict_crop(request.get_json())

Original 6th input key was "ph" (not rainfall). If you train with rainfall instead,
use the same key here and fit scalers/model on [N, P, K, temperature, humidity, rainfall].
"""

from __future__ import annotations

import numpy as np
from sklearn.preprocessing import LabelEncoder, MinMaxScaler, StandardScaler


def vector_from_json(data: dict, sixth_key: str = "rainfall") -> np.ndarray:
    """Build 1x6 feature row in fixed order (matches only_cropassist process_dataset column order)."""
    return np.array(
        [
            [
                float(data["N"]),
                float(data["P"]),
                float(data["K"]),
                float(data["temperature"]),
                float(data["humidity"]),
                float(data[sixth_key]),
            ]
        ],
        dtype=float,
    )


def predict_crop_label(
    data: dict,
    ms: MinMaxScaler,
    sc: StandardScaler,
    le: LabelEncoder,
    best_model,
    *,
    sixth_key: str = "rainfall",
) -> str:
    """
    Same logic as SoilAnalysisCore.predict_crop, without fertilizers/IOT.

    Parameters
    ----------
    data : dict
        Keys: N, P, K, temperature, humidity, and sixth_key (default "rainfall").
        Original only_cropassist used sixth_key="ph".
    ms, sc, le, best_model
        Fitted objects from your training pipeline (process_dataset + train_multiple_models).

    Returns
    -------
    str
        Predicted crop label.
    """
    features = vector_from_json(data, sixth_key=sixth_key)
    scaled = sc.transform(ms.transform(features))
    pred = best_model.predict(scaled)[0]
    crop = le.inverse_transform([int(pred)])[0]
    return str(crop)
