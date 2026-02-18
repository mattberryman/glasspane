# Script Format

Glasspane reads plain text files written in Markdown (`.md`). You do not need any special software to create one -- any text editor will do. Write what you want to say, add a few annotations to guide your delivery, and drop the file into Glasspane.

This document explains every feature of the format. If you just want the short version, skip to the [Cheat Sheet](#cheat-sheet) at the end.

---

## Slide boundaries

Start each new slide with a `##` heading. The heading text appears on screen as a section title.

```markdown
## Opening — Inaugural Address

Vice President Johnson, Mr. Speaker, Mr. Chief Justice, fellow citizens:

## Pledges to the World

To those old allies whose cultural and spiritual origins we share,
we pledge the loyalty of faithful friends.
```

Everything after a `##` heading belongs to that slide until the next `##` heading appears.

If your script has no `##` headings, Glasspane treats the entire file as one slide.

---

## Spoken lines

Every plain paragraph becomes a line on the teleprompter. Write one thought per paragraph. Glasspane highlights each line as you move through the script, so shorter paragraphs are easier to follow at a glance.

```markdown
We observe today not a victory of party but a celebration of freedom.

For I have sworn before you and Almighty God the same solemn oath
our forebears prescribed nearly a century and three-quarters ago.

The world is very different now.
```

Blank lines between paragraphs are ignored -- use them freely to keep your file readable.

---

## Inline directions

Place a tag in square brackets anywhere inside a spoken line to give yourself a stage direction. The tag appears on screen in a small accent-coloured label beside your words. The audience never sees it -- it is only on your teleprompter.

```markdown
Vice President Johnson, Mr. Speaker, Mr. Chief Justice, fellow citizens: [BREATHE]
```

On screen, the sentence reads normally and `[BREATHE]` appears as a small coloured cue next to the text.

### Common tags

| Tag | Purpose |
|-----|---------|
| `[BREATHE]` | Take a breath before continuing |
| `[PAUSE]` | Brief pause for effect |
| `[SLOW]` | Slow your pace for the next phrase |
| `[LOOK UP]` | Make eye contact with the audience |
| `[SMILE]` | Smile -- it changes your vocal tone |

### Making up your own

Tags are not limited to the list above. Any text in square brackets that is written in ALL CAPS is treated as a direction. Use whatever works for you:

```markdown
We exceeded every target. [FIST PUMP]

And we did it together. [GESTURE TO AUDIENCE]
```

Tags are case-insensitive, but the convention is ALL CAPS so they stand out in your script file.

---

## Slow emphasis

Wrap a word or phrase in double asterisks to mark it for slow, deliberate delivery. On the teleprompter, the text appears in a distinct colour (gold by default) so you know to slow down.

```markdown
Let us never negotiate out of fear. **But let us never fear to negotiate.**
```

On screen, "But let us never fear to negotiate." appears in gold while the rest of the sentence stays in the normal text colour.

Use slow emphasis sparingly. If everything is emphasised, nothing is.

---

## Block-level cues

A block-level cue sits on its own line -- it is not part of a spoken sentence. It tells you to do something between lines of speech.

There are three kinds:

### Click cue

```markdown
[CLICK]
```

Signals that you should advance your presentation slide (click the clicker, press the arrow key, etc.). On the teleprompter it appears as a small highlighted pill.

### Pause block

```markdown
[PAUSE — let the formalities settle. Survey the crowd.]
```

A pause with an optional note to yourself. The note appears in small italic text on screen. The double dash (`--`) separates the tag from the note.

Without a note, a standalone `[PAUSE]` on its own line works the same way:

```markdown
[PAUSE]
```

### Presenter note

```markdown
[NOTE — 20 January 1961. Washington, D.C. Speak slowly — your breath will be visible in the cold air.]
```

A note visible only to you on the teleprompter. Use it for reminders that are not part of your speech.

### How block-level cues differ from inline directions

The difference is placement. If the tag is the only thing on the line, it becomes a block-level cue -- a standalone element between spoken lines. If the tag sits inside a sentence alongside other words, it becomes an inline direction attached to that line.

```markdown
Let us never negotiate out of fear. [PAUSE]    <-- inline: pause cue sits beside the sentence

[PAUSE — let the opening land]                 <-- block: pause stands alone between lines

[CLICK]                                        <-- block: advance your slide

fellow citizens: [BREATHE]                     <-- inline: breathe cue sits beside the sentence
```

---

## Slide dividers

Glasspane automatically inserts a visual divider between slides. You do not need to add anything yourself -- the `##` headings handle it.

If you want an extra visual break within a slide (for example, to separate two major beats), you can insert a horizontal rule:

```markdown
---
```

This adds a thin line across the teleprompter at that point.

---

## Cheat sheet

A one-page summary of everything above.

### Structure

| Syntax | Effect |
|--------|--------|
| `## Heading text` | Starts a new slide section |
| Plain paragraph | A spoken line on the teleprompter |
| Blank line | Ignored (use freely for readability) |
| `---` | Horizontal divider within a slide |

### Inline directions (inside a spoken line)

| Syntax | Effect |
|--------|--------|
| `[BREATHE]` | Breath cue |
| `[PAUSE]` | Brief pause |
| `[SLOW]` | Slow your pace |
| `[LOOK UP]` | Make eye contact |
| `[SMILE]` | Smile |
| `[ANY CAPS]` | Custom direction (any all-caps text works) |

### Slow emphasis (inside a spoken line)

| Syntax | Effect |
|--------|--------|
| `**words**` | Gold text -- speak slowly and deliberately |

### Block-level cues (alone on a line)

| Syntax | Effect |
|--------|--------|
| `[CLICK]` | Advance your presentation slide |
| `[PAUSE]` | Standalone pause |
| `[PAUSE -- note]` | Pause with a reminder to yourself |
| `[NOTE -- text]` | Presenter note (not spoken) |

---

## Annotated example

Below is a short script that uses every feature. Each line has a comment explaining what it does.

````markdown
## Opening — Inaugural Address                  <!-- slide boundary: starts slide 1 -->

[NOTE — 20 January 1961. Speak slowly.]         <!-- block-level presenter note -->

[CLICK]                                         <!-- block-level click cue -->

Vice President Johnson, Mr. Speaker,            <!-- spoken line -->
Mr. Chief Justice, fellow citizens: [BREATHE]   <!-- inline direction -->

[PAUSE — let the formalities settle.]           <!-- block-level pause with note -->

We observe today not a victory of party         <!-- spoken line -->
but a celebration of freedom.

**We dare not forget today that we are          <!-- spoken line with slow emphasis -->
the heirs of that first revolution.** [BREATHE]

---                                             <!-- visual divider within the slide -->

## A Call to Negotiate                          <!-- slide boundary: starts slide 2 -->

[CLICK]                                         <!-- block-level click cue -->

Let us never negotiate out of fear. [BREATHE]   <!-- spoken line with inline direction -->

**But let us never fear to negotiate.**         <!-- spoken line with slow emphasis -->

[PAUSE — 4 seconds. One of the most quoted lines. Let it breathe fully.]
                                                <!-- block-level pause with note -->

**Ask not what your country can do for you** — <!-- spoken line with slow emphasis -->

ask what you can do for your country. [LOOK UP] <!-- inline direction -->
````

Copy this into a `.md` file, drop it into Glasspane, and you will see every element rendered on the teleprompter.
