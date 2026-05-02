const mongoose = require("mongoose");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const {
  notifyAdmins,
  notifyUser,
} = require("../services/notificationService");
const { filesToAttachments } = require("../middleware/uploads");

const VALID_STATUS = new Set(["open", "in_progress", "resolved", "closed"]);
const VALID_PRIORITY = new Set(["low", "medium", "high", "urgent"]);

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function invalidTicketId(res) {
  return res
    .status(400)
    .json({ error: "Invalid ticket ID", code: "INVALID_TICKET_ID" });
}

/* ------------------------------------------------------------------------- */
/* User actions                                                              */
/* ------------------------------------------------------------------------- */

/**
 * POST /tickets/create
 * Multipart-aware: subject, message, priority, category + up to 5 screenshots.
 */
async function createTicket(req, res) {
  try {
    const subject = String(req.body?.subject || "").trim();
    const message = String(req.body?.message || "").trim();
    const priority = String(req.body?.priority || "medium").toLowerCase();
    const category = String(req.body?.category || "").toLowerCase();

    if (!subject || !message) {
      return res
        .status(400)
        .json({ error: "Subject and message are required", code: "VALIDATION" });
    }
    if (!VALID_PRIORITY.has(priority)) {
      return res
        .status(400)
        .json({ error: "Invalid priority", code: "VALIDATION" });
    }

    const screenshots = filesToAttachments(req.files);

    const ticket = await Ticket.create({
      user: req.user.id,
      subject,
      message,
      priority,
      category: ["billing", "technical", "account", "feature_request", "other"].includes(
        category
      )
        ? category
        : "",
      screenshots,
      status: "open",
      replies: [],
    });

    // Fan-out: tell every admin about the new ticket so the bell lights up.
    notifyAdmins({
      type: "ticket_created",
      title: `New ${priority} ticket: ${subject}`,
      body: message.slice(0, 140),
      ticketId: ticket._id,
      link: `/admin/support?ticketId=${ticket._id}`,
    }).catch((err) => console.error("[notifyAdmins create]", err.message));

    return res.status(201).json({ ticket: serializeTicket(ticket) });
  } catch (err) {
    console.error("[tickets/create]", err);
    return res
      .status(500)
      .json({ error: "Failed to create ticket", detail: err.message });
  }
}

/**
 * GET /tickets/my — list the authenticated user's tickets (newest first).
 */
async function listMyTickets(req, res) {
  try {
    const tickets = await Ticket.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ tickets: tickets.map(serializeTicket) });
  } catch (err) {
    console.error("[tickets/my]", err);
    return res
      .status(500)
      .json({ error: "Failed to load tickets", detail: err.message });
  }
}

/**
 * GET /tickets/:id — fetch one ticket. Owner OR admin only.
 */
async function getTicket(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return invalidTicketId(res);

    const ticket = await Ticket.findById(id)
      .populate("user", "name email role institution")
      .lean();
    if (!ticket)
      return res.status(404).json({ error: "Ticket not found", code: "NOT_FOUND" });

    const isOwner =
      String(ticket.user?._id || ticket.user) === String(req.user.id);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
    }

    return res.json({ ticket: serializeTicketWithUser(ticket) });
  } catch (err) {
    if (err.name === "CastError") return invalidTicketId(res);
    console.error("[tickets/get]", err);
    return res
      .status(500)
      .json({ error: "Failed to load ticket", detail: err.message });
  }
}

/**
 * POST /tickets/reply-user/:ticketId — owner adds a reply (with optional screenshots).
 */
async function replyAsUser(req, res) {
  try {
    const { ticketId } = req.params;
    if (!isValidObjectId(ticketId)) return invalidTicketId(res);

    const text = String(req.body?.message || "").trim();
    const attachments = filesToAttachments(req.files);
    if (!text && attachments.length === 0) {
      return res
        .status(400)
        .json({ error: "Message or attachment is required", code: "VALIDATION" });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket)
      return res.status(404).json({ error: "Ticket not found", code: "NOT_FOUND" });

    if (String(ticket.user) !== String(req.user.id)) {
      return res
        .status(403)
        .json({ error: "You can only reply to your own tickets", code: "FORBIDDEN" });
    }
    if (ticket.status === "closed") {
      return res
        .status(400)
        .json({ error: "Ticket is closed", code: "TICKET_CLOSED" });
    }

    const senderName = await safeUserName(req.user.id);
    ticket.replies.push({
      message: text,
      sender: "user",
      senderId: req.user.id,
      senderName,
      attachments,
      date: new Date(),
    });
    ticket.lastReplyAt = new Date();
    if (ticket.status === "resolved") ticket.status = "open"; // user re-opens
    await ticket.save();

    notifyAdmins({
      type: "ticket_reply_user",
      title: `User replied: ${ticket.subject}`,
      body: text.slice(0, 140) || "(attachment)",
      ticketId: ticket._id,
      link: `/admin/support?ticketId=${ticket._id}`,
    }).catch((err) => console.error("[notifyAdmins reply-user]", err.message));

    return res.json({ ticket: serializeTicket(ticket) });
  } catch (err) {
    if (err.name === "CastError") return invalidTicketId(res);
    console.error("[tickets/reply user]", err);
    return res
      .status(500)
      .json({ error: "Failed to reply", detail: err.message });
  }
}

