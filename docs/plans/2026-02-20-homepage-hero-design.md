# Homepage Hero Section — Design

Date: 2026-02-20

## Problem

The current drop zone screen shows only a wordmark, a drag-drop target, a "Try the demo" link, and a guide link. A professional landing on the page for the first time has no immediate signal of what Glasspane is, why it is different, or why they should trust it with their script.

## Audience

Professionals: speakers, broadcasters, journalists, presenters. They know what a teleprompter is. They do not need an explanation of the concept — they need credibility signals.

## Key messages (in priority order)

1. **Privacy** — the script is read locally; nothing is sent to a server unless the user explicitly shares it.
2. **Zero friction** — no account, no install, drag a file and start reading.
3. **Professional feature set** — keyboard-driven navigation, slide-aware layout, optional sharing.

## Layout

A hero section sits above the existing drop zone inside `DropZone.tsx`. The drop zone itself becomes the call-to-action. No new pages or routes are required.

```
Glasspane                           ← existing wordmark

Read to the room.                   ← headline (h1)
A browser teleprompter built for    ← sub-headline (p)
professionals. No account. No
cloud sync. No distractions.

● Script stays local               ← three feature callouts (ul)
● Keyboard-driven
● Optional sharing

┌──────────────────────────────┐
│  Drop zone (existing)        │   ← unchanged CTA
└──────────────────────────────┘
```

## Copy

**Headline:** Read to the room.

**Sub-headline:** A browser teleprompter built for professionals. No account. No cloud sync. No distractions.

**Feature callouts:**
- Script stays local — your file is read in-browser; nothing is uploaded unless you choose to share it.
- Keyboard-driven — j/k to advance line by line; arrows to control scroll speed.
- Optional sharing — generate a link; your co-presenter opens it and the script loads automatically.

## Implementation

### `src/components/DropZone.tsx`

Add a `<header>` block before the drop target containing:
- `<h1>Read to the room.</h1>`
- `<p>` for the sub-headline
- `<ul>` with three `<li>` feature callouts

### `src/app.css`

Add styles for `.hero-header`, `.hero-headline`, `.hero-sub`, `.hero-features`. Constraints:
- Inherit the existing CSS custom properties (`--fg`, `--bg`, `--accent`, etc.)
- `max-width` matches the existing drop zone card
- Feature bullets use the accent colour for the marker
- No icons — text only, matching the app's spare aesthetic
- Responsive: stacks naturally on narrow viewports (no breakpoint hacks needed)

## Out of scope

- No new routes
- No changes to the teleprompter view
- No changes to the guide page
- No animation or scroll effects
