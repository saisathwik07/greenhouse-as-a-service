import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../../api";

const TYPE_META = {
  signup: { dot: "bg-emerald-500", label: "signed up" },
  login: { dot: "bg-sky-500", label: "logged in" },
  login_failed: { dot: "bg-red-500", label: "login failed" },
  subscription_started: { dot: "bg-amber-500", label: "started checkout" },
  subscription_paid: { dot: "bg-emerald-500", label: "paid for" },
  subscription_expired: { dot: "bg-gray-400", label: "expired" },
  feature_used: { dot: "bg-indigo-500", label: "used" },
  download: { dot: "bg-fuchsia-500", label: "downloaded" },
};

function eventLine(e) {
  const meta = TYPE_META[e.type] || { dot: "bg-gray-400", label: e.type };
  const target = e.featureKey
    ? ` · ${e.featureKey}`
    : e.metadata?.plan
    ? ` · ${e.metadata.plan}`
    : "";
  return { meta, text: `${meta.label}${target}` };
}

function formatRelative(ts) {
  const ms = Date.now() - new Date(ts).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export default function ActivityFeed() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const lastSinceRef = useRef(null);
  const seenRef = useRef(new Set());

  useEffect(() => {
    let active = true;
    let timer = null;

    const tick = async () => {
      try {
        const params = lastSinceRef.current
          ? `?since=${encodeURIComponent(lastSinceRef.current)}&limit=20`
          : "?limit=30";
        const { data } = await api.get(`/admin/activity-feed${params}`);
        if (!active) return;
        const fresh = data.events.filter((e) => !seenRef.current.has(e.id));
        if (fresh.length > 0) {
          fresh.forEach((e) => seenRef.current.add(e.id));
          setEvents((prev) => [...fresh, ...prev].slice(0, 60));
          lastSinceRef.current = fresh[0].at;
        } else if (!lastSinceRef.current && data.events.length === 0) {
          lastSinceRef.current = data.asOf;
        } else if (!lastSinceRef.current) {
          lastSinceRef.current = data.events[0]?.at || data.asOf;
        }
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.error || err.message || "Feed error");
      }
    };

    tick();
    timer = setInterval(tick, 8000);
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  return (
    <div className="glass-card p-4 sticky top-4 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider">
          Live activity
        </h3>
        <span className="flex items-center gap-1 text-[10px] text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          live
        </span>
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {events.length === 0 ? (
        <p className="text-xs text-gaas-muted">Waiting for activity...</p>
      ) : (
        <ol className="space-y-3">
          <AnimatePresence initial={false}>
            {events.map((e) => {
              const { meta, text } = eventLine(e);
              return (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex gap-2"
                >
                  <span
                    className={`mt-1 h-2 w-2 rounded-full shrink-0 ${meta.dot}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gaas-text">
                      <span className="font-semibold text-gaas-heading">
                        {e.userName || e.userEmail || "Anonymous"}
                      </span>{" "}
                      {text}
                    </p>
                    <p className="text-[10px] text-gaas-muted">
                      {formatRelative(e.at)}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}
