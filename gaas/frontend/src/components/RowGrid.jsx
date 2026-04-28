import HealthIndicator from "./HealthIndicator";

export default function RowGrid({ rows, onSelectRow }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-gaas-muted">
        <p>Waiting for sensor readings...</p>
      </div>
    );
  }
 return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {rows.map((row) => (
        <button
          key={row.row}
          onClick={() => onSelectRow(row.row)}
          className="glass-card p-5 text-left hover:border-gaas-accent/40 hover:shadow-glow transition-all duration-300 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gaas-heading capitalize">
              🌿 {row.row.replace("row", "Row ")}
            </h3>
            <span className="text-xs text-gaas-muted bg-gray-100 px-2 py-1 rounded-md">
              {row.bagCount} bags
            </span>
          </div>

          {row.latestReading && (
            <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
              <div>
                <p className="text-gaas-muted">Temp</p>
                <p className="font-semibold text-gaas-heading">{row.latestReading.temperature?.toFixed(1)}°C</p>
              </div>
              <div>
                <p className="text-gaas-muted">Humidity</p>
                <p className="font-semibold text-gaas-heading">{row.latestReading.humidity?.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-gaas-muted">Moisture</p>
                <p className="font-semibold text-gaas-heading">{row.latestReading.soil_moisture?.toFixed(1)}%</p>
              </div>
            </div>
          )}

          <HealthIndicator score={row.healthScore} size="sm" />

          <div className="mt-3 text-xs text-gaas-accent opacity-0 group-hover:opacity-100 transition-opacity">
            View bags →
          </div>
        </button>
      ))}
    </div>
  );
}
