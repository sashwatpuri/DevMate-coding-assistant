export const DEVMATE_SETTINGS_STORAGE_KEY = "devmate-settings";
export const DEVMATE_THEME_STORAGE_KEY = "devmate-theme";
export const DEFAULT_DEVMATE_SETTINGS = Object.freeze({
  theme: "dark",
  runAnywhereModelId: "lfm2-350m-q4_k_m",
  ollamaBaseUrl: "http://localhost:11434",
  ollamaModel: "phi3:mini",
});

function normalizePartialSettings(value) {
  const source = value && typeof value === "object" ? value : {};

  // Migrate old incorrect model IDs to correct ones
  let modelId = typeof source.runAnywhereModelId === "string" && source.runAnywhereModelId.trim()
    ? source.runAnywhereModelId.trim()
    : DEFAULT_DEVMATE_SETTINGS.runAnywhereModelId;
  
  // Auto-fix common incorrect model IDs
  if (modelId === "phi3-mini-4k" || modelId === "phi3-mini") {
    console.info("[DevMate] Migrated model ID from", source.runAnywhereModelId, "to lfm2-350m-q4_k_m");
    modelId = "lfm2-350m-q4_k_m";
  }

  return {
    theme: source.theme === "light" ? "light" : "dark",
    runAnywhereModelId: modelId,
    ollamaBaseUrl: typeof source.ollamaBaseUrl === "string" && source.ollamaBaseUrl.trim()
      ? source.ollamaBaseUrl.trim().replace(/\/$/, "")
      : DEFAULT_DEVMATE_SETTINGS.ollamaBaseUrl,
    ollamaModel: typeof source.ollamaModel === "string" && source.ollamaModel.trim()
      ? source.ollamaModel.trim()
      : DEFAULT_DEVMATE_SETTINGS.ollamaModel,
  };
}

export function mergeSettings(overrides = {}) {
  return {
    ...DEFAULT_DEVMATE_SETTINGS,
    ...normalizePartialSettings(overrides),
  };
}

export function getStoredSettings() {
  if (typeof window === "undefined") {
    return { ...DEFAULT_DEVMATE_SETTINGS };
  }

  try {
    const raw = window.localStorage.getItem(DEVMATE_SETTINGS_STORAGE_KEY);
    const theme = window.localStorage.getItem(DEVMATE_THEME_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return mergeSettings({
      ...parsed,
      theme: theme || parsed?.theme || DEFAULT_DEVMATE_SETTINGS.theme,
    });
  } catch {
    return { ...DEFAULT_DEVMATE_SETTINGS };
  }
}

export function saveStoredSettings(nextSettings = {}) {
  const normalized = mergeSettings(nextSettings);

  if (typeof window === "undefined") {
    return normalized;
  }

  try {
    window.localStorage.setItem(DEVMATE_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    window.localStorage.setItem(DEVMATE_THEME_STORAGE_KEY, normalized.theme);
  } catch {
    // Ignore storage write failures and keep the UI responsive.
  }

  return normalized;
}
