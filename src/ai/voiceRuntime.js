import { AudioPlayback, ModelCategory, ModelManager, VoicePipeline } from "@runanywhere/web";
import { STT, STTModelType, TTS, VAD } from "@runanywhere/web-onnx";
import { getOrLoadModel, initRuntime } from "./runAnywhereRuntime.js";
import {
  OLLAMA_CONFIG,
  VOICE_LLM_MODEL_ID,
  VOICE_MAX_RESPONSE_TOKENS,
  VOICE_RUNANYWHERE_MODEL_IDS,
  VOICE_RUNANYWHERE_MODEL_DEFS,
  VOICE_SAMPLE_RATE,
  VOICE_TTS_SPEED,
} from "./runAnywhereConfig.js";
import { buildVoiceAssistantPrompt } from "./promptBuilders.js";

const VOICE_MODEL_ESTIMATE_MB = 250;

function emit(callback, payload) {
  if (typeof callback !== "function") {
    return;
  }

  try {
    callback(payload);
  } catch {
    // Keep the voice runtime stable if a UI callback fails.
  }
}

function getHeapLimitMb() {
  if (typeof performance === "undefined" || !performance.memory) {
    return 0;
  }

  return performance.memory.jsHeapSizeLimit / 1_000_000;
}

function isSafeToLoadVoiceModel() {
  const availableMb = getHeapLimitMb();
  return availableMb === 0 || availableMb > VOICE_MODEL_ESTIMATE_MB * 2;
}

function assertVoiceModelMemory() {
  const availableMb = getHeapLimitMb();
  const safeToLoad = isSafeToLoadVoiceModel();

  if (!safeToLoad) {
    throw new Error(
      `Insufficient browser memory: need ~${VOICE_MODEL_ESTIMATE_MB}MB, heap limit is ${Math.round(availableMb)}MB. Use Ollama fallback instead.`,
    );
  }
}

function getLoadedVoiceSnapshot() {
  return {
    vad: Boolean(ModelManager.getLoadedModel(ModelCategory.Audio)),
    stt: Boolean(ModelManager.getLoadedModel(ModelCategory.SpeechRecognition)),
    llm: Boolean(ModelManager.getLoadedModel(ModelCategory.Language)),
    tts: Boolean(ModelManager.getLoadedModel(ModelCategory.SpeechSynthesis)),
  };
}

function getVoiceMode() {
  return getLoadedVoiceSnapshot().llm ? "browser" : "ollama";
}

function getVoiceModelMeta(modelId) {
  return VOICE_RUNANYWHERE_MODEL_DEFS.find((model) => model.id === modelId) || null;
}

function buildVoiceModelDir(modelId) {
  return `/models/${modelId}`;
}

function buildVADModelPath(modelId) {
  const modelMeta = getVoiceModelMeta(modelId);
  const fileName = modelMeta?.files?.[0] || modelMeta?.url?.split("/").pop() || "silero_vad.onnx";
  return `${buildVoiceModelDir(modelId)}/${fileName}`;
}

function buildWhisperPaths(modelId) {
  const modelDir = buildVoiceModelDir(modelId);
  return {
    encoder: `${modelDir}/encoder.onnx`,
    decoder: `${modelDir}/decoder.onnx`,
    tokens: `${modelDir}/tokens.txt`,
  };
}

function buildTTSPaths(modelId) {
  const modelDir = buildVoiceModelDir(modelId);
  return {
    voiceId: modelId,
    modelPath: `${modelDir}/model.onnx`,
    tokensPath: `${modelDir}/tokens.txt`,
    dataDir: `${modelDir}/espeak-ng-data`,
    numThreads: 1,
  };
}