/* ------------------------------------------------------------------------- */
/* Admin actions                                                             */
/* ------------------------------------------------------------------------- */

/**
 * GET /tickets/all — admin list with optional filters.
 *   ?status=open            (or comma-separated: open,in_progress)
 *   ?priority=high
 *   ?q=keyword              full-text-ish search over subject + message
 *   ?userId=<id>            tickets for one user
 *   ?limit=50&page=1        pagination
 */
async function listAllTickets(req, res) {
  try {
    const filter = {};

    const statusParam = String(req.query.status || "").trim();
    if (statusParam && statusParam !== "all") {
      const statuses = statusParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => VALID_STATUS.has(s));
      if (statuses.length) filter.status = { $in: statuses };
    }

    const priorityParam = String(req.query.priority || "").trim();
    if (priorityParam && priorityParam !== "all") {
      const priorities = priorityParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => VALID_PRIORITY.has(s));
      if (priorities.length) filter.priority = { $in: priorities };
    }

    if (req.query.userId && isValidObjectId(req.query.userId)) {
      filter.user = req.query.userId;
    }

    const q = String(req.query.q || "").trim();
    if (q) {
      const re = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ subject: re }, { message: re }];
    }

    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const page = Math.max(1, Number(req.query.page) || 1);

    const [tickets, total, counts] = await Promise.all([
      Ticket.find(filter)
        .populate("user", "name email role institution")
        .sort({
          // Open + urgent first, then most recently active.
          status: 1,
          priority: -1,
          lastReplyAt: -1,
          createdAt: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Ticket.countDocuments(filter),
      buildSummaryCounts(),
    ]);

    return res.json({
      tickets: tickets.map(serializeTicketWithUser),
      total,
      page,
      limit,
      summary: counts,
    });
  } catch (err) {
    console.error("[tickets/all]", err);
    return res
      .status(500)
      .json({ error: "Failed to load tickets", detail: err.message });
  }
}

/**
 * POST /tickets/reply/:ticketId — admin replies (notifies the ticket owner).
 */
async function replyAsAdmin(req, res) {
  try {
    const { ticketId } = req.params;
    if (!isValidObjectId(ticketId)) return invalidTicketId(res);

    const text = String(req.body?.message || "").trim();
    const attachments = filesToAttachments(req.files);
    if (!text && attachments.length === 0) {
      return res
        .status(400)
        .json({ error: "Message or attachment is required", code: "VALIDATION" });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket)
      return res.status(404).json({ error: "Ticket not found", code: "NOT_FOUND" });

    const senderName = await safeUserName(req.user.id);
    ticket.replies.push({
      message: text,
      sender: "admin",
      senderId: req.user.id,
      senderName,
      attachments,
      date: new Date(),
    });
    ticket.lastReplyAt = new Date();
    // Auto-progress: first admin reply moves an "open" ticket to in_progress.
    if (ticket.status === "open") ticket.status = "in_progress";
    if (!ticket.assignedTo) ticket.assignedTo = req.user.id;
    await ticket.save();

    notifyUser(ticket.user, {
      type: "ticket_reply_admin",
      title: `Support replied to: ${ticket.subject}`,
      body: text.slice(0, 140) || "(attachment)",
      ticketId: ticket._id,
      link: `/my-tickets?ticketId=${ticket._id}`,
    }).catch((err) => console.error("[notifyUser reply-admin]", err.message));

    return res.json({ ticket: serializeTicket(ticket) });
  } catch (err) {
    if (err.name === "CastError") return invalidTicketId(res);
    console.error("[tickets/reply admin]", err);
    return res
      .status(500)
      .json({ error: "Failed to reply", detail: err.message });
  }
}

/**
 * PUT /tickets/status/:ticketId — admin status transitions.
 */
