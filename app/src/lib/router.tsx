// A ~60-line router instead of React Router: the prototype has 9 flat routes and
// no nested layouts, so a dependency would add bundle weight with no benefit.
// Filters and search live in the URL, so results are shareable and Back works.

import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from "react";

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());
window.addEventListener("popstate", notify);

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const snapshot = () => window.location.pathname + window.location.search;

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (to === snapshot()) return;
  if (opts.replace) window.history.replaceState(null, "", to);
  else window.history.pushState(null, "", to);
  if (!opts.replace) window.scrollTo(0, 0);
  notify();
}

export function useLocation() {
  const href = useSyncExternalStore(subscribe, snapshot);
  const url = new URL(href, window.location.origin);
  return { path: url.pathname, params: url.searchParams };
}

/** Match "/projects/:id" against a path. Returns params or null. */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const a = path.split("/").filter(Boolean);
  if (p.length !== a.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) out[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return out;
}

/** Update some query parameters, keeping the rest. Empty values are removed. */
export function setParams(updates: Record<string, string | string[] | null>, opts: { replace?: boolean } = {}) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(updates)) {
    url.searchParams.delete(k);
    if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(k, x));
    else if (v) url.searchParams.set(k, v);
  }
  navigate(url.pathname + url.search, { replace: opts.replace ?? true });
}

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handle} {...rest} />;
}