export function getVoiceRuntimeInfo() {
  const loaded = getLoadedVoiceSnapshot();
  const llmMode = getVoiceMode();
  return {
    ...loaded,
    ready: loaded.vad && loaded.stt && loaded.tts && (loaded.llm || llmMode === "ollama"),
    llmMode,
    compatibilityMode: typeof crossOriginIsolated !== "undefined" && !crossOriginIsolated,
    sampleRate: VOICE_SAMPLE_RATE,
    maxTokens: VOICE_MAX_RESPONSE_TOKENS,
    ttsSpeed: VOICE_TTS_SPEED,
    models: VOICE_RUNANYWHERE_MODEL_DEFS.map((model) => ({
      id: model.id,
      name: model.name,
      modality: model.modality,
    })),
  };
}

async function ensureModelLoaded(modelId, onProgress) {
  const managedModel = ModelManager.getModels().find((model) => model.id === modelId);
  if (!managedModel) {
    throw new Error(`Voice model ${modelId} is not registered.`);
  }

  if (managedModel.status !== "downloaded" && managedModel.status !== "loaded") {
    emit(onProgress, {
      stage: `voice:download:${modelId}`,
      progress: 0.1,
      message: `Downloading ${managedModel.name} for voice features.`,
    });
    await ModelManager.downloadModel(modelId);
  }

  if (managedModel.status !== "loaded") {
    emit(onProgress, {
      stage: `voice:load:${modelId}`,
      progress: 0.65,
      message: `Loading ${managedModel.name} into memory.`,
    });
    await ModelManager.loadModel(modelId, { coexist: true });
  }
}

async function ensureVoiceLanguageModel(onProgress) {
  const loadedLanguageModel = ModelManager.getLoadedModel(ModelCategory.Language);
  if (loadedLanguageModel) {
    return "browser";
  }

  if (!isSafeToLoadVoiceModel()) {
    emit(onProgress, {
      stage: "voice:ollama",
      progress: 0.6,
      message: "Browser heap is tight. Routing voice reasoning through local Ollama.",
    });
    return "ollama";
  }

  assertVoiceModelMemory();
  await getOrLoadModel({ onProgress, requestedModelId: VOICE_LLM_MODEL_ID });
  return "browser";
}

async function ensureVADInitialized(modelId) {
  if (VAD.isInitialized) {
    return;
  }

  await VAD.loadModel({
    modelPath: buildVADModelPath(modelId),
  });
}

async function ensureSTTInitialized(modelId) {
  if (STT.isModelLoaded) {
    return;
  }

  await STT.loadModel({
    modelId,
    type: STTModelType.Whisper,
    modelFiles: buildWhisperPaths(modelId),
    sampleRate: VOICE_SAMPLE_RATE,
    language: "en",
  });
}

async function ensureTTSInitialized(modelId) {
  if (TTS.isVoiceLoaded) {
    return;
  }

  await TTS.loadVoice(buildTTSPaths(modelId));
}

async function ensureOnnxVoiceExtensions() {
  const [vadModelId, sttModelId, ttsModelId] = VOICE_RUNANYWHERE_MODEL_IDS;
  await ensureVADInitialized(vadModelId);
  await ensureSTTInitialized(sttModelId);
  await ensureTTSInitialized(ttsModelId);
}

async function callOllamaChat(messages, onChunk) {
  const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_CONFIG.model,
      stream: true,
      messages,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Ollama voice fallback failed: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        continue;
      }

      const chunk = parsed?.message?.content || "";
      if (chunk) {
        accumulated += chunk;
        if (typeof onChunk === "function") {
          onChunk(chunk, accumulated);
        }
      }

      if (parsed?.done) {
        return accumulated.trim();
      }
    }
  }

  if (buffer.trim()) {
    const parsed = JSON.parse(buffer.trim());
    const chunk = parsed?.message?.content || "";
    if (chunk) {
      accumulated += chunk;
      if (typeof onChunk === "function") {
        onChunk(chunk, accumulated);
      }
    }
  }

  return accumulated.trim();
}

