import { progress } from "../state.js";

export function ProgressBar() {
	return (
		<div class="progress-bar">
			<div
				class="progress-fill"
				id="progressFill"
				style={{ width: `${progress.value * 100}%` }}
			/>
		</div>
	);
}
