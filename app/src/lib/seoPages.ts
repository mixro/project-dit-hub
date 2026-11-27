// Search metadata for the fixed routes. Pure data (no DOM, no React), so vite.config.ts can
// import it to write a static HTML file per route at build time, and seo.ts uses the same
// entries at runtime. One list, so the built HTML and the live page never disagree.
// No numbers here: statistics are always derived from loaded data, never hard-coded.

export const SITE_NAME = "INSTiWISE";
export const DEFAULT_TITLE = "INSTiWISE – Explore past final-year engineering projects";
export const DEFAULT_DESCRIPTION =
  "Search past final-year engineering projects, explore the real problems behind them, and check whether your idea has been done before. Built for DIT students.";

export interface StaticPage {
  /** URL path, no trailing slash ("/" for home). */
  path: string;
  /** Output file written by the build ("projects.html"). */
  file: string;
  /** Page title without the " – INSTiWISE" suffix; empty for home. */
  title: string;
  description: string;
  /** Text placed in the raw HTML for crawlers and no-JS visitors; React replaces it on load. */
  heading: string;
  intro: string;
  /** Pages that only make sense for one visitor (e.g. their own compare list). */
  noindex?: boolean;
}

export const STATIC_PAGES: StaticPage[] = [
  {
    path: "/",
    file: "index.html",
    title: "",
    description: DEFAULT_DESCRIPTION,
    heading: "What problem do you want to solve?",
    intro: "Search past final-year engineering projects before you choose your own, explore the problems behind them, and check how close your idea is to existing work.",
  },
  {
    path: "/projects",
    file: "projects.html",
    title: "Projects",
    description: "Browse and search past final-year engineering projects by programme, year, decision, technology and problem area.",
    heading: "Past final-year engineering projects",
    intro: "Search past project titles and filter by programme, year, decision, technology and problem area.",
  },
  {
    path: "/problems",
    file: "problems.html",
    title: "Problems",
    description: "Start from a real engineering problem, then see how past final-year students tried to solve it.",
    heading: "Engineering problems",
    intro: "Start from a real problem, then see how past students tried to solve it.",
  },
  {
    path: "/check",
    file: "check.html",
    title: "Check your idea",
    description: "Describe your final-year project idea and see which past projects are closest to it.",
    heading: "Has my idea been done?",
    intro: "Describe your idea in a sentence or two. We compare it with every project title in the dataset.",
  },
  {
    path: "/insights",
    file: "insights.html",
    title: "Insights",
    description: "See what past final-year engineering students worked on: popular problem areas, technologies and trends over the years.",
    heading: "Insights",
    intro: "What past students worked on, calculated from all projects in the dataset.",
  },
  {
    path: "/about",
    file: "about.html",
    title: "About this data",
    description: "Where the INSTiWISE project data comes from, how it is processed, and what it can and cannot tell you.",
    heading: "About this data",
    intro: "This is a testing version built to learn how students search for project ideas. It is not an official record and it does not approve or reject projects.",
  },
  {
    path: "/compare",
    file: "compare.html",
    title: "Compare projects",
    description: "Compare up to three past projects side by side.",
    heading: "Compare projects",
    intro: "Pick up to three projects and see where they are alike and where they differ.",
    noindex: true,
  },
];

/** Links shown in the static fallback, so crawlers can reach every main page from raw HTML. */
export const FALLBACK_NAV = STATIC_PAGES.filter((p) => !p.noindex);

export function pageForPath(path: string): StaticPage | undefined {
  return STATIC_PAGES.find((p) => p.path === path);
}
