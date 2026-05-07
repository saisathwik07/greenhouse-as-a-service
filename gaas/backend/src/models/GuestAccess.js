const mongoose = require("mongoose");

const guestAccessSchema = new mongoose.Schema(
  {
    featureName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    isLocked: { type: Boolean, default: true },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    updatedAt: { type: Date, default: Date.now },
    guestGlobalUnlock: { type: Boolean, default: false },
  },
  { versionKey: false }
);

guestAccessSchema.index({ featureName: 1 }, { unique: true });
guestAccessSchema.index({ updatedAt: -1 });

module.exports =
  mongoose.models.GuestAccess ||
  mongoose.model("GuestAccess", guestAccessSchema);
