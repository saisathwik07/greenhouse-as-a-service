import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

/**
 * Email/password + guest entry. Google Sign-In lives in `Navbar` when logged out.
 * Optional `mode` / `onModeChange` let the parent `Navbar` toggle login vs signup.
 */
export default function LoginPage({ mode: controlledMode, onModeChange } = {}) {
  const { login, signup, continueAsGuest } = useAuth();
  const [internalMode, setInternalMode] = useState("login");
  const isControlled =
    controlledMode !== undefined && typeof onModeChange === "function";
  const mode = isControlled ? controlledMode : internalMode;
  const setMode = (next) => {
    if (isControlled) onModeChange(next);
    else setInternalMode(next);
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (mode === "signup") {
      const result = await signup(email, password, displayName);
      if (result.error) setError(result.error);
    } else {
      const result = await login(email, password);
      if (result.error) setError(result.error);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gaas-heading">
            {mode === "login" ? "Log in" : "Create account"}
          </h2>
          <p className="mt-1 text-sm text-gaas-muted">
            {mode === "login"
              ? "Access your greenhouse dashboard"
              : "Start monitoring your greenhouse"}
          </p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gaas-heading">
                  Full Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="input-field w-full"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gaas-heading">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field w-full"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gaas-heading">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field w-full"
                required
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full py-3 text-base">
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gaas-muted">
            {mode === "login" ? (
              <>
                No account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError("");
                  }}
                  className="font-semibold text-gaas-accent hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className="font-semibold text-gaas-accent hover:underline"
                >
                  Log in
                </button>
              </>
            )}
          </p>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gaas-border" />
            <span className="text-xs text-gaas-muted">or</span>
            <div className="h-px flex-1 bg-gaas-border" />
          </div>

          <button
            type="button"
            onClick={continueAsGuest}
            className="btn-secondary w-full py-2.5 text-sm"
          >
            Continue as Guest
          </button>

          <p className="mt-4 text-center text-[11px] text-gaas-muted">
            Guest users get Basic plan access. Sign up for full features. Use Google in the header
            to sign in with your account.
          </p>
        </div>
      </div>
    </div>
  );
}
