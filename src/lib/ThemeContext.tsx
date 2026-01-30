"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";

type Theme = "light" | "dark" | "system";
type ColorTheme = "indigo" | "emerald" | "rose" | "amber";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colorTheme: ColorTheme;
  setColorTheme: (color: ColorTheme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const colorThemes: Record<ColorTheme, { primary: string; accent: string; ring: string }> = {
  indigo: { primary: "#6366f1", accent: "#818cf8", ring: "#6366f1" },
  emerald: { primary: "#10b981", accent: "#34d399", ring: "#10b981" },
  rose: { primary: "#f43f5e", accent: "#fb7185", ring: "#f43f5e" },
  amber: { primary: "#f59e0b", accent: "#fbbf24", ring: "#f59e0b" },
};

function applyTheme(themeMode: "light" | "dark") {
  const root = document.documentElement;
  
  if (themeMode === "dark") {
    root.style.setProperty("--background", "#020617");
    root.style.setProperty("--foreground", "#f8fafc");
    root.style.setProperty("--card", "#0f172a");
    root.style.setProperty("--card-foreground", "#f8fafc");
    root.style.setProperty("--secondary", "#1e293b");
    root.style.setProperty("--secondary-foreground", "#cbd5e1");
    root.style.setProperty("--muted", "#1e293b");
    root.style.setProperty("--muted-foreground", "#94a3b8");
    root.style.setProperty("--border", "#1e293b");
    root.style.setProperty("--input", "#1e293b");
  } else {
    root.style.setProperty("--background", "#f8fafc");
    root.style.setProperty("--foreground", "#0f172a");
    root.style.setProperty("--card", "#ffffff");
    root.style.setProperty("--card-foreground", "#0f172a");
    root.style.setProperty("--secondary", "#f1f5f9");
    root.style.setProperty("--secondary-foreground", "#475569");
    root.style.setProperty("--muted", "#f1f5f9");
    root.style.setProperty("--muted-foreground", "#64748b");
    root.style.setProperty("--border", "#e2e8f0");
    root.style.setProperty("--input", "#e2e8f0");
  }
}

function applyColorTheme(colorTheme: ColorTheme) {
  const root = document.documentElement;
  const colors = colorThemes[colorTheme];
  
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--ring", colors.ring);
}

function getResolvedTheme(theme: Theme): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize state lazily from localStorage
  const [theme, setThemeInternal] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as Theme) || "system";
  });
  
  const [colorTheme, setColorThemeInternal] = useState<ColorTheme>(() => {
    if (typeof window === "undefined") return "indigo";
    return (localStorage.getItem("colorTheme") as ColorTheme) || "indigo";
  });
  
  // Compute resolved theme directly - not in state to avoid cascade
  const resolvedTheme = useMemo(() => getResolvedTheme(theme), [theme]);

  // Apply theme and save to localStorage
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeInternal(newTheme);
    localStorage.setItem("theme", newTheme);
    const resolved = getResolvedTheme(newTheme);
    applyTheme(resolved);
  }, []);

  // Apply color theme and save to localStorage
  const setColorTheme = useCallback((newColor: ColorTheme) => {
    setColorThemeInternal(newColor);
    localStorage.setItem("colorTheme", newColor);
    applyColorTheme(newColor);
  }, []);

  // Initial application of theme on mount
  useEffect(() => {
    applyTheme(resolvedTheme);
    applyColorTheme(colorTheme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const newResolved = mediaQuery.matches ? "dark" : "light";
      applyTheme(newResolved);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    colorTheme,
    setColorTheme,
    resolvedTheme
  }), [theme, setTheme, colorTheme, setColorTheme, resolvedTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
