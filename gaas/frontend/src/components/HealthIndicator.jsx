export default function HealthIndicator({ score, size = "md" }) {
  const safeScore = score ?? 0;
  const percentage = (safeScore / 50) * 100;

  let status, badgeClass, barColor;
  if (safeScore >= 36) {
    status = "Healthy";
    badgeClass = "badge-healthy";
    barColor = "bg-gaas-healthy";
  } else if (safeScore >= 21) {
    status = "Moderate";
    badgeClass = "badge-moderate";
    barColor = "bg-gaas-moderate";
  } else {
    status = "Unhealthy";
    badgeClass = "badge-unhealthy";
    barColor = "bg-gaas-unhealthy";
  }

  if (size === "sm") {
    return (
      <div className="flex items-center gap-2">
        <span className={badgeClass}>{status}</span>
        <span className="text-xs font-semibold text-gaas-heading tabular-nums">{safeScore}/50</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={badgeClass}>{status}</span>
          <span className="text-sm font-bold text-gaas-heading tabular-nums">{safeScore} / 50</span>
        </div>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gaas-muted">
        0-20 unhealthy · 21-35 moderate · 36-50 healthy
      </p>
    </div>
  );
}
