const express = require("express");
const FertigationSetting = require("../models/FertigationSetting");

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const row = await FertigationSetting.create(req.body);
    res.status(201).json({ data: row });
  } catch (error) {
    next(error);
  }
});

router.get("/analytics", async (_req, res, next) => {
  try {
    const rows = await FertigationSetting.find().sort({ timestamp: 1 }).lean();
    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
