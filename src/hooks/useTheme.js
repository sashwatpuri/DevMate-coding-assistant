import { useCallback, useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "devmate_theme";

function readStoredTheme() {
  if (typeof window === "undefined") {
    return "dark";
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyThemeClass(theme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
  const [theme, setTheme] = useState(() => readStoredTheme());

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch {
          // Ignore storage failures and keep the in-memory theme state.
        }
      }

      applyThemeClass(nextTheme);
      return nextTheme;
    });
  }, []);

  return useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
}

export default useTheme;
