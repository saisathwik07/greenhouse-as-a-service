const mongoose = require("mongoose");

const fertigationSettingSchema = new mongoose.Schema(
  {
    fertilizerType: { type: String, required: true },
    dosage: { type: Number, required: true },
    schedule: { type: String, required: true },
    targetPH: { type: Number, required: true },
    targetEC: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { versionKey: false }
);

module.exports = mongoose.model("FertigationSetting", fertigationSettingSchema);
