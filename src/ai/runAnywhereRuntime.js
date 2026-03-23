import { ModelCategory, ModelManager, RunAnywhere, SDKEnvironment } from "@runanywhere/web";
import { ONNX } from "@runanywhere/web-onnx";
import { LlamaCPP, TextGeneration } from "@runanywhere/web-llamacpp";
import {
  COMPACT_ANALYSIS_FIELDS,
  COMPACT_ANALYSIS_JSON_SCHEMA,
  FULL_ANALYSIS_JSON_SCHEMA,
  INTERVIEW_EVALUATION_JSON_SCHEMA,
  REQUIRED_ANALYSIS_FIELDS,
  sanitizeStructuredAnalysis,
} from "./schema.js";
import {
  DEFAULT_RUNANYWHERE_MODEL_ID,
  OLLAMA_CONFIG,
  PRIMARY_RUNANYWHERE_MODEL_ID,
  RUNANYWHERE_MAX_RETRIES,
  RUNANYWHERE_MODEL_DEFS,
  VOICE_MAX_RESPONSE_TOKENS,
  VOICE_RUNANYWHERE_MODEL_DEFS,
  VOICE_SAMPLE_RATE,
  VOICE_TTS_SPEED,
  getDeviceMemoryGb,
  getPreferredRunAnywhereModelId,
  getRunAnywhereModelMeta,
  getRunAnywhereModelViability,
  listRunAnywhereModels,
  resolveRunAnywhereModelId,
} from "./runAnywhereConfig.js";
import {
  buildCompactAnalysisPrompt,
  buildFullAnalysisPrompt,
  buildInterviewEvaluationPrompt,
  buildRepairPrompt,
} from "./promptBuilders.js";
import { buildParseError, tryParseJson } from "./structuredParser.js";
import { getStoredSettings, saveStoredSettings } from "../settings/settingsStore.js";
import { analyzeLocally } from "./localAnalyzer.js";

const BACKENDS = Object.freeze({
  RUNANYWHERE: "runanywhere",
  UNAVAILABLE: "unavailable",
});

const MODALITY = Object.freeze({
  LANGUAGE: "language",
  AUDIO: "audio",
  SPEECH_RECOGNITION: "speech-recognition",
  SPEECH_SYNTHESIS: "speech-synthesis",
});

const ANALYSIS_SCHEMA = JSON.stringify(FULL_ANALYSIS_JSON_SCHEMA);
const COMPACT_ANALYSIS_SCHEMA = JSON.stringify(COMPACT_ANALYSIS_JSON_SCHEMA);
const INTERVIEW_EVALUATION_SCHEMA = JSON.stringify(INTERVIEW_EVALUATION_JSON_SCHEMA);
const MODEL_FAILURE_CACHE_KEY = "devmate-runanywhere-model-failures";
const MODEL_FAILURE_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const STRUCTURED_OUTPUT_SYSTEM_PROMPT = [
  "You are DevMate, a browser-local code analysis engine.",
  "Return valid JSON only.",
  "Do not emit markdown fences or commentary.",
].join(" ");

const runtimeState = {
  initialized: false,
  initializingPromise: null,
  backend: BACKENDS.UNAVAILABLE,
  reason: "Not initialized",
  runAnywhereAvailable: false,
  modelReady: false,
  voiceBackend: "unknown",
  activeModel: DEFAULT_RUNANYWHERE_MODEL_ID,
  requestedModel: DEFAULT_RUNANYWHERE_MODEL_ID,
  selectionNote: "",
  availableModels: listRunAnywhereModels(),
  accelerationMode: "cpu",
};

function emit(callback, payload) {
  if (typeof callback !== "function") {
    return;
  }

  try {
    callback(payload);
  } catch {
    // Keep runtime stable if UI callbacks throw.
  }
}

function normalizeInitArgs(args) {
  if (typeof args === "function") {
    return { onStatus: args, onProgress: args };
  }

  if (args && typeof args === "object") {
    return {
      onStatus: typeof args.onStatus === "function" ? args.onStatus : null,
      onProgress: typeof args.onProgress === "function" ? args.onProgress : null,
    };
  }

  return { onStatus: null, onProgress: null };
}

