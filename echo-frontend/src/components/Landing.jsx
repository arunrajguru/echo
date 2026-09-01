import { useEffect, useState } from "react";
import { ChevronRight, Orbit, MessageCircle, Mic, Plus, Trash2, Heart } from "lucide-react";
import { Logo, Disclaimer, PrimaryButton, GhostButton } from "./shared/Basics.jsx";
import { MemoryOrb } from "./MemoryOrb.jsx";
import * as api from "../services/api.js";

export function Landing({ onCreate, onExplore, onSelectPersona, personas = [], onRefreshPersonas }) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (e, personaId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this Echo? All associated memories, messages, and voice profiles will be permanently removed.")) {
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
    <div className="echo-fade-in relative w-full h-full flex flex-col overflow-y-auto echo-scrollbar">
      <header className="flex items-center justify-between px-8 py-6">
        <Logo />
        <Disclaimer compact />
      </header>

      <div className="flex-1 grid md:grid-cols-2 gap-8 items-center px-8 md:px-16 pb-8">
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
                  const memoryCount = p.memories?.length || p.stats?.memoriesFound || (p.stats?.messagesAnalyzed ? Math.min(5, Math.ceil(p.stats.messagesAnalyzed / 2)) : 5);
                  const isVoiceEnabled = !!p.voiceProfileId || (p.voiceProfile && p.voiceProfile.status === "ready");

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

                      <div className="flex items-center gap-3 text-xs echo-mono mb-3" style={{ color: "var(--ink-dim)" }}>
                        <span>{memoryCount} memories</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Mic size={11} style={{ color: isVoiceEnabled ? "var(--ember)" : "var(--ink-dim)" }} />
                          {isVoiceEnabled ? "Voice enabled" : "Text mode"}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPersona(p, "chat");
                          }}
                          className="echo-focus flex-1 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-medium"
                          style={{ background: "var(--ember-soft)", color: "var(--ember)" }}
                        >
                          <MessageCircle size={13} /> Talk
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPersona(p, "space");
                          }}
                          className="echo-focus flex-1 text-xs py-1.5 rounded-lg border flex items-center justify-center gap-1.5"
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

        <div className="order-1 md:order-2 h-[320px] md:h-[440px]">
          <MemoryOrb state="idle" />
        </div>
      </div>
    </div>
  );
}

export default Landing;
