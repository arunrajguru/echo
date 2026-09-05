import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Send, ChevronLeft, Orbit, Heart } from "lucide-react";
import { Logo, Disclaimer } from "./shared/Basics.jsx";
import { MemoryOrb } from "./MemoryOrb.jsx";

function findGroundedMemory(text, memories) {
  const lower = text.toLowerCase();
  return memories.find((m) =>
    [m.title, m.category, ...(m.sourceLines || [])].some((s) =>
      lower.includes(s.toLowerCase().split(" ")[0]) && s.toLowerCase().length > 2
    ) ||
    lower.split(/\s+/).some((w) => w.length > 3 && m.title.toLowerCase().includes(w))
  );
}

export function ChatScreen({ persona, onBack, onOpenSpace }) {
  const [messages, setMessages] = useState([
    {
      role: "echo",
      text: `Hey. Good to hear from you. — this is an AI reflection built from the memories you shared, not ${persona.name} themself.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [orbState, setOrbState] = useState("idle");
  const [retrieved, setRetrieved] = useState(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, retrieved]);

  const send = useCallback(
    (text) => {
      if (!text.trim()) return;
      setMessages((m) => [...m, { role: "user", text }]);
      setInput("");
      const hit = findGroundedMemory(text, persona.memories);

      setOrbState("thinking");
      setTimeout(() => {
        if (hit) {
          setOrbState("retrieving");
          setRetrieved(hit);
          setTimeout(() => {
            setOrbState("speaking");
            setMessages((m) => [
              ...m,
              {
                role: "echo",
                text: `${hit.sourceLines[hit.sourceLines.length - 1]} — I remember that from ${hit.title.toLowerCase()}.`,
                grounded: hit.title,
              },
            ]);
            setTimeout(() => setOrbState("idle"), 1400);
          }, 900);
        } else {
          setOrbState("speaking");
          setRetrieved(null);
          setMessages((m) => [
            ...m,
            {
              role: "echo",
              text: "I don't have enough information from the memories you've shared to know that.",
            },
          ]);
          setTimeout(() => setOrbState("idle"), 1200);
        }
      }, 700);
    },
    [persona.memories]
  );

  const toggleVoice = () => {
    setVoiceMode((v) => !v);
    if (!voiceMode) {
      setOrbState("listening");
      setTimeout(() => setOrbState("thinking"), 1600);
      setTimeout(() => {
        setOrbState("speaking");
        setMessages((m) => [
          ...m,
          { role: "user", text: "(voice) Do you remember the Goa trip?" },
        ]);
        setTimeout(() => send("Do you remember the Goa trip?"), 50);
      }, 2600);
    } else {
      setOrbState("idle");
    }
  };

  const statusLabel = {
    idle: "",
    listening: "Listening…",
    thinking: "Remembering…",
    retrieving: "Remembering…",
    speaking: "Speaking…",
  }[orbState];

  return (
    <div className="echo-fade-in w-full h-full flex flex-col">
      <header className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="echo-focus" aria-label="Back">
            <ChevronLeft size={18} />
          </button>
          <Logo size="text-lg" />
          <span className="text-sm" style={{ color: "var(--ink-dim)" }}>
            / {persona.name}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onOpenSpace} className="text-xs echo-focus flex items-center gap-1" style={{ color: "var(--ink-dim)" }}>
            <Orbit size={14} /> Memory space
          </button>
          <Disclaimer compact />
        </div>
      </header>

      <div className="flex-1 grid md:grid-cols-[1fr_280px] min-h-0">
        <div className="flex flex-col min-h-0">
          <div className="h-40 md:h-48 relative">
            <MemoryOrb state={orbState} amplitude={0.6} />
            {statusLabel && (
              <div
                className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs echo-mono px-3 py-1 rounded-full"
                style={{ background: "var(--panel-solid)", color: "var(--ember)" }}
              >
                {statusLabel}
              </div>
            )}
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto echo-scrollbar px-6 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm"
                  style={{
                    background: m.role === "user" ? "var(--ember-soft)" : "var(--panel-solid)",
                    border: m.role === "user" ? "1px solid var(--ember)" : "1px solid var(--line)",
                  }}
                >
                  {m.text}
                  {m.grounded && (
                    <div className="echo-mono text-[10px] mt-1" style={{ color: "var(--ember)" }}>
                      grounded in “{m.grounded}”
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 flex items-center gap-2" style={{ borderTop: "1px solid var(--line)" }}>
            <button
              onClick={toggleVoice}
              className="echo-focus w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: voiceMode ? "var(--ember)" : "transparent",
                border: "1px solid var(--line)",
                color: voiceMode ? "#1a1305" : "var(--ink)",
              }}
              aria-label="Toggle voice mode"
            >
              <Mic size={16} />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder={`Ask ${persona.name} something…`}
              className="echo-focus flex-1 bg-transparent border rounded-full px-4 py-2.5 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
            <button
              onClick={() => send(input)}
              className="echo-focus w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "var(--ember)", color: "#1a1305" }}
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="px-6 pb-3 text-[11px] echo-mono" style={{ color: "var(--ink-dim)" }}>
            AI-GENERATED VOICE — synthetic audio, clearly labeled, never presented as a real recording.
          </div>
        </div>

        <aside className="hidden md:flex flex-col p-5 gap-3 echo-scrollbar overflow-y-auto" style={{ borderLeft: "1px solid var(--line)" }}>
          <p className="text-xs echo-mono" style={{ color: "var(--ink-dim)" }}>
            RELEVANT MEMORIES
          </p>
          {!retrieved ? (
            <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
              Nothing retrieved yet — ask about a shared memory to see it grounded here.
            </p>
          ) : (
            <div className="rounded-xl p-4 echo-fade-in" style={{ background: "var(--ember-soft)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{retrieved.title}</span>
                <span className="echo-mono text-[11px]" style={{ color: "var(--ember)" }}>
                  {Math.round(retrieved.confidence * 100)}%
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--ink-dim)" }}>
                {retrieved.content}
              </p>
            </div>
          )}
          <div className="mt-auto pt-4 border-t text-[11px]" style={{ borderColor: "var(--line)", color: "var(--ink-dim)" }}>
            <p className="flex items-center gap-1.5 mb-1">
              <Heart size={12} /> If this ever feels heavier than helpful, reaching out to someone you
              trust — or a mental health professional — matters more than this conversation does.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default ChatScreen;
