const { expireUserPlanIfNeeded } = require("../services/planExpiryService");

/**
 * After authenticate — auto-downgrade expired plans for the current user.
 */
async function applyPlanExpiry(req, res, next) {
  try {
    if (req.user?.id) await expireUserPlanIfNeeded(req.user.id);
  } catch (err) {
    return next(err);
  }
  next();
}

module.exports = { applyPlanExpiry };
