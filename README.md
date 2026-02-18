# Glasspane

![Demo](docs/demo.gif)

A browser teleprompter. Write a `.md` script, drop it onto the app, and read it during a live presentation. Auto-scroll, slide navigation, session timer, and stage direction cues are built in.

**Hosted version:** [glasspane.workers.dev](https://glasspane.workers.dev)

## Quickstart (hosted)

1. Open [glasspane.workers.dev](https://glasspane.workers.dev).
2. Paste or upload your Markdown script.
3. Share the link with any device on your speaker setup.

No account required. Scripts expire after 24 hours.

## Script format

Scripts are plain Markdown files. Use `##` headings for slide boundaries, `**bold**` for slow emphasis, and `[TAGS]` for stage directions.

```markdown
## Opening

Good morning, everyone. [SMILE]

**Thank you for being here.**

[PAUSE -- let the applause settle]

[CLICK]

## The Problem

Last year we lost forty per cent of our customers.
```

Full details in [docs/script-format.md](docs/script-format.md).

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Down` | Start auto-scroll |
| `Up` / `Down` | Adjust speed while scrolling |
| `Esc` | Stop auto-scroll |
| `j` | Next line |
| `k` | Previous line |
| Click | Stop auto-scroll / mark line |
| Timer click | Start / stop session timer |
| Timer double-click | Reset timer |

## Local development

```bash
npm install
npm run build
```

Open `dist/teleprompter.html` directly in a browser. Drag a `.md` file onto it. No server required.

Run tests:

```bash
npm test
```

## Deploy your own

1. Fork this repository.
2. Add a `CLOUDFLARE_API_TOKEN` secret in your fork's settings.
3. Push to `main`. The GitHub Action deploys to Cloudflare Workers automatically.

To customise the domain, edit `wrangler.toml` before pushing.

## Licence

[PolyForm Noncommercial 1.0.0](LICENSE)
