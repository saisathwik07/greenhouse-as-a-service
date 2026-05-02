import { useState } from "react";
import { Link } from "react-router-dom";
import {
  api,
  API_SESSION_HELP,
  ensureAppJwtFromGoogleIdToken,
  getAuthToken,
} from "../api";
import { useAuth } from "../hooks/useAuth";
import ScreenshotDropzone from "../components/support/ScreenshotDropzone";
import {
  PriorityBadge,
  TICKET_PRIORITIES,
} from "../components/support/TicketBadges";

const CATEGORIES = [
  { id: "", label: "Choose a category…" },
  { id: "technical", label: "Technical issue" },
  { id: "billing", label: "Billing & subscription" },
  { id: "account", label: "Account & access" },
  { id: "feature_request", label: "Feature request" },
  { id: "other", label: "Other" },
];

const PRIORITY_HINTS = {
  low: "We'll get to it soon.",
  medium: "Standard response time.",
  high: "Important — we'll prioritise.",
  urgent: "Critical — site down or blocking issue.",
};

export default function HelpPage() {
  const { isGuest, isAdmin } = useAuth();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("medium");
  const [files, setFiles] = useState([]);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    if (isGuest) return;
    const s = subject.trim();
    const m = message.trim();
    if (!s || !m) return;

    setSubmitting(true);
    setError("");
    setCreatedId(null);

    try {
      await ensureAppJwtFromGoogleIdToken();
      if (!getAuthToken()) {
        setError(`Sign in required. ${API_SESSION_HELP}`);
        setSubmitting(false);
        return;
      }

      const fd = new FormData();
      fd.append("subject", s);
      fd.append("message", m);
      fd.append("priority", priority);
      if (category) fd.append("category", category);
      for (const f of files) fd.append("screenshots", f);

      const { data } = await api.post("/tickets/create", fd);
      if (data?.ticket?._id) {
        setCreatedId(data.ticket._id);
        setSubject("");
        setMessage("");
        setCategory("");
        setPriority("medium");
        setFiles([]);
      }
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "Could not create ticket"
      );
    } finally {
      setSubmitting(false);
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
            Help &amp; Support
          </h1>
          <p className="text-sm text-gaas-muted mt-1">
            Describe your issue, attach screenshots, and pick a priority — we'll respond in your ticket thread.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={isAdmin ? "/admin/support" : "/my-tickets"}
            className="btn-secondary text-sm"
          >
            {isAdmin ? "All tickets" : "My tickets"}
          </Link>
          <Link to="/" className="btn-secondary text-sm">
            Dashboard
          </Link>
        </div>
      </div>

      {isGuest && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Guest mode cannot create tickets. Please sign in with Google or email.
        </div>
      )}

      {createdId && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 flex items-center justify-between gap-3">
          <span>Ticket submitted — our support team has been notified.</span>
          <Link
            to="/my-tickets"
            className="font-semibold underline whitespace-nowrap"
          >
            View my tickets →
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isAdmin && (
        <div className="glass-card p-5 text-center text-sm text-gaas-muted">
          Admins manage tickets from the{" "}
          <Link
            to="/admin/support"
            className="text-gaas-accent font-semibold hover:underline"
          >
            Support tickets
          </Link>{" "}
          page.
        </div>
      )}

      {!isGuest && !isAdmin && (
        <form onSubmit={handleCreate} className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider">
              New ticket
            </h2>
            <PriorityBadge priority={priority} />
          </div>

          <div>
            <label
              htmlFor="ticket-subject"
              className="block text-xs font-medium text-gaas-muted mb-1"
            >
              Subject
            </label>
            <input
              id="ticket-subject"
              className="input-field w-full"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary"
              maxLength={200}
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="ticket-category"
                className="block text-xs font-medium text-gaas-muted mb-1"
              >
                Category
              </label>
              <select
                id="ticket-category"
                className="input-field w-full"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="ticket-priority"
                className="block text-xs font-medium text-gaas-muted mb-1"
              >
                Priority
              </label>
              <select
                id="ticket-priority"
                className="input-field w-full"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p[0].toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gaas-muted mt-1">
                {PRIORITY_HINTS[priority]}
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="ticket-message"
              className="block text-xs font-medium text-gaas-muted mb-1"
            >
              Message
            </label>
            <textarea
              id="ticket-message"
              className="input-field w-full min-h-[140px] resize-y"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or question. Include steps to reproduce when possible."
              maxLength={8000}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px] text-gaas-muted">
                Markdown isn't rendered — use plain text.
              </p>
              <p className="text-[11px] text-gaas-muted">
                {message.length}/8000
              </p>
            </div>
          </div>

          <div>
            <p className="block text-xs font-medium text-gaas-muted mb-1">
              Screenshots (optional)
            </p>
            <ScreenshotDropzone
              files={files}
              onChange={setFiles}
              disabled={submitting}
              idPrefix="new-ticket"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gaas-border">
            <p className="text-[11px] text-gaas-muted">
              You'll be notified when an admin replies.
            </p>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || !subject.trim() || !message.trim()}
            >
              {submitting ? "Submitting…" : "Submit ticket"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