function getSettingsSnapshot() {
  try {
    return getStoredSettings();
  } catch {
    return {
      theme: "dark",
      runAnywhereModelId: getPreferredRunAnywhereModelId(),
      ollamaBaseUrl: OLLAMA_CONFIG.baseUrl,
      ollamaModel: OLLAMA_CONFIG.model,
    };
  }
}

function persistRunAnywhereModelSelection(modelId) {
  if (!modelId) {
    return;
  }

  const settings = getSettingsSnapshot();
  if (settings.runAnywhereModelId === modelId) {
    return;
  }

  saveStoredSettings({
    ...settings,
    runAnywhereModelId: modelId,
  });
}

function readFailureCache() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(MODEL_FAILURE_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeFailureCache(cache) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(MODEL_FAILURE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage write failures.
  }
}

function getFailureEntry(modelId) {
  if (!modelId) {
    return null;
  }

  const cache = readFailureCache();
  const entry = cache[modelId];
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const failedAt = Number(entry.failedAt);
  if (!Number.isFinite(failedAt)) {
    return null;
  }

  if (Date.now() - failedAt > MODEL_FAILURE_COOLDOWN_MS) {
    delete cache[modelId];
    writeFailureCache(cache);
    return null;
  }

  return {
    failedAt,
    count: Number.isFinite(Number(entry.count)) ? Number(entry.count) : 0,
    reason: typeof entry.reason === "string" ? entry.reason : "",
  };
}

function clearModelFailure(modelId) {
  if (!modelId) {
    return;
  }

  const cache = readFailureCache();
  if (!cache[modelId]) {
    return;
  }

  delete cache[modelId];
  writeFailureCache(cache);
}

function isModelTemporarilyDisabled(modelId) {
  return Boolean(getFailureEntry(modelId));
}

function isLikelyModelLoadFailure(error) {
  const message = String(error?.message || error?.parseError?.message || error || "").toLowerCase();
  return [
    "insufficient memory",
    "failed to allocate",
    "failed to create context",
    "failed to load model",
    "graph_reserve",
    "ggml_",
    "no provider can handle the request",
    "out of memory",
    "cannot allocate",
  ].some((needle) => message.includes(needle));
}

function recordModelFailure(modelId, error) {
  if (!modelId || !isLikelyModelLoadFailure(error)) {
    return;
  }

  const cache = readFailureCache();
  const previous = cache[modelId];
  cache[modelId] = {
    failedAt: Date.now(),
    reason: String(error?.message || error || "RunAnywhere model load failed.").slice(0, 240),
    count: Number.isFinite(Number(previous?.count)) ? Number(previous.count) + 1 : 1,
  };
  writeFailureCache(cache);
}

function buildSelectionNote(requestedModelId, resolvedModelId) {
  if (!requestedModelId) {
    return "";
  }

  if (!resolvedModelId) {
    return getRunAnywhereModelViability(requestedModelId).reason || "No browser-safe local model is available in this environment.";
  }

  if (requestedModelId === resolvedModelId) {
    return "";
  }

  const requested = getRunAnywhereModelMeta(requestedModelId);
  const resolved = getRunAnywhereModelMeta(resolvedModelId);
  if (!requested || !resolved) {
    return "";
  }

  if (isModelTemporarilyDisabled(requestedModelId)) {
    return `Selected model ${requested.name} recently failed to load. Using ${resolved.name} instead.`;
  }

  return `Selected model ${requested.name} was replaced with ${resolved.name}.`;
}

