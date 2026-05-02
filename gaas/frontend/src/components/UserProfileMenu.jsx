import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Circular avatar with Google profile photo, or initials fallback when the image fails to load.
 */
function ProfileAvatar({ name, email, pictureUrl, sizeClass = "h-9 w-9" }) {
  const [imgFailed, setImgFailed] = useState(false);

  const initials = (() => {
    const base = (name || email || "?").trim();
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
    }
    return base.slice(0, 2).toUpperCase();
  })();

  const showImage = pictureUrl && !imgFailed;

  return (
    <div
      className={`${sizeClass} shrink-0 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-semibold text-slate-700 ring-2 ring-white shadow-sm overflow-hidden`}
      aria-hidden={!showImage}
    >
      {showImage ? (
        <img
          src={pictureUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="select-none">{initials}</span>
      )}
    </div>
  );
}

/**
 * Compact icon for menu rows. Uses currentColor so it inherits the row's
 * text color and matches the existing slate/emerald/red palette without
 * introducing new theme tokens.
 */
function MenuIcon({ name, className = "h-4 w-4" }) {
  const paths = {
    profile: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 14a4 4 0 10-8 0m8 0a4 4 0 11-8 0m8 0v1a4 4 0 01-4 4H8a4 4 0 01-4-4v-1m12-7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    ),
    dashboard: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h3v6H4V6zm0 8a2 2 0 002 2h3v-6H4v4zm9 2h3a2 2 0 002-2v-3h-5v5zm0-7h5V6a2 2 0 00-2-2h-3v5z"
      />
    ),
    users: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m6-6a4 4 0 11-8 0 4 4 0 018 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
    revenue: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    reports: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17v-6h13M9 5H4a1 1 0 00-1 1v12a1 1 0 001 1h16a1 1 0 001-1v-7M9 5l3-3 3 3M9 5v6h13"
      />
    ),
    tickets: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5m6 0a3 3 0 11-6 0m6 0H9"
      />
    ),
    settings: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317a1 1 0 011.35 0l1.262 1.158 1.704-.34a1 1 0 011.166.732l.39 1.706 1.43.95a1 1 0 01.39 1.213l-.59 1.642.59 1.642a1 1 0 01-.39 1.213l-1.43.95-.39 1.706a1 1 0 01-1.166.732l-1.704-.34-1.262 1.158a1 1 0 01-1.35 0L9.063 17.7l-1.704.34a1 1 0 01-1.166-.732l-.39-1.706-1.43-.95a1 1 0 01-.39-1.213l.59-1.642-.59-1.642a1 1 0 01.39-1.213l1.43-.95.39-1.706a1 1 0 011.166-.732l1.704.34 1.262-1.158zM12 15a3 3 0 100-6 3 3 0 000 6z"
      />
    ),
    logout: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    ),
  };
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

/** Admin links surfaced inside the profile dropdown for `role === 'admin'`. */
const ADMIN_LINKS = [
  { to: "/admin", label: "Admin Dashboard", icon: "dashboard" },
  { to: "/admin?tab=users", label: "User Management", icon: "users" },
  { to: "/admin/analytics", label: "Revenue Analytics", icon: "revenue" },
  { to: "/admin/analytics?view=reports", label: "Reports", icon: "reports" },
  { to: "/admin/support", label: "Ticket Management", icon: "tickets" },
];

/**
 * Right-aligned user menu: avatar + name, dropdown with Profile, optional
 * admin shortcuts, and Logout. Opens on trigger click; closes on outside
 * click, Escape, or item activation.
 */
export default function UserProfileMenu({
  displayName,
  email,
  pictureUrl,
  isGuest,
  isAdmin = false,
  onLogout,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const handleLogout = () => {
    close();
    onLogout();
    navigate("/");
  };

  const handleNavigate = (to) => {
    close();
    navigate(to);
  };

  const label = isGuest ? "Guest" : displayName || email || "Account";
  const showAdminLinks = !isGuest && isAdmin;

  return (
    <div className="relative" ref={wrapRef}>
      {/* Trigger: avatar + name + chevron — subtle hover lift */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex items-center gap-2.5 rounded-full pl-1 pr-2 py-1 text-left transition-all duration-200 hover:bg-slate-100/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <ProfileAvatar name={displayName} email={email} pictureUrl={pictureUrl} />
        <span className="hidden sm:inline max-w-[160px] truncate text-sm font-medium text-slate-800">
          {label}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel — smooth open/close */}
      <div
        role="menu"
        className={`absolute right-0 top-full z-50 mt-2 w-60 origin-top-right rounded-xl border border-slate-200/80 bg-white py-1 shadow-lg shadow-slate-200/50 ring-1 ring-black/5 transition-all duration-200 ease-out ${
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        {/* Header — name + email (always shown for context, compact spacing) */}
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">
              {label}
            </p>
            {showAdminLinks && (
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/80">
                Admin
              </span>
            )}
          </div>
          {!isGuest && email && (
            <p className="mt-0.5 truncate text-xs text-slate-500">{email}</p>
          )}
        </div>

        {/* Account */}
        {!isGuest && (
          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => handleNavigate("/profile")}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <MenuIcon name="profile" />
              Profile
            </button>
          </div>
        )}

        {/* Admin section — gated to role === admin */}
        {showAdminLinks && (
          <>
            <div className="my-1 border-t border-slate-100" />
            <div className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Admin
            </div>
            <div className="pb-1">
              {ADMIN_LINKS.map((link) => (
                <button
                  key={link.to}
                  type="button"
                  role="menuitem"
                  onClick={() => handleNavigate(link.to)}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50/80 hover:text-emerald-900"
                >
                  <MenuIcon name={link.icon} />
                  {link.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Logout — always at the bottom, themed in red as before */}
        <div className="my-1 border-t border-slate-100" />
        <button
          type="button"
          role="menuitem"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <MenuIcon name="logout" />
          Logout
        </button>
      </div>
    </div>
  );
}
