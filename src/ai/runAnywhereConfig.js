import { LLMFramework, ModelCategory } from "@runanywhere/web";

export const PRIMARY_RUNANYWHERE_MODEL_ID = "lfm2-350m-q4_k_m";
export const DEFAULT_RUNANYWHERE_MODEL_ID = PRIMARY_RUNANYWHERE_MODEL_ID;
export const RUNANYWHERE_MIN_DEVICE_MEMORY_GB = 8;
export const RUNANYWHERE_MEMORY_SAFE_MODEL_ID = PRIMARY_RUNANYWHERE_MODEL_ID;
export const RUNANYWHERE_HIGH_MEMORY_MODEL_IDS = Object.freeze([]);
export const RUNANYWHERE_MAX_CODE_CHARS = 8000;
export const RUNANYWHERE_MAX_RETRIES = 2;
export const OLLAMA_CONFIG = Object.freeze({
  baseUrl: String(import.meta.env.VITE_OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, ""),
  model: String(import.meta.env.VITE_OLLAMA_MODEL || "phi3:mini").trim() || "phi3:mini",
});
export const OLLAMA_BASE_URL = OLLAMA_CONFIG.baseUrl;
export const OLLAMA_MODEL = OLLAMA_CONFIG.model;
export const VOICE_SAMPLE_RATE = 16000;
export const VOICE_MAX_RESPONSE_TOKENS = 60;
export const VOICE_TTS_SPEED = 1;
export const VOICE_LLM_MODEL_ID = "lfm2-350m-q4_k_m";

const RUNANYWHERE_MODEL_LIBRARY = Object.freeze([
  {
    id: "lfm2-350m-q4_k_m",
    name: "LFM2 350M",
    label: "LFM2 350M",
    repo: "LiquidAI/LFM2-350M-GGUF",
    files: ["LFM2-350M-Q4_K_M.gguf"],
    framework: LLMFramework.LlamaCpp,
    modality: ModelCategory.Language,
    memoryRequirement: 250_000_000,
    quantization: "Q4_K_M",
    recommended: true,
    tier: "balanced",
  },
  {
    id: "phi-3-mini-4k-instruct-q4",
    name: "Phi-3 Mini 4K",
    label: "Phi-3 Mini",
    repo: "microsoft/Phi-3-mini-4k-instruct-gguf",
    files: ["Phi-3-mini-4k-instruct-q4.gguf"],
    framework: LLMFramework.LlamaCpp,
    modality: ModelCategory.Language,
    memoryRequirement: 2_500_000_000,
    quantization: "Q4",
    recommended: false,
    tier: "high",
    minimumDeviceMemoryGb: 8,
    requiresCrossOriginIsolation: true,
  },
]);

const RUNANYWHERE_VOICE_MODEL_LIBRARY = Object.freeze([
  {
    id: "silero-vad-v5",
    name: "Silero VAD v5",
    label: "Silero VAD",
    url: "https://huggingface.co/runanywhere/silero-vad-v5/resolve/main/silero_vad.onnx",
    files: ["silero_vad.onnx"],
    framework: LLMFramework.ONNX,
    modality: ModelCategory.Audio,
    memoryRequirement: 5_000_000,
  },
  {
    id: "sherpa-onnx-whisper-tiny.en",
    name: "Whisper Tiny English",
    label: "Whisper Tiny",
    url: "https://huggingface.co/runanywhere/sherpa-onnx-whisper-tiny.en/resolve/main/sherpa-onnx-whisper-tiny.en.tar.gz",
    framework: LLMFramework.ONNX,
    modality: ModelCategory.SpeechRecognition,
    memoryRequirement: 105_000_000,
    artifactType: "archive",
  },
  {
    id: "vits-piper-en_US-lessac-medium",
    name: "Piper TTS",
    label: "Piper Voice",
    url: "https://huggingface.co/runanywhere/vits-piper-en_US-lessac-medium/resolve/main/vits-piper-en_US-lessac-medium.tar.gz",
    framework: LLMFramework.ONNX,
    modality: ModelCategory.SpeechSynthesis,
    memoryRequirement: 65_000_000,
    artifactType: "archive",
  },
]);

export const RUNANYWHERE_MODEL_DEFS = Object.freeze(
  RUNANYWHERE_MODEL_LIBRARY.map(({ label, quantization, recommended, tier, ...definition }) => definition),
);

export const VOICE_RUNANYWHERE_MODEL_DEFS = Object.freeze(
  RUNANYWHERE_VOICE_MODEL_LIBRARY.map(({ label, ...definition }) => definition),
);

