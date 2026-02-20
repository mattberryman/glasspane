import type { Slide } from "../types.js";
import { slides } from "../state.js";
import { Block } from "./Block.js";

interface Props {
	slide: Slide;
	index: number;
}

export function SlideSection({ slide, index }: Props) {
	// Count line blocks in all slides before this one to get offset
	const offset = slides.value
		.slice(0, index)
		.reduce(
			(acc, s) => acc + s.blocks.filter((b) => b.type === "line").length,
			0,
		);

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
