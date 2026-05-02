require("dotenv").config();

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

if (process.env.MONGO_URI) {
  const m = String(process.env.MONGO_URI).match(/@([^/?]+)/);
  console.log("[env] MONGO_URI loaded; cluster host:", m ? m[1] : "(could not parse)");
} else {
  console.warn("[env] MONGO_URI not set — using db.js fallback (localhost)");
}

const axios = require("axios");
const express = require("express");
const cors = require("cors");
const XLSX = require("xlsx");
const { connectDB } = require("./config/db");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const subscriptionRoutes = require("./routes/subscription");
const paymentRoutes = require("./routes/payment");
const planRoutes = require("./routes/plans");
const chatRoutes = require("./routes/chat");
const ticketRoutes = require("./routes/tickets");
const notificationRoutes = require("./routes/notifications");
const { UPLOAD_ROOT } = require("./middleware/uploads");
const { requireEntitlement } = require("./middleware/entitlement");
const { startExpirySweeper } = require("./services/planExpiryService");
const billingRoutes = require("./routes/billing");
const userRoutes = require("./routes/user");
const adminIntelligenceRoutes = require("./routes/adminIntelligence");
const { trackEvent } = require("./services/eventTracker");
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("./config/authConfig");

/**
 * Optional auth: decode JWT if present so we can attribute events. Never
 * blocks the request — the dashboard download endpoints stay public.
 */
function softAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = {
        id: decoded.id || decoded.sub,
        email: String(decoded.email || "").toLowerCase(),
        role: String(decoded.role || "user").toLowerCase(),
      };
    } catch {
      /* ignore */
    }
  }
  next();
}

const app = express();
const PORT = process.env.PORT || 5100;

app.use(cors());
app.use(express.json());

/** Auth: Google login + JWT; Admin: user list (MongoDB) */
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminIntelligenceRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/user", userRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/notifications", notificationRoutes);

/** Serve uploaded screenshots (ticket attachments). */
app.use(
  "/uploads",
  express.static(UPLOAD_ROOT, {
    maxAge: "1d",
    fallthrough: false,
  })
);

// ========================
// IN-MEMORY SENSOR DATA
// ========================
const ROWS = ["row1", "row2", "row3"];
const BAGS = ["bag1", "bag2", "bag3", "bag4"];
let sensorStore = []; // historical readings
let latestReadings = {}; // key: "row1-bag1" => latest reading

function generateReading(row, bag) {
  return {
    temperature: +(22 + Math.random() * 8).toFixed(1),
    humidity: +(55 + Math.random() * 30).toFixed(1),
    soil_moisture: +(35 + Math.random() * 40).toFixed(1),
    ph: +(5.8 + Math.random() * 1.5).toFixed(2),
    ec: +(1.0 + Math.random() * 1.6).toFixed(2),
    row,
    bag,
    timestamp: new Date().toISOString()
  };
}

function calcHealth(r) {
  let s = 0;
  if (r.temperature >= 20 && r.temperature <= 30) s += 10;
  if (r.humidity >= 55 && r.humidity <= 80) s += 10;
  if (r.soil_moisture >= 40 && r.soil_moisture <= 70) s += 10;
  if (r.ph >= 5.5 && r.ph <= 7.0) s += 10;
  if (r.ec >= 1.0 && r.ec <= 2.2) s += 10;
  return s;
}

// Seed initial history (past 72h, one reading per hour per unit)
function seedHistory() {
  const now = Date.now();
  for (let h = 72; h > 0; h--) {
    for (const row of ROWS) {
      for (const bag of BAGS) {
        const r = generateReading(row, bag);
        r.timestamp = new Date(now - h * 3600000).toISOString();
        r.healthScore = calcHealth(r);
        sensorStore.push(r);
      }
    }
  }
  console.log(`Seeded ${sensorStore.length} historical readings`);
}

// Generate fresh readings every 10 seconds
function startSimulator() {
  setInterval(() => {
    for (const row of ROWS) {
      for (const bag of BAGS) {
        const r = generateReading(row, bag);
        r.healthScore = calcHealth(r);
        latestReadings[`${row}-${bag}`] = r;
        sensorStore.push(r);
      }
    }
    // Keep last 10000 readings max
    if (sensorStore.length > 10000) {
      sensorStore = sensorStore.slice(-10000);
    }
  }, 10000);
}

