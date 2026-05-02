import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  api,
  API_SESSION_HELP,
  ensureAppJwtFromGoogleIdToken,
  getAuthToken,
} from "../api";
import {
  PriorityBadge,
  StatusBadge,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "../components/support/TicketBadges";
import AttachmentGallery from "../components/support/AttachmentGallery";
import ScreenshotDropzone from "../components/support/ScreenshotDropzone";

function formatWhen(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "resolved", label: "Resolved" },
];

export default function AdminSupportPage() {
  const [params, setParams] = useSearchParams();
  const initialTicketId = params.get("ticketId") || "";

  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [replyText, setReplyText] = useState("");
  const [replyFiles, setReplyFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    if (statusFilter !== "all") q.set("status", statusFilter);
    if (priorityFilter !== "all") q.set("priority", priorityFilter);
    if (search.trim()) q.set("q", search.trim());
    return q.toString();
  }, [statusFilter, priorityFilter, search]);

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
      const { data } = await api.get(
        `/tickets/all${queryString ? `?${queryString}` : ""}`
      );
      const list = Array.isArray(data?.tickets) ? data.tickets : [];
      setTickets(list);
      setSummary(data?.summary || null);
      setSelected((prev) => {
        if (initialTicketId && list.find((t) => t._id === initialTicketId)) {
          return list.find((t) => t._id === initialTicketId);
        }
        if (!prev) return list[0] || null;
        const still = list.find((x) => x._id === prev._id);
        return still || list[0] || null;
      });
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to load tickets"
      );
    } finally {
      setLoading(false);
    }
  }, [queryString, initialTicketId]);

  useEffect(() => {
    load();
  }, [load]);

  // Sync ?ticketId= when admin clicks a row.
  useEffect(() => {
    if (!selected) return;
    if (params.get("ticketId") !== selected._id) {
      const next = new URLSearchParams(params);
      next.set("ticketId", selected._id);
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?._id]);

  useEffect(() => {
    setReplyText("");
    setReplyFiles([]);
  }, [selected?._id]);

  async function sendReply() {
    if (!selected) return;
    const text = replyText.trim();
    if (!text && replyFiles.length === 0) return;
    setSending(true);
    setError("");
    try {
      const fd = new FormData();
      if (text) fd.append("message", text);
      for (const f of replyFiles) fd.append("screenshots", f);
      const { data } = await api.post(`/tickets/reply/${selected._id}`, fd);
      if (data?.ticket) {
        await load();
        setSelected(data.ticket);
        setReplyText("");
        setReplyFiles([]);
      }
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Could not send reply"
      );
    } finally {
      setSending(false);
    }
  }

  async function setStatus(status) {
    if (!selected) return;
    setStatusUpdating(true);
    setError("");
    try {
      const { data } = await api.put(`/tickets/status/${selected._id}`, {
        status,
      });
      if (data?.ticket) {
        await load();
        setSelected((prev) => (prev ? { ...prev, ...data.ticket } : data.ticket));
      }
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Could not update status"
      );
    } finally {
      setStatusUpdating(false);
    }
  }

  async function setPriorityValue(priority) {
    if (!selected) return;
    setStatusUpdating(true);
    setError("");
    try {
      const { data } = await api.put(`/tickets/priority/${selected._id}`, {
        priority,
      });
      if (data?.ticket) {
        await load();
        setSelected((prev) => (prev ? { ...prev, ...data.ticket } : data.ticket));
      }
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Could not update priority"
      );
    } finally {
      setStatusUpdating(false);
    }
  }

  return (
    <div className="space-y-5 animate-in">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gaas-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gaas-accent">
            Administration
          </p>
          <h1 className="text-[28px] font-bold text-gaas-heading leading-tight">
            Support tickets
          </h1>
          <p className="text-sm text-gaas-muted mt-1">
            Triage, reply and resolve issues raised by users.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin" className="btn-secondary text-sm">
            ← Admin dashboard
          </Link>
          <Link to="/" className="btn-secondary text-sm">
            App home
          </Link>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Total" value={summary.total ?? 0} accent="text-gaas-heading" />
          <StatTile label="Open" value={summary.open ?? 0} accent="text-sky-700" />
          <StatTile
            label="In progress"
            value={summary.in_progress ?? 0}
            accent="text-amber-700"
          />
          <StatTile
            label="Resolved"
            value={summary.resolved ?? 0}
            accent="text-emerald-700"
          />
        </div>
      )}

      {/* Filter bar */}
      <div className="glass-card p-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                statusFilter === tab.id
                  ? "bg-gaas-accent text-white border-gaas-accent"
                  : "bg-white text-gaas-text border-gaas-border hover:border-gaas-accent/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            className="input-field text-sm py-1.5"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="all">All priorities</option>
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
          <input
            type="search"
            className="input-field text-sm py-1.5 w-48"
            placeholder="Search subject or message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && (
        <div className="glass-card p-6 text-center text-gaas-muted">Loading…</div>
      )}

      {!loading && error && !tickets.length && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && tickets.length === 0 && !error && (
        <div className="glass-card p-6 text-center text-sm text-gaas-muted">
          No tickets match the current filters.
        </div>
      )}

      {!loading && tickets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
          <div className="lg:col-span-2 glass-card overflow-hidden">
            <div className="px-3 py-2 border-b border-gaas-border bg-gray-50/80 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gaas-heading">
                Tickets ({tickets.length})
              </h2>
            </div>
            <div className="overflow-x-auto max-h-[min(72vh,640px)] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white shadow-[0_1px_0_#E5E7EB]">
                  <tr className="text-left text-gaas-muted text-[11px]">
                    <th className="py-2 px-3 font-medium">User</th>
                    <th className="py-2 px-3 font-medium">Subject</th>
                    <th className="py-2 px-3 font-medium">Priority</th>
                    <th className="py-2 px-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((row) => (
                    <tr
                      key={row._id}
                      onClick={() => setSelected(row)}
                      className={`border-t border-gaas-border/50 cursor-pointer hover:bg-gaas-accent/5 ${
                        selected?._id === row._id ? "bg-gaas-accent/10" : ""
                      }`}
                    >
                      <td className="py-2 px-3 align-top">
                        <p
                          className="font-medium text-gaas-heading truncate max-w-[140px]"
                          title={row.userName}
                        >
                          {row.userName || "—"}
                        </p>
                        <p
                          className="text-[11px] text-gaas-muted truncate max-w-[160px]"
                          title={row.userEmail}
                        >
                          {row.userEmail || "—"}
                        </p>
                      </td>
                      <td className="py-2 px-3 align-top">
                        <p
                          className="font-medium text-gaas-heading truncate max-w-[200px]"
                          title={row.subject}
                        >
                          {row.subject}
                        </p>
                        <p className="text-[11px] text-gaas-muted">
                          {row.replies?.length || 0} reply ·{" "}
                          {formatWhen(row.lastReplyAt || row.createdAt)}
                        </p>
                      </td>
                      <td className="py-2 px-3 align-top">
                        <PriorityBadge priority={row.priority} />
                      </td>
                      <td className="py-2 px-3 align-top">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-3 glass-card p-4 min-h-[360px] flex flex-col">
            {selected ? (
              <>
                <header className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-gaas-heading">
                      {selected.subject}
                    </h2>
                    <p className="text-xs text-gaas-muted mt-0.5">
                      {selected.userName ? <span>{selected.userName} · </span> : null}
                      <span>{selected.userEmail || "—"}</span>
                      {selected.userInstitution
                        ? ` · ${selected.userInstitution}`
                        : ""}
                    </p>
                    <p className="text-[11px] text-gaas-muted mt-0.5">
                      Opened {formatWhen(selected.createdAt)}
                      {selected.lastReplyAt
                        ? ` · last activity ${formatWhen(selected.lastReplyAt)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="input-field text-xs py-1"
                      value={selected.priority}
                      disabled={statusUpdating}
                      onChange={(e) => setPriorityValue(e.target.value)}
                      aria-label="Priority"
                    >
                      {TICKET_PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          Priority: {p}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input-field text-xs py-1"
                      value={selected.status}
                      disabled={statusUpdating}
                      onChange={(e) => setStatus(e.target.value)}
                      aria-label="Status"
                    >
                      {TICKET_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          Status: {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                    {selected.status !== "resolved" && (
                      <button
                        type="button"
                        className="btn-primary text-xs py-1 px-3"
                        disabled={statusUpdating}
                        onClick={() => setStatus("resolved")}
                      >
                        Mark resolved
                      </button>
                    )}
                  </div>
                </header>

                <div className="flex-1 space-y-2 overflow-y-auto max-h-[min(50vh,420px)] border border-gaas-border rounded-lg p-3 bg-gray-50/50 mb-3">
                  <ChatBubble
                    role="user"
                    senderName={selected.userName}
                    text={selected.message}
                    at={selected.createdAt}
                    attachments={selected.screenshots}
                  />
                  {(selected.replies || []).map((r) => (
                    <ChatBubble
                      key={r._id || `${r.date}-${r.sender}`}
                      role={r.sender}
                      senderName={r.senderName}
                      text={r.message}
                      at={r.date}
                      attachments={r.attachments}
                    />
                  ))}
                </div>

                {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

                {selected.status !== "closed" ? (
                  <div className="space-y-2">
                    <textarea
                      className="input-field w-full min-h-[88px] text-sm resize-y"
                      placeholder="Reply as support…"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <ScreenshotDropzone
                      files={replyFiles}
                      onChange={setReplyFiles}
                      disabled={sending}
                      idPrefix={`admin-reply-${selected._id}`}
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="btn-primary text-sm"
                        disabled={
                          sending ||
                          (!replyText.trim() && replyFiles.length === 0)
                        }
                        onClick={sendReply}
                      >
                        {sending ? "Sending…" : "Send reply"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gaas-muted">
                    Ticket is closed. Reopen via status to allow replies.
                  </p>
                )}
              </>
            ) : (
              <p className="text-gaas-muted text-sm">Select a ticket.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, accent = "text-gaas-heading" }) {
  return (
    <div className="glass-card p-3">
      <p className="text-[10px] uppercase tracking-wide text-gaas-muted font-semibold">
        {label}
      </p>
      <p className={`text-2xl font-extrabold mt-0.5 ${accent}`}>{value}</p>
    </div>
  );
}

function ChatBubble({ role, text, at, attachments, senderName }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-2 text-sm ${
          isUser
            ? "bg-gaas-accent text-white rounded-br-md"
            : "bg-white border border-gaas-border text-gaas-text rounded-bl-md"
        }`}
      >
        <p className="text-[10px] uppercase tracking-wide opacity-80 mb-1">
          {isUser ? `User${senderName ? ` · ${senderName}` : ""}` : `Admin${senderName ? ` · ${senderName}` : ""}`}
        </p>
        {text && <p className="whitespace-pre-wrap">{text}</p>}
        {attachments?.length ? (
          <div className="mt-2">
            <AttachmentGallery attachments={attachments} />
          </div>
        ) : null}
        <p
          className={`text-[10px] mt-1 ${isUser ? "text-white/80" : "text-gaas-muted"}`}
        >
          {formatWhen(at)}
        </p>
      </div>
    </div>
  );
}
