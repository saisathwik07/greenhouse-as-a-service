const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ["Basic", "Pro", "Premium"],
      trim: true,
    },
    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 1 }, // days
    features: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

module.exports = mongoose.models.Plan || mongoose.model("Plan", planSchema);