function applyConfiguredModelSelection() {
  const settings = getSettingsSnapshot();
  const requestedModelId = settings?.runAnywhereModelId || getPreferredRunAnywhereModelId();
  const resolvedModelId = resolveRunAnywhereModelId(requestedModelId, {
    deviceMemoryGb: getDeviceMemoryGb(),
    fallbackModelId: PRIMARY_RUNANYWHERE_MODEL_ID,
  });
  const safeModelId = resolvedModelId && !isModelTemporarilyDisabled(resolvedModelId) ? resolvedModelId : null;

  runtimeState.requestedModel = requestedModelId;
  runtimeState.activeModel = safeModelId;
  runtimeState.selectionNote = buildSelectionNote(requestedModelId, safeModelId);

  if (safeModelId && requestedModelId !== safeModelId) {
    persistRunAnywhereModelSelection(safeModelId);
  }
}

function safeAvailableModels() {
  if (!RunAnywhere.isInitialized) {
    return [];
  }

  try {
    return RunAnywhere.availableModels();
  } catch {
    return [];
  }
}

function safeFindManagedModel(modelId) {
  if (!modelId) {
    return null;
  }

  return safeAvailableModels().find((model) => model.id === modelId) || null;
}

function syncAvailableModels() {
  const managedModels = safeAvailableModels();

  runtimeState.availableModels = listRunAnywhereModels().map((model) => {
    const managed = managedModels.find((entry) => entry.id === model.id);
    const blockedByFailure = isModelTemporarilyDisabled(model.id);
    const viability = getRunAnywhereModelViability(model.id, { deviceMemoryGb: getDeviceMemoryGb() });
    const blockedByEnvironment = !viability.viable;

    return {
      ...model,
      status: blockedByFailure || blockedByEnvironment ? "blocked" : managed?.status || "registered",
      downloadProgress: managed?.downloadProgress ?? 0,
      error: blockedByFailure
        ? getFailureEntry(model.id)?.reason || "Temporarily blocked after a failed browser-model load."
        : blockedByEnvironment
          ? viability.reason || "This browser environment cannot safely host the local model."
          : managed?.error,
    };
  });
}

function getRunAnywhereSelectedModelMeta() {
  if (!runtimeState.activeModel) {
    return {
      id: "browser-llm-unavailable",
      name: "Browser LLM unavailable",
      label: "Browser LLM unavailable",
      quantization: "N/A",
      memoryRequirement: 0,
      status: "blocked",
    };
  }

  const match = runtimeState.availableModels.find((model) => model.id === runtimeState.activeModel)
    || getRunAnywhereModelMeta(runtimeState.activeModel);

  if (!match) {
    return {
      id: runtimeState.activeModel,
      name: runtimeState.activeModel,
      label: runtimeState.activeModel,
      quantization: "Q4",
      memoryRequirement: 0,
      status: runtimeState.modelReady ? "loaded" : "registered",
    };
  }

  return {
    id: match.id,
    name: match.label || match.name || match.id,
    label: match.label || match.name || match.id,
    quantization: match.quantization || "Q4",
    memoryRequirement: match.memoryRequirement || 0,
    status: match.status || (runtimeState.modelReady ? "loaded" : "registered"),
  };
}

function getSelectedModelMeta() {
  return getRunAnywhereSelectedModelMeta();
}

function getLoadedLanguageModel() {
  try {
    return ModelManager.getLoadedModel(ModelCategory.Language);
  } catch {
    return null;
  }
}

function getVoiceLoadedState() {
  const models = safeAvailableModels();
  const isLoaded = (modality) => models.some((model) => model.modality === modality && model.status === "loaded");
  return {
    vad: isLoaded(MODALITY.AUDIO),
    stt: isLoaded(MODALITY.SPEECH_RECOGNITION),
    llm: isLoaded(MODALITY.LANGUAGE),
    tts: isLoaded(MODALITY.SPEECH_SYNTHESIS),
  };
}

