import { useMemo, useState } from "react";
import { getDeviceMemoryGb, getRunAnywhereModelViability, listRunAnywhereModels } from "../../ai/runAnywhereConfig.js";
import { setActiveModel } from "../../ai/runAnywhereRuntime.js";
import { clearHistory } from "../../storage/indexedDb.js";

function formatMemory(bytes) {
  if (!bytes) {
    return "Memory varies by device";
  }

  return `~${Math.round(bytes / 1_000_000)} MB browser memory`;
}

export default function SettingsPanel({
  isOpen = false,
  runtimeInfo,
  settings,
  theme = "dark",
  onClose,
  onSettingsChange,
  onThemeChange,
  onHistoryCleared,
  onRuntimeInfoChange,
}) {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("");
  const modelOptions = useMemo(
    () => (Array.isArray(runtimeInfo?.availableModels) && runtimeInfo.availableModels.length
      ? runtimeInfo.availableModels
      : listRunAnywhereModels()),
    [runtimeInfo?.availableModels],
  );

  async function handleTestConnection() {
    const baseUrl = String(settings?.ollamaBaseUrl || "http://localhost:11434").replace(/\/$/, "");
    setIsTestingConnection(true);
    setConnectionStatus(`Testing ${baseUrl}...`);

    try {
      const response = await fetch(`${baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      const modelCount = Array.isArray(payload?.models) ? payload.models.length : 0;
      setConnectionStatus(`Connected. ${modelCount} model${modelCount === 1 ? "" : "s"} visible to the browser.`);
    } catch (error) {
      setConnectionStatus(
        `Connection failed. Start Ollama with OLLAMA_ORIGINS="*" ollama serve. ${error?.message || ""}`.trim(),
      );
    } finally {
      setIsTestingConnection(false);
    }
  }

  function handleThemeSelection(nextTheme) {
    onThemeChange?.(nextTheme);
  }

  function handleModelSelection(modelId) {
    onSettingsChange?.({ runAnywhereModelId: modelId });
    const nextRuntimeInfo = setActiveModel(modelId);
    onRuntimeInfoChange?.(nextRuntimeInfo);
    setConnectionStatus(`Active browser model set to ${modelId}.`);
  }

  async function handleClearHistory() {
    setIsClearingHistory(true);
    setConnectionStatus("");

    try {
      await clearHistory();
      await onHistoryCleared?.();
      setConnectionStatus("Analysis history cleared from this device.");
    } catch (error) {
      setConnectionStatus(`Unable to clear history. ${error?.message || ""}`.trim());
    } finally {
      setIsClearingHistory(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`settings-panel__scrim ${isOpen ? "is-open" : ""}`}
        aria-label="Close settings panel"
        tabIndex={isOpen ? 0 : -1}
        onClick={onClose}
      />
      <aside className={`settings-panel ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen}>
        <div className="settings-panel__header">
          <div>
            <p className="eyebrow">Settings Config</p>
            <h2>DevMate Preferences</h2>
          </div>
          <button type="button" className="secondary-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <section className="settings-panel__section">
          <div className="settings-panel__section-head">
            <h3>Theme</h3>
            <p className="muted-text">Switch between the dark and light Kinetic Ether variants.</p>
          </div>
          <div className="settings-panel__theme-row">
            <button
              type="button"
              className={`settings-panel__theme-btn ${theme === "dark" ? "is-active" : ""}`}
              onClick={() => handleThemeSelection("dark")}
            >
              Dark
            </button>
            <button
              type="button"
              className={`settings-panel__theme-btn ${theme === "light" ? "is-active" : ""}`}
              onClick={() => handleThemeSelection("light")}
            >
              Light
            </button>
          </div>
        </section>

        <section className="settings-panel__section">
          <div className="settings-panel__section-head">
            <h3>Model</h3>
            <p className="muted-text">Choose the browser model profile used for on-device inference.</p>
          </div>
          <div className="settings-panel__options">
            {modelOptions.map((model) => {
              const checked = runtimeInfo?.runAnywhereSelectedModel?.id === model.id || settings?.runAnywhereModelId === model.id;
              const viability = getRunAnywhereModelViability(model.id, { deviceMemoryGb: getDeviceMemoryGb() });
              const isBlocked = !viability.viable;
              return (
                <label key={model.id} className={`settings-panel__option ${checked ? "is-active" : ""} ${isBlocked ? "is-blocked" : ""}`}>
                  <input
                    type="radio"
                    name="runanywhere-model"
                    value={model.id}
                    checked={checked}
                    disabled={isBlocked}
                    onChange={() => !isBlocked && handleModelSelection(model.id)}
                  />
                  <div>
                    <strong>{model.label || model.name}{isBlocked ? <span className="settings-panel__blocked-badge"> · Blocked</span> : null}</strong>
                    <span>{model.quantization || "Q4"} • {formatMemory(model.memoryRequirement)}</span>
                    {isBlocked && viability.reason ? <span className="settings-panel__blocked-reason">{viability.reason}</span> : null}
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        <section className="settings-panel__section">
          <div className="settings-panel__section-head">
            <h3>Ollama</h3>
            <p className="muted-text">Local server fallback used when browser inference is unavailable.</p>
          </div>

          <label className="settings-panel__field">
            <span>Base URL</span>
            <input
              type="text"
              value={settings?.ollamaBaseUrl || "http://localhost:11434"}
              onChange={(event) => onSettingsChange?.({ ollamaBaseUrl: event.target.value })}
              placeholder="http://localhost:11434"
            />
          </label>

          <label className="settings-panel__field">
            <span>Model Name</span>
            <input
              type="text"
              value={settings?.ollamaModel || "phi3:mini"}
              onChange={(event) => onSettingsChange?.({ ollamaModel: event.target.value })}
              placeholder="phi3:mini"
            />
          </label>

          <div className="settings-panel__actions">
            <button type="button" className="primary-btn" onClick={handleTestConnection} disabled={isTestingConnection}>
              {isTestingConnection ? "Testing..." : "Test Connection"}
            </button>
          </div>
        </section>

        <section className="settings-panel__section">
          <div className="settings-panel__section-head">
            <h3>History</h3>
            <p className="muted-text">Remove persisted local analysis history from this device.</p>
          </div>
          <div className="settings-panel__actions">
            <button type="button" className="secondary-btn" onClick={handleClearHistory} disabled={isClearingHistory}>
              {isClearingHistory ? "Clearing..." : "Clear History"}
            </button>
          </div>
        </section>

        {connectionStatus ? <p className="settings-panel__status">{connectionStatus}</p> : null}
      </aside>
    </>
  );
}
