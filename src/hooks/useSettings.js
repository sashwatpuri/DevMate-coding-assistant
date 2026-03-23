import { useCallback, useMemo, useState } from "react";
import { getStoredSettings, mergeSettings, saveStoredSettings } from "../settings/settingsStore.js";

export function useSettings() {
  const [settings, setSettings] = useState(() => getStoredSettings());

  const updateSettings = useCallback((updates) => {
    setSettings((current) => {
      const nextSettings = mergeSettings({
        ...current,
        ...(typeof updates === "function" ? updates(current) : updates),
      });

      saveStoredSettings(nextSettings);
      return nextSettings;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const nextSettings = mergeSettings();
    saveStoredSettings(nextSettings);
    setSettings(nextSettings);
  }, []);

  return useMemo(() => ({
    settings,
    updateSettings,
    resetSettings,
  }), [resetSettings, settings, updateSettings]);
}

export default useSettings;
