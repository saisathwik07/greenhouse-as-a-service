const ICONS = {
  temperature: "🌡️",
  humidity: "💧",
  soil_moisture: "🌍",
  ph: "⚗️",
  ec: "⚡"
};

const UNITS = {
  temperature: "°C",
  humidity: "%",
  soil_moisture: "%",
  ph: "",
  ec: "mS/cm"
};

const LABELS = {
  temperature: "Temperature",
  humidity: "Humidity",
  soil_moisture: "Soil Moisture",
  ph: "pH Level",
  ec: "EC"
};

export default function SensorCard({ sensorKey, value, previousValue }) {
  const unit = UNITS[sensorKey] || "";
  const label = LABELS[sensorKey] || sensorKey;
  const displayValue = value != null ? Number(value).toFixed(sensorKey === "ph" || sensorKey === "ec" ? 2 : 1) : "--";

  return (
    <div className="glass-card p-4 hover:border-gaas-accent/40 transition-all duration-300">
      <p className="text-xs font-semibold text-gaas-accent uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold text-gaas-heading tabular-nums">
        {displayValue}
        {value != null && <span className="text-sm font-normal text-gaas-muted ml-1">{unit}</span>}
      </p>
    </div>
  );
}
