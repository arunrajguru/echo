import { useEffect, useState } from "react";
import {
  ChevronRight,
  Orbit,
  MessageCircle,
  Mic,
  Plus,
  Trash2,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { Logo, Disclaimer, PrimaryButton, GhostButton } from "./shared/Basics.jsx";
import { MemoryOrb } from "./MemoryOrb.jsx";
import { AboutSection } from "./AboutSection.jsx";
import { FounderSection } from "./FounderSection.jsx";
import { TeamSection } from "./TeamSection.jsx";
import { FeedbackSection } from "./FeedbackSection.jsx";
import { ContactSection } from "./ContactSection.jsx";
import { Footer } from "./Footer.jsx";
import * as api from "../services/api.js";

export function Landing({
  onCreate,
  onExplore,
  onSelectPersona,
  personas = [],
  onRefreshPersonas,
  user,
  onOpenAuth,
  onLogout,
}) {
  const [deletingId, setDeletingId] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToSection = (id) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleDelete = async (e, personaId) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "Are you sure you want to delete this Echo? All associated memories, messages, and voice profiles will be permanently removed."
      )
    ) {
      return;
    }
    try {
      setDeletingId(personaId);
      await api.deletePersona(personaId);
      if (onRefreshPersonas) onRefreshPersonas();
    } catch (err) {
      console.error("Failed to delete persona:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="echo-fade-in relative w-full h-full flex flex-col overflow-y-auto echo-scrollbar scroll-smooth">
      {/* Top Navbar */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 md:px-12 py-4 backdrop-blur-md border-b transition-colors"
        style={{
          background: "rgba(10, 12, 22, 0.85)",
          borderColor: "rgba(42, 49, 84, 0.5)",
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection("hero")}>
          <Logo />
          <span
            className="hidden sm:inline-block text-xs font-mono px-2.5 py-0.5 rounded-full border border-[rgba(231,168,87,0.3)] text-[var(--ember)]"
          >
            Digital Memory Companion
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium">
          <button
            type="button"
            onClick={() => scrollToSection("hero")}
            className="hover:text-[var(--ember)] transition-colors echo-focus py-1"
            style={{ color: "var(--ink-dim)" }}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("about")}
            className="hover:text-[var(--ember)] transition-colors echo-focus py-1"
            style={{ color: "var(--ink-dim)" }}
          >
            About
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("founder")}
            className="hover:text-[var(--ember)] transition-colors echo-focus py-1"
            style={{ color: "var(--ink-dim)" }}
          >
            Lead
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("team")}
            className="hover:text-[var(--ember)] transition-colors echo-focus py-1"
            style={{ color: "var(--ink-dim)" }}
          >
            Team VISORA
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("feedback")}
            className="hover:text-[var(--ember)] transition-colors echo-focus py-1"
            style={{ color: "var(--ink-dim)" }}
          >
            Feedback
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("contact")}
            className="hover:text-[var(--ember)] transition-colors echo-focus py-1"
            style={{ color: "var(--ink-dim)" }}
          >
            Contact
          </button>
        </nav>

        {/* Right Actions: Auth & Disclaimer & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <span
                className="text-[11px] sm:text-xs font-mono px-2.5 sm:px-3 py-1 rounded-full border border-[var(--line)] truncate max-w-[120px] sm:max-w-none"
                style={{ color: "var(--ink-dim)" }}
              >
                {user?.email || "User"}
              </span>
              <button
                onClick={onLogout}
                className="text-xs font-mono hover:text-[#d9756b] transition-colors echo-focus py-1 px-1.5"
                style={{ color: "var(--ink-dim)" }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="text-xs font-mono px-3.5 py-1.5 rounded-full border border-[rgba(231,168,87,0.3)] bg-[rgba(231,168,87,0.08)] hover:bg-[rgba(231,168,87,0.18)] text-[var(--ember)] transition-all echo-focus"
            >
              Sign In / Register
            </button>
          )}

          <div className="hidden xl:block">
            <Disclaimer compact />
          </div>

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl border transition-colors echo-focus"
            style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden sticky top-[65px] z-30 w-full border-b backdrop-blur-xl animate-fade-in px-6 py-4 space-y-3"
          style={{
            background: "rgba(18, 21, 42, 0.98)",
            borderColor: "var(--line)",
          }}
        >
          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            <button
              onClick={() => scrollToSection("hero")}
              className="text-left px-3 py-2 rounded-lg hover:bg-white/5 echo-focus"
              style={{ color: "var(--ink)" }}
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="text-left px-3 py-2 rounded-lg hover:bg-white/5 echo-focus"
              style={{ color: "var(--ink)" }}
            >
              About Project
            </button>
            <button
              onClick={() => scrollToSection("founder")}
              className="text-left px-3 py-2 rounded-lg hover:bg-white/5 echo-focus"
              style={{ color: "var(--ink)" }}
            >
              Project Lead
            </button>
            <button
              onClick={() => scrollToSection("team")}
              className="text-left px-3 py-2 rounded-lg hover:bg-white/5 echo-focus"
              style={{ color: "var(--ink)" }}
            >
              Team VISORA
            </button>
            <button
              onClick={() => scrollToSection("feedback")}
              className="text-left px-3 py-2 rounded-lg hover:bg-white/5 echo-focus"
              style={{ color: "var(--ink)" }}
            >
              Feedback
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="text-left px-3 py-2 rounded-lg hover:bg-white/5 echo-focus"
              style={{ color: "var(--ink)" }}
            >
              Need Help?
            </button>
          </div>
          <div className="pt-2 border-t" style={{ borderColor: "var(--line)" }}>
            <Disclaimer compact />
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section id="hero" className="flex-1 min-h-[calc(100vh-80px)] flex flex-col justify-center">
        <div className="grid md:grid-cols-2 gap-8 items-center px-8 md:px-16 py-12">
          <div className="order-2 md:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[rgba(231,168,87,0.3)] bg-[rgba(231,168,87,0.08)] mb-4">
              <Sparkles size={12} style={{ color: "var(--ember)" }} />
              <span className="echo-mono text-xs" style={{ color: "var(--ember)" }}>
                AI MEMORY COMPANION · VOICE-RAG
              </span>
            </div>

            <h1 className="echo-serif text-5xl md:text-6xl leading-[1.05] mb-6">
              Some memories
              <br />
              deserve a voice.
            </h1>

            <p className="max-w-md mb-8 leading-relaxed text-sm md:text-base" style={{ color: "var(--ink-dim)" }}>
              Echo turns the conversations, memories, and recordings you choose to
              preserve into a grounded AI reflection you can talk to — built only
              from what actually happened between you.
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              <PrimaryButton onClick={onCreate} icon={Plus}>
                Create an Echo
              </PrimaryButton>
              <GhostButton onClick={onExplore} icon={Orbit}>
                Explore demo space
              </GhostButton>
            </div>

            {/* MY ECHOES LIST (Multiple independent personas) */}
            {personas && personas.length > 0 && (
              <div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="echo-mono text-xs" style={{ color: "var(--ember)" }}>
                    MY ECHOES ({personas.length})
                  </p>
                  <button
                    onClick={onCreate}
                    className="echo-focus text-xs flex items-center gap-1 hover:underline"
                    style={{ color: "var(--ink-dim)" }}
                  >
                    <Plus size={13} /> Add another Echo
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {personas.map((p) => {
                    const pId = p.id || p._id;
                    const memoryCount =
                      p.memories?.length ||
                      p.stats?.memoriesFound ||
                      (p.stats?.messagesAnalyzed
                        ? Math.min(5, Math.ceil(p.stats.messagesAnalyzed / 2))
                        : 5);
                    const isVoiceEnabled =
                      Boolean(p.voiceProfileId) ||
                      Boolean(p.voiceProfile && p.voiceProfile.status === "ready");

                    return (
                      <div
                        key={pId}
                        onClick={() => onSelectPersona(p)}
                        className="echo-focus cursor-pointer rounded-xl p-4 transition-all hover:scale-[1.01]"
                        style={{
                          background: "var(--panel-solid)",
                          border: "1px solid var(--line)",
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="echo-serif text-lg font-medium">{p.name}</h3>
                            <span className="text-xs" style={{ color: "var(--ink-dim)" }}>
                              {p.relationship}
                            </span>
                          </div>
                          <button
                            onClick={(e) => handleDelete(e, pId)}
                            disabled={deletingId === pId}
                            className="echo-focus text-xs p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                            title="Delete Echo"
                          >
                            <Trash2 size={13} style={{ color: "#e53e3e" }} />
                          </button>
                        </div>

                        <div
                          className="flex items-center gap-3 text-xs echo-mono mb-3"
                          style={{ color: "var(--ink-dim)" }}
                        >
                          <span>{memoryCount} memories</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Mic
                              size={11}
                              style={{
                                color: isVoiceEnabled ? "var(--ember)" : "var(--ink-dim)",
                              }}
                            />
                            {isVoiceEnabled ? "Voice enabled" : "Text mode"}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPersona(p, "chat");
                            }}
                            className="echo-focus flex-1 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-medium transition-opacity hover:opacity-90"
                            style={{ background: "var(--ember-soft)", color: "var(--ember)" }}
                          >
                            <MessageCircle size={13} /> Talk
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPersona(p, "space");
                            }}
                            className="echo-focus flex-1 text-xs py-1.5 rounded-lg border flex items-center justify-center gap-1.5 transition-colors hover:bg-white/5"
                            style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                          >
                            <Orbit size={13} /> Space
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-8">
              <Disclaimer />
            </div>
          </div>

          <div className="order-1 md:order-2 h-[320px] md:h-[480px]">
            <MemoryOrb state="idle" />
          </div>
        </div>
      </section>

      {/* Upgraded Sections */}
      <AboutSection />
      <FounderSection />
      <TeamSection />
      <FeedbackSection />
      <ContactSection />

      {/* Footer */}
      <Footer onNavigate={scrollToSection} />
    </div>
  );
}

export default Landing;