async function updateStatus(req, res) {
  try {
    const { ticketId } = req.params;
    if (!isValidObjectId(ticketId)) return invalidTicketId(res);

    const status = String(req.body?.status || "").toLowerCase();
    if (!VALID_STATUS.has(status)) {
      return res
        .status(400)
        .json({ error: "Invalid status", code: "VALIDATION" });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket)
      return res.status(404).json({ error: "Ticket not found", code: "NOT_FOUND" });

    const previous = ticket.status;
    ticket.status = status;
    if (status === "resolved") ticket.resolvedAt = new Date();
    if (status === "open") ticket.resolvedAt = null;
    await ticket.save();

    if (previous !== status) {
      const isResolved = status === "resolved";
      notifyUser(ticket.user, {
        type: isResolved ? "ticket_resolved" : "ticket_status",
        title: isResolved
          ? `Resolved: ${ticket.subject}`
          : `Status updated: ${ticket.subject}`,
        body: `Your ticket is now marked "${status.replace("_", " ")}".`,
        ticketId: ticket._id,
        link: `/my-tickets?ticketId=${ticket._id}`,
      }).catch((err) => console.error("[notifyUser status]", err.message));
    }

    return res.json({ ticket: serializeTicket(ticket) });
  } catch (err) {
    if (err.name === "CastError") return invalidTicketId(res);
    console.error("[tickets/status]", err);
    return res
      .status(500)
      .json({ error: "Failed to update status", detail: err.message });
  }
}

/**
 * PUT /tickets/priority/:ticketId — admin re-classifies urgency.
 */
async function updatePriority(req, res) {
  try {
    const { ticketId } = req.params;
    if (!isValidObjectId(ticketId)) return invalidTicketId(res);

    const priority = String(req.body?.priority || "").toLowerCase();
    if (!VALID_PRIORITY.has(priority)) {
      return res
        .status(400)
        .json({ error: "Invalid priority", code: "VALIDATION" });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket)
      return res.status(404).json({ error: "Ticket not found", code: "NOT_FOUND" });

    const previous = ticket.priority;
    ticket.priority = priority;
    await ticket.save();

    if (previous !== priority) {
      notifyUser(ticket.user, {
        type: "ticket_priority",
        title: `Priority updated: ${ticket.subject}`,
        body: `Priority is now "${priority}".`,
        ticketId: ticket._id,
        link: `/my-tickets?ticketId=${ticket._id}`,
      }).catch((err) => console.error("[notifyUser priority]", err.message));
    }

    return res.json({ ticket: serializeTicket(ticket) });
  } catch (err) {
    if (err.name === "CastError") return invalidTicketId(res);
    console.error("[tickets/priority]", err);
    return res
      .status(500)
      .json({ error: "Failed to update priority", detail: err.message });
  }
}

/* ------------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------- */

async function safeUserName(userId) {
  try {
    const u = await User.findById(userId).select("name").lean();
    return u?.name || "";
  } catch {
    return "";
  }
}

async function buildSummaryCounts() {
  const counts = { total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 };
  const byStatus = await Ticket.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  for (const row of byStatus) {
    if (row._id) counts[row._id] = row.count;
    counts.total += row.count;
  }
  const byPriority = await Ticket.aggregate([
    { $match: { status: { $in: ["open", "in_progress"] } } },
    { $group: { _id: "$priority", count: { $sum: 1 } } },
  ]);
  counts.activeByPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
  for (const row of byPriority) {
    if (row._id) counts.activeByPriority[row._id] = row.count;
  }
  return counts;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeTicket(t) {
  const o = typeof t.toObject === "function" ? t.toObject() : { ...t };
  let userId = o.user;
  if (userId && typeof userId === "object" && userId._id) userId = userId._id;
  return {
    _id: String(o._id),
    user: userId != null ? String(userId) : undefined,
    subject: o.subject,
    message: o.message,
    category: o.category || "",
    status: o.status,
    priority: o.priority || "medium",
    screenshots: (o.screenshots || []).map(normaliseAttachment),
    replies: (o.replies || []).map((r) => ({
      _id: r._id ? String(r._id) : undefined,
      message: r.message,
      sender: r.sender,
      senderName: r.senderName || "",
      attachments: (r.attachments || []).map(normaliseAttachment),
      date: r.date,
    })),
    lastReplyAt: o.lastReplyAt || null,
    resolvedAt: o.resolvedAt || null,
    createdAt: o.createdAt,
  };
}

function serializeTicketWithUser(t) {
  const o = typeof t.toObject === "function" ? t.toObject() : { ...t };
  const u = o.user;
  let userEmail = "";
  let userName = "";
  let userInstitution = "";
  let userId = u;
  if (u && typeof u === "object" && u._id) {
    userId = u._id;
    userEmail = u.email || "";
    userName = u.name || "";
    userInstitution = u.institution || "";
  }
  const base = serializeTicket({ ...o, user: userId });
  base.userEmail = userEmail;
  base.userName = userName;
  base.userInstitution = userInstitution;
  return base;
}

function normaliseAttachment(a) {
  if (!a) return null;
  return {
    url: a.url,
    filename: a.filename || "",
    mimeType: a.mimeType || "",
    sizeBytes: a.sizeBytes || 0,
  };
}

module.exports = {
  createTicket,
  listMyTickets,
  getTicket,
  listAllTickets,
  replyAsAdmin,
  replyAsUser,
  updateStatus,
  updatePriority,
};
