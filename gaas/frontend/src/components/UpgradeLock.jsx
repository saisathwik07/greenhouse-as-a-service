import { useNavigate } from "react-router-dom";

export default function UpgradeLock({
  title = "Upgrade Required",
  message = "This feature is available on higher plans.",
}) {
  const navigate = useNavigate();

  return (
    <div className="absolute inset-0 z-20 rounded-xl bg-white/70 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="max-w-sm w-full rounded-xl border border-gaas-border bg-white shadow-sm p-5 text-center">
        <p className="text-xl mb-2">🔒</p>
        <h3 className="text-base font-semibold text-gaas-heading">{title}</h3>
        <p className="text-sm text-gaas-muted mt-1">{message}</p>
        <button
          type="button"
          onClick={() => navigate("/subscription")}
          className="btn-primary mt-4 w-full"
        >
          View Plans
        </button>
      </div>
    </div>
  );
}