export const RUNANYWHERE_MODEL_IDS = Object.freeze(RUNANYWHERE_MODEL_LIBRARY.map((model) => model.id));
export const VOICE_RUNANYWHERE_MODEL_IDS = Object.freeze(RUNANYWHERE_VOICE_MODEL_LIBRARY.map((model) => model.id));

export function getPreferredRunAnywhereModelId() {
  return DEFAULT_RUNANYWHERE_MODEL_ID;
}

export function getRunAnywhereModelMeta(modelId = DEFAULT_RUNANYWHERE_MODEL_ID) {
  const match = RUNANYWHERE_MODEL_LIBRARY.find((model) => model.id === modelId);
  return match ? { ...match } : null;
}

export function listRunAnywhereModels() {
  return RUNANYWHERE_MODEL_LIBRARY.map((model) => ({ ...model }));
}

export function getDeviceMemoryGb() {
  if (typeof navigator === "undefined" || typeof navigator.deviceMemory !== "number") {
    return null;
  }

  return navigator.deviceMemory;
}

export function isCrossOriginIsolatedAvailable() {
  return typeof crossOriginIsolated === "boolean" ? crossOriginIsolated : false;
}

export function hasSharedArrayBufferSupport() {
  return typeof SharedArrayBuffer !== "undefined";
}

export function getRunAnywhereModelViability(modelId, options = {}) {
  const model = getRunAnywhereModelMeta(modelId);
  if (!model) {
    return {
      viable: false,
      reason: "Model is not registered.",
      reasons: ["Model is not registered."],
      model: null,
    };
  }

  const deviceMemoryGb = typeof options.deviceMemoryGb === "number" ? options.deviceMemoryGb : getDeviceMemoryGb();
  const crossOriginIsolatedAvailable = typeof options.crossOriginIsolated === "boolean"
    ? options.crossOriginIsolated
    : isCrossOriginIsolatedAvailable();
  const sharedArrayBufferAvailable = typeof options.sharedArrayBufferAvailable === "boolean"
    ? options.sharedArrayBufferAvailable
    : hasSharedArrayBufferSupport();
  const minimumDeviceMemoryGb = Number(model.minimumDeviceMemoryGb || 0);
  const reasons = [];

  if (minimumDeviceMemoryGb > 0 && (deviceMemoryGb === null || deviceMemoryGb < minimumDeviceMemoryGb)) {
    reasons.push(
      deviceMemoryGb === null
        ? `${model.name} is restricted to browsers that report at least ${minimumDeviceMemoryGb} GB device memory.`
        : `${model.name} requires at least ${minimumDeviceMemoryGb} GB device memory for a safe browser load.`,
    );
  }

  if (model.requiresCrossOriginIsolation && !crossOriginIsolatedAvailable) {
    reasons.push("Cross-origin isolation is required for browser llama.cpp loading.");
  }

  if (model.requiresSharedArrayBuffer && !sharedArrayBufferAvailable) {
    reasons.push("SharedArrayBuffer is unavailable in this browser.");
  }

  return {
    viable: reasons.length === 0,
    reason: reasons.join(" "),
    reasons,
    model,
  };
}

export function isRunAnywhereModelViable(modelId, deviceMemoryGb = getDeviceMemoryGb(), options = {}) {
  return getRunAnywhereModelViability(modelId, {
    ...options,
    deviceMemoryGb,
  }).viable;
}

export function resolveRunAnywhereModelId(requestedModelId, options = {}) {
  const fallbackModelId = options.fallbackModelId || DEFAULT_RUNANYWHERE_MODEL_ID;
  const deviceMemoryGb = typeof options.deviceMemoryGb === "number" ? options.deviceMemoryGb : getDeviceMemoryGb();
  const sharedOptions = {
    deviceMemoryGb,
    crossOriginIsolated: options.crossOriginIsolated,
    sharedArrayBufferAvailable: options.sharedArrayBufferAvailable,
  };
  const requestedModel = getRunAnywhereModelMeta(requestedModelId);
  const requestedViable = requestedModel && isRunAnywhereModelViable(requestedModel.id, deviceMemoryGb, sharedOptions);

  if (requestedViable) {
    return requestedModel.id;
  }

  const fallbackModel = getRunAnywhereModelMeta(fallbackModelId);
  if (fallbackModel && isRunAnywhereModelViable(fallbackModel.id, deviceMemoryGb, sharedOptions)) {
    return fallbackModel.id;
  }

  const defaultModel = getRunAnywhereModelMeta(DEFAULT_RUNANYWHERE_MODEL_ID);
  if (defaultModel && isRunAnywhereModelViable(defaultModel.id, deviceMemoryGb, sharedOptions)) {
    return defaultModel.id;
  }

  return null;
}
