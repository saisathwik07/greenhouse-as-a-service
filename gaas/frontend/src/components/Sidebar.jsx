import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { useSubscription } from "../hooks/useSubscription";

/* -------------------------------------------------------------------------- */
/*  Inline icon set (lightweight, currentColor) — keeps theme tokens intact.  */
/* -------------------------------------------------------------------------- */

const baseSvg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const Icon = {
  dashboard: (props) => (
    <svg {...baseSvg} {...props}>
      <rect x="3" y="3" width="7.5" height="9" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="1.5" />
      <rect x="13.5" y="12" width="7.5" height="9" rx="1.5" />
      <rect x="3" y="16" width="7.5" height="5" rx="1.5" />
    </svg>
  ),
  services: (props) => (
    <svg {...baseSvg} {...props}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  subscription: (props) => (
    <svg {...baseSvg} {...props}>
      <path d="M12 2.5l2.9 5.88 6.5.95-4.7 4.58 1.1 6.46L12 17.34l-5.8 3.03 1.1-6.46-4.7-4.58 6.5-.95L12 2.5z" />
    </svg>
  ),
  support: (props) => (
    <svg {...baseSvg} {...props}>
      <circle cx="12" cy="12" r="9.25" />
      <path d="M9.1 9a3 3 0 0 1 5.83 1c0 2-3 2.5-3 4" />
      <line x1="12" y1="17" x2="12" y2="17.01" />
    </svg>
  ),
  admin: (props) => (
    <svg {...baseSvg} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  profile: (props) => (
    <svg {...baseSvg} {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  chevron: (props) => (
    <svg {...baseSvg} strokeWidth={2.2} {...props}>
      <polyline points="9 6 15 12 9 18" />
    </svg>
  ),
  lock: (props) => (
    <svg {...baseSvg} {...props}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  ),
  dot: (props) => (
    <svg viewBox="0 0 8 8" fill="currentColor" {...props}>
      <circle cx="4" cy="4" r="2.5" />
    </svg>
  ),
  collapse: (props) => (
    <svg {...baseSvg} strokeWidth={2} {...props}>
      <polyline points="15 6 9 12 15 18" />
    </svg>
  ),
};

/* -------------------------------------------------------------------------- */
/*  Menu structure                                                            */
/* -------------------------------------------------------------------------- */

const ITEMS = {
  dashboard: { to: "/", label: "Dashboard", icon: Icon.dashboard, end: true, guestOk: true },
  profile: { to: "/profile", label: "Profile", icon: Icon.profile },
};

const GROUPS = [
  {
    id: "services",
    label: "Services",
    icon: Icon.services,
    items: [
      { to: "/data", label: "Data as a Service" },
      { to: "/agricultural?service=crop", label: "Crop Recommendation" },
      { to: "/agricultural?service=yield", label: "Yield Prediction" },
      { to: "/pest-disease?mode=prediction", label: "Pest Detection" },
      { to: "/pest-disease?mode=image", label: "Image Disease Detection" },
      { to: "/agricultural?service=fertigation", label: "Fertigation" },
      { to: "/iot", label: "Irrigation" },
      { to: "/ai", label: "AI Analytics" },
    ],
  },
  {
    id: "subscription",
    label: "Subscription",
    icon: Icon.subscription,
    items: [
      { to: "/subscription", label: "Plans" },
      { to: "/billing", label: "Billing" },
      { to: "/billing#history", label: "Payment History" },
    ],
  },
  {
    id: "support",
    label: "Support",
    icon: Icon.support,
    items: [
      { to: "/help", label: "Help Center", guestOk: true },
      { to: "/my-tickets", label: "My Tickets" },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    icon: Icon.admin,
    adminOnly: true,
    items: [
      { to: "/admin", label: "User Intelligence" },
      { to: "/admin/analytics", label: "Revenue Analytics" },
      { to: "/admin/analytics?view=reports", label: "Reports" },
      { to: "/admin/support", label: "Ticket Management" },
      { to: "/admin/analytics?view=datasets", label: "Dataset Analytics" },
    ],
  },
];

/* Strict path/query/hash matcher so sibling items sharing a base path don't
 * all appear active at once (e.g. Billing vs Payment History). */
function isActive(itemTo, loc, exact = false) {
  const url = new URL(itemTo, "http://x");
  if (exact ? loc.pathname !== url.pathname : loc.pathname !== url.pathname) {
    return false;
  }
  const itemHash = url.hash || "";
  const locHash = loc.hash || "";
  if (itemHash !== locHash) return false;
  const want = url.searchParams;
  const have = new URLSearchParams(loc.search);
  for (const [k, v] of want) {
    if (have.get(k) !== v) return false;
  }
  return true;
}

const GUEST_LOCK_HINT = "Sign in to unlock — guests can only use the Dashboard.";

/* -------------------------------------------------------------------------- */
/*  Group + leaf row components                                               */
/* -------------------------------------------------------------------------- */

function LeafRow({ item, isGuest, location }) {
  const guestLocked = isGuest && !item.guestOk;
  const active = isActive(item.to, location);

  if (guestLocked) {
    return (
      <div
        className="group/row mt-0.5 flex cursor-not-allowed select-none items-center gap-2.5 rounded-lg px-3 py-2 pl-10 text-[13px] font-medium text-gray-400"
        title={GUEST_LOCK_HINT}
        role="presentation"
      >
        <Icon.lock className="h-3.5 w-3.5 text-gray-400" />
        <span className="flex-1 truncate">{item.label}</span>
      </div>
    );
  }

  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={`group/row relative mt-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 pl-10 text-[13px] font-medium transition-all duration-150 ${
        active
          ? "bg-gaas-accent-glow text-gaas-heading"
          : "text-gray-600 hover:bg-gray-50 hover:text-gaas-heading"
      }`}
    >
      <span
        className={`absolute left-5 top-1/2 -translate-y-1/2 transition-all duration-200 ${
          active ? "scale-100 text-gaas-accent" : "scale-75 text-gray-300 group-hover/row:text-gray-400"
        }`}
        aria-hidden
      >
        <Icon.dot className="h-1.5 w-1.5" />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  );
}

function Group({ group, location, isGuest, openSet, setOpenSet }) {
  const open = openSet.has(group.id);
  const childActive = useMemo(
    () => group.items.some((it) => isActive(it.to, location)),
    [group.items, location],
  );

  const toggle = () => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(group.id)) next.delete(group.id);
      else next.add(group.id);
      return next;
    });
  };

  const GroupIcon = group.icon;

  return (
    <div className="px-1">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`grp-${group.id}`}
        className={`group/btn relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold transition-all duration-200 ${
          childActive
            ? "text-gaas-heading"
            : "text-gray-700 hover:bg-gray-50 hover:text-gaas-heading"
        }`}
      >
        {/* Left active rail when a child route is active */}
        <span
          className={`absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full bg-gaas-accent transition-all duration-200 ${
            childActive ? "w-[3px] opacity-100" : "w-0 opacity-0"
          }`}
          aria-hidden
        />
        <GroupIcon
          className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
            childActive ? "text-gaas-accent" : "text-gray-500 group-hover/btn:text-gaas-accent"
          }`}
        />
        <span className="flex-1 text-left tracking-tight">{group.label}</span>
        <Icon.chevron
          className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-300 ${
            open ? "rotate-90" : "rotate-0"
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`grp-${group.id}`}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 0.18, ease: "easeOut" },
            }}
            className="overflow-hidden"
          >
            <div className="pb-1 pt-0.5">
              {group.items.map((item) => (
                <LeafRow key={item.to} item={item} isGuest={isGuest} location={location} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TopLink({ item, isGuest, location }) {
  const guestLocked = isGuest && !item.guestOk;
  const active = isActive(item.to, location, item.end);
  const ItemIcon = item.icon;

  if (guestLocked) {
    return (
      <div
        className="group/row relative mx-1 flex cursor-not-allowed select-none items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold text-gray-400"
        title={GUEST_LOCK_HINT}
        role="presentation"
      >
        <ItemIcon className="h-[18px] w-[18px] shrink-0 text-gray-300" />
        <span className="flex-1 truncate">{item.label}</span>
        <Icon.lock className="h-3.5 w-3.5 text-gray-300" />
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive: navActive }) => {
        const a = active || navActive;
        return `group/row relative mx-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold transition-all duration-200 ${
          a ? "text-gaas-heading" : "text-gray-700 hover:bg-gray-50 hover:text-gaas-heading"
        }`;
      }}
    >
      <span
        className={`absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full bg-gaas-accent transition-all duration-200 ${
          active ? "w-[3px] opacity-100" : "w-0 opacity-0"
        }`}
        aria-hidden
      />
      <ItemIcon
        className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
          active ? "text-gaas-accent" : "text-gray-500 group-hover/row:text-gaas-accent"
        }`}
      />
      <span className="flex-1 tracking-tight">{item.label}</span>
    </NavLink>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="px-4 pb-1.5 pt-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-gray-400">
      {children}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sidebar                                                                   */
