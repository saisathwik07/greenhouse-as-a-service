/**
 * Same pH/EC scoring as gaas/ai-service/crop_api.py (_FERTILIZERS + match rules).
 * Keeps Fertilizer Recommendation working without calling the backend (no 404/proxy issues).
 */

const FERTILIZERS = [
  {
    fertilizer: "NPK 19-19-19",
    description: "Balanced growth formula",
    dosageMlPerL: 5,
    phRange: [5.5, 7.5],
    ecRange: [0.5, 2.5]
  },
  {
    fertilizer: "Urea (46-0-0)",
    description: "High nitrogen for leafy growth",
    dosageMlPerL: 3,
    phRange: [5.0, 7.0],
    ecRange: [0.5, 2.0]
  },
  {
    fertilizer: "DAP (18-46-0)",
    description: "Phosphorus-rich for root development",
    dosageMlPerL: 4,
    phRange: [6.0, 7.5],
    ecRange: [1.0, 2.5]
  },
  {
    fertilizer: "MOP (0-0-60)",
    description: "Potassium for fruit quality",
    dosageMlPerL: 3,
    phRange: [5.5, 7.0],
    ecRange: [0.8, 2.0]
  },
  {
    fertilizer: "Calcium Nitrate",
    description: "Prevents blossom end rot",
    dosageMlPerL: 4,
    phRange: [5.5, 7.0],
    ecRange: [0.5, 2.0]
  }
];

function inRange(val, [lo, hi]) {
  return val >= lo && val <= hi;
}

/**
 * @param {{ ph: number, ec: number }} input
 * @returns {Array<{ fertilizer: string, description: string, match: number, dosageMlPerL: number }>}
 */
export function computeFertilizerRecommendations({ ph, ec }) {
  const recommendations = FERTILIZERS.map((f) => {
    let match = 50;
    if (inRange(ph, f.phRange)) match += 25;
    if (inRange(ec, f.ecRange)) match += 25;
    return {
      fertilizer: f.fertilizer,
      description: f.description,
      match,
      dosageMlPerL: f.dosageMlPerL
    };
  });
  recommendations.sort((a, b) => b.match - a.match);
  return recommendations;
}
