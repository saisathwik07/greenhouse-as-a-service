const mongoose = require("mongoose");

/**
 * Allowed lifecycle states for a support ticket.
 *  - open         : New, awaiting first admin response.
 *  - in_progress  : Admin has acknowledged and is actively working.
 *  - resolved     : Admin has marked the issue as fixed.
 *  - closed       : Hard-closed (no further replies); used for cleanup.
 */
const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"];

/** Allowed priority tags, ordered low → urgent. */
const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"];

/** A single attachment stored on disk; URL is `/uploads/...`. */
const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    filename: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    sizeBytes: { type: Number, default: 0 },
  },
  { _id: false }
);

/** Replies are embedded for fast retrieval; they keep their own audit trail. */
const replySchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true },
    sender: { type: String, enum: ["user", "admin"], required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    senderName: { type: String, default: "" },
    attachments: { type: [attachmentSchema], default: [] },
    date: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ticketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 8000 },
    category: {
      type: String,
      enum: ["", "billing", "technical", "account", "feature_request", "other"],
      default: "",
    },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: "open",
      index: true,
    },
    priority: {
      type: String,
      enum: TICKET_PRIORITIES,
      default: "medium",
      index: true,
    },
    screenshots: { type: [attachmentSchema], default: [] },
    replies: { type: [replySchema], default: [] },
    /** Cached for quick `ORDER BY last activity DESC` queries. */
    lastReplyAt: { type: Date, default: null },
    /** ID of the admin who currently owns the ticket (optional). */
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

ticketSchema.index({ status: 1, priority: 1, createdAt: -1 });

module.exports =
  mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);
module.exports.TICKET_STATUSES = TICKET_STATUSES;
module.exports.TICKET_PRIORITIES = TICKET_PRIORITIES;
