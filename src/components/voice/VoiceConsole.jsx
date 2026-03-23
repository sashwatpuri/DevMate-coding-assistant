import { useEffect, useMemo, useRef, useState } from "react";
import { AudioCapture, SpeechActivity } from "@runanywhere/web";
import { VAD } from "@runanywhere/web-onnx";
import {
  buildVoicePromptContext,
  createVoicePlayback,
  ensureVoiceStack,
  processVoiceTurn,
} from "../../ai/voiceRuntime.js";
import { commandLabel, detectVoiceCommand } from "../../ai/voiceCommands.js";

const compatibilityMode = typeof crossOriginIsolated === "boolean" && !crossOriginIsolated;

if (compatibilityMode) {
  console.warn("[DevMate] crossOriginIsolated=false - WORKERFS unavailable, model will load slower via stream fallback. Check CORP headers.");
}

const VOICE_STATE_LABELS = {
  idle: "Ready",
  loading: "Loading voice stack",
  listening: "Listening",
  processing: "Transcribing and reasoning",
  speaking: "Speaking response",
  error: "Voice error",
};

const QUICK_ACTIONS = [
  { label: "Explain", tab: "Explanation" },
  { label: "Debug", tab: "Debug" },
  { label: "Optimize", tab: "Optimize" },
  { label: "Visualize", tab: "Visualize" },
  { label: "Interview", tab: "Interview Mode" },
];

function VoiceStatusPill({ label, active }) {
  return <span className={`voice-status-pill ${active ? "is-active" : ""}`}>{label}</span>;
}

