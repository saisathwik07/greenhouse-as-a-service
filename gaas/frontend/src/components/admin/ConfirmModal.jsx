import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Centered confirmation modal used before destructive admin actions
 * (block / delete / cancel). Matches the existing admin theme — no new
 * colors or fonts. Rendered via a portal-like fixed wrapper so it sits
 * above the user drawer.
 *
 * Props:
 *   open          : show / hide
 *   title         : heading text
 *   description   : body text (string or node)
 *   confirmLabel  : confirm button text (default "Confirm")
 *   cancelLabel   : cancel button text (default "Cancel")
 *   tone          : "danger" | "warning" | "default"
 *   confirmText   : optional string the user must type to enable confirm
 *   onConfirm     : async () => void; modal disables itself while pending
 *   onClose       : () => void
 *   children      : optional extra inputs rendered above the buttons
 */
export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  confirmText,
  onConfirm,
  onClose,
  children,
}) {
  const [pending, setPending] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setPending(false);
      setTyped("");
      setError("");
    }
  }, [open]);

  const confirmDisabled =
    pending || (confirmText && typed.trim() !== confirmText);

  const confirmCls =
    tone === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : tone === "warning"
      ? "bg-amber-500 text-white hover:bg-amber-600"
      : "bg-gaas-accent text-white hover:opacity-90";

  async function handleConfirm() {
    if (confirmDisabled) return;
    setError("");
    setPending(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(
        err?.response?.data?.error || err.message || "Action failed"
      );
      setPending(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
            onClick={pending ? undefined : onClose}
          />
          <motion.div
            key="confirm-modal"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              role="dialog"
              aria-modal="true"
              className="pointer-events-auto w-full max-w-md rounded-xl bg-white border border-gaas-border shadow-2xl p-5"
            >
              <h3 className="text-base font-bold text-gaas-heading">{title}</h3>
              {description && (
                <div className="mt-1 text-sm text-gaas-muted">
                  {description}
                </div>
              )}
              {children && <div className="mt-3">{children}</div>}
              {confirmText && (
                <div className="mt-3">
                  <label className="text-xs text-gaas-muted">
                    Type{" "}
                    <span className="font-mono text-gaas-heading">
                      {confirmText}
                    </span>{" "}
                    to confirm
                  </label>
                  <input
                    type="text"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    className="mt-1 w-full text-sm border border-gaas-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gaas-accent/40"
                    autoFocus
                    disabled={pending}
                  />
                </div>
              )}
              {error && (
                <p className="mt-3 text-xs rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2">
                  {error}
                </p>
              )}
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={pending}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gaas-border bg-white hover:bg-gray-50 disabled:opacity-60"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={confirmDisabled}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${confirmCls} disabled:opacity-60`}
                >
                  {pending ? "Working…" : confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
