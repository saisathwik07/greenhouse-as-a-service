const mongoose = require("mongoose");
const GuestAccess = require("../models/GuestAccess");
const { SERVICES, ADDONS } = require("../config/pricingConfig");

const GLOBAL_FEATURE_NAME = "__global__";
const FEATURE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/;

const DEFAULT_GUEST_FEATURES = Array.from(
  new Set([
    ...SERVICES.map((service) => service.feature),
    ...ADDONS.map((addon) => addon.feature),
    "downloadData",
    "cropRecommendation",
    "yieldPrediction",
    "pestDisease",
    "fertigation",
    "irrigation",
    "mqtt",
    "aiAnalytics",
    "prioritySupport",
  ].filter(Boolean))
);

function makeBadRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function normalizeFeatureName(input) {
  const featureName = String(input || "").trim();
  if (!FEATURE_NAME_PATTERN.test(featureName)) {
    throw makeBadRequest(
      "featureName must be 1-120 chars and use letters, numbers, dot, underscore, colon, or hyphen"
    );
  }
  return featureName;
}

function normalizeFeatureParam(input) {
  const featureName = normalizeFeatureName(input);
  if (featureName === GLOBAL_FEATURE_NAME) {
    throw makeBadRequest(`${GLOBAL_FEATURE_NAME} is reserved for global guest access`);
  }
  return featureName;
}

function requireBoolean(value, fieldName) {
  if (typeof value !== "boolean") {
    throw makeBadRequest(`${fieldName} must be a boolean`);
  }
  return value;
}

function actorIdOrNull(actorId) {
  return mongoose.isValidObjectId(actorId) ? actorId : null;
}

function sortGuestFeatures(features) {
  const rank = new Map(DEFAULT_GUEST_FEATURES.map((feature, index) => [feature, index]));
  return features.sort((a, b) => {
    const aRank = rank.has(a.featureName) ? rank.get(a.featureName) : Number.MAX_SAFE_INTEGER;
    const bRank = rank.has(b.featureName) ? rank.get(b.featureName) : Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return a.featureName.localeCompare(b.featureName);
  });
}

function serializeSetting(doc, globalUnlock) {
  const guestGlobalUnlock =
    typeof globalUnlock === "boolean" ? globalUnlock : !!doc.guestGlobalUnlock;
  const isLocked = !!doc.isLocked;

  return {
    id: doc._id ? String(doc._id) : null,
    featureName: doc.featureName,
    isLocked,
    guestGlobalUnlock,
    effectiveLocked: guestGlobalUnlock ? false : isLocked,
    updatedBy: doc.updatedBy ? String(doc.updatedBy) : null,
    updatedAt: doc.updatedAt || null,
  };
}

async function ensureGlobalAccessDoc() {
  const now = new Date();
  return GuestAccess.findOneAndUpdate(
    { featureName: GLOBAL_FEATURE_NAME },
    {
      $setOnInsert: {
        featureName: GLOBAL_FEATURE_NAME,
        isLocked: false,
        updatedBy: null,
        updatedAt: now,
        guestGlobalUnlock: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, lean: true }
  );
}

async function ensureDefaultFeatureDocs(globalUnlock) {
  const existingFeatureNames = new Set(
    await GuestAccess.distinct("featureName", {
      featureName: { $in: DEFAULT_GUEST_FEATURES },
    })
  );
  const missing = DEFAULT_GUEST_FEATURES.filter(
    (featureName) => !existingFeatureNames.has(featureName)
  );

  if (!missing.length) return;

  const now = new Date();
  await GuestAccess.bulkWrite(
    missing.map((featureName) => ({
      updateOne: {
        filter: { featureName },
        update: {
          $setOnInsert: {
            featureName,
            isLocked: true,
            updatedBy: null,
            updatedAt: now,
            guestGlobalUnlock: globalUnlock,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );
}

async function listGuestAccessSettings() {
  const globalDoc = await ensureGlobalAccessDoc();
  const guestGlobalUnlock = !!globalDoc.guestGlobalUnlock;
  await ensureDefaultFeatureDocs(guestGlobalUnlock);

  const featureDocs = await GuestAccess.find({
    featureName: { $ne: GLOBAL_FEATURE_NAME },
  }).lean();

  return {
    guestGlobalUnlock,
    global: serializeSetting(globalDoc, guestGlobalUnlock),
    features: sortGuestFeatures(featureDocs).map((doc) =>
      serializeSetting(doc, guestGlobalUnlock)
    ),
    knownFeatures: DEFAULT_GUEST_FEATURES,
  };
}

async function updateGuestGlobalUnlock({ guestGlobalUnlock, updatedBy }) {
  const unlock = requireBoolean(guestGlobalUnlock, "guestGlobalUnlock");
  const now = new Date();
  const actorId = actorIdOrNull(updatedBy);

  await GuestAccess.findOneAndUpdate(
    { featureName: GLOBAL_FEATURE_NAME },
    {
      $set: {
        featureName: GLOBAL_FEATURE_NAME,
        isLocked: false,
        updatedBy: actorId,
        updatedAt: now,
        guestGlobalUnlock: unlock,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await GuestAccess.updateMany(
    { featureName: { $ne: GLOBAL_FEATURE_NAME } },
    {
      $set: {
        guestGlobalUnlock: unlock,
        updatedBy: actorId,
        updatedAt: now,
      },
    }
  );

  return listGuestAccessSettings();
}

async function updateGuestFeatureLock({ featureName, isLocked, updatedBy }) {
  const normalizedFeatureName = normalizeFeatureParam(featureName);
  const locked = requireBoolean(isLocked, "isLocked");
  const now = new Date();
  const actorId = actorIdOrNull(updatedBy);
  const globalDoc = await ensureGlobalAccessDoc();
  const guestGlobalUnlock = !!globalDoc.guestGlobalUnlock;

  const doc = await GuestAccess.findOneAndUpdate(
    { featureName: normalizedFeatureName },
    {
      $set: {
        featureName: normalizedFeatureName,
        isLocked: locked,
        updatedBy: actorId,
        updatedAt: now,
        guestGlobalUnlock,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, lean: true }
  );

  return serializeSetting(doc, guestGlobalUnlock);
}

async function getGuestFeatureAccess(featureName) {
  const normalizedFeatureName = normalizeFeatureName(featureName);
  const globalDoc = await ensureGlobalAccessDoc();
  const guestGlobalUnlock = !!globalDoc.guestGlobalUnlock;

  if (guestGlobalUnlock) {
    return {
      featureName: normalizedFeatureName,
      guestGlobalUnlock,
      isLocked: false,
      allowed: true,
    };
  }

  const featureDoc = await GuestAccess.findOne({
    featureName: normalizedFeatureName,
  })
    .select("featureName isLocked guestGlobalUnlock")
    .lean();
  const isLocked = featureDoc ? !!featureDoc.isLocked : true;

  return {
    featureName: normalizedFeatureName,
    guestGlobalUnlock,
    isLocked,
    allowed: !isLocked,
  };
}

module.exports = {
  GLOBAL_FEATURE_NAME,
  DEFAULT_GUEST_FEATURES,
  getGuestFeatureAccess,
  listGuestAccessSettings,
  normalizeFeatureName,
  updateGuestFeatureLock,
  updateGuestGlobalUnlock,
};
