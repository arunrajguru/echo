import { ShieldCheck } from "lucide-react";

export function Disclaimer({ compact }) {
  return (
    <div
      className={`flex items-center gap-2 ${compact ? "text-[11px]" : "text-xs"}`}
      style={{ color: "var(--ink-dim)" }}
    >
      <ShieldCheck size={compact ? 12 : 14} strokeWidth={1.75} />
      <span>Echo is an AI reflection — not a replacement.</span>
    </div>
  );
}

export function Logo({ size = "text-2xl" }) {
  return (
    <span className={`echo-serif ${size}`} style={{ letterSpacing: "0.04em" }}>
      echo
    </span>
  );
}

export function PrimaryButton({ children, onClick, disabled, icon: Icon, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="echo-focus inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ background: "var(--ember)", color: "#1a1305" }}
    >
      {children}
      {Icon && <Icon size={16} strokeWidth={2} />}
    </button>
  );
}

export function GhostButton({ children, onClick, icon: Icon, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="echo-focus inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium border transition-colors"
      style={{ borderColor: "var(--line)", color: "var(--ink)" }}
    >
      {Icon && <Icon size={16} strokeWidth={2} />}
      {children}
    </button>
  );
}
