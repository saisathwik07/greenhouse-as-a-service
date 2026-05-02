/**
 * Visual primitives for ticket status + priority. Tailwind colour tokens are
 * picked so they fit on top of `gaas-bg` cards without overpowering the page.
 */

const STATUS_STYLES = {
  open: "bg-sky-100 text-sky-800 border-sky-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  closed: "bg-gray-200 text-gray-700 border-gray-300",
};

const STATUS_LABEL = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

const PRIORITY_STYLES = {
  low: "bg-gray-100 text-gray-700 border-gray-200",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  urgent: "bg-red-100 text-red-800 border-red-200",
};

const PRIORITY_DOT = {
  low: "bg-gray-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export function StatusBadge({ status, className = "" }) {
  const cls = STATUS_STYLES[status] || STATUS_STYLES.open;
  const label = STATUS_LABEL[status] || status;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cls} ${className}`}
    >
      {label}
    </span>
  );
}

export function PriorityBadge({ priority, className = "" }) {
  const cls = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
  const dot = PRIORITY_DOT[priority] || PRIORITY_DOT.medium;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cls} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {priority}
    </span>
  );
}

export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"];
export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"];
