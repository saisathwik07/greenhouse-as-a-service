import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../hooks/useAuth";

function formatWhen(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
}

export default function MyTicketsPage() {
  const { isGuest, isAdmin } = useAuth();

  // Admin should see ALL tickets, not just their own
  if (isAdmin) {
    return <Navigate to="/admin/support" replace />;
  }
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});

  const load = useCallback(async () => {
    if (isGuest) {
      setTickets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/tickets/my");
      setTickets(Array.isArray(data?.tickets) ? data.tickets : []);
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || "Failed to load tickets";
      if (status === 401) {
        setError("Session expired — please sign out and sign in again.");
      } else if (status === 403) {
        setError("You are not allowed to view these tickets.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendReply(ticketId) {
    if (isGuest) return;
    const text = String(replyDrafts[ticketId] || "").trim();
    if (!text) return;
    setError("");
    try {
      const { data } = await api.post(`/tickets/reply-user/${ticketId}`, { message: text });
      if (data?.ticket) {
        setTickets((prev) => prev.map((t) => (t._id === ticketId ? data.ticket : t)));
        setReplyDrafts((d) => ({ ...d, [ticketId]: "" }));
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Could not send reply");
    }
  }

  return (
    <div className="space-y-6 animate-in max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gaas-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gaas-accent">Support</p>
          <h1 className="text-2xl font-bold text-gaas-heading">My tickets</h1>
          <p className="text-sm text-gaas-muted mt-1">Only your tickets are shown here.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/help" className="btn-secondary text-sm">
            New ticket
          </Link>
          <Link to="/" className="btn-secondary text-sm">
            Dashboard
          </Link>
        </div>
      </div>

      {isGuest && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Sign in with Google or email to view your support tickets.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!isGuest && loading && <p className="text-sm text-gaas-muted">Loading your tickets…</p>}

      {!isGuest && !loading && tickets.length === 0 && !error && (
        <div className="glass-card p-6 text-center text-gaas-muted text-sm">
          No tickets yet.{" "}
          <Link to="/help" className="text-gaas-accent font-semibold hover:underline">
            Create one
          </Link>
        </div>
      )}

      {!isGuest &&
        !loading &&
        tickets.map((t) => (
          <article key={t._id} className="glass-card p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-gaas-heading">{t.subject}</h2>
                <p className="text-xs text-gaas-muted mt-0.5">{formatWhen(t.createdAt)}</p>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  t.status === "resolved" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"
                }`}
              >
                {t.status}
              </span>
            </div>

            <div className="space-y-2 border-t border-gaas-border pt-3">
              <ChatBubble sender="user" text={t.message} at={t.createdAt} />
              {(t.replies || []).map((r) => (
                <ChatBubble key={r._id || `${r.date}-${r.sender}`} sender={r.sender} text={r.message} at={r.date} />
              ))}
            </div>

            {t.status === "open" && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gaas-border">
                <input
                  className="input-field flex-1 text-sm"
                  placeholder="Reply…"
                  value={replyDrafts[t._id] || ""}
                  onChange={(e) => setReplyDrafts((d) => ({ ...d, [t._id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendReply(t._id);
                    }
                  }}
                />
                <button type="button" className="btn-primary text-sm shrink-0" onClick={() => sendReply(t._id)}>
                  Send
                </button>
              </div>
            )}
          </article>
        ))}
    </div>
  );
}

function ChatBubble({ sender, text, at }) {
  const isUser = sender === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
          isUser ? "bg-gaas-accent text-white rounded-br-md" : "bg-gray-100 text-gaas-text rounded-bl-md border border-gaas-border"
        }`}
      >
        <p className="text-[10px] uppercase tracking-wide opacity-80 mb-1">{isUser ? "You" : "Support"}</p>
        <p className="whitespace-pre-wrap">{text}</p>
        <p className={`text-[10px] mt-1 ${isUser ? "text-white/80" : "text-gaas-muted"}`}>{formatWhen(at)}</p>
      </div>
    </div>
  );
}
