"""
Greenhouse IoT simulation API: streams rows from Excel as virtual sensor readings.
HTTP: GET /sensor-data (2s delay per row). WebSocket: emits sensor_data every 2s.
"""

from __future__ import annotations

import hashlib
import threading
import time
from pathlib import Path

import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "greenhouse_sensors.xlsx"

# Canonical column names in Excel (input)
RAW_COLS = [
    "hum_sht",
    "tempc_sht",
    "soil_moisture",
    "soil_temp",
    "ph1_soil",
    "soil_conductivity",
]


def ensure_sample_excel(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file():
        return
    rng = __import__("numpy").random.default_rng(42)
    n = 150
    df = pd.DataFrame(
        {
            "hum_sht": rng.uniform(45, 82, n),
            "tempc_sht": rng.uniform(19.0, 31.5, n),
            "soil_moisture": rng.uniform(28, 78, n),
            "soil_temp": rng.uniform(17.0, 29.0, n),
            "ph1_soil": rng.uniform(5.4, 7.2, n),
            "soil_conductivity": rng.uniform(0.8, 2.8, n),
        }
    )
    df.to_excel(path, index=False)


def row_to_clean_record(row: pd.Series, index: int) -> dict:
    """Map raw Excel fields to API / UI names."""
    return {
        "humidity": float(row["hum_sht"]),
        "temperature": float(row["tempc_sht"]),
        "soil_moisture": float(row["soil_moisture"]),
        "soil_temp": float(row["soil_temp"]),
        "ph": float(row["ph1_soil"]),
        "soil_conductivity": float(row["soil_conductivity"]),
        "row_index": index,
        "timestamp": pd.Timestamp.utcnow().isoformat() + "Z",
    }


class SensorSimulator:
    """Thread-safe circular iterator over dataframe rows."""

    def __init__(self, df: pd.DataFrame):
        self._df = df.reset_index(drop=True)
        self._lock = threading.Lock()
        self._idx = 0
        self.total_rows = len(self._df)

    def next_record(self) -> dict:
        with self._lock:
            row = self._df.iloc[self._idx]
            i = self._idx
            self._idx = (self._idx + 1) % self.total_rows
        return row_to_clean_record(row, i)


def dummy_predict(sensor: dict) -> str:
    """Deterministic fake crop from sensor values (no real ML)."""
    crops = ["Rice", "Wheat", "Maize", "Cotton", "Tomato"]
    payload = "|".join(
        f"{k}={sensor.get(k, 0):.4f}"
        for k in ("humidity", "temperature", "soil_moisture", "ph")
    )
    h = int(hashlib.sha256(payload.encode()).hexdigest(), 16)
    return crops[h % len(crops)]


ensure_sample_excel(DATA_PATH)
_raw = pd.read_excel(DATA_PATH, engine="openpyxl")
for c in RAW_COLS:
    if c not in _raw.columns:
        raise ValueError(f"Excel must include column: {c}")
    _raw[c] = pd.to_numeric(_raw[c], errors="coerce")
_raw = _raw.dropna(subset=RAW_COLS).reset_index(drop=True)

# Separate cursors so HTTP polling and WebSocket push can run without fighting over rows
http_sim = SensorSimulator(_raw)
ws_sim = SensorSimulator(_raw)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")


@app.get("/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "service": "greenhouse-iot-sim",
            "rows": http_sim.total_rows,
        }
    )


@app.get("/sensor-data")
def sensor_data():
    """Return one mapped sensor row; 2s delay simulates sampling interval."""
    time.sleep(2.0)
    return jsonify(http_sim.next_record())


@app.post("/predict")
def predict():
    """Dummy ML: JSON body = cleaned sensor fields; returns crop name."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "JSON body required"}), 400
    crop = dummy_predict(data)
    return jsonify({"crop": crop})


def _socket_emit_loop():
    """Bonus: push one row every 2 seconds to all subscribers."""
    while True:
        time.sleep(2.0)
        try:
            rec = ws_sim.next_record()
            socketio.emit("sensor_data", rec)
        except Exception:
            pass


@socketio.on("connect")
def on_connect():
    socketio.emit("connected", {"message": "Greenhouse IoT stream"})


threading.Thread(target=_socket_emit_loop, daemon=True).start()

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5050, debug=False, allow_unsafe_werkzeug=True)
