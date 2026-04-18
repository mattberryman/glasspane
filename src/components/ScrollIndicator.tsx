import { SPEED_LEVELS } from "../constants.js";
import { scrollActive, scrollLevel } from "../state.js";

export function ScrollIndicator() {
	const level = scrollLevel.value;
	const levelName = (SPEED_LEVELS[level - 1] ?? SPEED_LEVELS[2]).name;
	return (
		<div
			class={`scroll-indicator${scrollActive.value ? " visible" : ""}`}
			id="scrollIndicator"
			role="status"
			aria-live="polite"
			aria-label={`Auto-scroll ${levelName}`}
		>
			<span class="scroll-label">Auto &#9654;</span>
			<span class="scroll-dots" id="scrollDots">
				{SPEED_LEVELS.map((_, i) => (
					<span key={i} class={`dot${i < level ? " filled" : ""}`} />
				))}
			</span>
			<span class="scroll-speed-name" id="scrollSpeedName">
				{levelName}
			</span>
			<span class="scroll-hint">
				&#8593;&#8595; speed &middot; click to stop
			</span>
		</div>
	);
}