export default function VoiceConsole({
  code = "",
  language = "python",
  activeTab = "Visualize",
  analysis = null,
  runtimeInfo = null,
  onAnalyze,
  onSetActiveTab,
  onRuntimeRefresh,
}) {
  const [voiceState, setVoiceState] = useState("idle");
  const [statusText, setStatusText] = useState("Tap the microphone to start a local voice turn.");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [detectedCommand, setDetectedCommand] = useState(null);
  const [voiceSnapshot, setVoiceSnapshot] = useState(runtimeInfo?.voice || null);

  const micRef = useRef(null);
  const playbackRef = useRef(null);
  const vadUnsubRef = useRef(null);
  const sessionActiveRef = useRef(false);
  const voiceReadyRef = useRef(false);

  const voiceLoaded = voiceSnapshot?.loaded || runtimeInfo?.voice?.loaded || {};
  const voiceLabels = useMemo(
    () => [
      { key: "vad", label: "VAD", loaded: Boolean(voiceLoaded.vad) },
      { key: "stt", label: "STT", loaded: Boolean(voiceLoaded.stt) },
      { key: "llm", label: "LLM", loaded: Boolean(voiceLoaded.llm) },
      { key: "tts", label: "TTS", loaded: Boolean(voiceLoaded.tts) },
    ],
    [voiceLoaded.vad, voiceLoaded.stt, voiceLoaded.llm, voiceLoaded.tts],
  );

  useEffect(() => {
    setVoiceSnapshot(runtimeInfo?.voice || null);
  }, [runtimeInfo?.voice]);

  useEffect(() => {
    return () => {
      sessionActiveRef.current = false;
      vadUnsubRef.current?.();
      vadUnsubRef.current = null;
      micRef.current?.stop();
      micRef.current = null;
      voiceReadyRef.current = false;
      playbackRef.current?.stop?.();
      playbackRef.current?.dispose?.();
      playbackRef.current = null;
      VAD.cleanup();
    };
  }, []);

  function stopSession(message = "Voice session stopped.") {
    sessionActiveRef.current = false;
    vadUnsubRef.current?.();
    vadUnsubRef.current = null;
    micRef.current?.stop();
    micRef.current = null;
    voiceReadyRef.current = false;
    playbackRef.current?.stop?.();
    playbackRef.current?.dispose?.();
    playbackRef.current = null;
    VAD.reset();
    setVoiceState("idle");
    setAudioLevel(0);
    setStatusText(message);
    setErrorMessage("");
  }

  async function startSession() {
    if (sessionActiveRef.current) {
      stopSession();
      return;
    }

    setErrorMessage("");
    setDetectedCommand(null);
    setTranscript("");
    setResponse("");
    playbackRef.current?.stop?.();
    playbackRef.current?.dispose?.();
    playbackRef.current = null;
    setVoiceState("loading");
    setStatusText("Preparing STT, VAD, LLM, and TTS on-device.");

    sessionActiveRef.current = true;

    try {
      const loadedVoiceStack = await ensureVoiceStack((progress) => {
        if (progress?.message) {
          setStatusText(progress.message);
        }
      });

      if (!sessionActiveRef.current) {
        return;
      }

      if (!loadedVoiceStack.ready) {
        throw new Error("Voice stack is not fully loaded yet.");
      }

      setVoiceSnapshot(loadedVoiceStack);
      if (typeof onRuntimeRefresh === "function") {
        onRuntimeRefresh();
      }

      voiceReadyRef.current = true;
      VAD.reset();

      setVoiceState("listening");
      setStatusText("Listening for speech. Speak a command or ask about the code.");

      vadUnsubRef.current = VAD.onSpeechActivity(async (activity) => {
        if (!sessionActiveRef.current || activity !== SpeechActivity.Ended) {
          return;
        }

        const segment = VAD.popSpeechSegment();
        if (!segment || segment.samples.length < 1600) {
          return;
        }

        micRef.current?.stop();
        micRef.current = null;
        vadUnsubRef.current?.();
        vadUnsubRef.current = null;

        setVoiceState("processing");
        setStatusText("Transcribing your speech and generating a local response.");

        try {
          const result = await processVoiceTurn(
            segment.samples,
            {
              maxTokens: loadedVoiceStack?.maxTokens || runtimeInfo?.voice?.maxTokens || 60,
              temperature: 0.35,
              sampleRate: loadedVoiceStack?.sampleRate || runtimeInfo?.voice?.sampleRate || 16000,
              ttsSpeed: loadedVoiceStack?.ttsSpeed || runtimeInfo?.voice?.ttsSpeed || 1,
              systemPrompt: buildVoicePromptContext({
                code,
                language,
                activeTab,
                analysis,
              }),
            },
            {
              onTranscription: (text) => {
                if (!sessionActiveRef.current) {
                  return;
                }
                setTranscript(text);
              },
              onResponseToken: (_, accumulated) => {
                if (!sessionActiveRef.current) {
                  return;
                }
                setResponse(accumulated);
              },
              onResponseComplete: (text) => {
                if (!sessionActiveRef.current) {
                  return;
                }
                setResponse(text);
              },
              onSynthesisComplete: async (audio, sampleRate) => {
                if (!sessionActiveRef.current) {
                  return;
                }
                setVoiceState("speaking");
                playbackRef.current?.stop?.();
                playbackRef.current?.dispose?.();
                playbackRef.current = createVoicePlayback(sampleRate);
                await playbackRef.current.play(audio, sampleRate);
              },
              onStateChange: (state) => {
                if (!sessionActiveRef.current) {
                  return;
                }
                if (state === "processingSTT") {
                  setStatusText("Running speech recognition locally.");
                } else if (state === "generatingResponse") {
                  setStatusText(
                    loadedVoiceStack?.llmMode === "ollama"
                      ? "Browser memory is limited. Routing reasoning through local Ollama."
                      : "Thinking on-device with the local LLM.",
                  );
                } else if (state === "playingTTS") {
                  setStatusText("Synthesizing and playing the response.");
                }
              },
            },
          );

          if (!sessionActiveRef.current) {
            return;
          }

          const command = detectVoiceCommand(result.transcription);
          setDetectedCommand(command);
          if (command?.tab && typeof onSetActiveTab === "function") {
            onSetActiveTab(command.tab);
          }
          if (command?.shouldAnalyze && typeof onAnalyze === "function") {
            await onAnalyze();
          }

          setStatusText(
            command
              ? `Recognized ${commandLabel(command)} command.`
              : "Voice turn complete. Start another turn whenever you're ready.",
          );
        } catch (err) {
          setErrorMessage(err?.message || "Voice processing failed.");
          setStatusText("Voice processing failed.");
          setVoiceState("error");
        } finally {
          setVoiceState((current) => (current === "error" ? current : "idle"));
          setAudioLevel(0);
          voiceReadyRef.current = false;
          sessionActiveRef.current = false;
        }
      });

      micRef.current = new AudioCapture({
        sampleRate: loadedVoiceStack?.sampleRate || runtimeInfo?.voice?.sampleRate || 16000,
      });

      await micRef.current.start(
        (chunk) => {
          if (voiceReadyRef.current) {
            VAD.processSamples(chunk);
          }
        },
        (level) => {
          setAudioLevel(level);
        },
      );
    } catch (err) {
      sessionActiveRef.current = false;
      vadUnsubRef.current?.();
      vadUnsubRef.current = null;
      micRef.current?.stop();
      micRef.current = null;
      voiceReadyRef.current = false;
      playbackRef.current?.stop?.();
      playbackRef.current?.dispose?.();
      playbackRef.current = null;
      setVoiceState("error");
      setErrorMessage(err?.message || "Voice stack could not start.");
      setStatusText("Unable to start the voice stack.");
    }
  }

  function handleQuickAction(tab) {
    if (typeof onSetActiveTab === "function") {
      onSetActiveTab(tab);
    }
  }

  return (
    <section className="voice-console panel panel-stitch" aria-label="Voice command center">
      <div className="voice-console__header">
        <div className="voice-console__copy">
          <p className="eyebrow">On-device Voice</p>
          <h2>Talk to DevMate</h2>
          <p className="muted-text">
            Speak a coding task, let RunAnywhere transcribe it locally, then hear the response through on-device TTS.
          </p>
        </div>

        <div className="voice-console__header-meta">
          <div className="voice-console__state-pill">
            <span className="status-dot status-dot--soft" />
            <span>{VOICE_STATE_LABELS[voiceState] || "Ready"}</span>
          </div>
          {compatibilityMode ? (
            <span className="voice-console__command-badge">
              Running in compatibility mode - first load may be slow
            </span>
          ) : null}
          <div className="voice-console__model-pills">
            {voiceLabels.map((item) => (
              <VoiceStatusPill key={item.key} label={item.label} active={item.loaded} />
            ))}
          </div>
        </div>
      </div>

      <div className="voice-console__body">
        <div className="voice-console__left">
          <button
            type="button"
            className={`voice-console__mic-button ${voiceState !== "idle" ? "is-active" : ""}`}
            onClick={startSession}
          >
            <span className="voice-console__mic-orb" style={{ transform: `scale(${1 + audioLevel * 0.8})` }} />
            <span>{voiceState === "idle" ? "Start Voice Turn" : "Stop Voice Turn"}</span>
          </button>

          <div className="voice-console__meter">
            <div className="voice-console__meter-track">
              <div className="voice-console__meter-fill" style={{ width: `${Math.max(8, audioLevel * 100)}%` }} />
            </div>
            <p className="voice-console__status-text">{statusText}</p>
          </div>

          <div className="voice-console__quick-actions">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.tab}
                type="button"
                className={`voice-console__chip ${activeTab === action.tab ? "is-active" : ""}`}
                onClick={() => handleQuickAction(action.tab)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <div className="voice-console__right">
          <div className="voice-console__panel">
            <span className="kv-label">Transcript</span>
            <p className="voice-console__text">
              {transcript || 'No speech captured yet. Try a command like "debug this" or "optimize this code".'}
            </p>
          </div>

          <div className="voice-console__panel voice-console__panel--reply">
            <span className="kv-label">Assistant Reply</span>
            <p className="voice-console__text">
              {response || "Your local response will appear here and can be spoken back immediately."}
            </p>
          </div>

          <div className="voice-console__footer">
            <span className="voice-console__hint">
              Suggested flow: speak a command, let the model respond, then jump into the matching analysis tab.
            </span>
            {detectedCommand ? (
              <span className="voice-console__command-badge">
                {commandLabel(detectedCommand)} command recognized
              </span>
            ) : null}
          </div>

          {errorMessage ? <p className="voice-console__error">{errorMessage}</p> : null}
          <button
            type="button"
            className="secondary-btn voice-console__stop-btn"
            onClick={() => stopSession("Voice session stopped.")}
            disabled={voiceState === "idle"}
          >
            Stop
          </button>
        </div>
      </div>
    </section>
  );
}
