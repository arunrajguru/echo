import { useMemo, useState } from "react";
import {
  ChevronLeft,
  Sparkles,
  MessageCircle,
  Orbit,
  Pencil,
  Trash2,
  MapPin,
  Users,
  Star,
} from "lucide-react";
import { Logo, PrimaryButton, GhostButton } from "./shared/Basics.jsx";
import { MemoryOrb } from "./MemoryOrb.jsx";

const CATEGORY_ICON = {
  Trips: MapPin,
  Conversations: MessageCircle,
  Favorites: Star,
  Places: MapPin,
  People: Users,
};

export function MemorySpace({ persona, onOpenChat, onBack }) {
  const [active, setActive] = useState(null);
  const categories = useMemo(
    () => ["All", ...new Set(persona.memories.map((m) => m.category))],
    [persona.memories]
  );
  const [filter, setFilter] = useState("All");
  const visible = persona.memories.filter((m) => filter === "All" || m.category === filter);

  return (
    <div className="echo-fade-in w-full h-full flex flex-col">
      <header className="flex items-center justify-between px-6 md:px-10 py-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="echo-focus" aria-label="Back">
            <ChevronLeft size={18} />
          </button>
          <Logo size="text-xl" />
          <span className="text-sm" style={{ color: "var(--ink-dim)" }}>
            / {persona.name}'s memory space
          </span>
        </div>
        <PrimaryButton onClick={onOpenChat} icon={MessageCircle}>
          Talk to {persona.name}
        </PrimaryButton>
      </header>

      <div className="flex gap-2 px-6 md:px-10 pb-4 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className="echo-focus text-xs px-3 py-1.5 rounded-full border"
            style={{
              borderColor: filter === c ? "var(--ember)" : "var(--line)",
              color: filter === c ? "var(--ember)" : "var(--ink-dim)",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex-1 grid md:grid-cols-[1.3fr_1fr] gap-6 px-6 md:px-10 pb-8 min-h-0">
        <div className="relative rounded-2xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
          <div className="absolute inset-0">
            <MemoryOrb state="idle" size={0.7} />
          </div>
          <div className="absolute inset-0 p-6 pointer-events-none">
            <div
              className="grid grid-cols-2 sm:grid-cols-3 gap-3 pointer-events-auto"
              style={{ maxWidth: 520 }}
            >
              {visible.map((m) => {
                const Icon = CATEGORY_ICON[m.category] || Sparkles;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActive(m)}
                    className="echo-focus text-left rounded-lg px-3 py-2 backdrop-blur-sm text-xs"
                    style={{
                      background: "rgba(18,21,42,0.7)",
                      border: `1px solid ${active?.id === m.id ? "var(--ember)" : "var(--line)"}`,
                    }}
                  >
                    <Icon size={13} style={{ color: "var(--ember)" }} className="mb-1.5" />
                    <div>{m.title}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6 echo-scrollbar overflow-y-auto" style={{ border: "1px solid var(--line)" }}>
          {!active ? (
            <div className="h-full flex flex-col items-center justify-center text-center" style={{ color: "var(--ink-dim)" }}>
              <Orbit size={22} className="mb-3" />
              <p className="text-sm">Select a memory to see its source and confidence.</p>
            </div>
          ) : (
            <div className="echo-fade-in">
              <div className="flex items-center justify-between mb-1">
                <span className="echo-mono text-[11px]" style={{ color: "var(--ink-dim)" }}>
                  {active.category.toUpperCase()} · {active.date}
                </span>
                <span className="echo-mono text-[11px]" style={{ color: "var(--ember)" }}>
                  {Math.round(active.confidence * 100)}% confidence
                </span>
              </div>
              <h3 className="echo-serif text-2xl mb-3">{active.title}</h3>
              <p className="text-sm mb-5" style={{ color: "var(--ink-dim)" }}>
                {active.content}
              </p>
              <p className="text-xs echo-mono mb-2" style={{ color: "var(--ink-dim)" }}>
                SOURCE MESSAGES
              </p>
              <div className="space-y-2 mb-6">
                {active.sourceLines.map((l, i) => (
                  <div
                    key={i}
                    className="text-sm rounded-lg px-3 py-2"
                    style={{ background: "var(--ember-soft)" }}
                  >
                    “{l}”
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <GhostButton icon={Pencil}>Edit</GhostButton>
                <GhostButton icon={Trash2}>Hide</GhostButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MemorySpace;