/* -------------------------------------------------------------------------- */

export default function Sidebar() {
  const { user, isAdmin, isGuest } = useAuth();
  const { plan, planExpiresAt } = useSubscription();
  const location = useLocation();

  const visibleGroups = useMemo(
    () => GROUPS.filter((g) => !g.adminOnly || isAdmin),
    [isAdmin],
  );

  /* Track open groups in a Set; auto-open the group containing the active
   * route on navigation (without collapsing manually-opened groups). */
  const [openSet, setOpenSet] = useState(() => {
    const initial = new Set();
    for (const g of GROUPS) {
      if (g.items.some((it) => isActive(it.to, location))) initial.add(g.id);
    }
    if (initial.size === 0) initial.add("services");
    return initial;
  });

  useEffect(() => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      for (const g of visibleGroups) {
        if (g.items.some((it) => isActive(it.to, location))) next.add(g.id);
      }
      return next;
    });
  }, [location, visibleGroups]);

  /* Plan badge */
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
  const planRingColor =
    effectivePlan === "premium" || effectivePlan === "pro"
      ? "ring-gaas-accent/30 bg-gaas-accent-glow"
      : effectivePlan === "standard"
      ? "ring-indigo-200 bg-indigo-50"
      : effectivePlan === "basic" || effectivePlan === "free"
      ? "ring-sky-200 bg-sky-50"
      : "ring-gray-200 bg-gray-50";

  const renewText =
    planExpiresAt && !isGuest
      ? new Date(planExpiresAt).toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : null;

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-gaas-border min-h-[calc(100vh-5rem)] flex-col flex-shrink-0">
      <SectionLabel>Menu</SectionLabel>

      <nav className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-2">
        <div className="space-y-0.5">
          <TopLink item={ITEMS.dashboard} isGuest={isGuest} location={location} />
        </div>

        <SectionLabel>Workspace</SectionLabel>
        <div className="space-y-0.5">
          {visibleGroups
            .filter((g) => g.id === "services")
            .map((g) => (
              <Group
                key={g.id}
                group={g}
                location={location}
                isGuest={isGuest}
                openSet={openSet}
                setOpenSet={setOpenSet}
              />
            ))}
        </div>

        <SectionLabel>Account</SectionLabel>
        <div className="space-y-0.5">
          {visibleGroups
            .filter((g) => g.id === "subscription" || g.id === "support")
            .map((g) => (
              <Group
                key={g.id}
                group={g}
                location={location}
                isGuest={isGuest}
                openSet={openSet}
                setOpenSet={setOpenSet}
              />
            ))}
          <TopLink item={ITEMS.profile} isGuest={isGuest} location={location} />
        </div>

        {isAdmin && (
          <>
            <SectionLabel>Admin</SectionLabel>
            <div className="space-y-0.5">
              {visibleGroups
                .filter((g) => g.id === "admin")
                .map((g) => (
                  <Group
                    key={g.id}
                    group={g}
                    location={location}
                    isGuest={isGuest}
                    openSet={openSet}
                    setOpenSet={setOpenSet}
                  />
                ))}
            </div>
          </>
        )}
      </nav>

      {user && (
        <div className="px-3 pb-4 pt-2 border-t border-gaas-border">
          <div className={`rounded-xl px-3.5 py-3 ring-1 ${planRingColor}`}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gaas-muted">
                Your plan
              </p>
              {isAdmin && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200">
                  Admin
                </span>
              )}
            </div>
            <p className={`mt-0.5 text-[15px] font-bold leading-tight ${planColor}`}>
              {planLabel}
            </p>
            <p className="mt-1 truncate text-[11px] text-gaas-muted">
              {isGuest ? "Guest account" : user.email}
            </p>
            {renewText && (
              <p className="mt-0.5 text-[11px] text-gaas-muted">
                Renews · {renewText}
              </p>
            )}
            {(effectivePlan === "standard" || effectivePlan === "premium") && (
              <ul className="mt-2 space-y-0.5">
                <li className="flex items-center gap-1.5 text-[11px] text-gaas-muted">
                  <Icon.dot className="h-1.5 w-1.5 text-gaas-accent" />
                  Full platform access
                </li>
                <li className="flex items-center gap-1.5 text-[11px] text-gaas-muted">
                  <Icon.dot className="h-1.5 w-1.5 text-gaas-accent" />
                  Advanced AI &amp; simulation tools
                </li>
              </ul>
            )}
            {(effectivePlan === "basic" || effectivePlan === "free") && (
              <Link
                to="/subscription"
                className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-gaas-accent px-2.5 py-1.5 text-[11.5px] font-semibold text-white shadow-sm transition hover:bg-gaas-accent-dark"
              >
                Upgrade plan
              </Link>
            )}
            {isGuest && (
              <p className="mt-2 text-[11px] text-gaas-muted">
                Sign up for full access
              </p>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
