export type ThemeMode = "light" | "dark" | "system";

export const theme = {
  dark: {
    background: "#0f172a",
    surface: "#1e293b",
    text: "#ffffff",
    textMuted: "#94a3b8",
    primary: "#38bdf8",
    border: "#334155",
  },
  light: {
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#000000",
    textMuted: "#64748b",
    primary: "#0284c7",
    border: "#e2e8f0",
  },
};

export function resolveTheme(mode: ThemeMode, systemIsDark: boolean = false) {
  if (mode === "system") {
    return systemIsDark ? theme.dark : theme.light;
  }
  return mode === "dark" ? theme.dark : theme.light;
}