export async function ensureVoiceStack(onProgress) {
  await initRuntime({ onProgress });

  const [vadModelId, sttModelId, ttsModelId] = VOICE_RUNANYWHERE_MODEL_IDS;
  const loaded = getLoadedVoiceSnapshot();
  const missing = [];

  if (!loaded.vad) missing.push(vadModelId);
  if (!loaded.stt) missing.push(sttModelId);
  if (!loaded.tts) missing.push(ttsModelId);

  for (const modelId of missing) {
    await ensureModelLoaded(modelId, onProgress);
  }

  emit(onProgress, {
    stage: "voice:init-engines",
    progress: 0.72,
    message: "Initializing VAD, speech recognition, and speech synthesis engines.",
  });
  await ensureOnnxVoiceExtensions();

  const llmMode = await ensureVoiceLanguageModel(onProgress);

  VAD.reset();

  const snapshot = {
    ...getVoiceRuntimeInfo(),
    llmMode,
    ready: true,
  };

  emit(onProgress, {
    stage: "voice:ready",
    progress: 1,
    message: llmMode === "browser"
      ? "Voice stack ready."
      : "Voice stack ready. Reasoning will use local Ollama to conserve browser memory.",
  });

  return snapshot;
}

export function buildVoicePromptContext({ code, language, activeTab, analysis }) {
  return buildVoiceAssistantPrompt({
    code,
    language,
    activeTab,
    analysis,
  });
}

export function createVoicePlayback(sampleRate) {
  return new AudioPlayback({ sampleRate });
}

export async function processVoiceTurn(audioData, options = {}, callbacks = {}) {
  const llmMode = getVoiceMode();

  if (llmMode === "browser") {
    const pipeline = new VoicePipeline();
    return pipeline.processTurn(audioData, options, callbacks);
  }

  callbacks?.onStateChange?.("processingSTT");
  const sttResult = await STT.transcribe(audioData, {
    sampleRate: options.sampleRate || VOICE_SAMPLE_RATE,
  });
  const transcription = sttResult?.text?.trim() || "";
  callbacks?.onTranscription?.(transcription, sttResult);

  if (!transcription) {
    callbacks?.onStateChange?.("idle");
    return {
      transcription: "",
      response: "",
      timing: { sttMs: sttResult?.processingTimeMs || 0, llmMs: 0, ttsMs: 0, totalMs: sttResult?.processingTimeMs || 0 },
      sttResult,
    };
  }

  callbacks?.onStateChange?.("generatingResponse");
  const llmStart = performance.now();
  const responseText = await callOllamaChat(
    [
      { role: "system", content: options.systemPrompt || "You are a concise coding voice assistant." },
      { role: "user", content: transcription },
    ],
    (token, accumulated) => {
      callbacks?.onResponseToken?.(token, accumulated);
    },
  );
  const llmMs = performance.now() - llmStart;
  callbacks?.onResponseComplete?.(responseText, { text: responseText, tokensUsed: 0, tokensPerSecond: 0 });

  if (!responseText.trim()) {
    callbacks?.onStateChange?.("idle");
    return {
      transcription,
      response: "",
      timing: {
        sttMs: sttResult?.processingTimeMs || 0,
        llmMs,
        ttsMs: 0,
        totalMs: (sttResult?.processingTimeMs || 0) + llmMs,
      },
      sttResult,
    };
  }

  callbacks?.onStateChange?.("playingTTS");
  const ttsStart = performance.now();
  const ttsResult = await TTS.synthesize(responseText.trim(), {
    speed: options.ttsSpeed || VOICE_TTS_SPEED,
  });
  const ttsMs = performance.now() - ttsStart;
  callbacks?.onSynthesisComplete?.(ttsResult.audioData, ttsResult.sampleRate, ttsResult);
  callbacks?.onStateChange?.("idle");

  return {
    transcription,
    response: responseText,
    synthesizedAudio: ttsResult.audioData,
    sampleRate: ttsResult.sampleRate,
    timing: {
      sttMs: sttResult?.processingTimeMs || 0,
      llmMs,
      ttsMs,
      totalMs: (sttResult?.processingTimeMs || 0) + llmMs + ttsMs,
    },
    sttResult,
    llmResult: { text: responseText, tokensUsed: 0, tokensPerSecond: 0 },
    ttsResult,
  };
}
