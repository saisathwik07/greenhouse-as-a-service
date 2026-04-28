# Greenhouse as a Service (GaaS)

Production-oriented full-stack platform with:
- `frontend/` React + Tailwind + Chart.js
- `backend/` Node.js + Express + MongoDB + MQTT ingestion
- `ai-service/` Python Flask AI endpoints
- `mqtt-service/` MQTT publisher simulator (integration-ready with real broker)

## Implemented Modules

1. Dashboard with realtime sensor cards, alerts, and last-updated time.
2. DaaS with range selector (24h/48h/72h), live API charts, and historical API flow.
3. Crop Recommendation service with backend scoring logic and top-5 response.
4. Fertigation control with API submission, MongoDB storage, and analytics chart.
5. RaaS with dataset filters, preview chart, and CSV/JSON download.
6. AI/ML analytics tabs for prediction, anomaly, and clustering from Flask.
7. MQTT integration subscribing to greenhouse topics and storing sensor data.

## API Endpoints

- `GET /api/sensors/realtime`
- `GET /api/sensors/history?start=&end=`
- `POST /api/crop/recommend`
- `POST /api/fertigation`
- `GET /api/fertigation/analytics`
- `GET /api/ai/predict`
- `GET /api/ai/anomaly`
- `GET /api/ai/clustering`
- `GET /api/raas/datasets`

## Database Schemas

### SensorReading
- `temperature`
- `humidity`
- `soil_moisture`
- `ph`
- `ec`
- `timestamp`

### FertigationSetting
- `fertilizerType`
- `dosage`
- `schedule`
- `targetPH`
- `targetEC`
- `timestamp`

## Sample API Responses

`GET /api/sensors/realtime`
```json
{
  "data": {
    "temperature": 27.1,
    "humidity": 63.2,
    "soil_moisture": 49.7,
    "ph": 6.4,
    "ec": 1.7,
    "timestamp": "2026-04-02T11:00:00.000Z"
  },
  "alerts": [],
  "lastUpdated": "2026-04-02T11:00:00.000Z"
}
```

`POST /api/crop/recommend`
```json
{
  "recommendations": [
    { "crop": "Tomato", "match": 100 },
    { "crop": "Maize", "match": 90 },
    { "crop": "Chili", "match": 90 },
    { "crop": "Rice", "match": 70 },
    { "crop": "Wheat", "match": 60 }
  ]
}
```

## Local Run Instructions

## 1) Start infra
From repo root:
```bash
docker compose up -d
```

## 2) Backend
```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

## 3) Frontend
```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

## 4) MQTT simulator service
```bash
cd mqtt-service
npm install
npm start
```

## 5) AI service (Python)
```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Note: if Python is not installed, install Python 3.11+ first and re-run AI service steps.

## Production-oriented Notes

- Backend MQTT ingestion supports real Mosquitto broker and topic subscriptions.
- If broker is unavailable, backend starts simulator fallback to keep data flow active.
- AI routes are API-driven proxy calls from backend to Flask service.
- UI has loading and error states and no `generateData()` fake frontend generator.
