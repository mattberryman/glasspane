import DOMPurify from "dompurify";
import { activeIndex } from "../state.js";
import type { Block as BlockType } from "../types.js";

interface Props {
	block: BlockType;
	lineIndex?: number; // only set for "line" type blocks
}

export function Block({ block, lineIndex }: Props) {
	if (block.type === "click") {
		return <div class="d-click">CLICK</div>;
	}
	if (block.type === "pause") {
		return <div class="d-pause">[{block.cue}]</div>;
	}
	if (block.type === "note") {
		const text = `[NOTE${block.text ? ` ${block.text}` : ""}]`;
		return <div class="d-note">{text}</div>;
	}
	// line type — DOMPurify sanitises content before DOM insertion (defence-in-depth)
	const clean = DOMPurify.sanitize(block.html, {
		ALLOWED_TAGS: ["span"],
		ALLOWED_ATTR: ["class"],
	});

	function onClick() {
		if (lineIndex !== undefined) {
			activeIndex.value = lineIndex;
		}
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: keyboard navigation handled globally via useKeyboard (j/k keys)
		// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard navigation handled globally via useKeyboard (j/k keys)
		<div
			class={`line${activeIndex.value === lineIndex ? " active" : ""}`}
			onClick={onClick}
			dangerouslySetInnerHTML={{ __html: clean }}
		/>
	);
}
