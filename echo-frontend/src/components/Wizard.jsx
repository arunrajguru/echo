import React, { useState, useRef } from "react";
import { ChevronRight, ChevronLeft, Upload, Check } from "lucide-react";
import { Logo, Disclaimer, PrimaryButton, GhostButton } from "./shared/Basics.jsx";
import { MemoryOrb } from "./MemoryOrb.jsx";
import * as api from "../services/api.js";
import { MOCK_PERSONA, MOCK_MEMORIES } from "../data/mockData.js";

const STEPS = ["Name", "Upload", "Select voice in chat", "Consent", "Review"];

function StepRail({ step }) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] echo-mono"
              style={{
                background: i <= step ? "var(--ember)" : "transparent",
                color: i <= step ? "#1a1305" : "var(--ink-dim)",
                border: i <= step ? "none" : "1px solid var(--line)",
              }}
            >
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            <span
              className="text-xs hidden sm:inline"
              style={{ color: i <= step ? "var(--ink)" : "var(--ink-dim)" }}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="w-6 h-px" style={{ background: "var(--line)" }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function Wizard({ onComplete, onBack }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [personaId, setPersonaId] = useState("");
  const [fileName, setFileName] = useState("");
  const [messageCount, setMessageCount] = useState(2481);
  const [participants, setParticipants] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [voiceFileName, setVoiceFileName] = useState("");
  const [consented, setConsented] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState({ messagesAnalyzed: 0, personaMessages: 0, memoriesFound: 0, confidence: 0.9 });
  const [style, setStyle] = useState({});
  const [memories, setMemories] = useState([]);
  const [approved, setApproved] = useState(() => new Set());

  const fileInputRef = useRef(null);
  const voiceInputRef = useRef(null);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => (step === 0 ? onBack() : setStep((s) => s - 1));

  const handleCreatePersonaStep = async () => {
    try {
      if (!personaId) {
        const p = await api.createPersona({ name, relationship });
        setPersonaId(p.id || p._id);
      }
    } catch (e) {
      console.warn("[wizard] Backend not available, continuing with local state:", e);
    }
    next();
  };

  const handleUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    try {
      if (personaId) {
        const res = await api.uploadChat(personaId, file);
        if (res.participants && res.participants.length > 0) {
          setParticipants(res.participants);
          setSelectedPerson(res.participants[0]);
        }
        if (res.messageCount) {
          setMessageCount(res.messageCount);
        }
      }
    } catch (err) {
      console.warn("[wizard] Upload fallback:", err);
      setParticipants(["Dad", "Me", "Mom"]);
      setSelectedPerson("Dad");
    }
  };

  const handleVoiceUpload = () => {
    if (voiceInputRef.current) {
      voiceInputRef.current.click();
    }
  };

  const handleVoiceFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVoiceFileName(file.name);
    if (personaId) {
      try {
        await api.uploadVoice(personaId, file);
      } catch (err) {
        console.warn("[wizard] Voice upload fallback:", err);
      }
    }
  };

  const [progressMsg, setProgressMsg] = useState("Reading conversation…");

  const runAnalysis = async () => {
    setAnalyzing(true);
    setProgressMsg("Reading conversation…");
    const progressSteps = [
      "Learning communication style…",
      "Finding recurring phrases & expressions…",
      "Learning response patterns…",
      "Extracting grounded memories…",
      "Building conversational examples…",
      "Preparing voice profile…",
      "Persona ready.",
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < progressSteps.length) {
        setProgressMsg(progressSteps[stepIdx]);
        stepIdx++;
      }
    }, 400);

    try {
      if (personaId) {
        if (selectedPerson) {
          await api.updatePersona(personaId, { targetParticipant: selectedPerson });
        }
        const res = await api.analyzePersona(personaId);
        if (res.stats) setStats(res.stats);
        if (res.style) setStyle(res.style);
        if (res.memories && res.memories.length > 0) {
          setMemories(res.memories);
          setApproved(new Set(res.memories.map((m) => m.id || m._id)));
        }
      }
    } catch (err) {
      console.warn("[wizard] Analysis fallback:", err);
    } finally {
      clearInterval(interval);
      setProgressMsg("Persona ready.");
      setTimeout(() => {
        setAnalyzing(false);
        next();
      }, 600);
    }
  };

  const toggleApproved = (id) =>
    setApproved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Voice is optional: consent is only required once a recording is attached.
  const canAnalyze = !analyzing && (!voiceFileName || consented);

  return (
    <div className="echo-fade-in w-full h-full overflow-y-auto echo-scrollbar px-6 md:px-16 py-10">
      <div className="flex items-center justify-between mb-8">
        <Logo size="text-xl" />
        <Disclaimer compact />
      </div>

      <StepRail step={step} />

      <div className="max-w-xl">
        {step === 0 && (
          <div className="echo-fade-in">
            <h2 className="echo-serif text-3xl mb-2">Name this Echo</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ink-dim)" }}>
              Who are you building this reflection from?
            </p>
            <label className="block text-xs echo-mono mb-2" style={{ color: "var(--ink-dim)" }}>
              NAME
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dad"
              className="echo-focus w-full mb-5 bg-transparent border rounded-lg px-4 py-3 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
            <label className="block text-xs echo-mono mb-2" style={{ color: "var(--ink-dim)" }}>
              RELATIONSHIP
            </label>
            <input
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="e.g. Father"
              className="echo-focus w-full mb-8 bg-transparent border rounded-lg px-4 py-3 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
            <div className="flex gap-3">
              <GhostButton onClick={prev} icon={ChevronLeft}>
                Back
              </GhostButton>
              <PrimaryButton onClick={handleCreatePersonaStep} disabled={!name || !relationship} icon={ChevronRight}>
                Continue
              </PrimaryButton>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="echo-fade-in">
            <h2 className="echo-serif text-3xl mb-2">Upload the conversation</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ink-dim)" }}>
              WhatsApp export, plain text, JSON, or CSV. Nothing leaves this device
              until you choose to build the reflection.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".txt,.json,.csv"
            />
            <button
              onClick={handleUpload}
              className="echo-focus w-full border-2 border-dashed rounded-xl py-12 flex flex-col items-center gap-3 mb-4"
              style={{ borderColor: "var(--line)" }}
            >
              <Upload size={22} style={{ color: "var(--ember)" }} />
              <span className="text-sm">
                {fileName || "Click to choose a file, or drag one here"}
              </span>
            </button>
            {fileName && (
              <div
                className="rounded-lg px-4 py-3 mb-6 text-sm flex items-center gap-2"
                style={{ background: "var(--ember-soft)", color: "var(--ember)" }}
              >
                <Check size={14} /> {fileName} — {messageCount.toLocaleString()} messages found
              </div>
            )}
            <div className="flex gap-3">
              <GhostButton onClick={prev} icon={ChevronLeft}>
                Back
              </GhostButton>
              <PrimaryButton onClick={next} disabled={!fileName} icon={ChevronRight}>
                Continue
              </PrimaryButton>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="echo-fade-in">
            <h2 className="echo-serif text-3xl mb-2">Which person should Echo learn from?</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ink-dim)" }}>
              Echo only builds a reflection of one participant — everyone else's
              messages are used purely as conversational context.
            </p>
            <div className="space-y-2 mb-8">
              {participants.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPerson(p)}
                  className="echo-focus w-full text-left border rounded-lg px-4 py-3 text-sm flex items-center justify-between"
                  style={{
                    borderColor: selectedPerson === p ? "var(--ember)" : "var(--line)",
                    background: selectedPerson === p ? "var(--ember-soft)" : "transparent",
                  }}
                >
                  {p}
                  {selectedPerson === p && <Check size={16} style={{ color: "var(--ember)" }} />}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <GhostButton onClick={prev} icon={ChevronLeft}>
                Back
              </GhostButton>
              <PrimaryButton onClick={next} disabled={!selectedPerson} icon={ChevronRight}>
                Continue
              </PrimaryButton>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="echo-fade-in">
            <h2 className="echo-serif text-3xl mb-2">Voice consent</h2>
            <p className="text-sm mb-2" style={{ color: "var(--ink-dim)" }}>
              Voice cloning is optional and runs on a local, free voice engine —
              never a paid third-party service.
            </p>
            <div
              className="rounded-lg px-4 py-4 mb-6 text-sm"
              style={{ border: "1px solid var(--line)" }}
            >
              <p className="mb-3">Only upload voice recordings that you have permission to use.</p>
              <p style={{ color: "var(--ink-dim)" }}>
                For a recording of someone who has passed away, any voice Echo
                generates will be clearly labeled AI-generated — never presented
                as a real recording of them.
              </p>
            </div>

            <input
              type="file"
              ref={voiceInputRef}
              onChange={handleVoiceFileChange}
              className="hidden"
              accept="audio/*,.mp3,.wav,.ogg,.m4a"
            />
            <label className="block text-xs echo-mono mb-2" style={{ color: "var(--ink-dim)" }}>
              VOICE RECORDING (OPTIONAL)
            </label>
            <button
              onClick={handleVoiceUpload}
              className="echo-focus w-full border-2 border-dashed rounded-xl py-8 flex flex-col items-center gap-2 mb-4"
              style={{ borderColor: "var(--line)" }}
            >
              <Upload size={20} style={{ color: "var(--ember)" }} />
              <span className="text-sm">
                {voiceFileName || "Click to choose a short audio clip, or drag one here"}
              </span>
            </button>
            {voiceFileName && (
              <div
                className="rounded-lg px-4 py-3 mb-6 text-sm flex items-center gap-2"
                style={{ background: "var(--ember-soft)", color: "var(--ember)" }}
              >
                <Check size={14} /> {voiceFileName} ready for voice cloning
              </div>
            )}

            <label className="flex items-start gap-3 mb-8 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                disabled={!voiceFileName}
                className="mt-1"
              />
              <span style={{ opacity: voiceFileName ? 1 : 0.5 }}>
                I confirm I have permission to use this voice recording, and I
                understand Echo will disclose that generated audio is synthetic.
              </span>
            </label>
            <div className="flex gap-3">
              <GhostButton onClick={prev} icon={ChevronLeft}>
                Back
              </GhostButton>
              <PrimaryButton
                onClick={runAnalysis}
                disabled={!canAnalyze}
                icon={analyzing ? undefined : ChevronRight}
              >
                {analyzing ? "Analyzing memories…" : "Analyze & continue"}
              </PrimaryButton>
            </div>
            {analyzing && (
              <div className="mt-6 flex flex-col items-center gap-2">
                <div className="h-24 w-24">
                  <MemoryOrb state="thinking" />
                </div>
                <span className="text-xs echo-mono animate-pulse" style={{ color: "var(--ember)" }}>
                  {progressMsg}
                </span>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="echo-fade-in">
            <h2 className="echo-serif text-3xl mb-2">Review what Echo found</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ink-dim)" }}>
              Nothing here becomes part of {name || "Echo"} until you approve it.
              Uncheck anything that looks wrong.
            </p>

            <div
              className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8 echo-mono text-xs"
              style={{ color: "var(--ink-dim)" }}
            >
              {[
                ["Messages analyzed", stats.messagesAnalyzed],
                ["Persona messages", stats.personaMessages],
                ["Memories found", memories.length],
                ["Conversation examples", stats.conversationExamples || 0],
                ["Confidence", `${Math.round((stats.confidence || 0.9) * 100)}%`],
              ].map(([label, val]) => (
                <div key={label} className="rounded-lg px-3 py-3" style={{ border: "1px solid var(--line)" }}>
                  <div className="text-base echo-serif" style={{ color: "var(--ink)" }}>
                    {val}
                  </div>
                  {label}
                </div>
              ))}
            </div>

            <h3 className="text-sm mb-3" style={{ color: "var(--ink-dim)" }}>
              Extracted memories
            </h3>
            <div className="space-y-2 mb-8">
              {memories.map((m) => {
                const memId = m.id || m._id;
                return (
                  <label
                    key={memId}
                    className="flex items-start gap-3 rounded-lg px-4 py-3 text-sm cursor-pointer"
                    style={{ border: "1px solid var(--line)" }}
                  >
                    <input
                      type="checkbox"
                      checked={approved.has(memId)}
                      onChange={() => toggleApproved(memId)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span>{m.title}</span>
                        <span className="echo-mono text-[11px]" style={{ color: "var(--ember)" }}>
                          {Math.round((m.confidence || 0.85) * 100)}%
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: "var(--ink-dim)" }}>
                        {m.content}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-3">
              <GhostButton onClick={prev} icon={ChevronLeft}>
                Back
              </GhostButton>
              <PrimaryButton
                onClick={() =>
                  onComplete({
                    id: personaId,
                    name,
                    relationship,
                    style,
                    stats,
                    memories: memories.filter((m) => approved.has(m.id || m._id)),
                  })
                }
                icon={ChevronRight}
              >
                Create Echo
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Wizard;
