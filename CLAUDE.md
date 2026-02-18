# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Root (parser tests + build)
npm run build          # assemble dist/teleprompter.html from src/ parts
npm run lint           # biome check across src/, tests/, scripts/, worker/
npm test               # 22 parser unit tests (vitest, node env)

# Worker (run from worker/)
npm test               # 15 worker integration tests (vitest-pool-workers / Miniflare)
npm run typecheck      # tsc --noEmit
npm run dev            # wrangler dev (local Worker)
npm run deploy         # wrangler deploy (requires CLOUDFLARE_API_TOKEN)
```

Run a single parser test file: `npx vitest run tests/parser.test.js`
Run a single worker test file: `cd worker && npx vitest run src/worker.test.ts`

## Architecture

Glasspane is a browser teleprompter. A `.md` script file is parsed client-side into slides and rendered. Scripts can optionally be shared via a Cloudflare Worker, which stores them in KV and serves a shareable URL.

### Build pipeline

The build (`scripts/build.js`) assembles self-contained HTML from separate source files:

```
src/teleprompter.html  (markup shell with <!-- INJECT:* --> placeholders)
src/teleprompter.css   → injected into <style><!-- INJECT:CSS --></style>
src/parser.js          → export keyword stripped, injected into IIFE
src/app.js             → injected after parser inside the IIFE
node_modules/dompurify → injected as <!-- INJECT:DOMPURIFY -->

src/guide.html + src/guide.css → assembled identically (no JS)
```

Outputs:
- `dist/teleprompter.html` — single self-contained file (gitignored)
- `worker/src/template.ts` — generated TypeScript exporting `HTML`, `GUIDE_HTML`, `DEMO_SCRIPT`, `CSP_SCRIPT_HASHES` (gitignored); do not edit manually

### Parser (`src/parser.js`)

Single source of truth. `export` keywords are stripped at build time so it runs inside the browser IIFE. The same file is tested directly in `tests/parser.test.js`.

Block-level cue regex: `/^\[([A-Z][A-Z ]*(?:[\u2014\-.,!?\s].*)?)\]$/`
Inline direction regex: `/\[([A-Z][A-Z ]*(?:[\u2014\-.,!?\s].*)?)\]/g`

Block types: `click`, `pause` (includes LOOK UP, SMILE, etc.), `note`. Anything else on its own line matching the regex is `pause`.

### App JS (`src/app.js`)

Browser ES5 — intentionally uses `var` and function declarations. Linter is disabled for this file in `biome.json`. The `teleprompterInited` flag prevents duplicate event listeners when `loadNewBtn` reloads a script without a full page navigation.

### Worker (`worker/src/`)

Cloudflare Worker. Routes:
- `POST /upload` — validates with Zod, stores in KV with 90-day TTL, returns `{ id, url }`
- `GET /script/:id` — retrieves raw script content from KV
- `GET /s/:id` — serves `HTML` with `data-script-id` injected (shareable link)
- `GET /` — serves `HTML` with no script ID (fresh session)
- `GET /guide` — serves `GUIDE_HTML`
- `GET /scripts/jfk-inaugural.md` — serves `DEMO_SCRIPT`

CSP is strict (`script-src` uses build-time SHA-256 hashes from `CSP_SCRIPT_HASHES`, no `unsafe-inline`).

### Linting

`biome.json` controls everything. Key overrides:
- `src/app.js` — linter disabled entirely (browser ES5)
- `src/teleprompter.html`, `src/guide.html` — excluded from Biome's HTML parser (template files with placeholders)
- `scripts/**` — `noConsole` disabled
- `worker/src/template.ts` — excluded (generated file)

### Sample content

Use `scripts/jfk-inaugural.md` for any demo, test, or documentation example. Do not invent placeholder scripts.

### Deployment

Push to `main` triggers `.github/workflows/deploy.yml`, which runs `npm run build` then `wrangler deploy` from `worker/`. Requires `CLOUDFLARE_API_TOKEN` secret in GitHub. Never deploy directly to production without running through preview/staging first.
