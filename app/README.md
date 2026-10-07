# DIT Project Hub: frontend prototype

React 19 + Vite + TypeScript. No backend; data is static JSON in `public/data/`, produced by the pipeline.

## Run it

```bash
cd app
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production build into dist/
npm run preview      # serve the production build locally
npm run test:data    # data-layer tests against ../output/public
npm run data:sync    # rebuild data from ../raw documents (Python 3 + python-docx)
```

`data:sync` copies the public JSON into `public/data/` automatically.

## Deploy

`dist/` is a static site. Deep links such as `/projects/p2026-...` need the host to serve `index.html` for unknown paths. `public/_redirects` handles Netlify and `vercel.json` handles Vercel. For GitHub Pages, copy `dist/index.html` to `dist/404.html`.

## Structure

```
src/
  main.tsx, App.tsx      entry, routes (lazy-loaded), error boundary, idle prefetch
  styles.css             all styling: tokens, light/dark, mobile-first
  lib/router.tsx         60-line History API router; filters live in the URL
  lib/core.tsx           loads core data once, label lookups, page titles
  lib/compare.ts         compare selection (max 3), persisted on the device
  lib/analytics.ts       on-device event log for student test sessions
  data/                  data layer: client, service, search, types (unchanged API)
  components/            Layout, SearchBox, Filters, ProjectRow, Decision, States
  pages/                 Home, Projects, ProjectDetail, Problems, ProblemDetail,
                         CheckIdea, Compare, Insights, About
```

Pages call only `data/projectService.ts`. Replacing its function bodies with API calls is the whole backend migration.

## UX decisions

| Decision | Why |
|---|---|
| Home asks "What problem do you want to solve?" | The product is problem-first. Searching by title is still one tap away. |
| Bottom tab bar on phones, top nav on desktop | Thumb reach on a phone; four destinations only. |
| Filters in a bottom sheet with live counts, "Show N projects" button | Students see what a filter will give before committing. Each group's counts ignore that group's own filter, so several years can be selected. |
| Filter and sort changes replace history; opening a project pushes | Back goes to the previous page, not through every filter click. |
| Decision shown as icon + text | Readable in sunlight and for colour-blind users. |
| Similarity shown as "Closely related / Related" with a "Why" line | Students see the reason, not an unexplained percentage. |
| Idea check uses the same rules and formula as the pipeline | A typed idea is judged exactly like a title. |
| Compare: stacked A/B/C on phones, table on desktop | No sideways scrolling on a phone. |
| Every loading, empty and error state says what to do next | No blank screens. Offline shows "Try again". |
| Provenance box on each project | Separates recorded facts from derived tags. |

## Performance budget (measured on the production bundle)

| Asset | Gzipped |
|---|---|
| Main JS (React + app shell + home) | ~59 KB, of which React is ~57 KB |
| CSS | ~4.5 KB |
| First data (manifest, index, problems, taxonomy, sources) | ~50 KB |
| Each other page, on first visit | 1–3 KB |
| Project details, per source document, on first project open | 25–60 KB |

Further choices:
- System fonts, so there are no font downloads.
- No UI or chart library.
- `manifest.json` is preloaded from the HTML, in parallel with the JS.
- Search is debounced, and previous results stay visible while new ones compute.
- Detail files are prefetched in idle time, except on 2G/3G or data-saver.

## Testing with students

Every search, filter, project open, similar-project click, comparison and idea check is logged on the device. At the end of a session, open **About this data → Download session log**. Event names follow section 28 of the spec.
