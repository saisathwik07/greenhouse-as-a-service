const crops = [
  { name: "Rice", soilTypes: ["Alluvial", "Clay"], temp: [22, 32], humidity: [70, 100], ph: [5.5, 6.5], moisture: [60, 80], ec: [1, 2] },
  { name: "Wheat", soilTypes: ["Loamy", "Clay"], temp: [15, 25], humidity: [50, 70], ph: [6.0, 7.5], moisture: [40, 60], ec: [1, 1.5] },
  { name: "Maize", soilTypes: ["Loamy", "Sandy"], temp: [18, 30], humidity: [50, 80], ph: [5.5, 7.5], moisture: [50, 70], ec: [1, 2] },
  { name: "Tomato", soilTypes: ["Loamy", "Sandy"], temp: [20, 30], humidity: [60, 80], ph: [5.5, 7.0], moisture: [50, 70], ec: [1, 2] },
  { name: "Chili", soilTypes: ["Sandy", "Red"], temp: [20, 32], humidity: [55, 80], ph: [6.0, 7.0], moisture: [45, 65], ec: [1.1, 2.1] },
  { name: "Lettuce", soilTypes: ["Loamy", "Black"], temp: [12, 24], humidity: [60, 85], ph: [6.0, 7.0], moisture: [55, 75], ec: [0.8, 1.6] }
];

function inRange(value, [min, max]) {
  return value >= min && value <= max;
}

function recommendCrops(input) {
  const { soilType, soilMoisture, ec, ph, temperature, humidity } = input;
  return crops
    .map((crop) => {
      let score = 0;
      if (crop.soilTypes.includes(soilType)) score += 20;
      if (inRange(temperature, crop.temp)) score += 20;
      if (inRange(humidity, crop.humidity)) score += 20;
      if (inRange(ph, crop.ph)) score += 20;
      if (inRange(soilMoisture, crop.moisture)) score += 10;
      if (inRange(ec, crop.ec)) score += 10;
      return { crop: crop.name, match: score };
    })
    .sort((a, b) => b.match - a.match)
    .slice(0, 5);
}

module.exports = { recommendCrops };
