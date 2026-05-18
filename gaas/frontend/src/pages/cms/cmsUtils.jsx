import { useState } from "react";

export function toast(msg, ok = true) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.className = `fixed top-4 right-4 z-[9999] rounded-lg px-5 py-3 text-sm font-semibold shadow-lg transition-all ${
    ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
  }`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

export function Field({ label, value, onChange, type = "text", rows, placeholder }) {
  const cls =
    "w-full rounded-lg border border-gaas-border bg-white px-3 py-2 text-sm focus:border-gaas-accent focus:outline-none focus:ring-1 focus:ring-gaas-accent/30 transition";
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gaas-muted">
        {label}
      </label>
      {rows ? (
        <textarea className={cls} rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input className={cls} type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

export function SectionCard({ icon, title, children, defaultOpen = false, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card overflow-hidden transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-gray-50/50"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gaas-accent-glow text-base shrink-0">{icon}</span>
        <span className="flex-1 text-sm font-bold text-gaas-heading">{title}</span>
        {badge && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">{badge}</span>}
        <svg className={`h-4 w-4 text-gaas-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && <div className="border-t border-gaas-border p-5 space-y-4">{children}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, action, onAction }) {
  return (
    <div className="glass-card p-12 text-center">
      <span className="text-4xl mb-3 block">{icon}</span>
      <p className="text-sm text-gaas-muted mb-4">{title}</p>
      {action && (
        <button onClick={onAction} className="btn-primary text-sm px-5 py-2">{action}</button>
      )}
    </div>
  );
}

export function StatusBadge({ active, activeLabel = "Active", inactiveLabel = "Inactive" }) {
  return (
    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${
      active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
    }`}>
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className={`block w-10 h-5 rounded-full transition ${checked ? "bg-gaas-accent" : "bg-gray-300"}`} />
        <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${checked ? "translate-x-5" : ""}`} />
      </div>
      {label && <span className="text-xs font-medium text-gaas-muted">{label}</span>}
    </label>
  );
}
