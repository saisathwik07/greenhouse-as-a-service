const express = require("express");
const { recommendCrops } = require("../services/cropScoring");

const router = express.Router();

router.post("/recommend", (req, res) => {
  const payload = {
    soilType: req.body.soilType,
    soilMoisture: Number(req.body.soilMoisture),
    ec: Number(req.body.ec),
    ph: Number(req.body.ph),
    temperature: Number(req.body.temperature),
    humidity: Number(req.body.humidity)
  };

  const recommendations = recommendCrops(payload);
  res.json({ recommendations });
});

module.exports = router;
