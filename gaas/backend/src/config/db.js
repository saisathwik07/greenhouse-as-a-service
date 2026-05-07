const mongoose = require("mongoose");

const RETRY_MS = 5000;

/** Hide password in logs */
function maskMongoUri(uri) {
  if (!uri) return "(empty)";
  try {
    return uri.replace(/:([^/@]+)@/, ":****@");
  } catch {
    return "(unparseable)";
  }
}

/**
 * Connects with mongoose.connect(process.env.MONGO_URI).
 * Retries every RETRY_MS on failure (helps transient DNS/network issues).
 */
async function connectDB() {
  const mongoUri = String(process.env.MONGO_URI || "").trim();
  if (!mongoUri) {
    throw new Error(
      "MONGO_URI is not set. Add it to gaas/backend/.env (or set the env var on your host). " +
        "A MongoDB connection string is required; there is no localhost fallback."
    );
  }
  const isAtlas = mongoUri.startsWith("mongodb+srv://");

  for (;;) {
    console.log("[MongoDB] Attempting connection…");
    console.log("[MongoDB] URI (masked):", maskMongoUri(mongoUri));

    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 20_000,
      });

      if (isAtlas) {
        console.log("[MongoDB] Success: MongoDB connected to Atlas");
      } else {
        console.log("[MongoDB] Success: MongoDB connected");
      }
      return;
    } catch (err) {
      console.error("[MongoDB] Connection error:", err.message);
      console.error("[MongoDB] Code:", err.code || "n/a");
      if (err.reason) console.error("[MongoDB] Reason:", err.reason);
      console.log(`[MongoDB] Retrying in ${RETRY_MS / 1000}s…`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
    }
  }
}

module.exports = { connectDB };
