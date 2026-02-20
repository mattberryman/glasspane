import {
	settingsOpen,
	theme,
	accent,
	scriptLoaded,
	scrollActive,
	scrollLevel,
	timerRunning,
	timerElapsed,
	slides,
	activeIndex,
} from "../state.js";
import type { Theme, Accent } from "../types.js";

export function Settings() {
	function onGearClick(e: MouseEvent) {
		e.stopPropagation();
		settingsOpen.value = !settingsOpen.value;
	}

	function onLoadNew() {
		if (scrollActive.value) scrollActive.value = false;
		timerRunning.value = false;
		timerElapsed.value = 0;
		activeIndex.value = -1;
		scrollLevel.value = 3;
		slides.value = [];
		settingsOpen.value = false;
		scriptLoaded.value = false;
		// Reset progress bar via signal — ProgressBar reads progress computed
		window.scrollTo(0, 0);
	}

	const themes: { value: Theme; label: string }[] = [
		{ value: "night", label: "Night" },
		{ value: "navy", label: "Navy" },
		{ value: "day", label: "Day" },
		{ value: "auto", label: "Auto" },
	];

	const accents: { value: Accent; label: string }[] = [
		{ value: "gold", label: "Gold" },
		{ value: "teal", label: "Teal" },
	];

	return (
		<>
			<button
				class="settings-btn"
				id="settingsBtn"
				title="Settings"
				aria-label="Settings"
				onClick={onGearClick}
				type="button"
			>
				&#9881;
			</button>
			<div
				class={`settings-panel${settingsOpen.value ? " visible" : ""}`}
				id="settingsPanel"
			>
				<div class="settings-group">
					<div class="settings-group-label">Theme</div>
					{themes.map(({ value, label }) => (
						<label key={value}>
							<input
								type="radio"
								name="theme"
								value={value}
								checked={theme.value === value}
								onChange={() => {
									theme.value = value;
								}}
							/>{" "}
							{label}
						</label>
					))}
				</div>
				<div class="settings-group">
					<div class="settings-group-label">Accent</div>
					{accents.map(({ value, label }) => (
						<label key={value}>
							<input
								type="radio"
								name="accent"
								value={value}
								checked={accent.value === value}
								onChange={() => {
									accent.value = value;
								}}
							/>{" "}
							{label}
						</label>
					))}
				</div>
				<button id="loadNewBtn" onClick={onLoadNew} type="button">
					Load new script
				</button>
			</div>
		</>
	);
}
