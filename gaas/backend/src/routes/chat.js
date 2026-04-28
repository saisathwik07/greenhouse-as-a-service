const express = require("express");
const { authenticate } = require("../middleware/authenticate");
const { chatHandler } = require("../controllers/chatController");

const router = express.Router();

router.use(authenticate);

/** POST /api/chat — agriculture chatbot (JWT required) */
router.post("/", chatHandler);

/** GET /api/chat — health check */
router.get("/", (_req, res) => {
  res.json({ ok: true, message: "GaaS Agriculture Chatbot is online" });
});

module.exports = router;
