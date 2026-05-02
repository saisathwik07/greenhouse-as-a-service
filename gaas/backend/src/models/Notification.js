const mongoose = require("mongoose");

/**
 * Lightweight in-app notification for ticket lifecycle events.
 * Recipients are addressed individually; admins each get their own row so
 * "read" state stays per-admin even when multiple admins are notified.
 */
const NOTIFICATION_TYPES = [
  "ticket_created",
  "ticket_reply_admin",
  "ticket_reply_user",
  "ticket_status",
  "ticket_priority",
  "ticket_resolved",
];

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "", trim: true },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
      index: true,
    },
    /** Frontend route the notification deep-links to. */
    link: { type: String, default: "" },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
