# Glasspane Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a browser-based teleprompter with a plain-text script format, drag-and-drop loading, theme switching, and a Cloudflare Workers backend for shareable script URLs.

**Architecture:** `teleprompter.html` is the presentation layer — a self-contained file built by a simple Node build script that inlines `src/parser.js` and DOMPurify. A Cloudflare Worker handles script upload (POST `/upload`), storage (CF KV), and serving (GET `/script/:id`). The Worker never parses or generates HTML from script content; that happens entirely in the browser. All untrusted content is sanitised through DOMPurify before being written to the DOM.

**Tech Stack:** Vanilla JS (front-end, no framework), TypeScript (Worker), Vitest (tests), Zod (Worker input validation), DOMPurify (browser HTML sanitisation), Cloudflare Workers + KV, Wrangler, GitHub Actions.

---

## Reference: Design document

`docs/plans/2026-02-18-glasspane-design.md` — read this if you need to understand any decision.

## Reference: Existing file

`psd3-teleprompter.html` — the original bespoke teleprompter. The JS auto-scroll, timer, j/k navigation, and pip logic should be carried over verbatim into the new `teleprompter.html`. Do not rewrite what works.

---

## Task 1: Repo scaffolding

**Files:**
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `package.json` (root — Vitest config for parser tests)
- Create: `vitest.config.js`

### Step 1: Create `.gitignore`

```
node_modules/
dist/
.wrangler/
*.local
.env
.env.*
```

### Step 2: Create `LICENSE`

Download PolyForm Noncommercial 1.0.0 from https://polyformproject.org/licenses/noncommercial/1.0.0/ and save as `LICENSE`. Update the copyright line:

```
Copyright 2026 [your name]
```

### Step 3: Create root `package.json`

```json
{
  "name": "glasspane",
  "version": "0.1.0",
  "description": "Browser teleprompter with Cloudflare Workers backend",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "node scripts/build.js",
    "lint": "eslint src tests"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "dompurify": "^3.0.0",
    "eslint": "^9.0.0"
  }
}
```

Run: `npm install`

### Step 4: Create `vitest.config.js`

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
```

### Step 5: Commit

```bash
git add .gitignore LICENSE package.json vitest.config.js package-lock.json
git commit -m "chore: repo scaffolding, licence, and Vitest config"
```

---

## Task 2: Script parser — tests

**Files:**
- Create: `tests/parser.test.js`
- Create: `src/parser.js` (stub — just enough to make tests importable)

The parser is the highest-risk component. Write all tests before writing a single line of implementation. Each test should be small and focused.

### Step 1: Create `src/parser.js` stub

```js
/**
 * parseScript
 * @param {string} text - raw .md file content
 * @returns {{ title: string, blocks: Array }[]}
 */
export function parseScript(text) {
  throw new Error('not implemented');
}
```

### Step 2: Create `tests/parser.test.js`

```js
import { describe, it, expect } from 'vitest';
import { parseScript } from '../src/parser.js';

