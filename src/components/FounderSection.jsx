import { Github, Linkedin, ShieldCheck, Terminal, Cpu, Layers } from "lucide-react";
import { FOUNDER_PROFILE } from "../data/projectConfig.js";

export function FounderSection() {
  return (
    <section id="founder" className="relative w-full py-20 px-8 md:px-16 border-t" style={{ borderColor: "var(--line)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="echo-mono text-xs mb-3 tracking-widest uppercase" style={{ color: "var(--ember)" }}>
            Project Leadership & Architecture
          </p>
          <h2 className="echo-serif text-3xl md:text-4xl font-medium">
            Meet the Project Lead
          </h2>
        </div>

        <div
          className="relative rounded-3xl p-8 md:p-12 border overflow-hidden transition-all duration-300 shadow-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(18,21,42,0.9) 0%, rgba(10,12,22,0.95) 100%)",
            borderColor: "rgba(231,168,87,0.3)",
          }}
        >
          {/* Subtle background glow */}
          <div
            className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none blur-3xl opacity-20"
            style={{ background: "radial-gradient(circle, var(--ember) 0%, transparent 70%)" }}
          />

          <div className="grid md:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left: Avatar & Socials */}
            <div className="md:col-span-4 flex flex-col items-center text-center">
              <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full p-1.5 mb-5 border-2 transition-transform hover:scale-105" style={{ borderColor: "var(--ember)" }}>
                <img
                  src={FOUNDER_PROFILE.photo}
                  alt={FOUNDER_PROFILE.name}
                  className="w-full h-full object-cover rounded-full shadow-inner"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%2312152a'><rect width='100' height='100'/><text x='50' y='55' text-anchor='middle' fill='%23e7a857' font-size='20' font-family='sans-serif'>AR</text></svg>";
                  }}
                />
                <div
                  className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono border"
                  style={{
                    background: "var(--void)",
                    borderColor: "var(--ember)",
                    color: "var(--ember)",
                  }}
                >
                  LEAD
                </div>
              </div>

              <h3 className="echo-serif text-2xl font-medium text-[var(--ink)]">
                {FOUNDER_PROFILE.name}
              </h3>
              <p className="text-xs echo-mono mt-1 mb-4" style={{ color: "var(--ember)" }}>
                {FOUNDER_PROFILE.role}
              </p>

              {/* Social Link Buttons */}
              <div className="flex items-center gap-3">
                {FOUNDER_PROFILE.github && (
                  <a
                    href={FOUNDER_PROFILE.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border transition-all hover:bg-[rgba(231,168,87,0.15)] echo-focus"
                    style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                    aria-label="Arun Rajpurohit GitHub"
                  >
                    <Github size={16} />
                  </a>
                )}
                {FOUNDER_PROFILE.linkedin && (
                  <a
                    href={FOUNDER_PROFILE.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border transition-all hover:bg-[rgba(231,168,87,0.15)] echo-focus"
                    style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                    aria-label="Arun Rajpurohit LinkedIn"
                  >
                    <Linkedin size={16} />
                  </a>
                )}
              </div>
            </div>

            {/* Right: Bio & Key Responsibilities */}
            <div className="md:col-span-8 flex flex-col justify-center">
              <div className="mb-6">
                <span className="text-xs echo-mono px-3 py-1 rounded-full border border-[rgba(139,135,217,0.3)] bg-[rgba(139,135,217,0.08)]" style={{ color: "var(--violet)" }}>
                  Core Project Developer & Lead
                </span>
                <p className="mt-4 text-sm md:text-base leading-relaxed" style={{ color: "var(--ink-dim)" }}>
                  {FOUNDER_PROFILE.introduction}
                </p>
              </div>

              {/* Responsibilities Grid */}
              <div className="mt-2">
                <p className="echo-mono text-xs uppercase tracking-wider mb-3 text-[var(--ember)] flex items-center gap-1.5">
                  <Cpu size={14} /> Development & Architectural Ownership:
                </p>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {FOUNDER_PROFILE.responsibilities.map((resp, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl border flex items-start gap-2.5 transition-colors"
                      style={{
                        background: "rgba(10, 12, 22, 0.7)",
                        borderColor: "var(--line)",
                      }}
                    >
                      <Terminal size={14} className="shrink-0 mt-1" style={{ color: "var(--ember)" }} />
                      <span className="text-xs leading-snug" style={{ color: "var(--ink)" }}>
                        {resp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FounderSection;
