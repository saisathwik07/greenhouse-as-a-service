const ResearchDataset = require("../models/ResearchDataset");

async function seedResearchData() {
  const count = await ResearchDataset.countDocuments();
  if (count > 0) return;

  await ResearchDataset.insertMany([
    {
      cropType: "Tomato",
      location: "Bengaluru",
      treatments: ["NPK", "Drip"],
      date: new Date("2026-02-10"),
      metrics: { yield: 28.1, avgTemperature: 25.2, avgHumidity: 66, avgPH: 6.4 }
    },
    {
      cropType: "Lettuce",
      location: "Pune",
      treatments: ["Hydroponic", "Micronutrients"],
      date: new Date("2026-01-22"),
      metrics: { yield: 19.4, avgTemperature: 22.1, avgHumidity: 73, avgPH: 6.1 }
    },
    {
      cropType: "Chili",
      location: "Hyderabad",
      treatments: ["Potassium Boost", "Fogging"],
      date: new Date("2026-03-05"),
      metrics: { yield: 24.8, avgTemperature: 27.7, avgHumidity: 61, avgPH: 6.6 }
    }
  ]);
}

module.exports = { seedResearchData };
