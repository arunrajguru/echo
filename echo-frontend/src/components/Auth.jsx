import { useState } from "react";
import { ChevronLeft, ChevronRight, LogIn, UserPlus } from "lucide-react";
import { Logo, Disclaimer, PrimaryButton, GhostButton } from "./shared/Basics.jsx";
import * as api from "../services/api.js";

// Minimal auth screen. Styled to match the existing Wizard input pattern
// exactly (same border/label/input classes) rather than introducing a new
// visual language. Wired to src/services/api.js — until the backend step
// of this build exists, login()/register() throw a clear "not wired yet"
// error, which is surfaced inline rather than faked as a success.

const inputClass =
  "echo-focus w-full mb-5 bg-transparent border rounded-lg px-4 py-3 text-sm";

export function Auth({ onBack, onAuthenticated }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user =
        mode === "login"
          ? await api.login({ email, password })
          : await api.register({ email, password });
      onAuthenticated(user);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="echo-fade-in w-full h-full overflow-y-auto echo-scrollbar px-6 md:px-16 py-10">
      <div className="flex items-center justify-between mb-10">
        <Logo size="text-xl" />
        <Disclaimer compact />
      </div>

      <div className="max-w-sm mx-auto md:mx-0">
        <h2 className="echo-serif text-3xl mb-2">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="text-sm mb-8" style={{ color: "var(--ink-dim)" }}>
          {mode === "login"
            ? "Sign in to reach the Echoes you've built."
            : "Your Echoes are private to your account only."}
        </p>

        <form onSubmit={submit}>
          <label className="block text-xs echo-mono mb-2" style={{ color: "var(--ink-dim)" }}>
            EMAIL
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
            style={{ borderColor: "var(--line)" }}
          />

          <label className="block text-xs echo-mono mb-2" style={{ color: "var(--ink-dim)" }}>
            PASSWORD
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
            style={{ borderColor: "var(--line)" }}
          />

          {error && (
            <div
              className="rounded-lg px-4 py-3 mb-5 text-sm"
              style={{ background: "rgba(217,117,107,0.12)", color: "#d9756b" }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-3 mb-6">
            <GhostButton onClick={onBack} icon={ChevronLeft} type="button">
              Back
            </GhostButton>
            <PrimaryButton
              type="submit"
              disabled={submitting || !email || password.length < 8}
              icon={mode === "login" ? LogIn : UserPlus}
            >
              {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </PrimaryButton>
          </div>
        </form>

        <button
          onClick={() => {
            setError("");
            setMode((m) => (m === "login" ? "register" : "login"));
          }}
          className="echo-focus text-xs flex items-center gap-1"
          style={{ color: "var(--ink-dim)" }}
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

export default Auth;
