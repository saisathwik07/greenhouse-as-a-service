const mqtt = require("mqtt");

const client = mqtt.connect(process.env.MQTT_BROKER_URL || "mqtt://localhost:1883");

const ROWS = ["row1", "row2", "row3"];
const BAGS_PER_ROW = ["bag1", "bag2", "bag3", "bag4"];

function generatePayload() {
  return {
    temperature: +(22 + Math.random() * 10).toFixed(2),
    humidity: +(55 + Math.random() * 30).toFixed(2),
    soil_moisture: +(35 + Math.random() * 40).toFixed(2),
    ph: +(5.8 + Math.random() * 1.5).toFixed(2),
    ec: +(1.0 + Math.random() * 1.6).toFixed(2),
    timestamp: new Date().toISOString()
  };
}

client.on("connect", () => {
  console.log("MQTT publisher connected — publishing for 3 rows × 4 bags");
  setInterval(() => {
    for (const row of ROWS) {
      for (const bag of BAGS_PER_ROW) {
        const payload = JSON.stringify(generatePayload());
        const sensors = ["temperature", "humidity", "soil"];
        sensors.forEach((sensor) => {
          client.publish(`greenhouse/${row}/${bag}/${sensor}`, payload);
        });
      }
    }
  }, 5000);
});

client.on("error", (error) => console.error("MQTT publisher error:", error.message));