function buildRunAnywhereReason() {
  if (!runtimeState.activeModel) {
    const selectionNote = runtimeState.selectionNote ? ` ${runtimeState.selectionNote}` : "";
    return `RunAnywhere browser inference is enabled, but the Phi-3 Mini local model cannot be loaded in this browser.${selectionNote}`;
  }

  const selectedModel = getRunAnywhereSelectedModelMeta();
  const acceleration = String(runtimeState.accelerationMode || "cpu").toUpperCase();
  const modelSizeMb = selectedModel.memoryRequirement ? ` ~${Math.round(selectedModel.memoryRequirement / 1_000_000)}MB` : "";
  const readinessNote = runtimeState.modelReady
    ? "Browser LLM loaded and ready."
    : `Model download pending.${modelSizeMb ? ` First run downloads${modelSizeMb}.` : ""}`;
  const isolationNote = typeof crossOriginIsolated !== "undefined" && !crossOriginIsolated
    ? " SharedArrayBuffer is unavailable, so inference is running in single-threaded mode."
    : "";
  const selectionNote = runtimeState.selectionNote ? ` ${runtimeState.selectionNote}` : "";

  return `RunAnywhere ready with ${selectedModel.name} on ${acceleration}. ${readinessNote}${selectionNote}${isolationNote}`;
}

function hasExpectedKeys(parsed, expectedKeys, allowPartial = false) {
  if (!Array.isArray(expectedKeys) || expectedKeys.length === 0) {
    return true;
  }

  return allowPartial
    ? expectedKeys.some((key) => Object.prototype.hasOwnProperty.call(parsed, key))
    : expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(parsed, key));
}

function buildStructuredSystemPrompt(schema, expectedKeys) {
  return [
    STRUCTURED_OUTPUT_SYSTEM_PROMPT,
    `The JSON must satisfy this schema: ${schema}`,
    `Target top-level keys: ${expectedKeys.join(", ")}`,
    "Return exactly one JSON object and nothing else.",
  ].join("\n");
}

function buildSchemaPrompt(prompt) {
  return String(prompt || "").trim();
}

function buildLlamaCppPrompt(contentPrompt, systemPrompt = "") {
  if (!systemPrompt) {
    return contentPrompt;
  }

  return [
    "<|system|>",
    systemPrompt,
    "<|end|>",
    "<|user|>",
    contentPrompt,
    "<|end|>",
    "<|assistant|>",
  ].join("\n");
}

