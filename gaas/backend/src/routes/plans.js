const express = require("express");
const Plan = require("../models/Plan");
const { authenticate } = require("../middleware/authenticate");
const { requireAdminRole } = require("../middleware/admin");

const router = express.Router();

router.get("/", async (_req, res) => {
  const plans = await Plan.find().sort({ price: 1, duration: 1 }).lean();
  res.json({ plans });
});

router.post("/", authenticate, requireAdminRole, async (req, res) => {
  try {
    const { name, price, duration, features = [] } = req.body || {};
    if (!name || !price || !duration) {
      return res.status(400).json({ error: "name, price and duration are required" });
    }
    const plan = await Plan.create({ name, price, duration, features });
    return res.status(201).json({ plan });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
