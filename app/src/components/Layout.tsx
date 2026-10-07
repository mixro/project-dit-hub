import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useLocation } from "../lib/router";
import { compareStore, useCompare } from "../lib/compare";
import { track } from "../lib/analytics";

const NAV = [
  { to: "/projects", label: "Projects", icon: "M10 4a6 6 0 1 0 3.9 10.6l4.2 4.2 1.4-1.4-4.2-4.2A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" },
  { to: "/problems", label: "Problems", icon: "M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3Zm-2.5 15v1.5A1.5 1.5 0 0 0 11 21h2a1.5 1.5 0 0 0 1.5-1.5V18Z" },
  { to: "/check", label: "Check idea", icon: "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4Z" },
  { to: "/insights", label: "Insights", icon: "M4 20h16v-2H4Zm2-4h3V9H6Zm5 0h3V4h-3Zm5 0h3v-5h-3Z" },
];

// The slide-out menu lists every page, including ones the tab bar has no room for.
const MENU = [
  { to: "/", label: "Home" },
  ...NAV,
  { to: "/compare", label: "Compare" },
  { to: "/about", label: "About the data" },
];

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d={d} fill="currentColor" /></svg>;
}

export function Layout({ children }: { children: ReactNode }) {
  const { path } = useLocation();
  const compare = useCompare();
  const active = (to: string) => path === to || path.startsWith(to + "/");
  const showTray = compare.length > 0 && path !== "/compare";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);

  // Close on any navigation, including Back.
  useEffect(() => { setMenuOpen(false); }, [path]);

  useEffect(() => {
    if (!menuOpen) return;
    const trigger = menuBtn.current;
    drawer.current?.querySelector<HTMLElement>("button")?.focus();
    document.body.classList.add("sheet-open");
    return () => { document.body.classList.remove("sheet-open"); trigger?.focus(); };
  }, [menuOpen]);

  const openMenu = () => { setMenuOpen(true); track("menu_opened", { path }); };

  // Esc closes; Tab cycles inside the open drawer.
  const onDrawerKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") return setMenuOpen(false);
    if (e.key !== "Tab") return;
    const items = drawer.current?.querySelectorAll<HTMLElement>("button, a");
    if (!items?.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <Link to="/" className="brand" aria-label="DIT Project Hub home">
            <img src="/logo.png" alt="" width="34" height="34" />
            <span>INSTiWISE</span>
          </Link>
          <nav className="topnav" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className={active(n.to) ? "active" : ""} aria-current={active(n.to) ? "page" : undefined}>{n.label}</Link>
            ))}
          </nav>
          <button ref={menuBtn} className="menu-btn" aria-label="Open menu" aria-expanded={menuOpen} aria-controls="site-menu" onClick={openMenu}>
            <Icon d="M3 6h18v2H3Zm0 5h18v2H3Zm0 5h18v2H3Z" />
          </button>
        </div>
      </header>

      {menuOpen && <div className="sheet-backdrop menu-backdrop" onClick={() => setMenuOpen(false)} />}
      <aside
        ref={drawer}
        id="site-menu"
        className={`drawer${menuOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!menuOpen}
        onKeyDown={onDrawerKey}
      >
        <div className="drawer-head">
          <span className="drawer-title">Menu</span>
          <button className="menu-btn" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <Icon d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6Z" />
          </button>
        </div>
        <nav aria-label="All pages">
          {MENU.map((n) => {
            const on = n.to === "/" ? path === "/" : active(n.to);
            return <Link key={n.to} to={n.to} className={on ? "active" : ""} aria-current={on ? "page" : undefined}>{n.label}</Link>;
          })}
        </nav>
      </aside>

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
