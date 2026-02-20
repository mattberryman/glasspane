# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Root — frontend (run from repo root)
npm run build          # vite build → dist/
npm run dev            # vite dev server
npm run lint           # biome check (src/, tests/, worker/src/, worker/tests/)
npm test               # 22 parser unit tests (vitest, node env)

# E2E tests (Playwright, requires built dist/)
npm run build && npx playwright test

# Worker (run from worker/)
npm test               # 15 worker integration tests (vitest-pool-workers / Miniflare)
npm run typecheck      # tsc --noEmit
npm run dev            # wrangler dev (local Worker)
npm run deploy         # wrangler deploy (requires CLOUDFLARE_API_TOKEN)
```

Run a single parser test: `npx vitest run tests/parser.test.js`
Run a single worker test: `cd worker && npx vitest run tests/worker.test.ts`

## Architecture

Glasspane is a browser teleprompter. A `.md` script file is parsed client-side into slides and rendered as a Preact app. Scripts can optionally be shared via a Cloudflare Worker, which stores them in KV and serves a shareable URL.

### Frontend (`src/`)

| File | Role |
|---|---|
| `src/index.html` | Vite HTML entry point |
| `src/main.tsx` | Mounts `<App />` to `#app` |
| `src/types.ts` | `Slide`, `Block`, `Theme`, `Accent` interfaces |
| `src/parser.ts` | Markdown → slides parser (logic from v1 `src/parser.js`) |
| `src/state.ts` | All `@preact/signals` state (slides, activeIndex, etc.) |
| `src/app.css` | All CSS; `data-theme` / `data-accent` drive theming |
| `src/components/` | 9 Preact components |
| `src/hooks/` | 4 hooks: useAutoScroll, useTimer, useKeyboard, useSettings |

### Build pipeline

```
npm run build  →  vite build  →  dist/
```

Vite bundles everything from `src/index.html`. No bespoke build script.

`public/` is copied into `dist/` verbatim by Vite:
- `public/fouc.js` — inline FOUC-prevention script (reads `gp-theme`/`gp-accent` from localStorage synchronously before first paint)
- `public/guide.html` + `public/guide.css` — guide page
- `public/scripts/jfk-inaugural.md` — demo script

### Parser (`src/parser.ts`)

Single source of truth. Tests import directly from `src/parser.ts`.

Block-level cue regex: `/^\[([A-Z][A-Z ]*(?:[\u2014\-.,!?\s].*)?)\]$/`
Inline direction regex: `/\[([A-Z][A-Z ]*(?:[\u2014\-.,!?\s].*)?)\]/g`

Block types: `click`, `pause` (includes LOOK UP, SMILE, etc.), `note`. Anything else on its own line matching the regex is `pause`.

### State (`src/state.ts`)

All state is `@preact/signals`. Key signals:
- `slides` — parsed `Slide[]`
- `activeIndex` — currently highlighted line index (-1 = none)
- `scrollActive` / `scrollLevel` — auto-scroll state
- `timerElapsed` / `timerRunning` — elapsed ms + running flag
- `theme` / `accent` — persisted to localStorage by `useSettings`
- `scriptLoaded` / `settingsOpen` — UI visibility

Derived: `totalLines` (computed), `progress` (computed, 0–1).

### Worker (`worker/src/`)

Cloudflare Worker. Routes:
- `POST /upload` — validates with Zod, stores in KV with 90-day TTL, returns `{ id, url }`
- `GET /script/:id` — retrieves raw script content from KV
- `GET /s/:id` — serves `teleprompter.html` via `env.ASSETS` + injects `<meta name="script-id">` with HTMLRewriter
- `GET /` or `/index.html` — serves `teleprompter.html`
- `GET /guide` — serves `guide.html`
- All other GET — served from Workers Static Assets (`env.ASSETS`)

CSP uses `script-src 'self'` (covers Vite-bundled modules and `fouc.js`; no `unsafe-inline`).

### Linting

`biome.json` controls everything. No per-file linter-disabled overrides (all source is TypeScript/TSX, fully linted).

a11y suppressions in `Block.tsx`, `Timer.tsx`, `SlideNav.tsx` use `// biome-ignore` placed **inside** the JSX return parens, immediately before the flagged element.

### Sample content

Use `scripts/jfk-inaugural.md` for any demo, test, or documentation example. Do not invent placeholder scripts.

### Deployment

Static assets (`dist/`) are deployed via Workers Static Assets. Worker routes the rest.

Push to `main` triggers `.github/workflows/deploy.yml`. Requires `CLOUDFLARE_API_TOKEN` secret in GitHub. Never deploy directly to production without running through preview/staging first.