function parseStructuredPayload(rawOutput, expectedKeys, options = {}) {
  const parsed = tryParseJson(rawOutput);
  return parsed && hasExpectedKeys(parsed, expectedKeys, options.allowPartial) ? parsed : null;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function createDownloadPoller(modelId, onProgress) {
  let active = true;

  const tick = () => {
    if (!active) {
      return;
    }

    const managed = safeFindManagedModel(modelId);
    const progressValue = Number(managed?.downloadProgress);
    const normalizedProgress = Number.isFinite(progressValue)
      ? clamp(progressValue)
      : managed?.status === "loaded" || managed?.status === "downloaded"
        ? 1
        : managed?.status === "downloading"
          ? 0.35
          : 0.08;

    emit(onProgress, {
      stage: "runtime:download",
      progress: 0.12 + normalizedProgress * 0.56,
      message: `Downloading ${getRunAnywhereSelectedModelMeta().name}: ${Math.round(normalizedProgress * 100)}%`,
    });

    if (managed?.status === "downloading") {
      globalThis.setTimeout(tick, 350);
    }
  };

  tick();
  return () => {
    active = false;
  };
}

function getRuntimeStatus() {
  syncAvailableModels();
  runtimeState.modelReady = safeFindManagedModel(runtimeState.activeModel)?.status === "loaded";
  const voiceLoaded = getVoiceLoadedState();
  const settings = getSettingsSnapshot();

  return {
    initialized: runtimeState.initialized,
    backend: runtimeState.backend,
    runAnywhereAvailable: runtimeState.runAnywhereAvailable,
    localOnly: true,
    modelReady: runtimeState.modelReady,
    activeModel: runtimeState.activeModel,
    requestedModel: runtimeState.requestedModel,
    selectedModel: getSelectedModelMeta(),
    runAnywhereSelectedModel: getRunAnywhereSelectedModelMeta(),
    models: {
      primary: getRunAnywhereModelMeta(PRIMARY_RUNANYWHERE_MODEL_ID) || { id: PRIMARY_RUNANYWHERE_MODEL_ID, label: "Phi-3 Mini 4K", quantization: "Q4_K_M" },
      fallback: { id: "disabled", label: "Disabled", quantization: "N/A" },
      local: { id: "browser-local-llm", label: "RunAnywhere Browser LLM", quantization: "GGUF" },
    },
    voice: {
      sampleRate: VOICE_SAMPLE_RATE,
      maxTokens: VOICE_MAX_RESPONSE_TOKENS,
      ttsSpeed: VOICE_TTS_SPEED,
      backend: runtimeState.voiceBackend,
      ready: voiceLoaded.vad && voiceLoaded.stt && voiceLoaded.llm && voiceLoaded.tts,
      loaded: voiceLoaded,
      models: VOICE_RUNANYWHERE_MODEL_DEFS.map((model) => ({ id: model.id, name: model.name, modality: model.modality, memoryRequirement: model.memoryRequirement })),
    },
    ollama: {
      baseUrl: settings?.ollamaBaseUrl || OLLAMA_CONFIG.baseUrl,
      model: settings?.ollamaModel || OLLAMA_CONFIG.model,
    },
    availableModels: runtimeState.availableModels,
    reason: runtimeState.reason,
    selectionNote: runtimeState.selectionNote,
    accelerationMode: runtimeState.accelerationMode,
  };
}

async function ensureSpecificRunAnywhereModel(modelId, onProgress) {
  if (!modelId) {
    throw new Error("No browser-safe Phi-3 Mini model is available in this environment.");
  }

  runtimeState.activeModel = modelId;
  syncAvailableModels();
  const modelMeta = getRunAnywhereSelectedModelMeta();
  let managedModel = safeFindManagedModel(modelId);

  if (!managedModel) {
    throw new Error(`RunAnywhere model ${modelId} is not registered.`);
  }

  if (managedModel.status !== "downloaded" && managedModel.status !== "loaded") {
    emit(onProgress, { stage: "runtime:download:start", progress: 0.12, message: `Downloading ${modelMeta.name} into browser storage.` });
    const stopPolling = createDownloadPoller(modelId, onProgress);
    try {
      await RunAnywhere.downloadModel(modelId);
    } finally {
      stopPolling();
    }
    syncAvailableModels();
    managedModel = safeFindManagedModel(modelId);
  }

  if (!managedModel || managedModel.status !== "loaded") {
    emit(onProgress, { stage: "runtime:model-load", progress: 0.72, message: `Loading ${modelMeta.name} into the ${String(runtimeState.accelerationMode).toUpperCase()} engine.` });
    const loaded = await RunAnywhere.loadModel(modelId);
    if (!loaded) {
      throw new Error(`RunAnywhere could not load ${modelMeta.name}.`);
    }
  }

  clearModelFailure(modelId);
  runtimeState.runAnywhereAvailable = true;
  runtimeState.modelReady = safeFindManagedModel(modelId)?.status === "loaded";
  syncAvailableModels();
  runtimeState.backend = BACKENDS.RUNANYWHERE;
  runtimeState.reason = buildRunAnywhereReason();

  emit(onProgress, { stage: "runtime:model-ready", progress: 0.9, message: runtimeState.reason });
}

async function ensureLanguageModelInternal(onProgress) {
  applyConfiguredModelSelection();
  const preferredModelId = runtimeState.activeModel;

  if (!preferredModelId) {
    throw new Error(runtimeState.selectionNote || "No browser-safe Phi-3 Mini model is available in this environment.");
  }

  try {
    await ensureSpecificRunAnywhereModel(preferredModelId, onProgress);
    persistRunAnywhereModelSelection(preferredModelId);
  } catch (error) {
    recordModelFailure(preferredModelId, error);
    throw error;
  }
}

export async function getOrLoadModel({ onProgress = null, requestedModelId = null } = {}) {
  await initRuntime({ onProgress });

  if (!runtimeState.runAnywhereAvailable) {
    throw new Error("RunAnywhere language model is unavailable in this environment.");
  }

  if (requestedModelId) {
    setActiveModel(requestedModelId);
  }

  const targetModelId = runtimeState.activeModel;
  const loadedModel = ModelManager.getLoadedModel(ModelCategory.Language);

  // Only reuse the already-loaded model if it matches the currently active (requested) model.
  // If the user switched models in Settings, targetModelId differs → skip the cache and reload.
  if (loadedModel && loadedModel.id === targetModelId) {
    runtimeState.activeModel = loadedModel.id;
    runtimeState.modelReady = true;
    runtimeState.backend = BACKENDS.RUNANYWHERE;
    runtimeState.reason = buildRunAnywhereReason();
    syncAvailableModels();
    return loadedModel;
  }

  await ensureLanguageModelInternal(onProgress);
  return ModelManager.getLoadedModel(ModelCategory.Language);
}

export async function ensureLanguageModel(onProgress, requestedModelId = null) {
  await getOrLoadModel({ onProgress, requestedModelId });
  return getRuntimeStatus();
}

export async function ensureLanguageModelLoaded(onProgress) {
  await ensureLanguageModel(onProgress);
  return getRuntimeStatus();
}

export function setActiveModel(modelId) {
  const requestedModelId = typeof modelId === "string" && modelId.trim()
    ? modelId.trim()
    : DEFAULT_RUNANYWHERE_MODEL_ID;
  const resolvedModelId = resolveRunAnywhereModelId(requestedModelId, {
    deviceMemoryGb: getDeviceMemoryGb(),
    fallbackModelId: PRIMARY_RUNANYWHERE_MODEL_ID,
  });
  const safeModelId = resolvedModelId && !isModelTemporarilyDisabled(resolvedModelId) ? resolvedModelId : null;

  runtimeState.requestedModel = requestedModelId;
  runtimeState.activeModel = safeModelId;
  runtimeState.modelReady = safeFindManagedModel(safeModelId)?.status === "loaded";
  runtimeState.selectionNote = buildSelectionNote(requestedModelId, safeModelId);
  runtimeState.backend = safeModelId ? BACKENDS.RUNANYWHERE : BACKENDS.UNAVAILABLE;
  runtimeState.reason = buildRunAnywhereReason();

  persistRunAnywhereModelSelection(safeModelId || requestedModelId);
  syncAvailableModels();
  return getRuntimeStatus();
}

async function requestStructuredObject({ prompt, schema, expectedKeys, label, onProgress, maxTokens, allowPartial = false }) {
  let lastError = null;
  let rawOutput = "";
  const model = getRunAnywhereSelectedModelMeta();
  const systemPrompt = buildStructuredSystemPrompt(schema, expectedKeys);

  for (let attempt = 0; attempt < RUNANYWHERE_MAX_RETRIES; attempt += 1) {
    emit(onProgress, {
      stage: `runanywhere:${label}`,
      progress: 0.78 + attempt * 0.06,
      message: attempt === 0 ? `Generating ${label} JSON with ${model.name}.` : `Repairing malformed ${label} JSON from ${model.name}.`,
    });

    const contentPrompt = buildSchemaPrompt(attempt === 0 ? prompt : buildRepairPrompt(rawOutput, expectedKeys));
    const fullPrompt = buildLlamaCppPrompt(contentPrompt, systemPrompt);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Inference timeout: single-threaded execution took over 90 seconds.")), 90000));
    const response = await Promise.race([
      TextGeneration.generate(fullPrompt, {
        maxTokens,
        temperature: attempt === 0 ? 0.2 : 0,
      }),
      timeoutPromise,
    ]);

    rawOutput = response?.text || "";
    const parsed = parseStructuredPayload(rawOutput, expectedKeys, { allowPartial });
    if (parsed) {
      return parsed;
    }

    lastError = buildParseError(`Unable to parse ${label} response as valid JSON.`, rawOutput);
  }

  throw Object.assign(new Error(lastError?.message || `Unable to parse ${label} response.`), { parseError: lastError });
}

function normalizeInput(input) {
  const data = input && typeof input === "object" ? input : {};
  return {
    code: typeof data.code === "string" ? data.code : String(data.code ?? ""),
    language: typeof data.language === "string" && data.language.trim() ? data.language.trim() : "unknown",
    mode: typeof data.mode === "string" && data.mode.trim() ? data.mode.trim() : "analyze",
    onProgress: typeof data.onProgress === "function" ? data.onProgress : null,
  };
}

function normalizeEvaluation(raw, interview) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const score = Number(raw.score);
  if (!Number.isFinite(score)) {
    return null;
  }

  return {
    score: Math.max(0, Math.min(10, Math.round(score))),
    verdict: typeof raw.verdict === "string" ? raw.verdict : "Evaluated",
    feedback: typeof raw.feedback === "string" ? raw.feedback : "No feedback generated.",
    optimized_answer: typeof raw.optimized_answer === "string" ? raw.optimized_answer : "",
    expected_approach: interview?.expected_approach || "",
  };
}

