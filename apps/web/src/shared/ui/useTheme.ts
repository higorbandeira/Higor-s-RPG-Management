import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

const THEME_KEY = "ui-theme";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === "dark" ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_KEY, theme);
      document.documentElement.style.background = theme === "dark" ? "#0b0b0b" : "#f5f5f5";
    }
  }, [theme]);

  return { theme, setTheme };
}
