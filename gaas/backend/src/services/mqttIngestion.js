const mqtt = require("mqtt");
const SensorReading = require("../models/SensorReading");
const { calculateHealthScore } = require("./healthCalculator");

const FLAT_TOPICS = ["greenhouse/temperature", "greenhouse/humidity", "greenhouse/soil"];
const WILDCARD_TOPICS = ["greenhouse/+/+/temperature", "greenhouse/+/+/humidity", "greenhouse/+/+/soil"];

function parsePayload(payload) {
  try {
    return JSON.parse(payload.toString());
  } catch (_error) {
    return null;
  }
}

function parseRowBagFromTopic(topic) {
  // greenhouse/row1/bag1/temperature → { row: "row1", bag: "bag1" }
  const parts = topic.split("/");
  if (parts.length === 4) {
    return { row: parts[1], bag: parts[2] };
  }
  return { row: "row1", bag: "bag1" };
}

function fallbackSensorValues() {
  return {
    temperature: 22 + Math.random() * 8,
    humidity: 55 + Math.random() * 30,
    soil_moisture: 40 + Math.random() * 40,
    ph: 5.8 + Math.random() * 1.2,
    ec: 1.0 + Math.random() * 1.2
  };
}

const ROWS = ["row1", "row2", "row3"];
const BAGS_PER_ROW = ["bag1", "bag2", "bag3", "bag4"];

function startSimulatorIfBrokerMissing() {
  setInterval(async () => {
    for (const row of ROWS) {
      for (const bag of BAGS_PER_ROW) {
        const values = fallbackSensorValues();
        const healthScore = calculateHealthScore(values);
        await SensorReading.create({
          ...values,
          row,
          bag,
          healthScore,
          sourceTopic: "simulator",
          timestamp: new Date()
        });
      }
    }
  }, 10000);
  console.warn("MQTT unavailable, local simulator started (3 rows × 4 bags)");
}

function startMqttIngestion() {
  const url = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
  const client = mqtt.connect(url);

  client.on("connect", () => {
    client.subscribe([...FLAT_TOPICS, ...WILDCARD_TOPICS]);
    console.log("Connected to MQTT broker");
  });

  client.on("message", async (topic, payload) => {
    const parsed = parsePayload(payload);
    if (!parsed) return;

    const { row, bag } = parseRowBagFromTopic(topic);

    const entry = {
      temperature: Number(parsed.temperature ?? parsed.temp ?? parsed.t),
      humidity: Number(parsed.humidity ?? parsed.h),
      soil_moisture: Number(parsed.soil_moisture ?? parsed.soil ?? parsed.sm),
      ph: Number(parsed.ph),
      ec: Number(parsed.ec),
      row,
      bag,
      sourceTopic: topic,
      timestamp: parsed.timestamp ? new Date(parsed.timestamp) : new Date()
    };

    const safeEntry = Object.fromEntries(Object.entries(entry).filter(([, value]) => !Number.isNaN(value)));
    safeEntry.healthScore = calculateHealthScore(safeEntry);
    await SensorReading.create(safeEntry);
  });

  client.on("error", (error) => {
    console.error("MQTT error:", error.message);
    startSimulatorIfBrokerMissing();
    client.end(true);
  });
}

module.exports = { startMqttIngestion };
