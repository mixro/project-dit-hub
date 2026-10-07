import type { ReactNode } from "react";
import { Link, useLocation } from "../lib/router";
import { compareStore, useCompare } from "../lib/compare";

const NAV = [
  { to: "/projects", label: "Projects", icon: "M10 4a6 6 0 1 0 3.9 10.6l4.2 4.2 1.4-1.4-4.2-4.2A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" },
  { to: "/problems", label: "Problems", icon: "M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3Zm-2.5 15v1.5A1.5 1.5 0 0 0 11 21h2a1.5 1.5 0 0 0 1.5-1.5V18Z" },
  { to: "/check", label: "Check idea", icon: "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4Z" },
  { to: "/insights", label: "Insights", icon: "M4 20h16v-2H4Zm2-4h3V9H6Zm5 0h3V4h-3Zm5 0h3v-5h-3Z" },
];

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d={d} fill="currentColor" /></svg>;
}

export function Layout({ children }: { children: ReactNode }) {
  const { path } = useLocation();
  const compare = useCompare();
  const active = (to: string) => path === to || path.startsWith(to + "/");
  const showTray = compare.length > 0 && path !== "/compare";

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <Link to="/" className="brand" aria-label="DIT Project Hub home">
            <img src="/favicon.svg" alt="" width="26" height="26" />
            <span>Project Hub</span>
          </Link>
          <nav className="topnav" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className={active(n.to) ? "active" : ""} aria-current={active(n.to) ? "page" : undefined}>{n.label}</Link>
            ))}
          </nav>
        </div>
      </header>

      <main id="main" className={`wrap main${showTray ? " has-tray" : ""}`}>{children}</main>

      <footer className="wrap footer">
        <Link to="/about">About this data and privacy</Link>
        <span className="muted">Testing version. Not an official approval system.</span>
      </footer>

      {showTray && (
        <div className="tray" role="region" aria-label="Compare selection">
          <span>{compare.length} selected</span>
          <button className="btn-text" onClick={() => compareStore.clear()}>Clear</button>
          <Link to={`/compare?ids=${compare.join(",")}`} className="btn btn-small">
            {compare.length < 2 ? "Add one more to compare" : `Compare ${compare.length}`}
          </Link>
        </div>
      )}

      <nav className="bottomnav" aria-label="Main">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className={active(n.to) ? "active" : ""} aria-current={active(n.to) ? "page" : undefined}>
            <Icon d={n.icon} />
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
