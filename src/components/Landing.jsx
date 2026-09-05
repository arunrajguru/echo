import { ChevronRight, Orbit } from "lucide-react";
import { Logo, Disclaimer, PrimaryButton, GhostButton } from "./shared/Basics.jsx";
import { MemoryOrb } from "./MemoryOrb.jsx";

export function Landing({ onCreate, onExplore }) {
  return (
    <div className="echo-fade-in relative w-full h-full flex flex-col">
      <header className="flex items-center justify-between px-8 py-6">
        <Logo />
        <Disclaimer compact />
      </header>

      <div className="flex-1 grid md:grid-cols-2 gap-8 items-center px-8 md:px-16">
        <div className="order-2 md:order-1">
          <p className="echo-mono text-xs mb-4" style={{ color: "var(--ember)" }}>
            AI MEMORY COMPANION
          </p>
          <h1 className="echo-serif text-5xl md:text-6xl leading-[1.05] mb-6">
            Some memories
            <br />
            deserve a voice.
          </h1>
          <p className="max-w-md mb-8" style={{ color: "var(--ink-dim)" }}>
            Echo turns the conversations, memories, and recordings you choose to
            preserve into a grounded AI reflection you can talk to — built only
            from what actually happened between you.
          </p>
          <div className="flex flex-wrap gap-3 mb-8">
            <PrimaryButton onClick={onCreate} icon={ChevronRight}>
              Create an Echo
            </PrimaryButton>
            <GhostButton onClick={onExplore} icon={Orbit}>
              Explore memory space
            </GhostButton>
          </div>
          <Disclaimer />
        </div>
        <div className="order-1 md:order-2 h-[320px] md:h-[440px]">
          <MemoryOrb state="idle" />
        </div>
      </div>
    </div>
  );
}

export default Landing;
