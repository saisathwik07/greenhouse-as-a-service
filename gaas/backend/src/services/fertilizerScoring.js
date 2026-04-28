const fertilizers = [
  {
    name: "NPK 20-20-20",
    bestFor: ["Tomato", "Maize", "Chili"],
    phRange: [5.5, 7.0],
    ecRange: [1.0, 2.0],
    soilTypes: ["Loamy", "Sandy"],
    dosageMlPerL: 2.5,
    description: "Balanced macro-nutrient formula for general vegetable growth"
  },
  {
    name: "Calcium Nitrate",
    bestFor: ["Tomato", "Lettuce", "Chili"],
    phRange: [5.0, 6.5],
    ecRange: [1.2, 2.5],
    soilTypes: ["Loamy", "Clay", "Sandy"],
    dosageMlPerL: 1.5,
    description: "Prevents blossom end rot, strengthens cell walls"
  },
  {
    name: "Potassium Sulfate",
    bestFor: ["Tomato", "Chili", "Rice"],
    phRange: [5.5, 7.5],
    ecRange: [0.8, 1.8],
    soilTypes: ["Loamy", "Red", "Black"],
    dosageMlPerL: 1.0,
    description: "Improves fruit quality and disease resistance"
  },
  {
    name: "DAP (Diammonium Phosphate)",
    bestFor: ["Wheat", "Rice", "Maize"],
    phRange: [6.0, 7.5],
    ecRange: [1.0, 2.0],
    soilTypes: ["Alluvial", "Clay", "Loamy"],
    dosageMlPerL: 2.0,
    description: "High phosphorus for root development and flowering"
  },
  {
    name: "Urea (46-0-0)",
    bestFor: ["Rice", "Wheat", "Maize", "Lettuce"],
    phRange: [5.5, 7.0],
    ecRange: [0.5, 1.5],
    soilTypes: ["Alluvial", "Loamy", "Black"],
    dosageMlPerL: 1.8,
    description: "High nitrogen source for leafy growth stages"
  },
  {
    name: "Micronutrient Mix",
    bestFor: ["Lettuce", "Tomato", "Chili"],
    phRange: [5.5, 6.8],
    ecRange: [0.8, 2.0],
    soilTypes: ["Loamy", "Sandy", "Red"],
    dosageMlPerL: 0.5,
    description: "Iron, manganese, zinc, boron for deficiency prevention"
  }
];

function inRange(value, [min, max]) {
  return value >= min && value <= max;
}

function recommendFertilizers(input) {
  const { cropType, soilType, ph, ec } = input;
  return fertilizers
    .map((fert) => {
      let score = 0;
      if (fert.bestFor.includes(cropType)) score += 30;
      if (fert.soilTypes.includes(soilType)) score += 25;
      if (inRange(Number(ph), fert.phRange)) score += 25;
      if (inRange(Number(ec), fert.ecRange)) score += 20;
      return {
        fertilizer: fert.name,
        match: score,
        dosageMlPerL: fert.dosageMlPerL,
        description: fert.description
      };
    })
    .sort((a, b) => b.match - a.match)
    .slice(0, 3);
}

module.exports = { recommendFertilizers };
