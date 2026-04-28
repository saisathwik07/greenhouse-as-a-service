const mongoose = require("mongoose");

const researchDatasetSchema = new mongoose.Schema(
  {
    cropType: String,
    location: String,
    treatments: [String],
    date: Date,
    metrics: {
      yield: Number,
      avgTemperature: Number,
      avgHumidity: Number,
      avgPH: Number
    }
  },
  { versionKey: false }
);

module.exports = mongoose.model("ResearchDataset", researchDatasetSchema);
