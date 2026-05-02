const Notification = require("../models/Notification");
const User = require("../models/User");

/**
 * Persist a notification for a single user. Failures are logged but never
 * thrown; callers treat notification fan-out as best-effort.
 *
 * @param {string|ObjectId} userId
 * @param {object} input
 * @param {string} input.type        One of NOTIFICATION_TYPES.
 * @param {string} input.title
 * @param {string} [input.body]
 * @param {string|ObjectId} [input.ticketId]
 * @param {string} [input.link]
 */
async function notifyUser(userId, { type, title, body = "", ticketId = null, link = "" }) {
  if (!userId || !type || !title) return null;
  try {
    return await Notification.create({
      user: userId,
      type,
      title,
      body,
      ticket: ticketId || null,
      link,
    });
  } catch (err) {
    console.error("[notifyUser]", err.message);
    return null;
  }
}

/**
 * Persist the same notification for every admin user. Used for ticket
 * lifecycle events the support team should see (new ticket, user replied).
 */
async function notifyAdmins({ type, title, body = "", ticketId = null, link = "" }) {
  if (!type || !title) return [];
  try {
    const admins = await User.find({ role: "admin" }).select("_id").lean();
    if (admins.length === 0) return [];
    const docs = admins.map((a) => ({
      user: a._id,
      type,
      title,
      body,
      ticket: ticketId || null,
      link,
    }));
    return await Notification.insertMany(docs, { ordered: false });
  } catch (err) {
    console.error("[notifyAdmins]", err.message);
    return [];
  }
}

module.exports = { notifyUser, notifyAdmins };