export async function initRuntime(args = {}) {
  const { onStatus, onProgress } = normalizeInitArgs(args);

  if (runtimeState.initialized) {
    emit(onStatus, { stage: "runtime:ready", backend: runtimeState.backend, modelReady: runtimeState.modelReady, reason: runtimeState.reason });
    return getRuntimeStatus();
  }

  if (runtimeState.initializingPromise) {
    return runtimeState.initializingPromise;
  }

  runtimeState.initializingPromise = (async () => {
    applyConfiguredModelSelection();
    
    // Check if selected model is viable before proceeding
    if (runtimeState.activeModel) {
      const viability = getRunAnywhereModelViability(runtimeState.activeModel);
      if (!viability.viable) {
        console.warn("[DevMate] Selected model is not viable:", viability.reason);
        emit(onProgress, {
          stage: "runtime:model-viability-check",
          progress: 0.05,
          message: `Model viability issue: ${viability.reason}`
        });
      }
    }
    
    syncAvailableModels();

    emit(onStatus, { stage: "runtime:init", message: "Initializing RunAnywhere browser runtime." });
    emit(onProgress, { stage: "runtime:init", progress: 0.08, message: "Initializing RunAnywhere core services." });

    try {
      await RunAnywhere.initialize({
        environment: import.meta.env.DEV ? SDKEnvironment.Development : SDKEnvironment.Production,
        debug: Boolean(import.meta.env.DEV),
      });

      if (!crossOriginIsolated) {
        const warningMessage = "[DevMate] SharedArrayBuffer unavailable - model will run in single-threaded mode (slower but functional). This is expected during development or if proper HTTP headers are not set.";
        console.warn(warningMessage);
        
        emit(onProgress, {
          stage: "runtime:compatibility-mode",
          progress: 0.15,
          message: "Running in compatibility mode: multi-threading unavailable. Inference will be slower but functional."
        });
      }

      emit(onProgress, { stage: "runtime:register-backend", progress: 0.18, message: "Registering llama.cpp WebAssembly backend." });
      await LlamaCPP.register();
      runtimeState.accelerationMode = LlamaCPP.accelerationMode || "cpu";

      try {
        emit(onProgress, { stage: "runtime:register-onnx", progress: 0.22, message: "Registering sherpa-onnx speech backend." });
        await ONNX.register();
        runtimeState.voiceBackend = "onnx";
      } catch (voiceBackendError) {
        runtimeState.voiceBackend = "unavailable";
        emit(onProgress, { stage: "runtime:register-onnx-failed", progress: 0.22, message: `Speech backend unavailable: ${voiceBackendError?.message || "unknown error"}.` });
      }

      emit(onProgress, { stage: "runtime:register-models", progress: 0.26, message: "Registering RunAnywhere local model catalog." });
      RunAnywhere.registerModels([...RUNANYWHERE_MODEL_DEFS, ...VOICE_RUNANYWHERE_MODEL_DEFS]);
      runtimeState.initialized = true;
      runtimeState.runAnywhereAvailable = true;
      runtimeState.modelReady = safeFindManagedModel(runtimeState.activeModel)?.status === "loaded";
      runtimeState.backend = runtimeState.activeModel ? BACKENDS.RUNANYWHERE : BACKENDS.UNAVAILABLE;
      syncAvailableModels();
      runtimeState.reason = buildRunAnywhereReason();
    } catch (error) {
      runtimeState.initialized = true;
      runtimeState.runAnywhereAvailable = false;
      runtimeState.modelReady = false;
      runtimeState.backend = BACKENDS.UNAVAILABLE;
      runtimeState.reason = `RunAnywhere initialization failed: ${error?.message || "Unknown error"}.`;
    }

    emit(onStatus, { stage: "runtime:ready", backend: runtimeState.backend, modelReady: runtimeState.modelReady, reason: runtimeState.reason });
    emit(onProgress, { stage: "runtime:ready", progress: 0.42, message: runtimeState.reason });
    return getRuntimeStatus();
  })();

  try {
    return await runtimeState.initializingPromise;
  } finally {
    runtimeState.initializingPromise = null;
  }
}

