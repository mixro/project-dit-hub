# app/: React website

Stack: React 19, Vite, TypeScript (strict). Runtime dependencies: react and react-dom only. Keep it that way unless a decision in `docs/DECISIONS.md` says otherwise.

## Architecture

- `src/data/`: data layer. `dataClient.ts` (fetch with timeout, retries, validation, caching, lazy per-source detail shards), `projectService.ts` (the ONLY API pages use), `search.ts` (search, synonyms, idea checker using pipeline rules), `types.ts` (schema v1, mirrors pipeline output).
- `src/lib/router.tsx`: small History-API router. Filter/search state lives in URL params; filter changes use `replace`, opening a page uses `push`.
- `src/lib/core.tsx`: loads core data once, gives `useCore()` lookups (`label()`, `byId`, `problemById`).
- `src/lib/compare.ts`: compare selection (max 3), localStorage-backed store.
- `src/lib/analytics.ts`: on-device event log for student testing. Event names follow spec section 28. Add a `track()` call for any new user action worth studying.
- `src/pages/*`: lazy-loaded except Home. `src/components/*`: shared UI.
- `src/styles.css`: single stylesheet with tokens. Light and dark mode via `prefers-color-scheme`.

## Design system

- Colours: paper `#FBFBF9`, ink `#172130`, accent PCB green `#0B6E4F` (all actions), solder yellow `#F3D35B` (search highlights only). Use the CSS variables; never hard-code colours.
- System font stack only (no font downloads). Type scale in `:root`.
- Mobile first. Phones get a bottom tab bar, bottom-sheet filters and stacked compare; ≥900 px gets a top nav and sidebar filters.
- Tap targets ≥ 44 px. Decision status is always icon + text, never colour alone. Respect `prefers-reduced-motion`.
- Every loading, empty and error state tells the student what to do next (`components/States.tsx`).

## Rules

- Pages never call `fetch` directly; add a function to `projectService.ts` that returns `Result<T>`.
- Never compute statistics from hard-coded numbers; derive everything from loaded data.
- If `types.ts` changes shape, bump `SCHEMA_VERSION` in `pipeline/src/build.py` and `SUPPORTED_SCHEMA` in `dataClient.ts` together.
- Deep links need SPA fallback: `public/_redirects` (Netlify), `vercel.json` (Vercel). Absolute `/data/` paths assume hosting at the domain root.
- Before finishing: `npm run build` and `npm run test:data` pass, and the change was checked at 390 px and 1280 px.
