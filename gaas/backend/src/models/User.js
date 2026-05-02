const mongoose = require("mongoose");

const paymentEntrySchema = new mongoose.Schema(
  {
    razorpay_payment_id: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    plan: { type: String, required: true, enum: ["free", "basic", "pro"] },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, default: "" },
    picture: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    /** SaaS plan: free | basic | pro */
    plan: {
      type: String,
      enum: ["free", "basic", "pro", "none", "standard", "premium"],
      default: "basic",
    },
    planStartDate: { type: Date, default: null },
    planEndDate: { type: Date, default: null },
    /** Legacy fields — kept in sync where possible */
    planActivatedAt: { type: Date },
    planExpiresAt: { type: Date },
    payments: { type: [paymentEntrySchema], default: [] },
    walletBalance: { type: Number, default: 0, min: 0 },

    /** Profile fields surfaced on the admin intelligence dashboard. */
    institution: { type: String, default: "", trim: true },
    /** Type-specific institution metadata (kept flat for query-friendliness). */
    degree: { type: String, default: "", trim: true },
    yearOfStudy: { type: String, default: "", trim: true },
    department: { type: String, default: "", trim: true },
    researchDomain: { type: String, default: "", trim: true },
    /** Captured from the subscription wizard (student | researcher | faculty | ...). */
    userType: { type: String, default: "", trim: true },
    purposeOfUsage: {
      type: String,
      enum: ["", "research", "teaching", "commercial", "learning", "other"],
      default: "",
    },

    /** Activity counters for funnel + churn metrics. */
    loginCount: { type: Number, default: 0, min: 0 },
    lastActiveAt: { type: Date, default: null },

    /**
     * Admin moderation state. Blocked users are rejected at login and on every
     * authenticated request. Default false so existing accounts behave as before.
     */
    isBlocked: { type: Boolean, default: false, index: true },
    blockedAt: { type: Date, default: null },
    blockedReason: { type: String, default: "", trim: true, maxlength: 240 },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /**
     * Anchor used to "reset" usage quotas without deleting audit history. Any
     * `feature_used` ActivityEvent with createdAt <= quotaResetAt is considered
     * cleared and excluded from quota counters.
     */
    quotaResetAt: { type: Date, default: null },
  },
  { timestamps: false }
);

/** Normalize legacy plan values to free | basic | pro */
userSchema.pre("save", function normalizePlan() {
  const legacy = {
    none: "free",
    standard: "pro",
    premium: "pro",
  };
  if (legacy[this.plan]) this.plan = legacy[this.plan];
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
