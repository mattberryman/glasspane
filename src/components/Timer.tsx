import { batch } from "@preact/signals";
import { timerElapsed, timerRunning } from "../state.js";

export function Timer() {
	const elapsed = timerElapsed.value;
	const mins = Math.floor(elapsed / 60000);
	const secs = Math.floor((elapsed % 60000) / 1000);
	const display = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

	function onClick(e: MouseEvent) {
		e.stopPropagation();
		timerRunning.value = !timerRunning.value;
	}

	function onDblClick(e: MouseEvent) {
		e.stopPropagation();
		batch(() => {
			timerRunning.value = false;
			timerElapsed.value = 0;
		});
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: timer click/dblclick; keyboard users control scroll via arrow keys
		// biome-ignore lint/a11y/useKeyWithClickEvents: timer click/dblclick; keyboard users control scroll via arrow keys
		<div
			class={`timer${timerRunning.value ? " running" : ""}`}
			id="timer"
			title="Click to start/stop"
			onClick={onClick}
			onDblClick={onDblClick}
		>
			<span class="timer-label">Timer</span>
			<span id="timerDisplay">{display}</span>
		</div>
	);
}
