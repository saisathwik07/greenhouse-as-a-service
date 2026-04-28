const SensorReading = require("../models/SensorReading");

function movingAverage(values, windowSize = 5) {
  if (!values.length) return [];
  return values.map((_, idx) => {
    const start = Math.max(0, idx - windowSize + 1);
    const chunk = values.slice(start, idx + 1);
    const avg = chunk.reduce((sum, v) => sum + v, 0) / chunk.length;
    return Number(avg.toFixed(2));
  });
}

async function localPredict() {
  const rows = await SensorReading.find().sort({ timestamp: 1 }).limit(200).lean();
  const labels = rows.map((r) => new Date(r.timestamp).toISOString());
  const values = rows.map((r) => Number(r.temperature || 0));
  return { model: "Local Moving Average", labels, values: movingAverage(values, 6) };
}

async function localAnomaly() {
  const rows = await SensorReading.find().sort({ timestamp: -1 }).limit(300).lean();
  if (!rows.length) return { model: "Local Z-Score", rows: [] };

  const temperatures = rows.map((r) => Number(r.temperature || 0));
  const mean = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
  const variance = temperatures.reduce((s, t) => s + (t - mean) ** 2, 0) / temperatures.length;
  const std = Math.sqrt(variance || 1);

  const anomalies = rows
    .map((r) => {
      const z = Math.abs((Number(r.temperature || 0) - mean) / std);
      return {
        timestamp: new Date(r.timestamp).toISOString(),
        sensor: "temperature",
        value: Number(r.temperature || 0),
        expectedRange: `${(mean - std).toFixed(1)}-${(mean + std).toFixed(1)}`,
        severity: z > 2 ? "high" : z > 1.5 ? "medium" : "low",
        score: z
      };
    })
    .filter((r) => r.score > 1.5)
    .slice(0, 50)
    .map(({ score, ...rest }) => rest);

  return { model: "Local Z-Score", rows: anomalies };
}

async function localClustering() {
  const rows = await SensorReading.find().sort({ timestamp: -1 }).limit(1000).lean();
  const buckets = {
    "Low Temp": { name: "Low Temp", count: 0, avgTemp: 0, avgHumidity: 0 },
    Optimal: { name: "Optimal", count: 0, avgTemp: 0, avgHumidity: 0 },
    "High Temp": { name: "High Temp", count: 0, avgTemp: 0, avgHumidity: 0 }
  };

  rows.forEach((r) => {
    const t = Number(r.temperature || 0);
    const h = Number(r.humidity || 0);
    const key = t < 22 ? "Low Temp" : t > 30 ? "High Temp" : "Optimal";
    const b = buckets[key];
    b.count += 1;
    b.avgTemp += t;
    b.avgHumidity += h;
  });

  const clusters = Object.values(buckets)
    .filter((b) => b.count > 0)
    .map((b) => ({
      name: b.name,
      count: b.count,
      avgTemp: Number((b.avgTemp / b.count).toFixed(2)),
      avgHumidity: Number((b.avgHumidity / b.count).toFixed(2))
    }));

  return { model: "Local Threshold Clustering", clusters };
}

module.exports = { localPredict, localAnomaly, localClustering };
