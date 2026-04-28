const mongoose = require("mongoose");

const sensorReadingSchema = new mongoose.Schema(
  {
    temperature: Number,
    humidity: Number,
    soil_moisture: Number,
    ph: Number,
    ec: Number,
    row: { type: String, default: "row1" },
    bag: { type: String, default: "bag1" },
    healthScore: { type: Number, min: 0, max: 50 },
    sourceTopic: String,
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { versionKey: false }
);

sensorReadingSchema.index({ row: 1, bag: 1, timestamp: -1 });

module.exports = mongoose.model("SensorReading", sensorReadingSchema);