export async function analyzeCode(input) {
  const { code, language, mode, onProgress } = normalizeInput(input);

  try {
    emit(onProgress, { stage: "analysis:start", progress: 0.04, message: "Starting analysis request." });
    await initRuntime({ onProgress });
    await getOrLoadModel({ onProgress });

    const activeModel = getRunAnywhereSelectedModelMeta();
    const useCompactPrompt = Number(activeModel?.memoryRequirement || 0) <= 400_000_000
      || /350m/i.test(String(activeModel?.id || activeModel?.name || ""));
    const structured = await requestStructuredObject({
      prompt: useCompactPrompt ? buildCompactAnalysisPrompt(code, language) : buildFullAnalysisPrompt(code, language),
      schema: useCompactPrompt ? COMPACT_ANALYSIS_SCHEMA : ANALYSIS_SCHEMA,
      expectedKeys: useCompactPrompt ? COMPACT_ANALYSIS_FIELDS : REQUIRED_ANALYSIS_FIELDS,
      label: "analysis",
      onProgress,
      maxTokens: useCompactPrompt ? 180 : 400,
      allowPartial: true,
    });

    runtimeState.backend = BACKENDS.RUNANYWHERE;
    runtimeState.reason = buildRunAnywhereReason();
    emit(onProgress, { stage: "analysis:done", progress: 1, message: `Structured JSON analysis complete with ${getRunAnywhereSelectedModelMeta().name}.` });
    return sanitizeStructuredAnalysis(structured, { code, language, mode });
  } catch (error) {
    runtimeState.reason = "RunAnywhere structured output failed; using local deterministic analysis.";
    emit(onProgress, {
      stage: "analysis:fallback",
      progress: 0.9,
      message: "Structured output failed, switching to local deterministic analysis.",
    });
    console.warn("[DevMate] Structured output failed after retries, using local analyzer", error);
    return analyzeLocally({ code, language, mode, onProgress });
  }
}

export function getRuntimeInfo() {
  return getRuntimeStatus();
}

export async function evaluateInterview({ solution = "", language = "python", interview = {} } = {}) {
  await initRuntime();
  await getOrLoadModel();

  const response = await requestStructuredObject({
    prompt: buildInterviewEvaluationPrompt(interview?.problem, solution, language),
    expectedKeys: ["score", "verdict", "feedback", "optimized_answer"],
    schema: INTERVIEW_EVALUATION_SCHEMA,
    label: "interview-eval",
    maxTokens: 320,
  });

  const normalized = normalizeEvaluation(response, interview);
  if (!normalized) {
    throw new Error("Interview evaluation response was missing required fields.");
  }

  runtimeState.backend = BACKENDS.RUNANYWHERE;
  runtimeState.reason = buildRunAnywhereReason();
  return normalized;
}

export default {
  initRuntime,
  analyzeCode,
  getRuntimeInfo,
  evaluateInterview,
  ensureLanguageModelLoaded,
  ensureLanguageModel,
  getOrLoadModel,
  setActiveModel,
};
