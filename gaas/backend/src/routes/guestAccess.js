const express = require("express");
const { listGuestAccessSettings } = require("../services/guestAccessService");

const router = express.Router();

/** GET /api/guest-access — matches frontend `api.get("/guest-access")` (axios baseURL ends with /api). */
router.get("/guest-access", async (_req, res, next) => {
  try {
    const settings = await listGuestAccessSettings();
    res.json({
      guestGlobalUnlock: settings.guestGlobalUnlock,
      features: settings.features.map((feature) => ({
        featureName: feature.featureName,
        isLocked: feature.isLocked,
        effectiveLocked: feature.effectiveLocked,
        guestGlobalUnlock: feature.guestGlobalUnlock,
        updatedAt: feature.updatedAt,
      })),
      knownFeatures: settings.knownFeatures,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
