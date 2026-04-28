require("dotenv").config();
const XLSX = require("xlsx");
const mongoose = require("mongoose");
const SensorReading = require("../src/models/SensorReading");

function parseDateAndTime(dateValue, timeValue) {
  if (!dateValue) return new Date();
  const dateStr = String(dateValue).trim();
  const [day, month, year] = dateStr.split("/").map((v) => Number(v));
  const base = new Date(year, month - 1, day, 0, 0, 0, 0);

  const dayFraction = Number(timeValue || 0);
  const totalSeconds = Math.round(dayFraction * 24 * 60 * 60);
  base.setSeconds(base.getSeconds() + totalSeconds);
  return base;
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error("Usage: node scripts/importWorkbook.js <xlsx-file-path>");
  }

  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/gaas";
  await mongoose.connect(mongoUri);

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const docs = rows.map((row) => ({
    temperature: num(row.tempc_sht),
    humidity: num(row.hum_sht),
    soil_moisture: num(row.soil_moisture),
    ph: num(row.ph1_soil),
    ec: num(row.soil_conductivity),
    sourceTopic: "xlsx-import",
    timestamp: parseDateAndTime(row.Date, row.Time)
  }));

  const filtered = docs.filter((d) => d.timestamp && [d.temperature, d.humidity, d.soil_moisture, d.ph, d.ec].some((x) => x !== undefined));
  await SensorReading.insertMany(filtered, { ordered: false });

  console.log(`Imported ${filtered.length} sensor rows from workbook`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Import failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch (_e) {}
  process.exit(1);
});
