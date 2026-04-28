import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, API_SESSION_HELP, ensureAppJwtFromGoogleIdToken, getAuthToken } from "../api";

function formatWhen(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await ensureAppJwtFromGoogleIdToken();
      if (!getAuthToken()) {
        setError(`Authentication required. ${API_SESSION_HELP}`);
        setLoading(false);
        return;
      }
      const { data } = await api.get("/tickets/all");
      const list = Array.isArray(data?.tickets) ? data.tickets : [];
      setTickets(list);
      setSelected((prev) => {
        if (!prev) return list[0] || null;
        const still = list.find((x) => x._id === prev._id);
        return still || list[0] || null;
      });
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setReplyText("");
  }, [selected?._id]);

  async function sendReply() {
    if (!selected) return;
    const text = replyText.trim();
    if (!text) return;
    setSending(true);
    setError("");
    try {
      const { data } = await api.post(`/tickets/reply/${selected._id}`, { message: text });
      if (data?.ticket) {
        setTickets((prev) => prev.map((t) => (t._id === data.ticket._id ? data.ticket : t)));
        setSelected(data.ticket);
        setReplyText("");
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Could not send reply");
    } finally {
      setSending(false);
    }
  }

  async function setStatus(status) {
    if (!selected) return;
    setStatusUpdating(true);
    setError("");
    try {
      const { data } = await api.put(`/tickets/status/${selected._id}`, { status });
      if (data?.ticket) {
        setTickets((prev) => prev.map((t) => (t._id === data.ticket._id ? data.ticket : t)));
        setSelected(data.ticket);
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Could not update status");
    } finally {
      setStatusUpdating(false);
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gaas-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gaas-accent">Administration</p>
          <h1 className="text-2xl font-bold text-gaas-heading">Support tickets</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/admin" className="btn-secondary text-sm">
            ← Admin dashboard
          </Link>
          <Link to="/home" className="btn-secondary text-sm">
            App home
          </Link>
        </div>
      </div>

      {loading && <div className="glass-card p-8 text-center text-gaas-muted">Loading…</div>}
      {!loading && error && !tickets.length && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!loading && tickets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-2 glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-gaas-border bg-gray-50/80">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gaas-heading">All tickets</h2>
            </div>
            <div className="overflow-x-auto max-h-[min(70vh,560px)] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gaas-border text-left text-gaas-muted text-xs">
                    <th className="py-2 px-3 font-medium">User name</th>
                    <th className="py-2 px-3 font-medium">Email</th>
                    <th className="py-2 px-3 font-medium">Subject</th>
                    <th className="py-2 px-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((row) => (
                    <tr
                      key={row._id}
                      onClick={() => setSelected(row)}
                      className={`border-b border-gaas-border/50 cursor-pointer hover:bg-gaas-accent/5 ${
                        selected?._id === row._id ? "bg-gaas-accent/10" : ""
                      }`}
                    >
                      <td className="py-2 px-3 align-top font-medium text-gaas-heading">
                        <span className="block truncate max-w-[120px]" title={row.userName}>
                          {row.userName || "—"}
                        </span>
                      </td>
                      <td className="py-2 px-3 align-top">
                        <span className="text-gaas-text block truncate max-w-[160px]" title={row.userEmail}>
                          {row.userEmail || "—"}
                        </span>
                      </td>
                      <td className="py-2 px-3 align-top font-medium text-gaas-heading">{row.subject}</td>
                      <td className="py-2 px-3 align-top">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            row.status === "resolved" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-3 glass-card p-5 min-h-[320px] flex flex-col">
            {selected ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gaas-heading">{selected.subject}</h2>
                    <p className="text-xs text-gaas-muted mt-1">
                      {selected.userName && <span>{selected.userName} · </span>}
                      <span>{selected.userEmail || "—"}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="ticket-status" className="text-xs text-gaas-muted">
                      Status
                    </label>
                    <select
                      id="ticket-status"
                      className="input-field text-sm py-1.5"
                      value={selected.status}
                      disabled={statusUpdating}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="open">open</option>
                      <option value="resolved">resolved</option>
                    </select>
                  </div>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto max-h-[min(50vh,400px)] border border-gaas-border rounded-lg p-3 bg-gray-50/50 mb-4">
                  <ChatBubble role="user" text={selected.message} at={selected.createdAt} />
                  {(selected.replies || []).map((r) => (
                    <ChatBubble key={r._id || `${r.date}-${r.sender}`} role={r.sender} text={r.message} at={r.date} />
                  ))}
                </div>

                {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

                {selected.status === "open" ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <textarea
                      className="input-field flex-1 min-h-[88px] text-sm resize-y"
                      placeholder="Reply as support…"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <button type="button" className="btn-primary text-sm self-end sm:self-stretch px-6" disabled={sending} onClick={sendReply}>
                      {sending ? "Sending…" : "Send reply"}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gaas-muted">This ticket is resolved. Set status to open to allow more replies.</p>
                )}
              </>
            ) : (
              <p className="text-gaas-muted text-sm">Select a ticket.</p>
            )}
          </div>
        </div>
      )}

      {!loading && !error && tickets.length === 0 && (
        <p className="text-sm text-gaas-muted">No support tickets yet.</p>
      )}
    </div>
  );
}

function ChatBubble({ role, text, at }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-2 text-sm ${
          isUser ? "bg-gaas-accent text-white rounded-br-md" : "bg-white border border-gaas-border text-gaas-text rounded-bl-md"
        }`}
      >
        <p className="text-[10px] uppercase tracking-wide opacity-80 mb-1">{isUser ? "User" : "Admin"}</p>
        <p className="whitespace-pre-wrap">{text}</p>
        <p className={`text-[10px] mt-1 ${isUser ? "text-white/80" : "text-gaas-muted"}`}>{formatWhen(at)}</p>
      </div>
    </div>
  );
}
