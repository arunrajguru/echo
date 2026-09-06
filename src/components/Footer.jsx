import { useState } from "react";
import { Shield, FileText, Scale, X, ArrowUp } from "lucide-react";
import { PROJECT_INFO, LEGAL_INFO } from "../data/projectConfig.js";

export function Footer({ onNavigate }) {
  const [activeModal, setActiveModal] = useState(null); // 'privacy' | 'terms' | 'license' | null

  const handleNavClick = (e, sectionId) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(sectionId);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const landingContainer = document.querySelector(".echo-scrollbar");
    if (landingContainer) {
      landingContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="relative w-full border-t pt-16 pb-12 px-8 md:px-16" style={{ borderColor: "var(--line)", background: "rgba(8, 10, 18, 0.95)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-12 gap-10 pb-12 border-b" style={{ borderColor: "rgba(42, 49, 84, 0.4)" }}>
          {/* Brand & Subtitle Column */}
          <div className="md:col-span-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="echo-serif text-2xl font-semibold tracking-wide text-[var(--ink)]">
                {PROJECT_INFO.name}
              </span>
              <span className="text-[10px] echo-mono px-2 py-0.5 rounded-full border" style={{ borderColor: "rgba(231,168,87,0.4)", color: "var(--ember)" }}>
                v0.1.0
              </span>
            </div>
            <p className="text-sm font-medium mb-4" style={{ color: "var(--violet)" }}>
              {PROJECT_INFO.subtitle}
            </p>
            <p className="text-xs leading-relaxed max-w-md" style={{ color: "var(--ink-dim)" }}>
              A grounded conversational memory platform learning communication habits and voice characteristics to create authentic, respectful AI reflections.
            </p>
          </div>

          {/* Quick Links Column */}
          <div className="md:col-span-3">
            <h4 className="echo-mono text-xs uppercase tracking-wider mb-4" style={{ color: "var(--ember)" }}>
              Navigation
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  type="button"
                  onClick={(e) => handleNavClick(e, "hero")}
                  className="hover:text-[var(--ember)] transition-colors echo-focus"
                  style={{ color: "var(--ink-dim)" }}
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleNavClick(e, "about")}
                  className="hover:text-[var(--ember)] transition-colors echo-focus"
                  style={{ color: "var(--ink-dim)" }}
                >
                  About Project
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleNavClick(e, "founder")}
                  className="hover:text-[var(--ember)] transition-colors echo-focus"
                  style={{ color: "var(--ink-dim)" }}
                >
                  Project Lead
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleNavClick(e, "team")}
                  className="hover:text-[var(--ember)] transition-colors echo-focus"
                  style={{ color: "var(--ink-dim)" }}
                >
                  Team VISORA
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleNavClick(e, "feedback")}
                  className="hover:text-[var(--ember)] transition-colors echo-focus"
                  style={{ color: "var(--ink-dim)" }}
                >
                  Feedback
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleNavClick(e, "contact")}
                  className="hover:text-[var(--ember)] transition-colors echo-focus"
                  style={{ color: "var(--ink-dim)" }}
                >
                  Contact & Support
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Governance Column */}
          <div className="md:col-span-3">
            <h4 className="echo-mono text-xs uppercase tracking-wider mb-4" style={{ color: "var(--ember)" }}>
              Governance & Policies
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal("privacy")}
                  className="hover:text-[var(--ember)] transition-colors flex items-center gap-1.5 echo-focus"
                  style={{ color: "var(--ink-dim)" }}
                >
                  <Shield size={12} /> Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal("terms")}
                  className="hover:text-[var(--ember)] transition-colors flex items-center gap-1.5 echo-focus"
                  style={{ color: "var(--ink-dim)" }}
                >
                  <FileText size={12} /> Terms of Service
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal("license")}
                  className="hover:text-[var(--ember)] transition-colors flex items-center gap-1.5 echo-focus"
                  style={{ color: "var(--ink-dim)" }}
                >
                  <Scale size={12} /> Software License
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Ownership Notice & Copyright Row */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs" style={{ color: "var(--ink-dim)" }}>
          <div className="text-center md:text-left">
            <p className="font-mono">{LEGAL_INFO.copyright}</p>
            <p className="text-[11px] mt-1 opacity-80 max-w-xl">
              {LEGAL_INFO.ownershipNotice}
            </p>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="p-2 rounded-xl border transition-all hover:bg-[rgba(231,168,87,0.1)] flex items-center gap-1.5 echo-focus"
            style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            aria-label="Scroll to top"
          >
            <ArrowUp size={14} />
            <span className="text-[11px] echo-mono">Top</span>
          </button>
        </div>
      </div>

      {/* Legal Information Modal */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl p-6 border shadow-2xl animate-fade-in"
            style={{
              background: "var(--panel-solid)",
              borderColor: "var(--line)",
              color: "var(--ink)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b mb-4" style={{ borderColor: "var(--line)" }}>
              <h3 className="echo-serif text-lg font-medium">
                {activeModal === "privacy" && "Privacy Policy"}
                {activeModal === "terms" && "Terms of Service"}
                {activeModal === "license" && "Software License & Proprietary Notice"}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg hover:bg-white/10 echo-focus"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-xs leading-relaxed space-y-3 max-h-[60vh] overflow-y-auto echo-scrollbar pr-2" style={{ color: "var(--ink-dim)" }}>
              {activeModal === "privacy" && (
                <>
                  <p>
                    <strong>Data Privacy & Protection:</strong> All uploaded chat files, transcripts, and voice audio clips are isolated strictly to your authenticated account and designated persona vector partitions.
                  </p>
                  <p>
                    Data is processed exclusively to compute localized embeddings and conversational style metrics. No user data is pooled across tenant boundaries or sold to third-party advertisers.
                  </p>
                </>
              )}

              {activeModal === "terms" && (
                <>
                  <p>
                    <strong>Simulated Interactions:</strong> Digital Memory Companion is designed as an assistive memory reflection system. AI responses represent simulated interpretations derived mathematically from uploaded artifacts.
                  </p>
                  <p>
                    Users must only upload communications and recordings for which they possess appropriate consent and rights.
                  </p>
                </>
              )}

              {activeModal === "license" && (
                <>
                  <p>
                    <strong>Proprietary Project Ownership:</strong> © 2026 Arun Rajpurohit and Team VISORA. All rights reserved.
                  </p>
                  <p>
                    This codebase is publicly presented for demonstration, academic assessment, and evaluation purposes. Commercial reproduction, redistribution, or unauthorized deployment of the proprietary replica pipeline without explicit written permission is prohibited.
                  </p>
                </>
              )}
            </div>

            <div className="mt-6 pt-4 border-t text-right" style={{ borderColor: "var(--line)" }}>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border echo-focus"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}

export default Footer;
