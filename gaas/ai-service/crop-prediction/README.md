# Crop Recommendation

Datasets used by the crop prediction logic in `gaas/ai-service/`.

## Files

- `Crop_recommendation.csv` — N, P, K, temperature, humidity, pH, rainfall → `label` (crop). Trained at startup by:
  - `core_model.SoilAnalysisCore` (consumed by `app.py` on port 8000)
  - `crop_api.train_model` (consumed by `crop_api.py` on port 5000)
- `greenhouse_sensors.csv` — synthetic greenhouse sensor stream replayed by `crop_api.py` for the `/sensor-data` and `/live-data` endpoints.

## API surface

| Method | Path | Server |
| ------ | ---- | ------ |
| POST | `/predict-crop` | `crop_api.py` (5000) and `app.py` (8000) |
| GET  | `/sensor-data`  | `crop_api.py` (5000) |
| GET  | `/live-data`    | `crop_api.py` (5000) — adds an irrigation alert + pump-status overlay |

The Express backend (`gaas/backend`) mirrors `/predict-crop` at
`/api/crop/recommend` using its own deterministic scorer when the Flask
service is unreachable.
