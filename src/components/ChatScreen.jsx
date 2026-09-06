import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Send, ChevronLeft, Orbit, Heart, Radio, Volume2 } from "lucide-react";
import { Logo, Disclaimer } from "./shared/Basics.jsx";
import { MemoryOrb } from "./MemoryOrb.jsx";
import { VoiceMode } from "./VoiceMode.jsx";
import * as api from "../services/api.js";

function findGroundedMemory(text, memories = []) {
  const lower = text.toLowerCase();
  return memories.find((m) =>
    [m.title, m.category, ...(m.sourceLines || [])].some((s) =>
      lower.includes(s.toLowerCase().split(" ")[0]) && s.toLowerCase().length > 2
    ) ||
    lower.split(/\s+/).some((w) => w.length > 3 && m.title?.toLowerCase().includes(w))
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
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  const listRef = useRef(null);
  const activeAudioRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, retrieved]);

  // Audio player helper
  const playGeneratedAudio = useCallback(async (audioUrl) => {
    if (!audioUrl) return;

    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch (_) {}
      activeAudioRef.current = null;
    }

    console.log(`[ECHO AUDIO] playback-start: ${audioUrl}`);
    const audio = new Audio(audioUrl);
    audio.preload = "auto";
    activeAudioRef.current = audio;

    audio.onplay = () => {
      setOrbState("speaking");
    };

    audio.onended = () => {
      console.log(`[ECHO AUDIO] playback-end: ${audioUrl}`);
      setOrbState("idle");
      activeAudioRef.current = null;
    };

    audio.onerror = (e) => {
      console.warn(`[ECHO AUDIO] playback-error: ${audioUrl}`, e);
      setOrbState("idle");
      activeAudioRef.current = null;
    };

    try {
      await audio.play();
    } catch (err) {
      console.warn("[ECHO AUDIO] playback-error: Autoplay prevented or playback error:", err);
      setOrbState("idle");
    }
  }, []);

  const send = useCallback(
    async (text, autoPlayVoice = false) => {
      if (!text.trim()) return;
      const userMsg = text.trim();
      setMessages((m) => [...m, { role: "user", text: userMsg }]);
      setInput("");
      setOrbState("thinking");

      try {
        let replyData = null;
        if (persona.id) {
          console.log(`[CHAT] Sending message to Persona ID: ${persona.id}`);
          replyData = await api.sendMessage(persona.id, {
            message: userMsg,
            sessionId: sessionId || undefined,
          });
          if (replyData.sessionId) {
            setSessionId(replyData.sessionId);
          }
          console.log(`[CHAT] Response received from persona:`, replyData.message);
        }

        if (replyData) {
          if (replyData.grounded || (replyData.memories && replyData.memories.length > 0)) {
            setOrbState("retrieving");
            const mem = replyData.memories?.[0] || {
              title: replyData.grounded,
              content: replyData.sources?.[0] || "",
              confidence: 0.94,
            };
            setRetrieved(mem);
          } else {
            setRetrieved(null);
          }

          setMessages((m) => [
            ...m,
            {
              role: "echo",
              text: replyData.message,
              grounded: replyData.grounded,
              sources: replyData.sources,
              audioUrl: replyData.audioUrl,
            },
          ]);

          // Handle Voice Playback if audioUrl exists
          if (autoPlayVoice && replyData.audioUrl) {
            await playGeneratedAudio(replyData.audioUrl);
          } else {
            setOrbState("speaking");
            setTimeout(() => setOrbState("idle"), 1400);
          }
        } else {
          // Offline / demo fallback
          const hit = findGroundedMemory(userMsg, persona.memories || []);
          if (hit) {
            setOrbState("retrieving");
            setRetrieved(hit);
            setTimeout(() => {
              setOrbState("speaking");
              setMessages((m) => [
                ...m,
                {
                  role: "echo",
                  text: `${hit.sourceLines?.[hit.sourceLines.length - 1] || hit.content} — I remember that from ${hit.title.toLowerCase()}.`,
                  grounded: hit.title,
                },
              ]);
              setTimeout(() => setOrbState("idle"), 1400);
            }, 600);
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
        }
      } catch (err) {
        console.warn("[chat] API send error:", err);
        setOrbState("speaking");
        setMessages((m) => [
          ...m,
          {
            role: "echo",
            text: "I don't have enough information from the memories you've shared to know that.",
          },
        ]);
        setTimeout(() => setOrbState("idle"), 1200);
      }
    },
    [persona, sessionId, playGeneratedAudio]
  );

  const statusLabel = {
    idle: "",
    listening: "Listening…",
    thinking: "Remembering…",
    retrieving: "Remembering…",
    speaking: "Speaking…",
  }[orbState];

  // If Full-Screen Voice Mode is active, render VoiceMode component
  if (isVoiceModeOpen) {
    return (
      <VoiceMode
        persona={persona}
        messages={messages}
        setMessages={setMessages}
        sessionId={sessionId}
        onExit={() => setIsVoiceModeOpen(false)}
      />
    );
  }

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
        <div className="flex items-center gap-3">
          {/* Voice Mode Launch Button */}
          <button
            onClick={() => setIsVoiceModeOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-full border border-[rgba(231,168,87,0.3)] bg-[rgba(231,168,87,0.08)] hover:bg-[rgba(231,168,87,0.16)] text-[#e7a857] transition-all echo-focus"
            title="Open dedicated Echo Voice Mode"
            aria-label="Start Voice Mode"
          >
            <Radio size={14} className="animate-pulse" />
            <span>Voice Mode</span>
          </button>

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
                className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs echo-mono px-3 py-1 rounded-full animate-pulse"
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
                  className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm relative group"
                  style={{
                    background: m.role === "user" ? "var(--ember-soft)" : "var(--panel-solid)",
                    border: m.role === "user" ? "1px solid var(--ember)" : "1px solid var(--line)",
                  }}
                >
                  <p>{m.text}</p>
                  {m.grounded && (
                    <div className="echo-mono text-[10px] mt-1" style={{ color: "var(--ember)" }}>
                      grounded in “{m.grounded}”
                    </div>
                  )}
                  {m.role === "echo" && (
                    <button
                      onClick={async () => {
                        if (m.audioUrl) {
                          playGeneratedAudio(m.audioUrl);
                        } else if (persona.id) {
                          try {
                            const synth = await api.synthesizeVoice(persona.id, m.text);
                            if (synth && synth.audioUrl) {
                              m.audioUrl = synth.audioUrl;
                              playGeneratedAudio(synth.audioUrl);
                            }
                          } catch (e) {
                            console.warn("[chat] Voice playback notice:", e);
                          }
                        }
                      }}
                      className="mt-1.5 text-[11px] font-mono flex items-center gap-1 text-[var(--ember)] opacity-80 hover:opacity-100 transition-opacity"
                      title="Play cloned voice"
                    >
                      <Volume2 size={12} /> Play voice
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 flex items-center gap-2" style={{ borderTop: "1px solid var(--line)" }}>
            {/* Voice Mode quick trigger */}
            <button
              onClick={() => setIsVoiceModeOpen(true)}
              className="echo-focus w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-[var(--line)] hover:border-[var(--ember)] text-[var(--ember)] bg-[rgba(231,168,87,0.06)] transition-all"
              title="Start hands-free Voice Mode"
              aria-label="Start Voice Mode"
            >
              <Mic size={16} />
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder={`Message ${persona.name}…`}
              className="echo-focus flex-1 bg-transparent border rounded-full px-4 py-2.5 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
            <button
              onClick={() => send(input)}
              className="echo-focus w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "var(--ember)", color: "#1a1305" }}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>

          <div className="px-6 pb-3 text-[11px] echo-mono flex items-center justify-between" style={{ color: "var(--ink-dim)" }}>
            <span>ECHO REMEMBRANCE — responses synthesized in {persona.name}&apos;s style.</span>
            <button
              onClick={() => setIsVoiceModeOpen(true)}
              className="text-[var(--ember)] hover:underline flex items-center gap-1"
            >
              <Radio size={11} /> Open Voice Mode
            </button>
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
                  {Math.round((retrieved.confidence || 0.94) * 100)}%
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