// ========================
// HEALTH CHECK
// ========================
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "gaas-backend", readings: sensorStore.length });
});

// ========================
// SENSORS API
// ========================

// GET /api/sensors/realtime?row=&bag=
app.get("/api/sensors/realtime", (req, res) => {
  const { row, bag } = req.query;
  let reading;
  if (row && bag) {
    reading = latestReadings[`${row}-${bag}`];
  } else if (row) {
    reading = latestReadings[`${row}-bag1`];
  } else {
    // aggregate latest across all
    const all = Object.values(latestReadings);
    if (all.length === 0) {
      reading = generateReading("row1", "bag1");
      reading.healthScore = calcHealth(reading);
    } else {
      reading = {
        temperature: +(all.reduce((s, r) => s + r.temperature, 0) / all.length).toFixed(1),
        humidity: +(all.reduce((s, r) => s + r.humidity, 0) / all.length).toFixed(1),
        soil_moisture: +(all.reduce((s, r) => s + r.soil_moisture, 0) / all.length).toFixed(1),
        ph: +(all.reduce((s, r) => s + r.ph, 0) / all.length).toFixed(2),
        ec: +(all.reduce((s, r) => s + r.ec, 0) / all.length).toFixed(2),
        row: "all",
        bag: "all",
        timestamp: all[0]?.timestamp
      };
      reading.healthScore = calcHealth(reading);
    }
  }

  const alerts = [];
  if (reading) {
    if (reading.temperature > 32) alerts.push({ type: "HIGH_TEMPERATURE", message: "High temperature detected" });
    if (reading.temperature < 18) alerts.push({ type: "LOW_TEMPERATURE", message: "Low temperature detected" });
    if (reading.soil_moisture < 35) alerts.push({ type: "LOW_MOISTURE", message: "Low soil moisture detected" });
    if (reading.humidity > 85) alerts.push({ type: "HIGH_HUMIDITY", message: "High humidity detected" });
  }

  res.json({ data: reading || null, alerts, lastUpdated: reading?.timestamp || null });
});

// GET /api/sensors/history?start=&end=&row=&bag=
app.get("/api/sensors/history", (req, res) => {
  const start = req.query.start ? new Date(req.query.start).getTime() : Date.now() - 24 * 3600000;
  const end = req.query.end ? new Date(req.query.end).getTime() : Date.now();
  let filtered = sensorStore.filter(r => {
    const t = new Date(r.timestamp).getTime();
    return t >= start && t <= end;
  });
  if (req.query.row) filtered = filtered.filter(r => r.row === req.query.row);
  if (req.query.bag) filtered = filtered.filter(r => r.bag === req.query.bag);
  // Aggregate by hour (one reading per hour)
  const hourly = {};
  for (const r of filtered) {
    const key = new Date(r.timestamp).toISOString().slice(0, 13);
    if (!hourly[key]) hourly[key] = r;
  }
  res.json({ data: Object.values(hourly) });
});

// GET /api/sensors/rows
app.get("/api/sensors/rows", (_req, res) => {
  const rows = ROWS.map(row => {
    const reading = latestReadings[`${row}-bag1`] || generateReading(row, "bag1");
    reading.healthScore = reading.healthScore ?? calcHealth(reading);
    return {
      row,
      bagCount: BAGS.length,
      latestReading: reading,
      healthScore: reading.healthScore
    };
  });
  res.json({ data: rows });
});

// GET /api/sensors/rows/:row/bags
app.get("/api/sensors/rows/:row/bags", (req, res) => {
  const { row } = req.params;
  const bags = BAGS.map(bag => {
    const reading = latestReadings[`${row}-${bag}`] || generateReading(row, bag);
    reading.healthScore = reading.healthScore ?? calcHealth(reading);
    return { bag, row, latestReading: reading, healthScore: reading.healthScore };
  });
  res.json({ data: bags });
});

