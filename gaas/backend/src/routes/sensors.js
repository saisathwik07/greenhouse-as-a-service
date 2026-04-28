const express = require("express");
const SensorReading = require("../models/SensorReading");

const router = express.Router();

/* GET /api/sensors/realtime?row=&bag= */
router.get("/realtime", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.row) filter.row = req.query.row;
    if (req.query.bag) filter.bag = req.query.bag;

    const latest = await SensorReading.findOne(filter).sort({ timestamp: -1 }).lean();
    const alerts = [];
    if (latest?.temperature > 32) alerts.push({ type: "HIGH_TEMPERATURE", message: "High temperature detected" });
    if (latest?.temperature < 18) alerts.push({ type: "LOW_TEMPERATURE", message: "Low temperature detected" });
    if (latest?.soil_moisture < 35) alerts.push({ type: "LOW_MOISTURE", message: "Low soil moisture detected" });
    if (latest?.humidity > 85) alerts.push({ type: "HIGH_HUMIDITY", message: "High humidity detected" });
    if (latest?.ph && (latest.ph < 5.5 || latest.ph > 7.5)) alerts.push({ type: "PH_OUT_OF_RANGE", message: "pH level out of optimal range" });
    res.json({ data: latest, alerts, lastUpdated: latest?.timestamp || null });
  } catch (error) {
    next(error);
  }
});

/* GET /api/sensors/history?row=&bag=&start=&end= */
router.get("/history", async (req, res, next) => {
  try {
    const start = req.query.start ? new Date(req.query.start) : new Date(Date.now() - 72 * 60 * 60 * 1000);
    const end = req.query.end ? new Date(req.query.end) : new Date();
    const filter = { timestamp: { $gte: start, $lte: end } };
    if (req.query.row) filter.row = req.query.row;
    if (req.query.bag) filter.bag = req.query.bag;

    const rows = await SensorReading.find(filter).sort({ timestamp: 1 }).lean();
    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

/* GET /api/sensors/rows — distinct rows with latest reading summary */
router.get("/rows", async (_req, res, next) => {
  try {
    const distinctRows = await SensorReading.distinct("row");
    const rows = await Promise.all(
      distinctRows.map(async (row) => {
        const latest = await SensorReading.findOne({ row }).sort({ timestamp: -1 }).lean();
        const bagCount = (await SensorReading.distinct("bag", { row })).length;
        return {
          row,
          bagCount,
          latestReading: latest,
          healthScore: latest?.healthScore ?? null
        };
      })
    );
    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

/* GET /api/sensors/rows/:row/bags — bags in a row with latest reading */
router.get("/rows/:row/bags", async (req, res, next) => {
  try {
    const { row } = req.params;
    const distinctBags = await SensorReading.distinct("bag", { row });
    const bags = await Promise.all(
      distinctBags.map(async (bag) => {
        const latest = await SensorReading.findOne({ row, bag }).sort({ timestamp: -1 }).lean();
        return {
          bag,
          row,
          latestReading: latest,
          healthScore: latest?.healthScore ?? null
        };
      })
    );
    res.json({ data: bags });
  } catch (error) {
    next(error);
  }
});

/* GET /api/sensors/rows/:row/bags/:bag — detailed bag view */
router.get("/rows/:row/bags/:bag", async (req, res, next) => {
  try {
    const { row, bag } = req.params;
    const latest = await SensorReading.findOne({ row, bag }).sort({ timestamp: -1 }).lean();
    const recentHistory = await SensorReading.find({ row, bag })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    res.json({ data: latest, history: recentHistory.reverse() });
  } catch (error) {
    next(error);
  }
});

/* GET /api/sensors/download?start=&end=&sensors=temperature,humidity */
router.get("/download", async (req, res, next) => {
  try {
    const start = req.query.start ? new Date(req.query.start) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = req.query.end ? new Date(req.query.end) : new Date();
    const filter = { timestamp: { $gte: start, $lte: end } };
    if (req.query.row) filter.row = req.query.row;
    if (req.query.bag) filter.bag = req.query.bag;

    const sensorKeys = req.query.sensors ? req.query.sensors.split(",") : ["temperature", "humidity", "soil_moisture", "ph", "ec"];
    const rows = await SensorReading.find(filter).sort({ timestamp: 1 }).lean();

    const header = ["timestamp", "row", "bag", ...sensorKeys].join(",");
    const csvRows = rows.map((r) =>
      ["timestamp", "row", "bag", ...sensorKeys].map((k) => (k === "timestamp" ? new Date(r[k]).toISOString() : r[k] ?? "")).join(",")
    );
    const csv = [header, ...csvRows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=sensor_data.csv");
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
