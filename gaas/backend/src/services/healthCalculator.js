/**
 * Calculates a health score from 0–50 based on sensor readings.
 * Each parameter in its ideal range contributes +10 points.
 */

const IDEAL_RANGES = {
  temperature: [20, 30],
  humidity: [55, 80],
  soil_moisture: [40, 70],
  ph: [5.5, 7.0],
  ec: [1.0, 2.2]
};

function calculateHealthScore(reading) {
  let score = 0;
  for (const [key, [min, max]] of Object.entries(IDEAL_RANGES)) {
    const value = Number(reading[key]);
    if (!Number.isNaN(value) && value >= min && value <= max) {
      score += 10;
    }
  }
  return score;
}

function getHealthStatus(score) {
  if (score >= 36) return "healthy";
  if (score >= 21) return "moderate";
  return "unhealthy";
}

function getHealthColor(score) {
  if (score >= 36) return "#22C55E";
  if (score >= 21) return "#EAB308";
  return "#EF4444";
}

module.exports = { calculateHealthScore, getHealthStatus, getHealthColor };
