const mongoose = require("mongoose");

/**
 * Single source of truth for the admin intelligence dashboard.
 * Every login, feature call, payment milestone, and dataset download writes
 * one row here. Aggregations downstream (funnel, churn, feature adoption,
 * activity feed, per-user drawer) all read from this collection.
 */
const activityEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    /** Cached at write time so the activity feed is one query, not a join. */
    userEmail: { type: String, default: "" },
    userName: { type: String, default: "" },

    /**
     * Coarse type so we can group/filter without joining.
     * - login: successful auth (any provider)
     * - signup: first-time account creation
     * - subscription_started: pending Subscription created
     * - subscription_paid: Razorpay verify succeeded
     * - subscription_expired: sweeper marked it expired
     * - feature_used: any gated API call (`featureKey` in metadata)
     * - download: dataset/CSV/JSON download
     * - login_failed: bad credentials
     */
    type: {
      type: String,
      enum: [
        "login",
        "signup",
        "subscription_started",
        "subscription_paid",
        "subscription_expired",
        "feature_used",
        "download",
        "login_failed",
      ],
      required: true,
      index: true,
    },

    featureKey: { type: String, default: "", index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

activityEventSchema.index({ createdAt: -1 });
activityEventSchema.index({ userId: 1, createdAt: -1 });
activityEventSchema.index({ type: 1, createdAt: -1 });

module.exports =
  mongoose.models.ActivityEvent ||
  mongoose.model("ActivityEvent", activityEventSchema);
