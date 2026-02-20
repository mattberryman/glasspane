import { describe, expect, it } from "vitest";
import { parseScript } from "../src/parser.ts";

// ---------------------------------------------------------------------------
// Slide boundaries
// ---------------------------------------------------------------------------
describe("slide boundaries", () => {
	it("creates one slide per ## heading", () => {
		const input = `## Slide One\n\nHello.\n\n## Slide Two\n\nWorld.`;
		const slides = parseScript(input);
		expect(slides).toHaveLength(2);
		expect(slides[0].title).toBe("Slide One");
		expect(slides[1].title).toBe("Slide Two");
	});

	it("places content with no ## heading in a single implicit slide", () => {
		const input = `Hello world.`;
		const slides = parseScript(input);
		expect(slides).toHaveLength(1);
		expect(slides[0].blocks).toHaveLength(1);
	});

	it("ignores --- dividers", () => {
		const input = `## Slide One\n\nHello.\n\n---\n\n## Slide Two\n\nWorld.`;
		const slides = parseScript(input);
		expect(slides).toHaveLength(2);
	});

	it("ignores empty lines", () => {
		const input = `## Slide One\n\n\n\nHello.\n\n\n`;
		const slides = parseScript(input);
		expect(slides[0].blocks).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Block-level cues
// ---------------------------------------------------------------------------
describe("block-level cues", () => {
	it("[CLICK] alone becomes a click block", () => {
		const input = `## S\n\n[CLICK]\n\nHello.`;
		const blocks = parseScript(input)[0].blocks;
		expect(blocks[0]).toEqual({ type: "click" });
	});

	it("[PAUSE] alone becomes a pause block", () => {
		const input = `## S\n\n[PAUSE]`;
		const blocks = parseScript(input)[0].blocks;
		expect(blocks[0]).toMatchObject({ type: "pause" });
	});

	it("[PAUSE — note text] preserves the note", () => {
		const input = `## S\n\n[PAUSE — let this land. 4 seconds.]`;
		const blocks = parseScript(input)[0].blocks;
		expect(blocks[0]).toMatchObject({
			type: "pause",
			note: "— let this land. 4 seconds.",
		});
	});

	it("[NOTE — text] becomes a note block", () => {
		const input = `## S\n\n[NOTE — refer to slide]`;
		const blocks = parseScript(input)[0].blocks;
		expect(blocks[0]).toMatchObject({ type: "note", text: "— refer to slide" });
	});

	it("[LOOK UP] alone treated as a cue block, not a spoken line", () => {
		const input = `## S\n\n[LOOK UP]`;
		const blocks = parseScript(input)[0].blocks;
		expect(blocks[0].type).not.toBe("line");
	});
});

// ---------------------------------------------------------------------------
// Spoken lines
// ---------------------------------------------------------------------------
describe("spoken lines", () => {
	it("plain text becomes a line block", () => {
		const input = `## S\n\nWe shall fight on the beaches.`;
		const blocks = parseScript(input)[0].blocks;
		expect(blocks[0].type).toBe("line");
		expect(blocks[0].html).toContain("We shall fight on the beaches.");
	});

	it("inline [BREATHE] renders as a direction span", () => {
		const input = `## S\n\nWe shall fight [BREATHE] on the beaches.`;
		const blocks = parseScript(input)[0].blocks;
		expect(blocks[0].html).toContain('<span class="d">[BREATHE]</span>');
	});

	it("inline [PAUSE] renders as a direction span", () => {
		const input = `## S\n\nEnd of point. [PAUSE]`;
		const blocks = parseScript(input)[0].blocks;
		expect(blocks[0].html).toContain('<span class="d">[PAUSE]</span>');
	});

	it("**text** renders as a slow-emphasis span", () => {
		const input = `## S\n\n**We shall never surrender.**`;
		const blocks = parseScript(input)[0].blocks;
		expect(blocks[0].html).toContain(
			'<span class="slow">We shall never surrender.</span>',
		);
	});

	it("combination of direction and emphasis in one line", () => {
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
describe("HTML injection prevention", () => {
	it("escapes < and > in spoken text", () => {
		const input = `## S\n\n<b>bold attempt</b>`;
		const blocks = parseScript(input)[0].blocks;
		expect(blocks[0].html).not.toContain("<b>");
		expect(blocks[0].html).toContain("&lt;b&gt;");
	});

	it("escapes & in spoken text", () => {
		const input = `## S\n\nQ&A session`;
		const blocks = parseScript(input)[0].blocks;
		expect(blocks[0].html).toContain("Q&amp;A");
	});

	it("does not treat [lowercase] as a direction", () => {
		const input = `## S\n\nSee [footnote 1] for details.`;
		const blocks = parseScript(input)[0].blocks;
		expect(blocks[0].html).not.toContain('<span class="d">');
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe("edge cases", () => {
	it("empty string returns one empty slide", () => {
		const slides = parseScript("");
		expect(slides).toHaveLength(1);
		expect(slides[0].blocks).toHaveLength(0);
	});

	it("whitespace-only string returns one empty slide", () => {
		const slides = parseScript("   \n   \n   ");
		expect(slides).toHaveLength(1);
		expect(slides[0].blocks).toHaveLength(0);
	});

	it("[unclosed bracket treated as plain text", () => {
		const input = `## S\n\nSee [unclosed for details.`;
		const blocks = parseScript(input)[0].blocks;
		expect(blocks[0].type).toBe("line");
		expect(blocks[0].html).not.toContain('<span class="d">');
	});

	it("[] empty brackets treated as plain text", () => {
		const input = `## S\n\nSomething [] happened.`;
		const blocks = parseScript(input)[0].blocks;
		expect(blocks[0].type).toBe("line");
	});

	it("unknown [ALL CAPS TAG] treated as inline direction", () => {
		const input = `## S\n\nSomething. [SMILE]`;
		const blocks = parseScript(input)[0].blocks;
		expect(blocks[0].html).toContain('<span class="d">[SMILE]</span>');
	});
});
