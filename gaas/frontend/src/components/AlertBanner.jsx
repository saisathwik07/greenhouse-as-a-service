export default function AlertBanner({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <p className="text-sm text-gaas-muted">No active alerts.</p>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div key={`${alert.type}-${i}`} className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <span className="text-sm">⚠️</span>
          <p className="text-sm text-red-700">{alert.message}</p>
        </div>
      ))}
    </div>
  );
}
