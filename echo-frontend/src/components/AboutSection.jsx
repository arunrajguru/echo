import {
  MessageSquareQuote,
  Mic,
  BrainCircuit,
  FileUp,
  Layers,
  ShieldCheck,
  HeartHandshake,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";
import { PROJECT_INFO, CAPABILITIES } from "../data/projectConfig.js";

const ICON_MAP = {
  MessageSquareQuote: MessageSquareQuote,
  Mic: Mic,
  BrainCircuit: BrainCircuit,
  FileUp: FileUp,
  Layers: Layers,
  ShieldCheck: ShieldCheck,
  HeartHandshake: HeartHandshake,
};

export function AboutSection() {
  return (
    <section id="about" className="relative w-full py-20 px-8 md:px-16 border-t" style={{ borderColor: "var(--line)" }}>
      {/* Background ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] pointer-events-none rounded-full blur-3xl opacity-20"
        style={{ background: "radial-gradient(circle, var(--ember) 0%, transparent 70%)" }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header Badge & Titles */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[rgba(231,168,87,0.3)] bg-[rgba(231,168,87,0.07)] mb-4">
            <Sparkles size={14} style={{ color: "var(--ember)" }} />
            <span className="echo-mono text-xs tracking-wider uppercase" style={{ color: "var(--ember)" }}>
              System Overview & Architecture
            </span>
          </div>

          <h2 className="echo-serif text-4xl md:text-5xl font-medium tracking-tight mb-4">
            {PROJECT_INFO.name}
          </h2>
          <p className="text-lg md:text-xl font-medium mb-6" style={{ color: "var(--violet)" }}>
            {PROJECT_INFO.subtitle}
          </p>

          <p className="text-base leading-relaxed" style={{ color: "var(--ink-dim)" }}>
            {PROJECT_INFO.description}
          </p>

          {/* Ethics / Simulated Reality Disclaimer Banner */}
          <div
            className="mt-8 p-4 rounded-xl border flex items-start gap-3 text-left transition-all"
            style={{
              background: "rgba(18, 21, 42, 0.6)",
              borderColor: "rgba(139, 135, 217, 0.3)",
            }}
          >
            <Info size={20} className="shrink-0 mt-0.5" style={{ color: "var(--violet)" }} />
            <div className="text-xs md:text-sm leading-relaxed" style={{ color: "var(--ink-dim)" }}>
              <span className="font-semibold text-[var(--ink)]">Simulated Reflection Notice: </span>
              {PROJECT_INFO.disclaimer}
            </div>
          </div>
        </div>

        {/* Capabilities Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CAPABILITIES.map((item, idx) => {
            const IconComponent = ICON_MAP[item.icon] || Sparkles;
            return (
              <div
                key={item.id}
                className="group relative rounded-2xl p-6 border transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between"
                style={{
                  background: "var(--panel-solid)",
                  borderColor: "var(--line)",
                }}
              >
                <div>
                  {/* Category & Icon */}
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors group-hover:bg-[rgba(231,168,87,0.2)]"
                      style={{
                        background: "rgba(231,168,87,0.1)",
                        color: "var(--ember)",
                        border: "1px solid rgba(231,168,87,0.25)",
                      }}
                    >
                      <IconComponent size={20} strokeWidth={1.8} />
                    </div>
                    <span className="echo-mono text-[11px] px-2.5 py-1 rounded-full border border-[var(--line)]" style={{ color: "var(--ink-dim)" }}>
                      {item.category}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-[var(--ember)] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed" style={{ color: "var(--ink-dim)" }}>
                    {item.description}
                  </p>
                </div>

                {/* Bottom Highlight */}
                <div className="mt-6 pt-4 border-t flex items-center gap-2" style={{ borderColor: "rgba(42, 49, 84, 0.5)" }}>
                  <CheckCircle2 size={13} style={{ color: "var(--ember)" }} />
                  <span className="echo-mono text-[11px] font-medium" style={{ color: "var(--ink-dim)" }}>
                    {item.highlight}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default AboutSection;
