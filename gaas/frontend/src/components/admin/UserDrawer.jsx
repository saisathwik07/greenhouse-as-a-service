import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../../api";
import ConfirmModal from "./ConfirmModal";

const PLAN_OPTIONS = [
  { value: "basic", label: "Basic" },
  { value: "pro", label: "Pro" },
];

const DURATION_OPTIONS = [
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 180, label: "180 days" },
  { value: 365, label: "365 days" },
];

const AUDIT_LABELS = {
  user_blocked: "Blocked user",
  user_unblocked: "Unblocked user",
  user_deleted: "Deleted user",
  subscription_upgraded: "Upgraded subscription",
  subscription_downgraded: "Downgraded subscription",
  subscription_extended: "Extended subscription",
  subscription_cancelled: "Cancelled subscription",
  quota_reset: "Reset usage quota",
  plan_updated: "Updated plan",
};

function formatINR(value) {
  const n = Number(value || 0);
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function institutionLabelFor(userType) {
  switch ((userType || "").toLowerCase()) {
    case "student":
      return "College / University";
    case "researcher":
      return "Organization / Lab";
    case "faculty":
      return "Institution";
    default:
      return "Institution";
  }
}

function StatusBadge({ status }) {
  const cls =
    {
      success: "bg-emerald-100 text-emerald-800",
      pending: "bg-amber-100 text-amber-800",
      failed: "bg-red-100 text-red-700",
      expired: "bg-gray-100 text-gray-600",
    }[status] || "bg-gray-100 text-gray-700";
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${cls}`}
    >
      {status || "?"}
    </span>
  );
}

const drawerVariants = {
  hidden: { x: "100%" },
  visible: { x: 0, transition: { type: "spring", damping: 28, stiffness: 280 } },
  exit: { x: "100%", transition: { duration: 0.18 } },
};

export default function UserDrawer({ userId, onClose, onUserChanged, currentAdminId }) {
  const [data, setData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState({ open: false });
  const [planChoice, setPlanChoice] = useState("pro");
  const [durationChoice, setDurationChoice] = useState(30);
  const [extendDays, setExtendDays] = useState(30);
  const [reason, setReason] = useState("");

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      const [insights, logs] = await Promise.all([
        api.get(`/admin/users/${userId}/insights`),
        api
          .get(`/admin/users/${userId}/audit-logs?limit=20`)
          .catch(() => ({ data: { logs: [] } })),
      ]);
      setData(insights.data);
      setAuditLogs(logs.data?.logs || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to load");
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    setError("");
    setActionError("");
    setActionSuccess("");
    setData(null);
    setAuditLogs([]);
    (async () => {
      try {
        const [insights, logs] = await Promise.all([
          api.get(`/admin/users/${userId}/insights`),
          api
            .get(`/admin/users/${userId}/audit-logs?limit=20`)
            .catch(() => ({ data: { logs: [] } })),
        ]);
        if (!active) return;
        setData(insights.data);
        setAuditLogs(logs.data?.logs || []);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.error || err.message || "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  function flashSuccess(msg) {
    setActionError("");
    setActionSuccess(msg);
    if (typeof window !== "undefined") {
      setTimeout(() => setActionSuccess(""), 3500);
    }
  }

  async function runAction(label, fn) {
    setActionError("");
    try {
      await fn();
      await reload();
      flashSuccess(label);
      onUserChanged?.();
    } catch (err) {
      const msg =
        err?.response?.data?.error || err.message || "Action failed";
      setActionError(msg);
      throw err;
    }
  }

  function openConfirm(spec) {
    setConfirm({ open: true, ...spec });
  }
  function closeConfirm() {
    setConfirm({ open: false });
  }

  const profile = data?.profile;
  const isBlocked = !!profile?.isBlocked;
  const isAdminTarget = String(profile?.role || "").toLowerCase() === "admin";
  const isSelf =
    currentAdminId && profile && String(currentAdminId) === String(profile.id);
  const restricted = isAdminTarget || isSelf;

  return (
    <AnimatePresence>
      {userId && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
            onClick={onClose}
          />
          <motion.aside
            key="drawer"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={drawerVariants}
            className="fixed top-0 right-0 z-50 h-full w-full max-w-2xl bg-white border-l border-gaas-border shadow-2xl overflow-y-auto"
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gaas-border px-5 py-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-gaas-heading">
                User insights
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gaas-muted hover:text-gaas-heading text-xl leading-none"
                aria-label="Close drawer"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-5">
              {loading && <p className="text-sm text-gaas-muted">Loading...</p>}
              {error && (
                <p className="text-sm rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2">
                  {error}
                </p>
              )}

              {data && (
                <>
                  <section>
                    <p className="text-xs uppercase tracking-wide text-gaas-muted">
                      Profile
                    </p>
                    <div className="flex items-start justify-between gap-3 mt-1">
                      <div>
                        <h3 className="text-xl font-bold text-gaas-heading">
                          {data.profile.name}
                        </h3>
                        <p className="text-sm text-gaas-muted">
                          {data.profile.email}
                        </p>
                      </div>
                      {isBlocked && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold uppercase tracking-wide">
                          Blocked
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <p className="text-xs text-gaas-muted">Role</p>
                        <p className="font-medium capitalize">{data.profile.role}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gaas-muted">Plan</p>
                        <p className="font-medium">{data.profile.planLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gaas-muted">User type</p>
                        <p className="font-medium">{data.profile.userTypeLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gaas-muted">Purpose of usage</p>
                        <p className="font-medium capitalize">
                          {data.profile.purposeOfUsage || "—"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gaas-muted">
                          {institutionLabelFor(data.profile.userType)}
                        </p>
                        <p className="font-medium">
                          {data.profile.institution || "—"}
                        </p>
                      </div>
                      {data.profile.userType === "student" && (
                        <>
                          <div>
                            <p className="text-xs text-gaas-muted">Degree</p>
                            <p className="font-medium">{data.profile.degree || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gaas-muted">Year</p>
                            <p className="font-medium">
                              {data.profile.yearOfStudy || "—"}
                            </p>
                          </div>
                        </>
                      )}
                      {data.profile.userType === "researcher" && (
                        <div className="col-span-2">
                          <p className="text-xs text-gaas-muted">Research domain</p>
                          <p className="font-medium">
                            {data.profile.researchDomain || "—"}
                          </p>
                        </div>
                      )}
                      {data.profile.userType === "faculty" && (
                        <div className="col-span-2">
                          <p className="text-xs text-gaas-muted">Department</p>
                          <p className="font-medium">{data.profile.department || "—"}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gaas-muted">Joined</p>
                        <p className="font-medium">
                          {formatDate(data.profile.joinDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gaas-muted">Logins</p>
                        <p className="font-medium">{data.profile.loginCount}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gaas-muted">Last active</p>
                        <p className="font-medium">
                          {formatDateTime(
                            data.profile.lastActiveAt || data.profile.lastLoginAt
                          )}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Stat
                      label="Total spent"
                      value={formatINR(data.summary.totalSpent)}
                      accent="text-gaas-accent"
                    />
                    <Stat
                      label="Invoices"
                      value={data.summary.invoicesCount}
                    />
                    <Stat
                      label="Downloads"
                      value={data.summary.downloadsCount}
                    />
                    <Stat
                      label="Feature calls"
                      value={data.summary.featureCallsCount}
                    />
                  </section>

                  <section>
                    <p className="text-xs uppercase tracking-wide text-gaas-muted mb-2">
                      Services used
                    </p>
                    {data.services.owned.length === 0 ? (
                      <p className="text-xs text-gaas-muted">None purchased</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {data.services.owned.map((s) => (
                          <span
                            key={s.id}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium"
                          >
                            {s.label}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs uppercase tracking-wide text-gaas-muted mt-4 mb-2">
                      Services not used
                    </p>
                    {data.services.notOwned.length === 0 ? (
                      <p className="text-xs text-gaas-muted">All features unlocked</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {data.services.notOwned.map((s) => (
                          <span
                            key={s.id}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium"
                          >
                            {s.label}
                            {s.price ? ` · ${formatINR(s.price)}/mo` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <p className="text-xs uppercase tracking-wide text-gaas-muted mb-2">
                      Feature usage
                    </p>
                    {data.featureUsage.length === 0 ? (
                      <p className="text-xs text-gaas-muted">No tracked feature calls.</p>
                    ) : (
                      <ul className="text-sm space-y-1">
                        {data.featureUsage.map((f) => (
                          <li
                            key={f.featureKey}
                            className="flex items-center justify-between border-b border-gaas-border/60 py-1"
                          >
                            <span className="font-medium text-gaas-heading">
                              {f.label}
                            </span>
                            <span className="text-xs text-gaas-muted">
                              {f.count} calls · last {formatDateTime(f.lastUsed)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <p className="text-xs uppercase tracking-wide text-gaas-muted mb-2">
                      Payment history
                    </p>
                    {data.paymentHistory.length === 0 ? (
                      <p className="text-xs text-gaas-muted">No invoices yet.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-[10px] uppercase tracking-wide text-gaas-muted">
                            <th className="py-1 pr-2">Invoice</th>
                            <th className="py-1 pr-2">Plan</th>
                            <th className="py-1 pr-2">Amount</th>
                            <th className="py-1">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.paymentHistory.map((p) => (
                            <tr key={p.id} className="border-t border-gaas-border/60">
                              <td className="py-1 pr-2 font-mono">
                                {p.invoiceNumber}
                              </td>
                              <td className="py-1 pr-2">
                                {p.planLabel} · {p.duration}
                              </td>
                              <td className="py-1 pr-2 font-semibold">
                                {formatINR(p.totalAmount)}
                              </td>
                              <td className="py-1">
                                <StatusBadge status={p.paymentStatus} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </section>

                  <section>
                    <p className="text-xs uppercase tracking-wide text-gaas-muted mb-2">
                      Datasets downloaded
                    </p>
                    {data.downloads.length === 0 ? (
                      <p className="text-xs text-gaas-muted">No downloads recorded.</p>
                    ) : (
                      <ul className="text-xs space-y-1">
                        {data.downloads.slice(0, 10).map((d) => (
                          <li
                            key={d.id}
                            className="flex items-center justify-between border-b border-gaas-border/60 py-1"
                          >
                            <span className="font-medium">{d.kind}</span>
                            <span className="text-gaas-muted">
                              {formatDateTime(d.at)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <p className="text-xs uppercase tracking-wide text-gaas-muted mb-2">
                      Recent activity
                    </p>
                    <ol className="text-xs space-y-1">
                      {data.activity.slice(0, 12).map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center justify-between border-b border-gaas-border/60 py-1"
                        >
                          <span>
                            <span className="font-medium text-gaas-heading">
                              {e.type}
                            </span>
                            {e.featureKey ? (
                              <span className="text-gaas-muted"> · {e.featureKey}</span>
                            ) : null}
                          </span>
                          <span className="text-gaas-muted">{formatDateTime(e.at)}</span>
                        </li>
                      ))}
                    </ol>
                  </section>

                  <section className="rounded-xl border border-gaas-border bg-gaas-accent/5 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wide text-gaas-muted font-bold">
                        Admin actions
                      </p>
                      {restricted && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gaas-muted font-semibold uppercase">
                          {isSelf ? "Your account" : "Admin user"}
                        </span>
                      )}
                    </div>
                    {restricted && (
                      <p className="text-[11px] text-gaas-muted mt-1">
                        Block / delete are disabled for this account.
                      </p>
                    )}

                    {actionError && (
                      <p className="mt-3 text-xs rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2">
                        {actionError}
                      </p>
                    )}
                    {actionSuccess && (
                      <p className="mt-3 text-xs rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2">
                        {actionSuccess}
                      </p>
                    )}

                    {isBlocked && profile?.blockedReason && (
                      <p className="mt-3 text-xs rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2">
                        Reason: {profile.blockedReason}
                      </p>
                    )}

                    {/* Block / Unblock + Delete */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {isBlocked ? (
                        <button
                          type="button"
                          disabled={restricted}
                          onClick={() =>
                            openConfirm({
                              tone: "warning",
                              title: "Unblock user",
                              description:
                                "This user will be able to log in and use the platform again.",
                              confirmLabel: "Unblock",
                              onConfirm: async () => {
                                await runAction("User unblocked", () =>
                                  api.post(`/admin/users/${userId}/unblock`)
                                );
                                closeConfirm();
                              },
                            })
                          }
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Unblock user
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={restricted}
                          onClick={() => {
                            setReason("");
                            openConfirm({
                              tone: "warning",
                              title: "Block this user?",
                              description:
                                "They will be signed out and unable to log in until you unblock them. Existing sessions are revoked on next request.",
                              confirmLabel: "Block user",
                              onConfirm: async () => {
                                await runAction("User blocked", () =>
                                  api.post(`/admin/users/${userId}/block`, {
                                    reason: reason.trim(),
                                  })
                                );
                                closeConfirm();
                              },
                              extra: (
                                <div>
                                  <label className="text-xs text-gaas-muted">
                                    Reason (optional)
                                  </label>
                                  <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="e.g. Spam reports"
                                    className="mt-1 w-full text-sm border border-gaas-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gaas-accent/40"
                                  />
                                </div>
                              ),
                            });
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                        >
                          Block user
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={restricted}
                        onClick={() =>
                          openConfirm({
                            tone: "danger",
                            title: "Permanently delete this user?",
                            description: (
                              <>
                                This removes the user and all related data —
                                subscriptions, payments, activity events,
                                notifications, and tickets. <br />
                                This action <strong>cannot be undone</strong>.
                              </>
                            ),
                            confirmLabel: "Delete forever",
                            confirmText: profile?.email,
                            onConfirm: async () => {
                              const targetUserId = String(
                                profile?.id || userId || ""
                              ).trim();
                              await runAction("User deleted", () =>
                                // POST avoids proxies/CDNs that mishandle DELETE + JSON body
                                // (often surfaced as misleading 404s). DELETE remains on the server for API clients.
                                api.post(
                                  `/admin/users/${encodeURIComponent(targetUserId)}/permanent-delete`,
                                  { confirmEmail: profile?.email }
                                )
                              );
                              closeConfirm();
                              onClose?.();
                            },
                          })
                        }
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Delete account
                      </button>
                    </div>

                    {/* Subscription management */}
                    <div className="mt-4 rounded-lg border border-gaas-border bg-white p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gaas-muted font-bold">
                        Subscription
                      </p>
                      <p className="text-xs text-gaas-muted">
                        Current plan:{" "}
                        <span className="font-semibold text-gaas-heading capitalize">
                          {profile?.plan || "free"}
                        </span>
                        {profile?.planEndDate ? (
                          <>
                            {" "}
                            · ends {formatDate(profile.planEndDate)}
                          </>
                        ) : (
                          " · no expiry"
                        )}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 items-end">
                        <div>
                          <label className="text-[11px] text-gaas-muted">Plan</label>
                          <select
                            value={planChoice}
                            onChange={(e) => setPlanChoice(e.target.value)}
                            className="mt-1 w-full text-xs border border-gaas-border rounded-lg px-2 py-1.5 bg-white"
                          >
                            {PLAN_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-gaas-muted">Duration</label>
                          <select
                            value={durationChoice}
                            onChange={(e) =>
                              setDurationChoice(Number(e.target.value))
                            }
                            className="mt-1 w-full text-xs border border-gaas-border rounded-lg px-2 py-1.5 bg-white"
                          >
                            {DURATION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            runAction(
                              `Plan upgraded to ${planChoice}`,
                              () =>
                                api.post(
                                  `/admin/users/${userId}/subscription`,
                                  {
                                    action: "upgrade",
                                    plan: planChoice,
                                    durationDays: durationChoice,
                                  }
                                )
                            ).catch(() => {})
                          }
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-gaas-accent text-white hover:opacity-90"
                        >
                          Upgrade
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            runAction(
                              `Plan downgraded to ${planChoice}`,
                              () =>
                                api.post(
                                  `/admin/users/${userId}/subscription`,
                                  {
                                    action: "downgrade",
                                    plan: planChoice,
                                    durationDays: durationChoice,
                                  }
                                )
                            ).catch(() => {})
                          }
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-gaas-border text-gaas-heading hover:bg-gray-50"
                        >
                          Downgrade
                        </button>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="3650"
                            value={extendDays}
                            onChange={(e) =>
                              setExtendDays(Number(e.target.value) || 0)
                            }
                            className="w-16 text-xs border border-gaas-border rounded-lg px-2 py-1 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              runAction(
                                `Extended by ${extendDays} days`,
                                () =>
                                  api.post(
                                    `/admin/users/${userId}/subscription`,
                                    { action: "extend", addDays: extendDays }
                                  )
                              ).catch(() => {})
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-gaas-border text-gaas-heading hover:bg-gray-50"
                          >
                            Extend
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            openConfirm({
                              tone: "danger",
                              title: "Cancel this subscription?",
                              description:
                                "The user will be moved to the free tier and active subscriptions will be marked expired.",
                              confirmLabel: "Cancel subscription",
                              onConfirm: async () => {
                                await runAction("Subscription cancelled", () =>
                                  api.post(
                                    `/admin/users/${userId}/subscription`,
                                    { action: "cancel" }
                                  )
                                );
                                closeConfirm();
                              },
                            })
                          }
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100"
                        >
                          Cancel plan
                        </button>
                      </div>
                    </div>

                    {/* Reset usage quota */}
                    <div className="mt-3 rounded-lg border border-gaas-border bg-white p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-gaas-heading">
                          Usage quota
                        </p>
                        <p className="text-[11px] text-gaas-muted">
                          {data.summary.featureCallsCount} feature call
                          {data.summary.featureCallsCount === 1 ? "" : "s"} this
                          window
                          {profile?.quotaResetAt
                            ? ` · last reset ${formatDateTime(
                                profile.quotaResetAt
                              )}`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          openConfirm({
                            tone: "warning",
                            title: "Reset usage quota?",
                            description:
                              "Counters will start from zero. Existing audit history is preserved.",
                            confirmLabel: "Reset quota",
                            onConfirm: async () => {
                              await runAction("Quota reset", () =>
                                api.post(
                                  `/admin/users/${userId}/reset-quota`
                                )
                              );
                              closeConfirm();
                            },
                          })
                        }
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-gaas-border text-gaas-heading hover:bg-gray-50"
                      >
                        Reset quota
                      </button>
                    </div>

                    {/* Audit log */}
                    <div className="mt-3 rounded-lg border border-gaas-border bg-white p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gaas-muted font-bold">
                        Admin audit log
                      </p>
                      {auditLogs.length === 0 ? (
                        <p className="text-[11px] text-gaas-muted mt-1">
                          No admin actions recorded yet.
                        </p>
                      ) : (
                        <ul className="mt-2 text-[11px] space-y-1 max-h-40 overflow-y-auto pr-1">
                          {auditLogs.map((l) => (
                            <li
                              key={l.id}
                              className="flex items-center justify-between border-b border-gaas-border/60 pb-1"
                            >
                              <span>
                                <span className="font-semibold text-gaas-heading">
                                  {AUDIT_LABELS[l.action] || l.action}
                                </span>
                                {l.actorEmail ? (
                                  <span className="text-gaas-muted">
                                    {" "}
                                    · by {l.actorEmail}
                                  </span>
                                ) : null}
                              </span>
                              <span className="text-gaas-muted">
                                {formatDateTime(l.at)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                </>
              )}
            </div>
          </motion.aside>

          <ConfirmModal
            open={!!confirm.open}
            title={confirm.title}
            description={confirm.description}
            confirmLabel={confirm.confirmLabel}
            tone={confirm.tone}
            confirmText={confirm.confirmText}
            onConfirm={confirm.onConfirm}
            onClose={closeConfirm}
          >
            {confirm.extra}
          </ConfirmModal>
        </>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value, accent = "text-gaas-heading" }) {
  return (
    <div className="rounded-lg border border-gaas-border bg-white p-3">
      <p className="text-[10px] uppercase tracking-wide text-gaas-muted">{label}</p>
      <p className={`text-lg font-extrabold mt-1 ${accent}`}>{value}</p>
    </div>
  );
}
