import { useState, useEffect, useRef } from "react";
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
  const [mode, setMode] = useState("login"); // "login" | "register" | "otp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const googleBtnRef = useRef(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || mode === "otp") return;

    const renderGoogleBtn = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response) => {
              if (response.credential) {
                setSubmitting(true);
                setError("");
                try {
                  const user = await api.googleLogin({ id_token: response.credential });
                  onAuthenticated(user);
                } catch (err) {
                  setError(err.message || "Google sign-in failed. Please try again.");
                } finally {
                  setSubmitting(false);
                }
              }
            },
          });
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "outline",
            size: "large",
            width: "100%",
            text: mode === "login" ? "signin_with" : "signup_with",
          });
        } catch (_) {}
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogleBtn();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = renderGoogleBtn;
      document.body.appendChild(script);
    }
  }, [clientId, mode]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        const user = await api.login({ email, password });
        onAuthenticated(user);
      } else if (mode === "register") {
        await api.register({ email, password });
        setMode("otp");
        setOtp("");
        setInfoMsg("A 6-digit verification code has been sent to your email.");
      }
    } catch (err) {
      if (mode === "login" && err.message && err.message.toLowerCase().includes("verify your email")) {
        setMode("otp");
        setOtp("");
        setInfoMsg("Please verify your email to continue. Enter your verification code below.");
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");
    setSubmitting(true);
    try {
      const user = await api.verifyOtp({ email, otp });
      onAuthenticated(user);
    } catch (err) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfoMsg("");
    setResending(true);
    try {
      const res = await api.resendOtp({ email });
      setInfoMsg(res.message || "A new verification code has been sent.");
    } catch (err) {
      setError(err.message || "Failed to resend verification code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="echo-fade-in w-full h-full overflow-y-auto echo-scrollbar px-6 md:px-16 py-10">
      <div className="flex items-center justify-between mb-10">
        <Logo size="text-xl" />
        <Disclaimer compact />
      </div>

      {mode === "otp" ? (
        <div className="max-w-sm mx-auto md:mx-0">
          <h2 className="echo-serif text-3xl mb-2">Check your email</h2>
          <p className="text-sm mb-8" style={{ color: "var(--ink-dim)" }}>
            We sent a 6-digit verification code to <span className="font-medium" style={{ color: "var(--ink)" }}>{email}</span>.
          </p>

          <form onSubmit={submitOtp}>
            <label className="block text-xs echo-mono mb-2" style={{ color: "var(--ink-dim)" }}>
              VERIFICATION CODE
            </label>
            <input
              type="text"
              required
              maxLength={6}
              pattern="\d{6}"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className={`${inputClass} tracking-widest text-center text-lg`}
              style={{ borderColor: "var(--line)" }}
              autoFocus
            />

            {infoMsg && (
              <div
                className="rounded-lg px-4 py-3 mb-5 text-sm"
                style={{ background: "rgba(107, 217, 137, 0.12)", color: "#6bd989" }}
              >
                {infoMsg}
              </div>
            )}

            {error && (
              <div
                className="rounded-lg px-4 py-3 mb-5 text-sm"
                style={{ background: "rgba(217,117,107,0.12)", color: "#d9756b" }}
              >
                {error}
              </div>
            )}

            <div className="flex gap-3 mb-6">
              <GhostButton
                onClick={() => {
                  setMode("register");
                  setError("");
                  setInfoMsg("");
                }}
                icon={ChevronLeft}
                type="button"
              >
                Back
              </GhostButton>
              <PrimaryButton
                type="submit"
                disabled={submitting || otp.length !== 6}
                icon={LogIn}
              >
                {submitting ? "Verifying…" : "Verify & Continue"}
              </PrimaryButton>
            </div>
          </form>

          <div className="flex items-center justify-between text-xs mt-4" style={{ color: "var(--ink-dim)" }}>
            <span>Didn't receive the code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="echo-focus underline hover:text-white"
            >
              {resending ? "Sending…" : "Resend code"}
            </button>
          </div>
        </div>
      ) : (
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

            {infoMsg && (
              <div
                className="rounded-lg px-4 py-3 mb-5 text-sm"
                style={{ background: "rgba(107, 217, 137, 0.12)", color: "#6bd989" }}
              >
                {infoMsg}
              </div>
            )}

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

          {clientId && (
            <>
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: "var(--line)" }} />
                </div>
                <span className="relative px-3 text-xs echo-mono bg-inherit" style={{ color: "var(--ink-dim)" }}>
                  OR
                </span>
              </div>

              <div ref={googleBtnRef} className="w-full flex justify-center mb-6 min-h-[40px]" />
            </>
          )}

          <button
            onClick={() => {
              setError("");
              setInfoMsg("");
              setMode((m) => (m === "login" ? "register" : "login"));
            }}
            className="echo-focus text-xs flex items-center gap-1"
            style={{ color: "var(--ink-dim)" }}
          >
            {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
            <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

export default Auth;