// GET /api/sensors/rows/:row/bags/:bag
app.get("/api/sensors/rows/:row/bags/:bag", (req, res) => {
  const { row, bag } = req.params;
  const latest = latestReadings[`${row}-${bag}`] || generateReading(row, bag);
  latest.healthScore = latest.healthScore ?? calcHealth(latest);
  // Recent history for this unit
  const history = sensorStore
    .filter(r => r.row === row && r.bag === bag)
    .slice(-50);
  res.json({ data: latest, history });
});

// GET /api/sensors/export?range=24h|48h|72h
app.get("/api/sensors/export", softAuth, (req, res) => {
  const rangeStr = req.query.range || "24h";
  const hours = parseInt(rangeStr) || 24;
  const cutoff = Date.now() - hours * 3600000;

  const filtered = sensorStore.filter(r => new Date(r.timestamp).getTime() >= cutoff);
  const sensorKeys = ["temperature", "humidity", "soil_moisture", "ph", "ec"];
  const header = ["timestamp", "row", "bag", ...sensorKeys, "healthScore"].join(",");
  const csvRows = filtered.map(r =>
    [r.timestamp, r.row, r.bag, ...sensorKeys.map(k => r[k] ?? ""), r.healthScore ?? ""].join(",")
  );
  const csv = [header, ...csvRows].join("\n");

  trackEvent({
    userId: req.user?.id,
    type: "download",
    featureKey: "sensor_export",
    metadata: { rangeHours: hours, rows: filtered.length, format: "csv" },
    req,
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=sensor_data_${hours}h.csv`);
  res.send(csv);
});

// Also keep old /download route for backwards compat
app.get("/api/sensors/download", softAuth, (req, res) => {
  req.query.range = req.query.range || "24h";
  // forward to export handler
  const rangeStr = req.query.range;
  const hours = parseInt(rangeStr) || 24;
  const cutoff = Date.now() - hours * 3600000;
  const filtered = sensorStore.filter(r => new Date(r.timestamp).getTime() >= cutoff);
  const sensorKeys = (req.query.sensors || "temperature,humidity,soil_moisture,ph,ec").split(",");
  const header = ["timestamp", "row", "bag", ...sensorKeys].join(",");
  const csvRows = filtered.map(r =>
    [r.timestamp, r.row, r.bag, ...sensorKeys.map(k => r[k] ?? "")].join(",")
  );
  const csv = [header, ...csvRows].join("\n");

  trackEvent({
    userId: req.user?.id,
    type: "download",
    featureKey: "sensor_download",
    metadata: { rangeHours: hours, rows: filtered.length, sensors: sensorKeys, format: "csv" },
    req,
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=sensor_data.csv");
  res.send(csv);
});

// ========================
// CROP RECOMMENDATION
// ========================
const CROPS = [
  { name: "Rice", soilTypes: ["Alluvial", "Clay"], temp: [22, 32], humidity: [70, 100], ph: [5.5, 6.5], moisture: [60, 80], ec: [1, 2] },
  { name: "Wheat", soilTypes: ["Loamy", "Clay"], temp: [15, 25], humidity: [50, 70], ph: [6.0, 7.5], moisture: [40, 60], ec: [1, 1.5] },
  { name: "Maize", soilTypes: ["Loamy", "Sandy"], temp: [18, 30], humidity: [50, 80], ph: [5.5, 7.5], moisture: [50, 70], ec: [1, 2] },
  { name: "Cotton", soilTypes: ["Black", "Alluvial"], temp: [20, 35], humidity: [60, 80], ph: [5.5, 8.0], moisture: [40, 60], ec: [1, 2] },
  { name: "Tomato", soilTypes: ["Loamy", "Sandy"], temp: [20, 30], humidity: [60, 80], ph: [5.5, 7.0], moisture: [50, 70], ec: [1, 2] },
  { name: "Chili", soilTypes: ["Sandy", "Red"], temp: [20, 32], humidity: [55, 80], ph: [6.0, 7.0], moisture: [45, 65], ec: [1.1, 2.1] },
  { name: "Lettuce", soilTypes: ["Loamy", "Black"], temp: [12, 24], humidity: [60, 85], ph: [6.0, 7.0], moisture: [55, 75], ec: [0.8, 1.6] }
];

function inRange(v, [min, max]) { return v >= min && v <= max; }

app.post("/api/crop/recommend", requireEntitlement("cropRecommendation"), (req, res) => {
  const { soilType, soilMoisture, ec, ph, temperature, humidity } = req.body;
  const t = Number(temperature), h = Number(humidity), sm = Number(soilMoisture);
  const phVal = Number(ph), ecVal = Number(ec);

  const recommendations = CROPS.map(crop => {
    let score = 0;
    if (crop.soilTypes.includes(soilType)) score += 20;
    if (inRange(t, crop.temp)) score += 20;
    if (inRange(h, crop.humidity)) score += 20;
    if (inRange(phVal, crop.ph)) score += 20;
    if (inRange(sm, crop.moisture)) score += 10;
    if (inRange(ecVal, crop.ec)) score += 10;
    return { crop: crop.name, match: score };
  }).sort((a, b) => b.match - a.match).slice(0, 5);

  res.json({ recommendations });
});

// ========================
// FERTILIZER RECOMMENDATION
// ========================
const FERTILIZERS = [
  { fertilizer: "NPK 19-19-19", description: "Balanced growth formula", baseDosage: 5, phRange: [5.5, 7.5], ecRange: [0.5, 2.5] },
  { fertilizer: "Urea (46-0-0)", description: "High nitrogen for leafy growth", baseDosage: 3, phRange: [5.0, 7.0], ecRange: [0.5, 2.0] },
  { fertilizer: "DAP (18-46-0)", description: "Phosphorus-rich for root development", baseDosage: 4, phRange: [6.0, 7.5], ecRange: [1.0, 2.5] },
  { fertilizer: "MOP (0-0-60)", description: "Potassium for fruit quality", baseDosage: 3, phRange: [5.5, 7.0], ecRange: [0.8, 2.0] },
  { fertilizer: "Calcium Nitrate", description: "Prevents blossom end rot", baseDosage: 4, phRange: [5.5, 7.0], ecRange: [0.5, 2.0] }
];

app.post("/api/fertilizer/recommend", requireEntitlement("fertigation"), (req, res) => {
  const phVal = Number(req.body.ph) || 6.5;
  const ecVal = Number(req.body.ec) || 1.5;

  const recommendations = FERTILIZERS.map(f => {
    let match = 50;
    if (inRange(phVal, f.phRange)) match += 25;
    if (inRange(ecVal, f.ecRange)) match += 25;
    return { fertilizer: f.fertilizer, description: f.description, match, dosageMlPerL: f.baseDosage };
  }).sort((a, b) => b.match - a.match);

  res.json({ recommendations });
});

// ========================
// YIELD ML (proxy to Flask on :5000 — fixes 404 if /api was sent here by mistake)
// ========================
const FLASK_ML_URL = process.env.FLASK_ML_URL || "http://127.0.0.1:5000";

app.get("/api/yield/crops", async (req, res) => {
  try {
    const r = await axios.get(`${FLASK_ML_URL}/api/yield/crops`, {
      validateStatus: () => true,
      timeout: 30000
    });
    res.status(r.status).json(r.data);
  } catch (e) {
    res.status(502).json({ error: "Flask ML unavailable", detail: e.message });
  }
});

app.post("/api/yield/predict", requireEntitlement("yieldPrediction"), async (req, res) => {
  try {
    const r = await axios.post(`${FLASK_ML_URL}/api/yield/predict`, req.body, {
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
      timeout: 60000
    });
    res.status(r.status).json(r.data);
  } catch (e) {
    res.status(502).json({ error: "Flask ML unavailable", detail: e.message });
  }
});

// ========================
// AI ANALYTICS (local)
// ========================
app.get("/api/ai/predict", (_req, res) => {
  const labels = [];
  const values = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const t = new Date(now.getTime() + i * 3600000);
    labels.push(t.toISOString().slice(0, 16).replace("T", " "));
    values.push(+(22 + Math.sin(i / 4) * 4 + Math.random() * 2).toFixed(1));
  }
  res.json({ model: "LSTM Neural Network", labels, values });
});

app.get("/api/ai/anomaly", (_req, res) => {
  res.json({
    model: "Isolation Forest",
    rows: [
      { timestamp: new Date(Date.now() - 3600000).toISOString(), sensor: "temperature", value: 35.2, expectedRange: "22-28", severity: "high" },
      { timestamp: new Date(Date.now() - 7200000).toISOString(), sensor: "humidity", value: 95, expectedRange: "60-80", severity: "medium" },
      { timestamp: new Date(Date.now() - 10800000).toISOString(), sensor: "soil_moisture", value: 18, expectedRange: "40-70", severity: "high" }
    ]
  });
});

app.get("/api/ai/clustering", (_req, res) => {
  res.json({
    model: "K-Means Clustering",
    clusters: [
      { name: "Optimal Zone", count: 3200, avgTemp: 24.5, avgHumidity: 68 },
      { name: "Stress Zone", count: 1250, avgTemp: 32.1, avgHumidity: 45 },
      { name: "Recovery Zone", count: 800, avgTemp: 19.8, avgHumidity: 78 }
    ]
  });
});

// ========================
// IMAGE-BASED DISEASE DETECTION
// ========================
app.post("/api/detect-disease", requireEntitlement("pestDisease"), (req, res) => {
  try {
    const imageBase64 = String(req.body?.imageBase64 || "");
    if (!imageBase64) return res.status(400).json({ error: "imageBase64 is required" });

    // Deterministic mock inspired by ZIP leaf inference output format.
    const labels = [
      "Powdery Mildew",
      "Leaf Spot",
      "Downy Mildew",
      "Early Blight",
      "Bacterial Leaf Blight"
    ];
    const seed = imageBase64.length % labels.length;
    const primary = labels[seed];
    const confidence = 70 + (imageBase64.length % 16); // 70-85
    const predictions = [
      { label: primary, confidence },
      { label: labels[(seed + 1) % labels.length], confidence: Math.max(5, 92 - confidence) },
      { label: labels[(seed + 2) % labels.length], confidence: Math.max(3, 100 - confidence - 8) }
    ];

    res.json({
      disease: primary,
      confidence,
      predictions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Detection failed", detail: err.message });
  }
});

// ========================
// RESEARCH DATASETS
// ========================
const RESEARCH_DATA = [
  { cropType: "Tomato", location: "Greenhouse A", treatments: ["NPK", "Drip"], date: "2026-03-01", metrics: { yield: 4.2 } },
  { cropType: "Wheat", location: "Field B", treatments: ["Urea"], date: "2026-02-15", metrics: { yield: 3.8 } },
  { cropType: "Rice", location: "Paddy C", treatments: ["DAP", "Flood"], date: "2026-01-20", metrics: { yield: 5.1 } },
  { cropType: "Maize", location: "Plot D", treatments: ["NPK"], date: "2026-03-10", metrics: { yield: 3.5 } },
  { cropType: "Chili", location: "Greenhouse A", treatments: ["MOP", "Drip"], date: "2026-02-28", metrics: { yield: 2.9 } }
];

function filterResearchData(query) {
  let data = [...RESEARCH_DATA];
  const crop = query.crop || query.cropType;
  if (crop) {
    const c = String(crop).toLowerCase();
    data = data.filter((d) => d.cropType.toLowerCase().includes(c));
  }
  if (query.location) {
    const loc = String(query.location).toLowerCase();
    data = data.filter((d) => d.location.toLowerCase().includes(loc));
  }
  if (query.treatments) {
    const t = String(query.treatments).toLowerCase();
    data = data.filter((d) => (d.treatments || []).some((x) => String(x).toLowerCase().includes(t)));
  }
  if (query.conditions) {
    const c = String(query.conditions).toLowerCase();
    data = data.filter((d) => (d.treatments || []).some((x) => String(x).toLowerCase().includes(c)));
  }
  if (query.date) {
    const target = String(query.date).slice(0, 10);
    data = data.filter((d) => String(d.date).slice(0, 10) === target);
  }
  const start = query.startDate || query.start;
  const end = query.endDate || query.end;
  if (start) data = data.filter((d) => String(d.date) >= String(start).slice(0, 10));
  if (end) data = data.filter((d) => String(d.date) <= String(end).slice(0, 10));
  return data;
}

app.get("/api/raas/datasets", (req, res) => {
  res.json({ data: filterResearchData(req.query) });
});

app.get("/api/research/search", (req, res) => {
  try {
    res.json({ data: filterResearchData(req.query) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed", detail: err.message });
  }
});

app.get("/api/research/summary", (req, res) => {
  try {
    const data = filterResearchData(req.query);
    res.json({
      labels: data.map((d) => d.cropType),
      yields: data.map((d) => d.metrics?.yield ?? 0)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Summary failed", detail: err.message });
  }
});

app.get("/api/research/export", softAuth, (req, res) => {
  trackEvent({
    userId: req.user?.id,
    type: "download",
    featureKey: "research_export",
    metadata: { format: req.query.format || "csv", filters: req.query },
    req,
  });
  try {
    const format = String(req.query.format || "csv").toLowerCase();
    const filter = { ...req.query };
    delete filter.format;
    const data = filterResearchData(filter);

    if (format === "csv") {
      const header = ["cropType", "location", "treatments", "date", "yield"];
      const lines = data.map((r) =>
        [r.cropType, r.location, (r.treatments || []).join("|"), r.date, r.metrics?.yield ?? ""].join(",")
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=data.csv");
      res.send(`${header.join(",")}\n${lines.join("\n")}`);
      return;
    }

    if (format === "json") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=data.json");
      res.send(JSON.stringify({ data }));
      return;
    }

    if (format === "excel" || format === "xlsx") {
      const rows = data.map((r) => ({
        cropType: r.cropType,
        location: r.location,
        treatments: (r.treatments || []).join("|"),
        date: r.date,
        yield: r.metrics?.yield ?? ""
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(
        rows.length ? rows : [{ cropType: "", location: "", treatments: "", date: "", yield: "" }]
      );
      XLSX.utils.book_append_sheet(wb, ws, "Research");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=data.xlsx");
      res.send(buf);
      return;
    }

    res.status(400).json({ error: "Invalid format" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Export failed", detail: err.message });
  }
});

app.get("/api/research/comparison", (_req, res) => {
  try {
    res.json({
      labels: ["Day 1", "Day 2", "Day 3", "Day 4"],
      expA: [6.2, 6.4, 6.5, 6.7],
      expB: [5.8, 6.1, 6.3, 6.2]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Comparison failed", detail: err.message });
  }
});

app.post("/api/research/run-query", (req, res) => {
  try {
    console.log("[research/run-query]", req.body);
    res.json({ ok: true, received: req.body || {} });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Query failed", detail: err.message });
  }
});

// ========================
// ERROR HANDLER
// ========================
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error", detail: err.message });
});

// ========================
// BOOTSTRAP
// ========================
seedHistory();
startSimulator();

// Generate initial latest readings
for (const row of ROWS) {
  for (const bag of BAGS) {
    const r = generateReading(row, bag);
    r.healthScore = calcHealth(r);
    latestReadings[`${row}-${bag}`] = r;
  }
}

connectDB()
  .then(() => {
    startExpirySweeper();
    app.listen(PORT, () => {
      console.log(`✅ HTTP server listening (MongoDB ready) — http://localhost:${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/api/health`);
      console.log(`   Auth: POST http://localhost:${PORT}/api/auth/google-login`);
      console.log(`   Admin: GET http://localhost:${PORT}/api/admin/users`);
      console.log(`   Realtime: http://localhost:${PORT}/api/sensors/realtime`);
      console.log(`   CSV Export: http://localhost:${PORT}/api/sensors/export?range=24h`);
      console.log(`   Crop: POST http://localhost:${PORT}/api/crop/recommend`);
    });
  })
  .catch((err) => {
    console.error("[bootstrap] Unexpected error before listen:", err);
    process.exit(1);
  });
