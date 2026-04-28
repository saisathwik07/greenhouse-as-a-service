const express = require("express");
const { recommendFertilizers } = require("../services/fertilizerScoring");

const router = express.Router();

router.post("/recommend", (req, res) => {
  const payload = {
    cropType: req.body.cropType || "Tomato",
    soilType: req.body.soilType || "Loamy",
    ph: Number(req.body.ph) || 6.5,
    ec: Number(req.body.ec) || 1.5
  };
  const recommendations = recommendFertilizers(payload);
  res.json({ recommendations });
});

module.exports = router;
