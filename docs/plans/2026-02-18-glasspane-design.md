# Glasspane — Design Document

**Date:** 2026-02-18
**Status:** Approved

---

## Overview

Glasspane is a browser-based teleprompter. A speaker writes a script as a plain Markdown file, drops it onto the app, and reads it during a live presentation. The tool handles auto-scroll, slide navigation, a session timer, and stage direction cues.

The project has two delivery targets:

1. **Open-source repo** — a self-contained `teleprompter.html` that works by opening it directly in a browser. Ships with a demo speech and an authoring guide.
2. **Hosted service** — the same front-end deployed to Cloudflare Workers, with an upload endpoint that stores a script in KV and returns a short URL. No repo cloning required.

---

## Architecture

### Repository layout

```
glasspane/
├── teleprompter.html         # presentation layer (self-contained)
├── worker/
│   ├── src/
│   │   └── index.ts          # CF Worker: upload + serve scripts
│   ├── tsconfig.json
│   └── package.json
├── wrangler.toml             # Cloudflare config (KV binding, routes)
├── scripts/
│   └── jfk-inaugural.md     # demo speech
├── docs/
│   ├── plans/               # design and implementation docs
│   └── script-format.md     # authoring guide
├── .github/
│   └── workflows/
│       ├── ci.yml            # lint, typecheck, test on every PR
│       └── deploy.yml        # deploy to CF on merge to main
└── README.md                 # with animated GIF
```

### Request flow (hosted)

```
GET  /                    → Worker serves teleprompter.html (drop zone screen)
POST /upload              → validate → store in KV → return { id, url }
GET  /s/:id               → Worker serves teleprompter.html with id in meta tag
GET  /script/:id          → Worker returns raw script content from KV
```

The browser fetches `/script/:id` after reading the id from the page, parses the Markdown locally, and renders the teleprompter view. The Worker never generates HTML from script content — parsing and rendering happen entirely in the browser.

### Storage

Cloudflare KV. Each script is stored as plain text, keyed by a random 12-character alphanumeric ID (72 bits of entropy — sufficient to prevent enumeration). No expiry by default; TTL can be added later if storage grows.

### Local / offline use

`teleprompter.html` also runs without any Worker. The user opens it in a browser, drags a `.md` file onto the drop zone, and the script loads from the local `File` object. Nothing is uploaded or persisted.

---

## Script format

Scripts are plain `.md` files. The authoring guide (`docs/script-format.md`) documents the full syntax; the key rules follow.

### Slide boundaries

An `##` heading starts a new slide section. Slide dividers are inserted automatically between sections.

```markdown
## Slide 2 — We Shall Fight
```

### Spoken lines

Any plain paragraph becomes a clickable, highlightable line.

```markdown
We shall fight on the beaches, we shall fight on the landing grounds.
```

### Inline stage directions

`[TAG]` anywhere within a line renders as a coloured cue visible to the speaker.

```markdown
We shall fight [BREATHE] on the beaches. [PAUSE]
```

Supported tags: `[BREATHE]` `[PAUSE]` `[SLOW]` `[LOOK UP]` `[SMILE]`

Tags are case-insensitive and extensible — the parser treats any `[ALL CAPS]` token as a direction.

### Slow emphasis

Text in `**double asterisks**` within a spoken line renders in gold to signal "speak this slowly".

```markdown
**We shall never surrender.** [PAUSE]
```

### Block-level cues

A line containing only a tag (with optional note text) becomes a standalone cue block — not a spoken line.

```markdown
[CLICK]
[PAUSE — let this land. 4–5 seconds.]
[NOTE — refer to the slide here]
```

---

## Front-end design

### Screens

**Drop zone** (shown when no script is loaded):

A centred drop target with a drag-and-drop area and a file picker fallback. A "Try the demo" link loads the JFK inaugural address without requiring a file upload. When hosted, dropping a file uploads it to the Worker and redirects to `/s/:id`; in local mode it reads the file directly from the `File` object.

**Teleprompter view** (after a script loads):

Identical to the existing design — progress bar, timer, slide pip navigation, auto-scroll with speed control, `j`/`k` highlight movement. Two additions:

- A ⚙ gear icon in the top-right corner opens the settings panel.
- A "Load new script" option in the settings panel returns to the drop zone.

### Settings panel

An overlay panel, dismissed by clicking outside it or pressing Escape. Preferences are saved to `localStorage`.

**Theme options:**

| Option | Background | Text |
|--------|------------|------|
| Night (default) | `#0c0c0e` | `#d8d8dc` |
| Navy | `#0a0f1e` | `#d0d8f0` |
| Day | `#f8f7f4` | `#1a1a1a` |
| Auto | OS `prefers-color-scheme` | — |

**Accent colours:**

| Option | Colour | Character |
|--------|--------|-----------|
| Gold (default) | `#c9a84c` | Warm, editorial |
| Teal | `#3dbfa8` | Cool, modern |

The accent colour applies to slide headers, the progress bar, the active line highlight, and pip dots. All other colours derive from the theme.

---

## Security

### Threat model

The primary risk is a malicious `.md` file — either uploaded by an attacker or crafted by a third party — that, when parsed and inserted into the DOM, executes arbitrary JavaScript (XSS). Secondary concerns: oversized uploads consuming KV quota, ID enumeration, and upload endpoint abuse.

### Mitigations

**Worker-side input validation — Zod**

All data entering the Worker through `POST /upload` is validated against a Zod schema before storage. Zod provides both compile-time types and runtime enforcement.

