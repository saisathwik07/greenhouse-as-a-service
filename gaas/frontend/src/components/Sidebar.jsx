import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useSubscription } from "../hooks/useSubscription";

const navItemsAll = [
  { to: "/", label: "Dashboard" },
  { to: "/data", label: "Data" },
  { to: "/agricultural", label: "Agricultural Services" },
  { to: "/pest-disease", label: "Pest & Disease Prediction" },
  { to: "/iot", label: "IoT / MQTT" },
  { to: "/greenhouse", label: "Greenhouse IoT sim" },
  { to: "/ai", label: "AI Analytics" },
  { to: "/subscription", label: "Premium hub" }
];

function getHelpFooterLinks(isAdmin) {
  return [
    { to: "/help", label: "Help & Support", end: true },
    isAdmin
      ? { to: "/admin/support", label: "All Tickets", end: true }
      : { to: "/my-tickets", label: "My Tickets", end: true },
  ];
}

const GUEST_LOCK_HINT = "Sign in to unlock — guests can only use the Dashboard.";

export default function Sidebar() {
  const { user, isAdmin, isGuest } = useAuth();
  const { plan, planExpiresAt } = useSubscription();

  const effectivePlan = isGuest
    ? "none"
    : plan && plan !== "none"
    ? plan
    : "basic";
  const planLabel =
    effectivePlan === "premium" || effectivePlan === "pro"
      ? "Premium"
      : effectivePlan === "standard"
      ? "Standard"
      : effectivePlan === "basic" || effectivePlan === "free"
      ? "Basic (Free)"
      : "Guest";

  const planColor =
    effectivePlan === "premium" || effectivePlan === "pro"
      ? "text-gaas-accent"
      : effectivePlan === "standard"
      ? "text-indigo-600"
      : effectivePlan === "basic" || effectivePlan === "free"
      ? "text-sky-600"
      : "text-gray-500";

  const renewText =
    planExpiresAt && !isGuest
      ? new Date(planExpiresAt).toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : null;

  return (
    <aside className="w-56 bg-white border-r border-gaas-border min-h-[calc(100vh-5rem)] flex flex-col flex-shrink-0">
      {/* Menu Label */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-xs font-bold text-gaas-accent uppercase tracking-wider">Menu</p>
      </div>

      {/* Navigation — Help & Support pinned at bottom of menu (above plan) */}
      <nav className="flex-1 px-3 flex flex-col min-h-0">
        <div className="space-y-0.5 flex-1 min-h-0">
          {navItemsAll.map(({ to, label, guestOk }) => {
            const guestLocked = isGuest && to !== "/" && !guestOk;
            if (guestLocked) {
              return (
                <div
                  key={to}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed select-none border border-transparent"
                  title={GUEST_LOCK_HINT}
                  role="presentation"
                >
                  <span className="text-[13px] leading-none opacity-80" aria-hidden>
                    🔒
                  </span>
                  <span className="flex-1 truncate">{label}</span>
                </div>
              );
            }
            return (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-gaas-accent text-white"
                      : "text-gray-600 hover:text-gaas-heading hover:bg-gray-50"
                  }`
                }
              >
                {label}
              </NavLink>
            );
          })}
        </div>

        <div className="mt-auto pt-3 pb-1 border-t border-gaas-border space-y-0.5">
          {getHelpFooterLinks(isAdmin).map(({ to, label, end }) => (
            <NavLink
              key={to + label}
              to={to}
              end={end}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gaas-accent text-white"
                    : "text-gray-600 hover:text-gaas-heading hover:bg-gray-50"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Plan info at bottom */}
      {user && (
        <div className="px-5 py-4 border-t border-gaas-border">
          <p className="text-sm font-bold text-gaas-heading">Your plan</p>
          <p className={`text-lg font-bold ${planColor}`}>
            {planLabel}
          </p>
          <p className="text-[11px] text-gaas-muted mt-0.5 truncate">
            {isGuest ? "Guest account" : user.email}
          </p>
          {renewText && (
            <p className="text-[11px] text-gaas-muted mt-0.5">
              Renews on {renewText}
            </p>
          )}
          {isAdmin && (
            <p className="text-[11px] text-gaas-accent font-semibold mt-1">⭐ Admin Account</p>
          )}
          {(effectivePlan === "standard" || effectivePlan === "premium") && (
            <ul className="mt-2 space-y-1">
              <li className="text-[11px] text-gaas-muted flex items-center gap-1">
                <span className="text-gaas-accent">•</span> Full platform access
              </li>
              <li className="text-[11px] text-gaas-muted flex items-center gap-1">
                <span className="text-gaas-accent">•</span> Access advanced AI & simulation tools
              </li>
            </ul>
          )}
          {isGuest && (
            <p className="text-[11px] text-gaas-muted mt-2">Sign up for full access</p>
          )}
        </div>
      )}
    </aside>
  );
}
