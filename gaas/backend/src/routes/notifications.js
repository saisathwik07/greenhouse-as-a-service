const express = require("express");
const mongoose = require("mongoose");
const { authenticate } = require("../middleware/authenticate");
const Notification = require("../models/Notification");

const router = express.Router();
router.use(authenticate);

/**
 * GET /api/notifications?unreadOnly=true&limit=20
 */
router.get("/", async (req, res, next) => {
  try {
    const filter = { user: req.user.id };
    if (String(req.query.unreadOnly || "").toLowerCase() === "true") {
      filter.read = false;
    }
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const items = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({
      items: items.map(serialize),
      count: items.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/notifications/unread-count — small payload for the bell badge.
 */
router.get("/unread-count", async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user.id,
      read: false,
    });
    return res.json({ count });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/:id/read — mark one as read.
 */
router.post("/:id/read", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const notif = await Notification.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    ).lean();
    if (!notif) return res.status(404).json({ error: "Not found" });
    return res.json({ notification: serialize(notif) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/read-all — mark every unread for the caller.
 */
router.post("/read-all", async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user.id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    return res.json({ updated: result.modifiedCount || 0 });
  } catch (err) {
    next(err);
  }
});

function serialize(n) {
  return {
    id: String(n._id),
    type: n.type,
    title: n.title,
    body: n.body || "",
    ticket: n.ticket ? String(n.ticket) : null,
    link: n.link || "",
    read: !!n.read,
    readAt: n.readAt || null,
    createdAt: n.createdAt,
  };
}

module.exports = router;
