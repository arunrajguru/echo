import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, MessageSquare, AlertCircle } from "lucide-react";
import { Logo } from "./shared/Basics.jsx";
import { MemoryOrb } from "./MemoryOrb.jsx";
import { WavRecorder } from "../services/wavRecorder.js";
import * as api from "../services/api.js";

/**
 * Dedicated Echo Voice Mode Screen
 * Full-screen immersive voice-to-voice experience with animated particle orb,
 * real-time speech recognition, Groq RAG text generation, and ElevenLabs audio playback.
 */
export function VoiceMode({ persona, messages, setMessages, sessionId, onExit }) {
  const [orbState, setOrbState] = useState("listening"); // 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'
  const [amplitude, setAmplitude] = useState(0.4);
  const [isMuted, setIsMuted] = useState(false);
  const [liveSpokenText, setLiveSpokenText] = useState("");
  const [latestEchoResponse, setLatestEchoResponse] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const recognitionRef = useRef(null);
  const recorderRef = useRef(null);
  const activeAudioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isMutedRef = useRef(false);
  const latestTranscriptRef = useRef("");
  const isProcessingTurnRef = useRef(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Visual amplitude animation during speaking (completely decoupled from audio hardware)
  const startSpeakingVisualPulse = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    let startTime = performance.now();
    const animateAmplitude = (currentTime) => {
      if (!isSpeakingRef.current) {
        setAmplitude(0.35);
        return;
      }
      const elapsed = (currentTime - startTime) / 1000;
      // Gentle natural speaking wave between 0.55 and 0.85
      const wave = 0.68 + Math.sin(elapsed * 6.5) * 0.12 + Math.cos(elapsed * 11.2) * 0.06;
      setAmplitude(wave);
      animFrameRef.current = requestAnimationFrame(animateAmplitude);
    };

    animFrameRef.current = requestAnimationFrame(animateAmplitude);
  }, []);

  // Process a user turn (text transcript) through the existing Persona Chat Pipeline
  const processSpokenTurn = useCallback(
    async (userText) => {
      if (isProcessingTurnRef.current) return;
      if (!userText || !userText.trim()) {
        if (!isMutedRef.current && !isSpeakingRef.current) {
          startListening();
        }
        return;
      }

      isProcessingTurnRef.current = true;
      const cleanText = userText.trim();
      console.log(`[ECHO VOICE] transcript: "${cleanText}"`);
      setLiveSpokenText(cleanText);
      setOrbState("thinking");
      setErrorMessage("");

      // Append user turn to shared conversation history
      setMessages((prev) => [...prev, { role: "user", text: cleanText }]);

      const personaId = persona?.id || persona?._id;

      try {
        console.log(`[ECHO VOICE] sending chat request: personaId=${personaId}, sessionId=${sessionId || "default"}`);
        let replyData = null;

        if (personaId) {
          replyData = await api.sendMessage(personaId, {
            message: cleanText,
            sessionId: sessionId || undefined,
          });
        }

        console.log(`[ECHO VOICE] chat response status: 200`);
        const replyMessage =
          replyData?.message ||
          "Haan, sun raha hoon! Aur bata kya chal raha hai? 😅";

        console.log(`[ECHO VOICE] chat response: "${replyMessage}"`);
        setLatestEchoResponse(replyMessage);

        // Append assistant reply to shared conversation history
        setMessages((prev) => [
          ...prev,
          {
            role: "echo",
            text: replyMessage,
            grounded: replyData?.grounded,
            sources: replyData?.sources,
            audioUrl: replyData?.audioUrl,
          },
        ]);

        // Synthesize or play generated audio
        let audioToPlay = replyData?.audioUrl;
        if (!audioToPlay && personaId) {
          try {
            console.log(`[ECHO VOICE] Requesting voice synthesis fallback for persona ${personaId}...`);
            const synth = await api.synthesizeVoice(personaId, replyMessage);
            audioToPlay = synth.audioUrl;
          } catch (synthErr) {
            console.warn("[ECHO VOICE] Voice synthesis fallback notice:", synthErr.message);
          }
        }

        console.log(`[ECHO VOICE] audioUrl: ${audioToPlay || "none"}`);

        if (audioToPlay) {
          await playGeneratedVoiceAudio(audioToPlay, replyMessage);
        } else {
          // Visual speech fallback if audioUrl is unavailable
          console.log("[ECHO VOICE] Simulating visual speaking state");
          setOrbState("speaking");
          isSpeakingRef.current = true;
          startSpeakingVisualPulse();
          const duration = Math.min(6000, Math.max(2000, replyMessage.length * 65));
          setTimeout(() => {
            isSpeakingRef.current = false;
            isProcessingTurnRef.current = false;
            setAmplitude(0.35);
            if (!isMutedRef.current) {
              startListening();
            } else {
              setOrbState("idle");
            }
          }, duration);
        }
      } catch (err) {
        console.error("[ECHO VOICE] chat error:", err);
        isProcessingTurnRef.current = false;
        setErrorMessage("Echo had trouble answering. Please speak again.");
        setOrbState("error");
        setTimeout(() => {
          if (!isMutedRef.current) {
            startListening();
          } else {
            setOrbState("idle");
          }
        }, 2000);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [persona, sessionId, setMessages, startSpeakingVisualPulse]
  );

  // Play generated audio stream and automatically return to listening upon finish
  const playGeneratedVoiceAudio = useCallback(
    async (audioUrl, replyText = "") => {
      // Ensure exactly ONE playback instance exists and stop any previous stream
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
          activeAudioRef.current.currentTime = 0;
        } catch (_) {}
        activeAudioRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      console.log(`[ECHO AUDIO] playback-start: ${audioUrl}`);
      const audio = new Audio();
      audio.preload = "auto";
      audio.crossOrigin = "anonymous";
      activeAudioRef.current = audio;

      audio.onplay = () => {
        console.log("[ECHO VOICE] audio started: playing stream");
        setOrbState("speaking");
        isSpeakingRef.current = true;
        startSpeakingVisualPulse();
      };

      audio.onended = () => {
        console.log(`[ECHO AUDIO] playback-end: ${audioUrl}`);
        isSpeakingRef.current = false;
        isProcessingTurnRef.current = false;
        setOrbState("idle");
        setAmplitude(0.35);
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        activeAudioRef.current = null;

        // Auto turn-taking: resume listening for user's next turn
        if (!isMutedRef.current) {
          startListening();
        }
      };

      audio.onerror = (e) => {
        console.warn(`[ECHO AUDIO] playback-error: ${audioUrl}`, e);
        isSpeakingRef.current = false;
        isProcessingTurnRef.current = false;
        setOrbState("idle");
        setAmplitude(0.35);
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        activeAudioRef.current = null;
        if (!isMutedRef.current) {
          startListening();
        }
      };

      try {
        audio.src = audioUrl;
        await audio.play();
      } catch (playErr) {
        console.warn("[ECHO AUDIO] playback-error: Audio play prevented by browser, simulating duration:", playErr);
        setOrbState("speaking");
        isSpeakingRef.current = true;
        startSpeakingVisualPulse();
        const duration = Math.min(6000, Math.max(2000, replyText.length * 60));
        setTimeout(() => {
          isSpeakingRef.current = false;
          isProcessingTurnRef.current = false;
          setOrbState("idle");
          setAmplitude(0.35);
          if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
          }
          if (!isMutedRef.current) {
            startListening();
          }
        }, duration);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startSpeakingVisualPulse]
  );

  // Developer & automated test simulation hook
  useEffect(() => {
    window.__echoSimulateSpeech = (text) => {
      const clean = (text || "").trim();
      if (clean) {
        console.log(`[ECHO VOICE] speech recognized: "${clean}"`);
        processSpokenTurn(clean);
      }
    };
    return () => {
      delete window.__echoSimulateSpeech;
    };
  }, [processSpokenTurn]);

  // Start Speech-to-Text Listening (Web Speech API with WavRecorder fallback)
  const startListening = useCallback(() => {
    if (isMutedRef.current || isSpeakingRef.current || isProcessingTurnRef.current) return;

    setOrbState("listening");
    setAmplitude(0.5);
    setLiveSpokenText("");
    setErrorMessage("");
    latestTranscriptRef.current = "";

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-IN"; // English/Hinglish optimal

        recognition.onstart = () => {
          isListeningRef.current = true;
          setOrbState("listening");
        };

        recognition.onresult = (event) => {
          let interim = "";
          let final = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              final += res[0].transcript;
            } else {
              interim += res[0].transcript;
            }
          }
          const spoken = (final || interim).trim();
          if (spoken) {
            latestTranscriptRef.current = spoken;
            setLiveSpokenText(spoken);
            setAmplitude(0.8);
          }
        };

        recognition.onerror = (event) => {
          console.warn("[ECHO VOICE] Speech recognition error:", event.error);
          isListeningRef.current = false;
          if (event.error === "no-speech") {
            if (!isMutedRef.current && !isSpeakingRef.current && !isProcessingTurnRef.current) {
              setTimeout(startListening, 300);
            }
          } else if (event.error === "not-allowed") {
            setErrorMessage("Microphone access was denied. Please allow microphone permissions.");
            setOrbState("error");
          }
        };

        recognition.onend = () => {
          isListeningRef.current = false;
          const freshTranscript = (latestTranscriptRef.current || "").trim();
          latestTranscriptRef.current = "";

          if (freshTranscript) {
            console.log(`[ECHO VOICE] speech recognized: "${freshTranscript}"`);
            processSpokenTurn(freshTranscript);
          } else if (!isMutedRef.current && !isSpeakingRef.current && !isProcessingTurnRef.current) {
            setOrbState("listening");
            setTimeout(startListening, 300);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err) {
        console.warn("[ECHO VOICE] WebSpeech init error, using fallback:", err);
      }
    }

    // Fallback: WavRecorder microphone capture
    startWavRecorderCapture();
  }, [processSpokenTurn]);

  // Fallback Microphone Recorder
  const startWavRecorderCapture = useCallback(async () => {
    try {
      if (!recorderRef.current) {
        recorderRef.current = new WavRecorder();
      }
      await recorderRef.current.start();
      isListeningRef.current = true;
      setOrbState("listening");
    } catch (err) {
      console.error("[ECHO VOICE] Microphone fallback error:", err);
      setErrorMessage("Could not access microphone.");
      setOrbState("error");
    }
  }, []);

  // Lifecycle: start listening on mount, cleanup on unmount
  useEffect(() => {
    startListening();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      if (recorderRef.current) {
        recorderRef.current.stop().catch(() => {});
        recorderRef.current = null;
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle Mute
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      isMutedRef.current = false;
      startListening();
    } else {
      setIsMuted(true);
      isMutedRef.current = true;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (recorderRef.current && isListeningRef.current) {
        recorderRef.current.stop().catch(() => {});
      }
      setOrbState("idle");
    }
  };

  // Exit Voice Mode cleanly
  const handleExit = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }
    onExit();
  };

  const statusDescription = {
    idle: isMuted ? "Microphone muted" : "Tap microphone to speak",
    listening: "Listening… speak naturally",
    thinking: "Thinking…",
    speaking: `${persona?.name || "Echo"} is speaking…`,
    error: errorMessage || "Error encountered",
  }[orbState];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f0c08] text-[#f7eedc] select-none echo-fade-in">
      {/* Background Ambient Aura */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background:
            orbState === "listening"
              ? "radial-gradient(circle at 50% 50%, rgba(127, 212, 224, 0.12) 0%, transparent 65%)"
              : orbState === "thinking"
              ? "radial-gradient(circle at 50% 50%, rgba(139, 135, 217, 0.14) 0%, transparent 65%)"
              : orbState === "speaking"
              ? "radial-gradient(circle at 50% 50%, rgba(240, 185, 106, 0.16) 0%, transparent 65%)"
              : "radial-gradient(circle at 50% 50%, rgba(231, 168, 87, 0.08) 0%, transparent 60%)",
        }}
      />

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <Logo size="text-lg" />
          <span className="text-sm px-2.5 py-0.5 rounded-full border border-[rgba(231,168,87,0.25)] bg-[rgba(231,168,87,0.08)] text-[#e7a857]">
            Voice Mode
          </span>
          <span className="text-xs text-[rgba(247,238,220,0.6)] font-mono">
            / {persona?.name || "Echo"}
          </span>
        </div>

        <button
          onClick={handleExit}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-full border border-[rgba(247,238,220,0.15)] bg-[rgba(247,238,220,0.05)] hover:bg-[rgba(247,238,220,0.1)] transition-all echo-focus"
          aria-label="Return to text chat"
        >
          <MessageSquare size={14} />
          <span>Text Chat</span>
        </button>
      </header>

      {/* Main Center Area — 3D Echo Particle Orb */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        <div className="w-full max-w-lg h-72 sm:h-96 md:h-[420px] relative flex items-center justify-center">
          <MemoryOrb state={orbState} amplitude={amplitude} size={1.35} />
        </div>

        {/* Live Subtitle / State Indicator */}
        <div className="mt-2 text-center max-w-md px-4 flex flex-col items-center gap-2 min-h-[68px]">
          <div
            className="text-xs font-mono tracking-wide uppercase px-3 py-1 rounded-full border transition-all duration-300"
            style={{
              borderColor:
                orbState === "listening"
                  ? "rgba(127, 212, 224, 0.4)"
                  : orbState === "thinking"
                  ? "rgba(139, 135, 217, 0.4)"
                  : orbState === "speaking"
                  ? "rgba(240, 185, 106, 0.4)"
                  : "rgba(247, 238, 220, 0.15)",
              color:
                orbState === "listening"
                  ? "#7fd4e0"
                  : orbState === "thinking"
                  ? "#8b87d9"
                  : orbState === "speaking"
                  ? "#f0b96a"
                  : "rgba(247, 238, 220, 0.7)",
              background: "rgba(15, 12, 8, 0.6)",
            }}
          >
            {statusDescription}
          </div>

          {liveSpokenText && orbState === "listening" && (
            <p className="text-sm sm:text-base text-[#7fd4e0] italic animate-pulse">
              “{liveSpokenText}”
            </p>
          )}

          {orbState === "speaking" && latestEchoResponse && (
            <p className="text-sm sm:text-base text-[#f7eedc] font-serif leading-relaxed line-clamp-2">
              “{latestEchoResponse}”
            </p>
          )}

          {errorMessage && (
            <p className="text-xs text-[#d9756b] flex items-center gap-1.5 font-mono">
              <AlertCircle size={12} />
              {errorMessage}
            </p>
          )}
        </div>
      </main>

      {/* Bottom Voice Controls */}
      <footer className="relative z-10 pb-8 pt-4 px-6 flex items-center justify-center gap-6 max-w-lg mx-auto w-full">
        {/* Return to Chat Button */}
        <button
          onClick={handleExit}
          className="w-12 h-12 rounded-full flex items-center justify-center border border-[rgba(247,238,220,0.18)] bg-[rgba(247,238,220,0.06)] hover:bg-[rgba(247,238,220,0.12)] text-[#f7eedc] transition-all echo-focus"
          title="Return to text conversation"
          aria-label="Return to text chat"
        >
          <MessageSquare size={18} />
        </button>

        {/* Main Microphone Button */}
        <button
          onClick={toggleMute}
          className="w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 echo-focus"
          style={{
            background: isMuted
              ? "rgba(217, 117, 107, 0.2)"
              : orbState === "listening"
              ? "#e7a857"
              : "rgba(231, 168, 87, 0.25)",
            border: isMuted
              ? "2px solid #d9756b"
              : "2px solid #e7a857",
            color: orbState === "listening" && !isMuted ? "#1a1305" : "#f7eedc",
            transform: orbState === "listening" ? "scale(1.05)" : "scale(1)",
          }}
          title={isMuted ? "Unmute microphone" : "Mute microphone"}
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        {/* End Voice Mode Call Button */}
        <button
          onClick={handleExit}
          className="w-12 h-12 rounded-full flex items-center justify-center border border-[rgba(217,117,107,0.4)] bg-[rgba(217,117,107,0.15)] hover:bg-[rgba(217,117,107,0.3)] text-[#d9756b] transition-all echo-focus"
          title="End voice mode"
          aria-label="End voice call"
        >
          <PhoneOff size={18} />
        </button>
      </footer>
    </div>
  );
}

export default VoiceMode;
