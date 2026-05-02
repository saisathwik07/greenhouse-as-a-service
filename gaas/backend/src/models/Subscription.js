const mongoose = require("mongoose");

/**
 * Multi-step subscription record. Created with `paymentStatus: "pending"` at
 * order creation, then promoted to `success` after Razorpay signature verify.
 *
 * Stores the full wizard selection so feature gating (services / add-ons) can
 * be derived without re-reading the pricing config.
 */
const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** Optional: legacy Plan reference, kept for older flows. */
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
      index: true,
    },

    userType: {
      type: String,
      enum: ["student", "faculty", "researcher"],
      required: true,
    },
    planName: {
      type: String,
      enum: ["starter", "pro", "enterprise"],
      required: true,
    },
    duration: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      required: true,
    },

    selectedServices: { type: [String], default: [] },
    addons: { type: [String], default: [] },

    /** Razorpay identifiers; orderId is set at create-order, paymentId at verify. */
    orderId: { type: String, required: true, trim: true, index: true },
    paymentId: { type: String, default: "", trim: true },
    signature: { type: String, default: "", trim: true },

    /** Total in rupees (display) and paise (Razorpay). */
    totalAmount: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 }, // paise mirror for legacy reads

    paymentStatus: {
      type: String,
      enum: ["pending", "success", "failed", "expired"],
      default: "pending",
      index: true,
    },
    /** Legacy alias; mirrors paymentStatus for older readers. */
    status: {
      type: String,
      enum: ["pending", "success", "failed", "expired"],
      default: "pending",
    },

    startDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
  },
  { versionKey: false, timestamps: true }
);

subscriptionSchema.pre("save", function syncStatusAlias() {
  if (this.isModified("paymentStatus")) {
    this.status = this.paymentStatus;
  } else if (this.isModified("status")) {
    this.paymentStatus = this.status;
  }
});

module.exports =
  mongoose.models.Subscription || mongoose.model("Subscription", subscriptionSchema);
