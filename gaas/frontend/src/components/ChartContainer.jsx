import { useRef } from "react";
import { Line, Bar } from "react-chartjs-2";

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: "#374151", font: { family: "Inter", size: 12 } }
    },
    tooltip: {
      backgroundColor: "#FFFFFF",
      titleColor: "#111827",
      bodyColor: "#374151",
      borderColor: "#E5E7EB",
      borderWidth: 1,
      cornerRadius: 8,
      padding: 10
    }
  },
  scales: {
    x: {
      ticks: { color: "#6B7280", font: { size: 10, family: "Inter" }, maxRotation: 45 },
      grid: { color: "rgba(229,231,235,0.5)" }
    },
    y: {
      ticks: { color: "#6B7280", font: { size: 10, family: "Inter" } },
      grid: { color: "rgba(229,231,235,0.5)" }
    }
  }
};

export default function ChartContainer({ title, type = "line", data, options = {}, onDownload, height = 280 }) {
  const chartRef = useRef(null);
  const ChartComponent = type === "bar" ? Bar : Line;

  const mergedOptions = {
    ...chartDefaults,
    ...options,
    plugins: { ...chartDefaults.plugins, ...options.plugins },
    scales: { ...chartDefaults.scales, ...options.scales }
  };

  return (
    <div className="glass-card p-4 animate-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gaas-heading">{title}</h3>
        {onDownload && (
          <button onClick={onDownload} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV
          </button>
        )}
      </div>
      <div style={{ height }}>
        {data && data.labels?.length > 0 ? (
          <ChartComponent ref={chartRef} data={data} options={mergedOptions} />
        ) : (
          <div className="flex items-center justify-center h-full text-gaas-muted text-sm">No data available</div>
        )}
      </div>
    </div>
  );
}
