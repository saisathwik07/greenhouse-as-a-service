const express = require("express");
const ResearchDataset = require("../models/ResearchDataset");
const { seedResearchData } = require("../services/seedData");

const router = express.Router();

router.get("/datasets", async (req, res, next) => {
  try {
    await seedResearchData();
    const query = {};
    if (req.query.cropType) query.cropType = req.query.cropType;
    if (req.query.location) query.location = req.query.location;
    if (req.query.treatments) query.treatments = req.query.treatments;
    if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) query.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.date.$lte = new Date(req.query.endDate);
    }

    const rows = await ResearchDataset.find(query).sort({ date: -1 }).lean();
    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
