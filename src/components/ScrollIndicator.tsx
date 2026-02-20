import { scrollActive, scrollLevel } from "../state.js";

const SPEED_LEVELS = [
	{ px: 12, name: "1" },
	{ px: 18, name: "2" },
	{ px: 27, name: "3" },
	{ px: 40, name: "4" },
	{ px: 60, name: "5" },
	{ px: 90, name: "6" },
	{ px: 135, name: "7" },
] as const;

export { SPEED_LEVELS };

export function ScrollIndicator() {
	const level = scrollLevel.value;
	return (
		<div
			class={`scroll-indicator${scrollActive.value ? " visible" : ""}`}
			id="scrollIndicator"
		>
			<span class="scroll-label">Auto &#9654;</span>
			<span class="scroll-dots" id="scrollDots">
				{SPEED_LEVELS.map((_, i) => (
					<span key={i} class={`dot${i < level ? " filled" : ""}`} />
				))}
			</span>
			<span class="scroll-speed-name" id="scrollSpeedName">
				{(SPEED_LEVELS[level - 1] ?? SPEED_LEVELS[2]).name}
			</span>
			<span class="scroll-hint">&#8593;&#8595; speed &middot; click to stop</span>
		</div>
	);
}
