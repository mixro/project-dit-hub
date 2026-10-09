// Behaviour logging for Phase 2 student testing (spec section 28).
// Events stay on the device (localStorage ring buffer). During a test session the
// facilitator exports them from the About page. Later, send() can post to a backend.

export type EventName =
  | "search_performed" | "filter_used" | "project_opened" | "problem_opened" | "category_opened"
  | "similar_project_clicked" | "comparison_started" | "comparison_completed" | "technology_selected"
  | "idea_checked" | "page_viewed" | "menu_opened" | "theme_changed";

interface LoggedEvent { t: number; name: EventName; props?: Record<string, unknown> }

const KEY = "hub.events.v1";
const MAX = 1000;
const SESSION = Math.random().toString(36).slice(2, 10);

function read(): LoggedEvent[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as LoggedEvent[]; } catch { return []; }
}

export function track(name: EventName, props?: Record<string, unknown>) {
  try {
    const events = read();
    events.push({ t: Date.now(), name, props: { ...props, session: SESSION } });
    localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX)));
  } catch { /* storage full or blocked: logging must never break the app */ }
  if (import.meta.env?.DEV) console.debug("[track]", name, props);
}

export function exportEvents(): string { return JSON.stringify(read(), null, 2); }
export function eventCount(): number { return read().length; }
export function clearEvents() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
