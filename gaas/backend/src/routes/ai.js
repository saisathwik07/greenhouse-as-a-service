const express = require("express");
const { getPrediction, getAnomaly, getClustering } = require("../services/aiClient");
const { localPredict, localAnomaly, localClustering } = require("../services/localAnalytics");

const router = express.Router();

router.get("/predict", async (_req, res, next) => {
  try {
    try {
      res.json(await getPrediction());
    } catch (_error) {
      res.json(await localPredict());
    }
  } catch (error) {
    next(error);
  }
});

router.get("/anomaly", async (_req, res, next) => {
  try {
    try {
      res.json(await getAnomaly());
    } catch (_error) {
      res.json(await localAnomaly());
    }
  } catch (error) {
    next(error);
  }
});

router.get("/clustering", async (_req, res, next) => {
  try {
    try {
      res.json(await getClustering());
    } catch (_error) {
      res.json(await localClustering());
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
