import { useState } from "react";
import { Link } from "react-router-dom";
import { api, API_SESSION_HELP, ensureAppJwtFromGoogleIdToken, getAuthToken } from "../api";
import { useAuth } from "../hooks/useAuth";

export default function HelpPage() {
  const { isGuest, isAdmin } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
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
      const { data } = await api.post("/tickets/create", { subject: s, message: m });
      if (data?.ticket?._id) {
        setCreatedId(data.ticket._id);
        setSubject("");
        setMessage("");
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Could not create ticket");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 animate-in max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gaas-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gaas-accent">Support</p>
          <h1 className="text-2xl font-bold text-gaas-heading">Help &amp; Support</h1>
          <p className="text-sm text-gaas-muted mt-1">Describe your issue — we will respond in your ticket thread.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={isAdmin ? "/admin/support" : "/my-tickets"} className="btn-secondary text-sm">
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
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Ticket submitted.{" "}
          <Link to="/my-tickets" className="font-semibold underline">
            View my tickets
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {isAdmin && (
        <div className="glass-card p-5 text-center text-sm text-gaas-muted">
          Admins manage tickets from the{" "}
          <Link to="/admin/support" className="text-gaas-accent font-semibold hover:underline">
            Support tickets
          </Link>{" "}
          page.
        </div>
      )}

      {!isGuest && !isAdmin && (
        <form onSubmit={handleCreate} className="glass-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider">New ticket</h2>
          <div>
            <label htmlFor="ticket-subject" className="block text-xs font-medium text-gaas-muted mb-1">
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
          <div>
            <label htmlFor="ticket-message" className="block text-xs font-medium text-gaas-muted mb-1">
              Message
            </label>
            <textarea
              id="ticket-message"
              className="input-field w-full min-h-[140px] resize-y"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or question"
              maxLength={8000}
            />
          </div>
          <div className="flex flex-wrap gap-2">
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
