import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../hooks/useAuth";
import {
  PriorityBadge,
  StatusBadge,
} from "../components/support/TicketBadges";
import AttachmentGallery from "../components/support/AttachmentGallery";
import ScreenshotDropzone from "../components/support/ScreenshotDropzone";

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
  if (isAdmin) return <Navigate to="/admin/support" replace />;

  const [params, setParams] = useSearchParams();
  const initialOpen = params.get("ticketId") || "";

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState(initialOpen);
  const [drafts, setDrafts] = useState({});
  const [draftFiles, setDraftFiles] = useState({});
  const [sendingId, setSendingId] = useState("");

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
      const msg =
        err?.response?.data?.error || err?.message || "Failed to load tickets";
      setError(
        status === 401
          ? "Session expired — please sign out and sign in again."
          : msg
      );
    } finally {
      setLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep ?ticketId= in sync with the expanded ticket so notifications can deep-link.
  useEffect(() => {
    if (expanded) {
      if (params.get("ticketId") !== expanded) {
        const next = new URLSearchParams(params);
        next.set("ticketId", expanded);
        setParams(next, { replace: true });
      }
    } else if (params.get("ticketId")) {
      const next = new URLSearchParams(params);
      next.delete("ticketId");
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const counts = useMemo(() => {
    const c = { all: tickets.length, open: 0, in_progress: 0, resolved: 0 };
    for (const t of tickets) {
      if (t.status in c) c[t.status] += 1;
    }
    return c;
  }, [tickets]);

  async function sendReply(ticketId) {
    if (isGuest) return;
    const text = String(drafts[ticketId] || "").trim();
    const files = draftFiles[ticketId] || [];
    if (!text && files.length === 0) return;

    setSendingId(ticketId);
    setError("");
    try {
      const fd = new FormData();
      if (text) fd.append("message", text);
      for (const f of files) fd.append("screenshots", f);

      const { data } = await api.post(`/tickets/reply-user/${ticketId}`, fd);
      if (data?.ticket) {
        setTickets((prev) =>
          prev.map((t) => (t._id === ticketId ? data.ticket : t))
        );
        setDrafts((d) => ({ ...d, [ticketId]: "" }));
        setDraftFiles((d) => ({ ...d, [ticketId]: [] }));
      }
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Could not send reply"
      );
    } finally {
      setSendingId("");
    }
  }

  return (
    <div className="space-y-5 animate-in max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gaas-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gaas-accent">
            Support
          </p>
          <h1 className="text-[28px] font-bold text-gaas-heading leading-tight">
            My tickets
          </h1>
          <p className="text-sm text-gaas-muted mt-1">
            Track conversations with our support team and reply with screenshots.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/help" className="btn-primary text-sm">
            + New ticket
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
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isGuest && !loading && tickets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: `All (${counts.all})` },
            { id: "open", label: `Open (${counts.open})` },
            { id: "in_progress", label: `In progress (${counts.in_progress})` },
            { id: "resolved", label: `Resolved (${counts.resolved})` },
          ].map((tab) => (
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
      )}

      {!isGuest && loading && (
        <p className="text-sm text-gaas-muted">Loading your tickets…</p>
      )}

      {!isGuest && !loading && filtered.length === 0 && !error && (
        <div className="glass-card p-6 text-center text-gaas-muted text-sm">
          {tickets.length === 0 ? (
            <>
              No tickets yet.{" "}
              <Link
                to="/help"
                className="text-gaas-accent font-semibold hover:underline"
              >
                Create your first ticket
              </Link>
            </>
          ) : (
            <>No tickets in this view.</>
          )}
        </div>
      )}

      {!isGuest &&
        !loading &&
        filtered.map((t) => {
          const isOpenThread = t.status === "open" || t.status === "in_progress";
          const isExpanded = expanded === t._id;
          return (
            <article key={t._id} className="glass-card p-4 space-y-3">
              <header
                className="flex flex-wrap items-start justify-between gap-2 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? "" : t._id)}
              >
                <div className="min-w-0">
                  <h2 className="font-semibold text-gaas-heading truncate">
                    {t.subject}
                  </h2>
                  <p className="text-[11px] text-gaas-muted mt-0.5">
                    Opened {formatWhen(t.createdAt)}
                    {t.lastReplyAt
                      ? ` · last activity ${formatWhen(t.lastReplyAt)}`
                      : ""}
                    {t.replies?.length
                      ? ` · ${t.replies.length} repl${t.replies.length === 1 ? "y" : "ies"}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </header>

              {isExpanded && (
                <>
                  <div className="space-y-2 border-t border-gaas-border pt-3">
                    <ChatBubble
                      sender="user"
                      text={t.message}
                      at={t.createdAt}
                      attachments={t.screenshots}
                    />
                    {(t.replies || []).map((r) => (
                      <ChatBubble
                        key={r._id || `${r.date}-${r.sender}`}
                        sender={r.sender}
                        text={r.message}
                        at={r.date}
                        attachments={r.attachments}
                        senderName={r.senderName}
                      />
                    ))}
                  </div>

                  {isOpenThread ? (
                    <div className="border-t border-gaas-border pt-3 space-y-2">
                      <textarea
                        className="input-field w-full text-sm min-h-[80px] resize-y"
                        placeholder="Reply to support…"
                        value={drafts[t._id] || ""}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [t._id]: e.target.value }))
                        }
                      />
                      <ScreenshotDropzone
                        files={draftFiles[t._id] || []}
                        onChange={(next) =>
                          setDraftFiles((d) => ({ ...d, [t._id]: next }))
                        }
                        disabled={sendingId === t._id}
                        idPrefix={`reply-${t._id}`}
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="btn-primary text-sm"
                          disabled={
                            sendingId === t._id ||
                            (!String(drafts[t._id] || "").trim() &&
                              !(draftFiles[t._id] || []).length)
                          }
                          onClick={() => sendReply(t._id)}
                        >
                          {sendingId === t._id ? "Sending…" : "Send reply"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gaas-muted border-t border-gaas-border pt-3">
                      This ticket is {t.status}. Send another reply to reopen the conversation.
                      <button
                        type="button"
                        className="ml-2 text-gaas-accent font-semibold hover:underline"
                        onClick={() => {
                          setDrafts((d) => ({ ...d, [t._id]: d[t._id] || " " }));
                        }}
                      >
                        Reopen with a reply
                      </button>
                    </p>
                  )}
                </>
              )}
            </article>
          );
        })}
    </div>
  );
}

function ChatBubble({ sender, text, at, attachments, senderName }) {
  const isUser = sender === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
          isUser
            ? "bg-gaas-accent text-white rounded-br-md"
            : "bg-gray-100 text-gaas-text rounded-bl-md border border-gaas-border"
        }`}
      >
        <p className="text-[10px] uppercase tracking-wide opacity-80 mb-1">
          {isUser ? "You" : senderName ? `Support · ${senderName}` : "Support"}
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
