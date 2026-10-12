import { Component, createElement, lazy, Suspense, useEffect, type ComponentType, type ReactNode } from "react";
import { Layout } from "./components/Layout";
import { Empty, PageSkeleton } from "./components/States";
import { CoreProvider } from "./lib/core";
import { Link, matchPath, useLocation } from "./lib/router";
import { track } from "./lib/analytics";
import { dataClient } from "./data/dataClient";
import Home from "./pages/Home";

// Home ships in the main bundle; every other page is a separate chunk, fetched on first
// visit or ahead of time (preloadPages) so a tab switch never waits on a download.
// React.lazy shows its fallback for one render on first use even when the code is already here;
// lazyPage renders the page directly once loaded. That keeps the short loading screen from
// appearing, which on Android Chrome re-shows the address bar and shifts the fixed bottom nav.
function lazyPage<P extends object>(load: () => Promise<{ default: ComponentType<P> }>) {
  let loaded: ComponentType<P> | null = null;
  const preload = () => load().then((m) => { loaded = m.default; return m; });
  const Lazy = lazy(preload);
  const Page = (props: P) => (loaded ? createElement(loaded, props) : createElement(Lazy as unknown as ComponentType<P>, props));
  return Object.assign(Page, { preload });
}

const Projects = lazyPage(() => import("./pages/Projects"));
const ProjectDetail = lazyPage(() => import("./pages/ProjectDetail"));
const Problems = lazyPage(() => import("./pages/Problems"));
const ProblemDetail = lazyPage(() => import("./pages/ProblemDetail"));
const CheckIdea = lazyPage(() => import("./pages/CheckIdea"));
const Compare = lazyPage(() => import("./pages/Compare"));
const Insights = lazyPage(() => import("./pages/Insights"));
const About = lazyPage(() => import("./pages/About"));

/** Bottom-nav pages first, then the rest. */
const preloadPages = () => {
  Promise.all([Projects, Problems, CheckIdea, Insights].map((p) => p.preload()))
    .then(() => [ProjectDetail, ProblemDetail, Compare, About].forEach((p) => p.preload()))
    .catch(() => {});
};

function route(path: string): ReactNode {
  if (path === "/") return <Home />;
  if (path === "/projects") return <Projects />;
  if (path === "/problems") return <Problems />;
  if (path === "/check") return <CheckIdea />;
  if (path === "/compare") return <Compare />;
  if (path === "/insights") return <Insights />;
  if (path === "/about") return <About />;
  let m = matchPath("/projects/:id", path);
  if (m) return <ProjectDetail key={m.id} id={m.id} />;
  m = matchPath("/problems/:id", path);
  if (m) return <ProblemDetail key={m.id} id={m.id} />;
  return (
    <Empty title="Page not found">
      <p>The link may be incomplete.</p>
      <Link className="btn" to="/">Go to search</Link>
    </Empty>
  );
}

/** Last line of defence: a render bug shows a recoverable message, not a white screen. */
class Boundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(prev: { resetKey: string }) { if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false }); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Empty title="This page hit a problem">
        <p>Other pages still work. Go back, or reload to try again.</p>
        <button className="btn" onClick={() => window.location.reload()}>Reload</button>
      </Empty>
    );
  }
}

export default function App() {
  const { path } = useLocation();
  useEffect(() => { track("page_viewed", { path }); }, [path]);

  // After the first screen is up, quietly fetch project details in idle time,
  // so opening a project later feels instant even on a slow connection.
  useEffect(() => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    // Page code is tiny (1-3 KB each), so it is fetched even when data prefetch is skipped below.
    if (idle) idle(preloadPages); else setTimeout(preloadPages, 1500);
    const start = () => dataClient.prefetchAllDetails();
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    // Students often pay per megabyte: skip prefetch on data-saver or slow connections.
    if (conn?.saveData || /2g|3g/.test(conn?.effectiveType ?? "")) return;
    if (idle) idle(start); else setTimeout(start, 2500);
  }, []);

  return (
    <Layout>
      <CoreProvider>
        <Boundary resetKey={path}>
          <Suspense fallback={<PageSkeleton />}>{route(path)}</Suspense>
        </Boundary>
      </CoreProvider>
    </Layout>
  );
}
