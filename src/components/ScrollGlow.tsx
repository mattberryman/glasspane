import { scrollActive } from "../state.js";

export function ScrollGlow() {
	return (
		<div
			class={`scroll-border-glow${scrollActive.value ? " visible" : ""}`}
			id="scrollGlow"
		/>
	);
}
