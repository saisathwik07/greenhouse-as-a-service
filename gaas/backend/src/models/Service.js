const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    pricing: { type: String, default: "", trim: true, maxlength: 100 },
    features: { type: [String], default: [] },
    image: { type: String, default: "" },
    category: {
      type: String,
      default: "general",
      trim: true,
      lowercase: true,
    },
    activeStatus: { type: Boolean, default: true, index: true },
    /** Display order — lower numbers appear first. */
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

serviceSchema.index({ activeStatus: 1, sortOrder: 1 });

module.exports =
  mongoose.models.Service || mongoose.model("Service", serviceSchema);
