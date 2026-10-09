// Light / dark theme. Dark is the default; the student's choice is remembered on
// the device. index.html applies the saved theme before first paint (no flash);
// this module switches it afterwards and lets components react.
import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const KEY = "hub.theme.v1"; // keep in sync with the inline script in index.html
const BAR_COLOUR: Record<Theme, string> = { light: "#FBFBF9", dark: "#10161D" };
const listeners = new Set<() => void>();

const current = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BAR_COLOUR[theme]);
  try { localStorage.setItem(KEY, theme); } catch { /* private mode: the choice lasts for this visit only */ }
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, current);
}
