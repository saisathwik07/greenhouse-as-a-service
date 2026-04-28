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
 * Right-aligned user menu: avatar + name, dropdown with Logout.
 * Opens on trigger click; closes on outside click or Escape.
 */
export default function UserProfileMenu({
  displayName,
  email,
  pictureUrl,
  isGuest,
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

  const label = isGuest ? "Guest" : displayName || email || "Account";

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
        className={`absolute right-0 top-full z-50 mt-2 min-w-[220px] origin-top-right rounded-xl border border-slate-200/80 bg-white py-1 shadow-lg shadow-slate-200/50 ring-1 ring-black/5 transition-all duration-200 ease-out ${
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div className="border-b border-slate-100 px-4 py-3 sm:hidden">
          <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
          {!isGuest && email && (
            <p className="truncate text-xs text-slate-500 mt-0.5">{email}</p>
          )}
        </div>
        <button
          type="button"
          role="menuitem"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
}
