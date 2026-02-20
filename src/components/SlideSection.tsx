import type { Slide } from "../types.js";
import { Block } from "./Block.js";

interface Props {
	slide: Slide;
	index: number;
	lineOffset: number;
}

export function SlideSection({ slide, index, lineOffset }: Props) {
	const offset = lineOffset;

	let lineCount = 0;
	return (
		<>
			{index > 0 && <hr class="slide-divider" />}
			<div class="slide-section" id={`slide-${index}`}>
				{slide.title && <div class="slide-header">{slide.title}</div>}
				{slide.blocks.map((block, i) => {
					const lineIndex =
						block.type === "line" ? offset + lineCount++ : undefined;
					return <Block key={i} block={block} lineIndex={lineIndex} />;
				})}
			</div>
		</>
	);
}
