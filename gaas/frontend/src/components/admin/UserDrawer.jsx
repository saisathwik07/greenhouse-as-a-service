import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../../api";

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

export default function UserDrawer({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    (async () => {
      try {
        const { data } = await api.get(`/admin/users/${userId}/insights`);
        if (!active) return;
        setData(data);
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
                    <h3 className="text-xl font-bold text-gaas-heading mt-1">
                      {data.profile.name}
                    </h3>
                    <p className="text-sm text-gaas-muted">{data.profile.email}</p>
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
                </>
              )}
            </div>
          </motion.aside>
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
