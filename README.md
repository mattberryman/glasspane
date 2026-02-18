# Glasspane

![Demo](docs/demo.gif)

A browser teleprompter. Write a `.md` script, drop it onto the app, and read it during a live presentation. Auto-scroll, slide navigation, session timer, and stage direction cues are built in.

**Hosted version:** [glasspane.page](https://glasspane.page)

## Quickstart (hosted)

1. Open [glasspane.page](https://glasspane.page).
2. Paste or upload your Markdown script.
3. Share the link with any device on your speaker setup.

No account required. Scripts expire after 24 hours.

## Script format

Scripts are plain Markdown files. Use `##` headings for slide boundaries, `**bold**` for slow emphasis, and `[TAGS]` for stage directions.

```markdown
## Opening — Inaugural Address

Vice President Johnson, Mr. Speaker, Mr. Chief Justice, fellow citizens: [BREATHE]

**We dare not forget today that we are the heirs of that first revolution.** [BREATHE]

[PAUSE — let this declaration resonate]

[CLICK]

## Pledges to the World

To those old allies whose cultural and spiritual origins we share, [BREATHE]
we pledge the loyalty of faithful friends.
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

Source files live in `src/` — assembled by the build step into the self-contained `dist/teleprompter.html`.

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