// ---------------------------------------------------------------------------
// Slide boundaries
// ---------------------------------------------------------------------------
describe('slide boundaries', () => {
  it('creates one slide per ## heading', () => {
    const input = `## Slide One\n\nHello.\n\n## Slide Two\n\nWorld.`;
    const slides = parseScript(input);
    expect(slides).toHaveLength(2);
    expect(slides[0].title).toBe('Slide One');
    expect(slides[1].title).toBe('Slide Two');
  });

  it('places content with no ## heading in a single implicit slide', () => {
    const input = `Hello world.`;
    const slides = parseScript(input);
    expect(slides).toHaveLength(1);
    expect(slides[0].blocks).toHaveLength(1);
  });

  it('ignores --- dividers', () => {
    const input = `## Slide One\n\nHello.\n\n---\n\n## Slide Two\n\nWorld.`;
    const slides = parseScript(input);
    expect(slides).toHaveLength(2);
  });

  it('ignores empty lines', () => {
    const input = `## Slide One\n\n\n\nHello.\n\n\n`;
    const slides = parseScript(input);
    expect(slides[0].blocks).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Block-level cues
// ---------------------------------------------------------------------------
describe('block-level cues', () => {
  it('[CLICK] alone becomes a click block', () => {
    const input = `## S\n\n[CLICK]\n\nHello.`;
    const blocks = parseScript(input)[0].blocks;
    expect(blocks[0]).toEqual({ type: 'click' });
  });

  it('[PAUSE] alone becomes a pause block', () => {
    const input = `## S\n\n[PAUSE]`;
    const blocks = parseScript(input)[0].blocks;
    expect(blocks[0]).toMatchObject({ type: 'pause' });
  });

  it('[PAUSE — note text] preserves the note', () => {
    const input = `## S\n\n[PAUSE — let this land. 4 seconds.]`;
    const blocks = parseScript(input)[0].blocks;
    expect(blocks[0]).toMatchObject({ type: 'pause', note: '— let this land. 4 seconds.' });
  });

  it('[NOTE — text] becomes a note block', () => {
    const input = `## S\n\n[NOTE — refer to slide]`;
    const blocks = parseScript(input)[0].blocks;
    expect(blocks[0]).toMatchObject({ type: 'note', text: '— refer to slide' });
  });

  it('[LOOK UP] alone treated as a cue block, not a spoken line', () => {
    const input = `## S\n\n[LOOK UP]`;
    const blocks = parseScript(input)[0].blocks;
    expect(blocks[0].type).not.toBe('line');
  });
});

// ---------------------------------------------------------------------------
// Spoken lines
// ---------------------------------------------------------------------------
describe('spoken lines', () => {
  it('plain text becomes a line block', () => {
    const input = `## S\n\nWe shall fight on the beaches.`;
    const blocks = parseScript(input)[0].blocks;
    expect(blocks[0].type).toBe('line');
    expect(blocks[0].html).toContain('We shall fight on the beaches.');
  });

  it('inline [BREATHE] renders as a direction span', () => {
    const input = `## S\n\nWe shall fight [BREATHE] on the beaches.`;
    const blocks = parseScript(input)[0].blocks;
    expect(blocks[0].html).toContain('<span class="d">[BREATHE]</span>');
  });

  it('inline [PAUSE] renders as a direction span', () => {
    const input = `## S\n\nEnd of point. [PAUSE]`;
    const blocks = parseScript(input)[0].blocks;
    expect(blocks[0].html).toContain('<span class="d">[PAUSE]</span>');
  });

  it('**text** renders as a slow-emphasis span', () => {
    const input = `## S\n\n**We shall never surrender.**`;
    const blocks = parseScript(input)[0].blocks;
    expect(blocks[0].html).toContain('<span class="slow">We shall never surrender.</span>');
  });

  it('combination of direction and emphasis in one line', () => {
    const input = `## S\n\n[SLOW] **Never.** [BREATHE] Not once.`;
    const blocks = parseScript(input)[0].blocks;
    expect(blocks[0].html).toContain('<span class="d">[SLOW]</span>');
    expect(blocks[0].html).toContain('<span class="slow">Never.</span>');
    expect(blocks[0].html).toContain('<span class="d">[BREATHE]</span>');
  });
});

// ---------------------------------------------------------------------------
// Security: HTML injection prevention in parser output
// ---------------------------------------------------------------------------
describe('HTML injection prevention', () => {
  it('escapes < and > in spoken text', () => {
    const input = `## S\n\n<b>bold attempt</b>`;
    const blocks = parseScript(input)[0].blocks;
    expect(blocks[0].html).not.toContain('<b>');
    expect(blocks[0].html).toContain('&lt;b&gt;');
  });

  it('escapes & in spoken text', () => {
    const input = `## S\n\nQ&A session`;
    const blocks = parseScript(input)[0].blocks;
    expect(blocks[0].html).toContain('Q&amp;A');
  });

  it('does not treat [lowercase] as a direction', () => {
    const input = `## S\n\nSee [footnote 1] for details.`;
    const blocks = parseScript(input)[0].blocks;
    expect(blocks[0].html).not.toContain('<span class="d">');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('edge cases', () => {
  it('empty string returns one empty slide', () => {
    const slides = parseScript('');
    expect(slides).toHaveLength(1);
    expect(slides[0].blocks).toHaveLength(0);
  });

  it('whitespace-only string returns one empty slide', () => {
    const slides = parseScript('   \n   \n   ');
    expect(slides).toHaveLength(1);
    expect(slides[0].blocks).toHaveLength(0);
  });

  it('[unclosed bracket treated as plain text', () => {
    const input = `## S\n\nSee [unclosed for details.`;
    const blocks = parseScript(input)[0].blocks;
    expect(blocks[0].type).toBe('line');
    expect(blocks[0].html).not.toContain('<span class="d">');
  });

  it('[] empty brackets treated as plain text', () => {
    const input = `## S\n\nSomething [] happened.`;
    const blocks = parseScript(input)[0].blocks;
    expect(blocks[0].type).toBe('line');
  });

  it('unknown [ALL CAPS TAG] treated as inline direction', () => {
    const input = `## S\n\nSomething. [SMILE]`;
    const blocks = parseScript(input)[0].blocks;
    expect(blocks[0].html).toContain('<span class="d">[SMILE]</span>');
  });
});
```

### Step 3: Run tests — verify all fail

```bash
npm test
```

Expected: all tests fail with `Error: not implemented`.

### Step 4: Commit the failing tests

```bash
git add src/parser.js tests/parser.test.js
git commit -m "test: parser tests (all failing — TDD red phase)"
```

---

## Task 3: Script parser — implementation

**Files:**
- Modify: `src/parser.js`

### Step 1: Implement `parseScript`

Replace the stub with the full implementation:

```js
/**
 * parseScript
 * @param {string} text - raw .md file content
 * @returns {{ title: string, blocks: Array }[]}
 */
export function parseScript(text) {
  const lines = text.split('\n');
  const slides = [];
  let current = { title: '', blocks: [] };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line || line === '---') continue;

    // Slide boundary
    if (line.startsWith('## ')) {
      if (current.blocks.length > 0 || current.title) {
        slides.push(current);
      }
      current = { title: line.slice(3).trim(), blocks: [] };
      continue;
    }

    // Block-level cue: line is *only* [TAG optional note]
    const blockMatch = line.match(/^\[([A-Z][A-Z\s\u2014\-.,!?0-9]*)\]$/);
    if (blockMatch) {
      const tag = blockMatch[1].trim();
      if (tag === 'CLICK') {
        current.blocks.push({ type: 'click' });
      } else if (tag.startsWith('NOTE')) {
        current.blocks.push({ type: 'note', text: tag.slice(4).trim() });
      } else {
        // PAUSE, LOOK UP, SMILE, and any other all-caps cue
        const spaceIdx = tag.indexOf(' ');
        const note = spaceIdx >= 0 ? tag.slice(spaceIdx).trim() : '';
        current.blocks.push({ type: 'pause', note });
      }
      continue;
    }

    // Spoken line — process inline markup
    current.blocks.push({ type: 'line', html: processInline(line) });
  }

  slides.push(current);
  return slides;
}

/**
 * processInline — converts a plain text line to safe HTML.
 * Escapes HTML entities first, then applies markup.
 * The result must still pass through DOMPurify before DOM insertion.
 * @param {string} text
 * @returns {string}
 */
function processInline(text) {
  // 1. Escape HTML entities to prevent injection
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. **bold** → slow emphasis span
  html = html.replace(/\*\*(.+?)\*\*/g, '<span class="slow">$1</span>');

  // 3. [ALL CAPS] inline direction — only matches all-caps content
  html = html.replace(/\[([A-Z][A-Z\s\u2014\-.,!?0-9]*)\]/g, '<span class="d">[$1]</span>');

  return html;
}
```

### Step 2: Run tests — verify all pass

```bash
npm test
```

Expected: all tests pass.

### Step 3: Commit

```bash
git add src/parser.js
git commit -m "feat: implement script parser with inline markup and HTML escaping"
```

---

## Task 4: Worker scaffolding

**Files:**
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `worker/src/index.ts` (stub)
- Create: `wrangler.toml`

### Step 1: Create `worker/package.json`

```json
{
  "name": "glasspane-worker",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run --project worker",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "wrangler": "^3.0.0",
    "@cloudflare/workers-types": "^4.0.0",
    "@cloudflare/vitest-pool-workers": "^0.5.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

Run: `cd worker && npm install`

### Step 2: Create `worker/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

### Step 3: Create `worker/src/index.ts` stub

```typescript
export default {
  async fetch(_request: Request, _env: Env): Promise<Response> {
    return new Response('not implemented', { status: 501 });
  },
};

export interface Env {
  SCRIPTS: KVNamespace;
}
```

### Step 4: Create `wrangler.toml`

```toml
name = "glasspane"
main = "worker/src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[[kv_namespaces]]
binding = "SCRIPTS"
id = "REPLACE_WITH_REAL_KV_ID"
preview_id = "REPLACE_WITH_PREVIEW_KV_ID"

[[rules]]
type = "Text"
globs = ["**/*.html"]
fallthrough = true
```

To create KV namespaces:
```bash
cd worker && npx wrangler kv namespace create SCRIPTS
npx wrangler kv namespace create SCRIPTS --preview
```
Replace the placeholder IDs in `wrangler.toml` with the output.

### Step 5: Verify TypeScript compiles

```bash
cd worker && npm run typecheck
```

Expected: exits 0 with no errors.

### Step 6: Commit

```bash
git add worker/ wrangler.toml
git commit -m "chore: worker TypeScript scaffolding and wrangler config"
```

---

## Task 5: Worker — Zod schema tests and implementation

**Files:**
- Create: `worker/vitest.config.ts`
- Create: `worker/tests/schema.test.ts`
- Create: `worker/src/schema.ts`

### Step 1: Create `worker/vitest.config.ts`

```typescript
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: '../wrangler.toml' },
      },
    },
    include: ['tests/**/*.test.ts'],
  },
});
```

### Step 2: Write failing tests — `worker/tests/schema.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { UploadSchema } from '../src/schema';

describe('UploadSchema', () => {
  it('accepts valid content within size limit', () => {
    const result = UploadSchema.safeParse({ content: 'Hello world.' });
    expect(result.success).toBe(true);
  });

  it('accepts content exactly at 100,000 characters', () => {
    const result = UploadSchema.safeParse({ content: 'a'.repeat(100_000) });
    expect(result.success).toBe(true);
  });

  it('rejects content over 100,000 characters', () => {
    const result = UploadSchema.safeParse({ content: 'a'.repeat(100_001) });
    expect(result.success).toBe(false);
  });

  it('rejects empty string', () => {
    const result = UploadSchema.safeParse({ content: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing content field', () => {
    const result = UploadSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-string content', () => {
    const result = UploadSchema.safeParse({ content: 42 });
    expect(result.success).toBe(false);
  });
});
```

### Step 3: Run tests — verify they fail

```bash
cd worker && npm test
```

### Step 4: Implement `worker/src/schema.ts`

```typescript
import { z } from 'zod';

export const UploadSchema = z.object({
  content: z.string()
    .min(1, 'Script content cannot be empty')
    .max(100_000, 'Script exceeds 100 KB limit'),
});

export type Upload = z.infer<typeof UploadSchema>;
```

### Step 5: Run tests — verify they pass

```bash
cd worker && npm test
```

Expected: all 6 tests pass.

### Step 6: Commit

```bash
git add worker/src/schema.ts worker/tests/schema.test.ts worker/vitest.config.ts
git commit -m "feat: Zod upload schema with validation tests"
```

---

## Task 6: Worker — ID generation tests and implementation

**Files:**
- Create: `worker/tests/id.test.ts`
- Create: `worker/src/id.ts`

### Step 1: Write failing tests — `worker/tests/id.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { generateId } from '../src/id';

describe('generateId', () => {
  it('returns a 12-character string', () => {
    expect(generateId()).toHaveLength(12);
  });

  it('uses only alphanumeric characters', () => {
    expect(generateId()).toMatch(/^[a-zA-Z0-9]{12}$/);
  });

  it('generates unique IDs (10,000 samples, no collisions)', () => {
    const ids = new Set(Array.from({ length: 10_000 }, () => generateId()));
    expect(ids.size).toBe(10_000);
  });
});
```

### Step 2: Run — verify they fail

```bash
cd worker && npm test
```

### Step 3: Implement `worker/src/id.ts`

```typescript
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 12;

export function generateId(): string {
  const bytes = new Uint8Array(ID_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
```

### Step 4: Run — verify they pass

```bash
cd worker && npm test
```

### Step 5: Commit

```bash
git add worker/src/id.ts worker/tests/id.test.ts
git commit -m "feat: cryptographically secure ID generation"
```

---

## Task 7: Worker — upload and script endpoints

**Files:**
- Modify: `worker/src/index.ts`
- Create: `worker/tests/worker.test.ts`

### Step 1: Write integration tests — `worker/tests/worker.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../src/index';

async function workerFetch(path: string, init?: RequestInit) {
  const ctx = createExecutionContext();
  const res = await worker.fetch(new Request(`https://glasspane.test${path}`, init), env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

describe('POST /upload', () => {
  it('returns 400 for empty content', async () => {
    const res = await workerFetch('/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for oversized content', async () => {
    const res = await workerFetch('/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'a'.repeat(100_001) }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 200 with id and url for valid content', async () => {
    const res = await workerFetch('/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '## Slide One\n\nHello.' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { id: string; url: string };
    expect(body.id).toMatch(/^[a-zA-Z0-9]{12}$/);
    expect(body.url).toContain('/s/');
  });
});

describe('GET /script/:id', () => {
  let scriptId: string;

  beforeAll(async () => {
    const res = await workerFetch('/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '## Test Slide\n\nTest line.' }),
    });
    const body = await res.json() as { id: string };
    scriptId = body.id;
  });

  it('returns the stored script content', async () => {
    const res = await workerFetch(`/script/${scriptId}`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('## Test Slide');
  });

  it('returns 404 for unknown id', async () => {
    const res = await workerFetch('/script/doesnotexist0');
    expect(res.status).toBe(404);
  });
});

describe('GET /s/:id', () => {
  it('returns HTML containing the script id', async () => {
    const upload = await workerFetch('/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '## S\n\nHello.' }),
    });
    const { id } = await upload.json() as { id: string };

    const res = await workerFetch(`/s/${id}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain(id);
  });
});
```

### Step 2: Run — verify they fail

```bash
cd worker && npm test
```

### Step 3: Implement `worker/src/index.ts`

The Worker routes are: `POST /upload`, `GET /script/:id`, `GET /s/:id`, `GET /`.

Import the HTML template using Wrangler's text module binding (`import HTML from '../../teleprompter.html'`). When serving a shared URL (`/s/:id`), perform a string replacement on the `data-script-id=""` attribute to inject the script ID before sending the HTML. This is a simple string replacement on a known attribute pattern — it does not involve parsing or executing any user content.

The upload handler: parse JSON body → run through `UploadSchema.safeParse()` → return 400 with error message if invalid → call `generateId()` → call `env.SCRIPTS.put(id, content)` → return `{ id, url }`.

The script handler: call `env.SCRIPTS.get(id)` → return 404 if null → return plain text content.

Add security headers to every HTML response:
- `Content-Security-Policy` — disallow eval, restrict script/connect sources to self
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`

### Step 4: Run — verify they pass

```bash
cd worker && npm test
```

### Step 5: Commit

```bash
git add worker/src/index.ts worker/tests/worker.test.ts
git commit -m "feat: worker upload, script serve, and HTML serve endpoints"
```

---

## Task 8: teleprompter.html — full implementation

**Files:**
- Create: `teleprompter.html`

This is the complete presentation layer. Write it in one pass — CSS, HTML structure, then the script block.

### Step 1: CSS — all four themes as CSS custom properties

Define `--bg`, `--text`, `--text-dim`, `--slide-bg`, `--progress-bg`, `--hint-bg`, `--hint-border`, `--divider`, `--pip-bg`, `--pip-border`, `--scroll-indicator-bg`, `--timer-bg`, `--settings-bg`, `--settings-border` for each theme:

- `[data-theme="night"]` — dark near-black (`#0c0c0e` bg, `#d8d8dc` text)
- `[data-theme="navy"]` — dark navy (`#0a0f1e` bg, `#d0d8f0` text)
- `[data-theme="day"]` — off-white (`#f8f7f4` bg, `#1a1a1a` text)
- `[data-theme="auto"]` — maps to night/day via `@media (prefers-color-scheme)`

Define `--accent`, `--click`, `--highlight`, `--highlight-border`, `--slide-border`, `--scroll-active`, `--slow-color` for each accent:

- `[data-accent="gold"]` — `#c9a84c`
- `[data-accent="teal"]` — `#3dbfa8`

Apply `data-theme="night"` and `data-accent="gold"` on `<html>` as the defaults.

### Step 2: HTML structure

Two top-level sections:

**`#drop-zone`** (visible by default): wordmark, a `<label>` wrapping a dashed drop target and a hidden `<input type="file">`, and a demo link.

**`#teleprompter`** (hidden until script loads, `display: none`): progress bar, scroll glow bar, timer, slide pip nav (`#slideNav`, populated dynamically), settings gear button, settings panel (theme + accent radio groups, load-new-script button), scroll indicator, and the main container with a hint banner and an empty `#scriptContent` div.

The `<body>` must have `data-script-id=""` — the Worker replaces this attribute value for shared URLs.

### Step 3: Script block — four sections

**A. Parser** — copy `parseScript` and `processInline` from `src/parser.js` verbatim. Do not summarise.

**B. Renderer** — `renderScript(slides)` builds DOM nodes from parser output and appends them to `#scriptContent`. Use `document.createDocumentFragment()` for performance. For each slide: create the section div, the slide-header (using `textContent` — never parsed as markup), and each block. For `line` blocks: create a `div.line`, pass `block.html` through `DOMPurify.sanitize()` with an allowlist of `['span', 'em', 'strong']` and `['class']`, then assign the sanitised result. After building the fragment, replace `#scriptContent` content atomically and populate `#slideNav` with pip dots.

**C. Script loading** — wire up:
- File drag-and-drop on `#dropTarget` (dragover, dragleave, drop)
- `<input type="file">` change event
- `FileReader.readAsText()` → parse → render → show teleprompter screen
- Demo link: `fetch('./scripts/jfk-inaugural.md')` → same pipeline
- Load-new-script button: hide teleprompter, show drop zone, clear content
- On page load: check `document.body.dataset.scriptId`; if set, `fetch('/script/${id}')` and load

**D. Teleprompter interactions** — copy the JS from `psd3-teleprompter.html` (the IIFE at lines 605–930). Wrap it as `function initTeleprompter()` called after `renderScript`. Remove the hardcoded pip construction (now done by the renderer). Verify element IDs match.

**E. Settings panel** — on load, read `localStorage.getItem('gp-theme')` (default `'night'`) and `localStorage.getItem('gp-accent')` (default `'gold'`), set `document.documentElement.dataset.theme/accent`, and check the matching radio inputs. On radio change, update the data attribute and save to `localStorage`. Toggle the panel on gear-button click; close on outside click or Escape.

### Step 4: Add DOMPurify script tag for development

Above the main script block, add:

```html
<!-- Build step replaces this with an inline version for dist/ -->
<script src="node_modules/dompurify/dist/purify.min.js"></script>
```

### Step 5: Manual smoke test

```bash
npx serve .
```

Open `http://localhost:3000`. Verify:
- Drop zone renders
- Drag `scripts/jfk-inaugural.md` (create a minimal version for now) → script loads
- Timer, j/k, auto-scroll all work
- Settings panel opens, theme switches apply immediately
- Preferences survive page reload

### Step 6: Commit

```bash
git add teleprompter.html
git commit -m "feat: complete teleprompter.html — drop zone, renderer, settings, interactions"
```

---

## Task 9: Build script

**Files:**
- Create: `scripts/build.js`

The build script produces `dist/teleprompter.html` — inlines `src/parser.js` and DOMPurify for self-contained offline use.

### Step 1: Create `scripts/build.js`

```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const html = readFileSync(resolve(root, 'teleprompter.html'), 'utf8');
const purify = readFileSync(
  resolve(root, 'node_modules/dompurify/dist/purify.min.js'),
  'utf8'
);

// Remove the development DOMPurify script tag and inline both libraries
const DEVTAG = /<!-- Build step.*?-->\s*<script src="node_modules\/dompurify.*?"><\/script>/s;
const inlined = html.replace(
  DEVTAG,
  `<script>${purify}</script>`
);

mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/teleprompter.html'), inlined, 'utf8');
console.log('Built: dist/teleprompter.html');
```

### Step 2: Run and verify

```bash
npm run build && open dist/teleprompter.html
```

Expected: opens in browser without a local server; drop zone renders; demo script loads.

### Step 3: Commit

```bash
git add scripts/build.js
git commit -m "chore: build script for self-contained dist/teleprompter.html"
```

---

## Task 10: Demo speech — JFK Inaugural Address

**Files:**
- Create: `scripts/jfk-inaugural.md`

Write the file with generous annotations. The speech is public domain. Cover at minimum: the opening, "let the word go forth", "ask not", and the closing. Use all supported tag types so the file demonstrates the full format.

```markdown
## Opening — Inaugural Address

[CLICK]

We observe today not a victory of party [BREATHE] but a celebration of freedom [BREATHE]
symbolising an end as well as a beginning [BREATHE] signifying renewal as well as change.

[PAUSE — let the opening land]

For I have sworn before you and Almighty God the same solemn oath our forebears prescribed
nearly a century and three-quarters ago.

[PAUSE]

The world is very different now. [BREATHE] For man holds in his mortal hands the power
to abolish all forms of human poverty [BREATHE] and all forms of human life.

---

## The New Generation

[CLICK]

Let the word go forth [BREATHE] from this time and place [BREATHE] to friend and foe alike
[BREATHE] that the torch has been passed to a new generation of Americans —

[PAUSE — 3 seconds]

Born in this century [BREATHE] tempered by war [BREATHE] disciplined by a hard and bitter peace.

[PAUSE]

---

## Ask Not

[CLICK]

And so, my fellow Americans: [PAUSE]

**Ask not what your country can do for you** [BREATHE]
ask what you can do for your country.

[PAUSE — longest pause in the speech. 5–6 seconds. Look up.]

My fellow citizens of the world: [BREATHE]
ask not what America will do for you [BREATHE]
but what together we can do for the freedom of man.

[PAUSE — 3 seconds before the close]
```

### Step 2: Commit

```bash
git add scripts/jfk-inaugural.md
git commit -m "docs: JFK inaugural address demo script with full teleprompter annotations"
```

---

## Task 11: Authoring guide

**Files:**
- Create: `docs/script-format.md`

Write the guide so a non-technical speaker can follow it without prior knowledge. Sections:

1. **Overview** — what the file is, how to create one
2. **Slide boundaries** — `##` headings
3. **Spoken lines** — plain paragraphs
4. **Inline directions** — `[BREATHE]`, `[PAUSE]`, `[SLOW]`, `[LOOK UP]`, `[SMILE]`; what they look like on screen
5. **Slow emphasis** — `**text**`, when to use it
6. **Block-level cues** — `[CLICK]`, `[PAUSE — note]`, `[NOTE — text]`; difference from inline
7. **Slide dividers** — `---`
8. **Quick-reference cheat sheet** — one-page summary of all syntax
9. **Annotated example** — short excerpt with every element labelled

### Step 2: Commit

```bash
git add docs/script-format.md
git commit -m "docs: script format authoring guide"
```

---

## Task 12: CI/CD — GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`

### Step 1: Create `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install root dependencies
        run: npm ci

      - name: Install worker dependencies
        run: npm ci
        working-directory: worker

      - name: Typecheck worker
        run: npm run typecheck
        working-directory: worker

      - name: Parser tests
        run: npm test

      - name: Worker tests
        run: npm test
        working-directory: worker
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Step 2: Create `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install root dependencies
        run: npm ci

      - name: Install worker dependencies
        run: npm ci
        working-directory: worker

      - name: Build dist
        run: npm run build

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: worker
```

Add `CLOUDFLARE_API_TOKEN` to GitHub → Settings → Secrets and variables → Actions.

### Step 3: Commit

```bash
git add .github/
git commit -m "ci: GitHub Actions CI and deploy workflows"
```

---

## Task 13: README

**Files:**
- Create: `README.md`

Lead with the animated GIF placeholder, then: what it does (two sentences), hosted URL, quickstart for the hosted service, script format summary, keyboard shortcuts table, local dev instructions, deploy-your-own instructions, licence.

### Step 2: Commit

```bash
git add README.md
git commit -m "docs: README with quickstart, keyboard reference, and deploy guide"
```

---

## Task 14: Record animated GIF (manual)

After Tasks 8–11 are complete and the UI works:

1. `npm run build && npx serve dist`
2. Screen-record at ~1280×800 (QuickTime on macOS, then convert with LICEcap or `ffmpeg`)
3. Show: drop zone → drag script file → script loads → `↓` starts scroll → open settings → switch theme
4. Keep to ~15–20 seconds, looping
5. Save to `docs/demo.gif`
6. Commit: `git add docs/demo.gif && git commit -m "docs: demo GIF for README"`

---

## Execution handoff

Plan saved to `docs/plans/2026-02-18-glasspane-implementation.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** — dispatch a fresh subagent per task, review between tasks, fast iteration. Uses `superpowers:subagent-driven-development`.

**2. Parallel Session (separate)** — open a new Claude Code session in the `glasspane/` directory, load `superpowers:executing-plans`, and work through tasks with checkpoints.

Which approach?
