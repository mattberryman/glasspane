import type { Block, Slide } from "./types.js";

const BLOCK_CUE_RE = /^\[([A-Z][A-Z ]*(?:[\u2014\-.,!?\s].*)?)\]$/;

export function parseScript(text: string): Slide[] {
	const lines = text.split("\n");
	const slides: Slide[] = [];
	let current: Slide = { title: "", blocks: [] };

	for (const raw of lines) {
		const line = raw.trim();

		if (!line || line === "---") {
			continue;
		}

		// Slide boundary
		if (line.startsWith("## ")) {
			if (current.blocks.length > 0 || current.title) {
				slides.push(current);
			}
			current = { title: line.slice(3).trim(), blocks: [] };
			continue;
		}

		// Block-level cue: line is *only* [TAG optional note]
		const blockMatch = line.match(BLOCK_CUE_RE);
		if (blockMatch) {
			const tag = blockMatch[1].trim();
			let block: Block;
			if (tag === "CLICK") {
				block = { type: "click" };
			} else if (tag.startsWith("NOTE")) {
				block = { type: "note", text: tag.slice(4).trim() };
			} else {
				// PAUSE, LOOK UP, SMILE, and any other all-caps cue — preserve original text
				block = { type: "pause", cue: tag };
			}
			current.blocks.push(block);
			continue;
		}

		// Spoken line — process inline markup
		current.blocks.push({ type: "line", html: processInline(line) });
	}

	slides.push(current);
	return slides;
}

/**
 * processInline — converts a plain text line to safe HTML.
 * Escapes HTML entities first, then applies markup.
 * The result must still pass through DOMPurify before DOM insertion.
 */
function processInline(text: string): string {
	// 1. Escape HTML entities to prevent injection
	let html = text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");

	// 2. **bold** → slow emphasis span
	html = html.replace(/\*\*(.+?)\*\*/g, '<span class="slow">$1</span>');

	// 3. [ALL CAPS] inline direction — only matches all-caps content
	html = html.replace(
		/\[([A-Z][A-Z ]*(?:[\u2014\-.,!?\s].*)?)\]/g,
		'<span class="d">[$1]</span>',
	);

	return html;
}
