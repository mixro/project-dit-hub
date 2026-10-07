// Compare selection: up to 3 projects, kept across pages and reloads.
// A tiny external store instead of a global state library.
import { useSyncExternalStore } from "react";

const KEY = "hub.compare.v1";
export const MAX_COMPARE = 3;
const listeners = new Set<() => void>();

function load(): string[] {
  try { return (JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]).slice(0, MAX_COMPARE); } catch { return []; }
}
let ids: string[] = load();

function save(next: string[]) {
  ids = next;
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export const compareStore = {
  toggle(id: string) {
    if (ids.includes(id)) save(ids.filter((x) => x !== id));
    else if (ids.length < MAX_COMPARE) save([...ids, id]);
  },
  clear() { save([]); },
};

export function useCompare(): string[] {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => ids);
}
