import { Component, lazy, Suspense, useEffect, type ReactNode } from "react";
import { Layout } from "./components/Layout";
import { Empty, PageSkeleton } from "./components/States";
import { CoreProvider } from "./lib/core";
import { Link, matchPath, useLocation } from "./lib/router";
import { track } from "./lib/analytics";
import { dataClient } from "./data/dataClient";
import Home from "./pages/Home";

// Home ships in the main bundle; every other page downloads only when visited.
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Problems = lazy(() => import("./pages/Problems"));
const ProblemDetail = lazy(() => import("./pages/ProblemDetail"));
const CheckIdea = lazy(() => import("./pages/CheckIdea"));
const Compare = lazy(() => import("./pages/Compare"));
const Insights = lazy(() => import("./pages/Insights"));
const About = lazy(() => import("./pages/About"));

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
