import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getAuthToken } from "../api";

const POLL_MS = 30_000;

function formatRelative(d) {
  if (!d) return "";
  const ms = Date.now() - new Date(d).getTime();
  if (Number.isNaN(ms)) return "";
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

/**
 * In-app notification bell. Polls /notifications/unread-count every 30s and
 * lazy-loads the list on open. Designed to slot inside the existing Navbar
 * without breaking layout when not authenticated (renders nothing).
 */
export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  const refreshCount = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      const { data } = await api.get("/notifications/unread-count");
      setCount(Number(data?.count || 0));
    } catch (_err) {
      // Silent — notifications are non-critical.
    }
  }, []);

  const loadList = useCallback(async () => {
    if (!getAuthToken()) return;
    setLoading(true);
    try {
      const { data } = await api.get("/notifications?limit=15");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (_err) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(id);
  }, [refreshCount]);

  useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function markAllRead() {
    try {
      await api.post("/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setCount(0);
    } catch (_err) {
      /* ignore */
    }
  }

  async function handleClick(n) {
    setOpen(false);
    try {
      if (!n.read) {
        await api.post(`/notifications/${n.id}/read`);
        setCount((c) => Math.max(0, c - 1));
      }
    } catch (_err) {
      /* ignore */
    }
    if (n.link) navigate(n.link);
  }

  if (!getAuthToken()) return null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 transition"
        title="Notifications"
        aria-label="Notifications"
      >
        <BellIcon />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] max-w-[90vw] rounded-xl border border-gaas-border bg-white shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gaas-border">
            <p className="text-sm font-bold text-gaas-heading">Notifications</p>
            <button
              type="button"
              onClick={markAllRead}
              disabled={count === 0}
              className="text-xs text-gaas-accent font-semibold hover:underline disabled:opacity-50 disabled:hover:no-underline"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && (
              <p className="text-sm text-gaas-muted px-4 py-6 text-center">
                Loading…
              </p>
            )}
            {!loading && items.length === 0 && (
              <p className="text-sm text-gaas-muted px-4 py-6 text-center">
                You're all caught up.
              </p>
            )}
            {!loading &&
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-gaas-border/60 hover:bg-gaas-bg transition ${
                    !n.read ? "bg-gaas-accent/5" : ""
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                      n.read ? "bg-transparent" : "bg-gaas-accent"
                    }`}
                    aria-hidden
                  />
                  <span className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gaas-heading truncate">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-gaas-muted line-clamp-2">
                        {n.body}
                      </p>
                    )}
                    <p className="text-[10px] uppercase tracking-wide text-gaas-muted mt-0.5">
                      {formatRelative(n.createdAt)}
                    </p>
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-slate-700"
      aria-hidden
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
