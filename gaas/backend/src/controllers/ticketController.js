const mongoose = require("mongoose");
const Ticket = require("../models/Ticket");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function invalidTicketId(res) {
  return res.status(400).json({ error: "Invalid ticket ID", code: "INVALID_TICKET_ID" });
}

/**
 * POST /create
 */
async function createTicket(req, res) {
  try {
    const subject = String(req.body?.subject || "").trim();
    const message = String(req.body?.message || "").trim();
    if (!subject || !message) {
      return res.status(400).json({ error: "Subject and message are required", code: "VALIDATION" });
    }

    const ticket = await Ticket.create({
      user: req.user.id,
      subject,
      message,
      status: "open",
      replies: [],
    });

    return res.status(201).json({ ticket: serializeTicket(ticket) });
  } catch (err) {
    console.error("[tickets/create]", err);
    return res.status(500).json({ error: "Failed to create ticket", detail: err.message });
  }
}

/**
 * GET /my — only tickets owned by the authenticated user (strict filter).
 */
async function listMyTickets(req, res) {
  try {
    const userId = req.user.id;
    const tickets = await Ticket.find({ user: userId })
      .sort({ createdAt: -1 })
      .select("user subject message status replies createdAt")
      .lean();
    return res.json({ tickets: tickets.map(serializeTicket) });
  } catch (err) {
    console.error("[tickets/my]", err);
    return res.status(500).json({ error: "Failed to load tickets", detail: err.message });
  }
}

/**
 * GET /all (admin only — enforced by requireTicketAdmin)
 */
async function listAllTickets(req, res) {
  try {
    const tickets = await Ticket.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ tickets: tickets.map(serializeTicketWithUser) });
  } catch (err) {
    console.error("[tickets/all]", err);
    return res.status(500).json({ error: "Failed to load tickets", detail: err.message });
  }
}

/**
 * POST /reply/:ticketId (admin only — enforced by requireTicketAdmin)
 */
async function replyAsAdmin(req, res) {
  try {
    const { ticketId } = req.params;
    if (!isValidObjectId(ticketId)) return invalidTicketId(res);

    const text = String(req.body?.message || "").trim();
    if (!text) {
      return res.status(400).json({ error: "Message is required", code: "VALIDATION" });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found", code: "NOT_FOUND" });
    }

    ticket.replies.push({ message: text, sender: "admin", date: new Date() });
    await ticket.save();

    return res.json({ ticket: serializeTicket(ticket) });
  } catch (err) {
    if (err.name === "CastError") return invalidTicketId(res);
    console.error("[tickets/reply admin]", err);
    return res.status(500).json({ error: "Failed to reply", detail: err.message });
  }
}

/**
 * POST /reply-user/:ticketId
 */
async function replyAsUser(req, res) {
  try {
    const { ticketId } = req.params;
    if (!isValidObjectId(ticketId)) return invalidTicketId(res);

    const text = String(req.body?.message || "").trim();
    if (!text) {
      return res.status(400).json({ error: "Message is required", code: "VALIDATION" });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found", code: "NOT_FOUND" });
    }

    if (String(ticket.user) !== String(req.user.id)) {
      return res.status(403).json({ error: "You can only reply to your own tickets", code: "FORBIDDEN" });
    }

    ticket.replies.push({ message: text, sender: "user", date: new Date() });
    await ticket.save();

    return res.json({ ticket: serializeTicket(ticket) });
  } catch (err) {
    if (err.name === "CastError") return invalidTicketId(res);
    console.error("[tickets/reply user]", err);
    return res.status(500).json({ error: "Failed to reply", detail: err.message });
  }
}

/**
 * PUT /status/:ticketId (admin only — enforced by requireTicketAdmin)
 */
async function updateStatus(req, res) {
  try {
    const { ticketId } = req.params;
    if (!isValidObjectId(ticketId)) return invalidTicketId(res);

    const status = String(req.body?.status || "").toLowerCase();
    if (status !== "open" && status !== "resolved") {
      return res.status(400).json({ error: "Status must be open or resolved", code: "VALIDATION" });
    }

    const ticket = await Ticket.findByIdAndUpdate(ticketId, { status }, { new: true });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found", code: "NOT_FOUND" });
    }

    return res.json({ ticket: serializeTicket(ticket) });
  } catch (err) {
    if (err.name === "CastError") return invalidTicketId(res);
    console.error("[tickets/status]", err);
    return res.status(500).json({ error: "Failed to update status", detail: err.message });
  }
}

function serializeTicket(t) {
  const o = typeof t.toObject === "function" ? t.toObject() : { ...t };
  let userId = o.user;
  if (userId && typeof userId === "object" && userId._id) {
    userId = userId._id;
  }
  return {
    _id: String(o._id),
    user: userId != null ? String(userId) : undefined,
    subject: o.subject,
    message: o.message,
    status: o.status,
    replies: (o.replies || []).map((r) => ({
      _id: r._id ? String(r._id) : undefined,
      message: r.message,
      sender: r.sender,
      date: r.date,
    })),
    createdAt: o.createdAt,
  };
}

function serializeTicketWithUser(t) {
  const o = typeof t.toObject === "function" ? t.toObject() : { ...t };
  const u = o.user;
  let userEmail = "";
  let userName = "";
  let userId = u;
  if (u && typeof u === "object" && u._id) {
    userId = u._id;
    userEmail = u.email || "";
    userName = u.name || "";
  }
  const base = serializeTicket({ ...o, user: userId });
  base.userEmail = userEmail;
  base.userName = userName;
  return base;
}

module.exports = {
  createTicket,
  listMyTickets,
  listAllTickets,
  replyAsAdmin,
  replyAsUser,
  updateStatus,
};
