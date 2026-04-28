const XLSX = require("xlsx");

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: node scripts/inspectWorkbook.js <xlsx-file-path>");
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
console.log("Sheets:", workbook.SheetNames.join(", "));

workbook.SheetNames.forEach((name) => {
  const sheet = workbook.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const header = rows[0] || [];
  console.log(`\n[${name}]`);
  console.log("Columns:", header.map((h) => String(h).trim()).join(" | "));
  console.log("Preview rows:", Math.min(3, Math.max(0, rows.length - 1)));
  for (let i = 1; i <= Math.min(3, rows.length - 1); i += 1) {
    console.log(JSON.stringify(rows[i]));
  }
});