```typescript
const UploadSchema = z.object({
  content: z.string().min(1).max(100_000), // 100 KB ceiling
});
```

The Worker reads the raw request body as text and passes it through this schema. Oversized or empty payloads are rejected with `400` before touching KV. The Worker never evaluates or parses the Markdown — it stores and retrieves opaque text.

**Browser-side HTML sanitisation — DOMPurify**

The script parser converts Markdown to an HTML structure using only known, safe patterns (specific class names, no event attributes, no script tags). Before that structure is written into the document, it passes through DOMPurify.

DOMPurify is the industry-standard client-side sanitiser — used by Google, GitHub, and others. It strips any element or attribute outside an explicit allowlist, providing defence in depth even if the parser has an edge-case bug. The parser is our code; DOMPurify is the safety net. We never insert untrusted string content into the document without passing it through DOMPurify first.

**ID generation**

Script IDs are generated with `crypto.getRandomValues()` — the Workers runtime's cryptographically secure RNG. IDs are 12 characters drawn from a 62-character alphabet (a–z, A–Z, 0–9), giving 72 bits of entropy. Enumeration is not practical.

**Rate limiting**

The upload endpoint enforces a per-IP request limit using Cloudflare's built-in rate limiting rules (configured in `wrangler.toml`). No custom middleware required.

**Content-Security-Policy**

The Worker adds a `Content-Security-Policy` header to every HTML response. The policy disallows eval, restricts script sources to self, and limits `connect-src` to the same origin. This reduces the blast radius of any XSS that slips through.

---

## Testing strategy

Tests exist to verify correctness where a mistake causes real harm — a broken parser corrupts a live presentation; a validation bypass enables XSS. Tests do not exist to satisfy a coverage percentage.

### What to test

**Script parser** — the highest-value test target. The parser is pure logic: string in, structured data out. A bug is immediately visible to the speaker during a live session. Test exhaustively:

- `##` heading → slide boundary with correct title
- `[CLICK]` alone on a line → click-cue block, not a spoken line
- `[PAUSE — note text]` alone → pause block with note preserved
- Inline `[BREATHE]` within a line → direction cue inside spoken line
- `**text**` within a line → slow-emphasis span
- Unknown `[ALL CAPS]` tag → treated as direction (not dropped, not errored)
- Empty lines → ignored
- Multiple consecutive slides
- Script with no `##` headings (all content in one implicit slide)
- Malformed tags: `[unclosed`, `[]`, deeply nested brackets

**Zod upload schema** — tests at the system boundary. Fast and deterministic:

- Content at the maximum length (100,000 chars) → accepted
- Content one byte over the limit → rejected with informative error
- Empty string → rejected
- Missing `content` field → rejected

**ID generation** — generate 10,000 IDs and assert no collisions. This is a smoke test, not a proof of security; it validates that the character set and length are as specified.

### What not to test

- CSS layout and visual rendering
- Auto-scroll animation (rAF-based; no meaningful unit-testable surface)
- DOMPurify internals (trust the library's own test suite)
- `localStorage` read/write (trivial, no branching logic)
- The CF Workers runtime itself

### Testing stack

- **Vitest** — unit tests for the parser and Zod schemas. Fast, ESM-native, zero configuration overhead.
- **`@cloudflare/vitest-pool-workers`** — Worker integration tests running inside the actual Workers runtime (Miniflare). Used for the upload endpoint end-to-end: POST content → assert KV write → GET `/script/:id` → assert content returned.

---

## CI/CD

### On every pull request — `ci.yml`

1. `tsc --noEmit` — type-check the Worker source
2. `eslint worker/src` and `eslint teleprompter.html` — lint for errors
3. `prettier --check` — enforce consistent formatting
4. `vitest run` — all unit and integration tests

All four checks must pass before merge is permitted (branch protection rule).

### On merge to `main` — `deploy.yml`

1. Run the same CI checks
2. Deploy via `cloudflare/wrangler-action` to the production Worker

No manual step required.

### Tooling

| Tool | Purpose |
|------|---------|
| TypeScript (strict) | Worker source |
| ESLint + `@typescript-eslint` | Linting |
| Prettier | Formatting (enforced in CI) |
| Vitest | Unit and integration tests |
| `@cloudflare/vitest-pool-workers` | CF Worker integration tests |
| Wrangler | CF local dev and deployment |
| `cloudflare/wrangler-action` | GitHub Actions deployment |

`teleprompter.html` uses plain JavaScript (no build step, no bundler). ESLint covers it via a separate lint target.

---

## Licence

**PolyForm Noncommercial 1.0.** Free to use, modify, and self-host. Commercial use — including offering the tool as a paid or monetised service — requires a separate agreement. Simple, well-drafted, purpose-built for this intent.

---

## Demo content

**Speech:** JFK's Inaugural Address, 20 January 1961 (public domain). Pre-annotated with `[BREATHE]`, `[PAUSE]`, and `**slow emphasis**` tags to demonstrate the full format. Ships in `scripts/jfk-inaugural.md`.

**Animated GIF:** Recorded after implementation. Shows drop zone → script loads → auto-scroll active → settings panel opens. Approximately 15–20 seconds, looping. Embedded in `README.md` above the fold.

---

## Out of scope (for now)

- User accounts or authentication
- Script version history
- Presenter notes separate from the script
- Multi-speaker scripts
- Mobile / touch support (desktop + external display is the target)
