# Yield Prediction

Trained sklearn `Pipeline` for tons-per-hectare yield estimation.

## Files

- `yield_model.pkl` — fitted pipeline (preprocess + regressor). Loaded lazily by `crop_api.py`.
- `yield_model_meta.json` — supported `crops` and `soils` lists used to validate user input.
- `train.py` — rebuilds `yield_model.pkl` from `data/final_dataset.csv`.
- `merge_datasets.py` — joins the four FAO CSVs in `data/` into `data/final_dataset.csv`.
- `data/` — raw FAO inputs (`yield.csv`, `temp.csv`, `rainfall.csv`, `pesticides.csv`) plus the merged training file.

## Retrain

```bash
cd gaas/ai-service/yield-prediction
python merge_datasets.py   # rebuild data/final_dataset.csv
python train.py            # rewrite yield_model.pkl + yield_model_meta.json
```

## API surface

Served by `gaas/ai-service/crop_api.py` on port 5000:

| Method | Path | Notes |
| ------ | ---- | ----- |
| GET  | `/api/yield/crops`   | Returns `{ crops, soils }` from the meta file. |
| POST | `/api/yield/predict` | Body: `{ crop_type, soil_type, n, p, k, temperature }` → `{ predicted_yield }` (hg/ha). |

Express (`gaas/backend/src/server.js`) proxies `/api/yield/*` to this Flask
service so the React app can call the same `/api/*` origin in dev and prod.
