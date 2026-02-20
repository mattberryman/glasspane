import { useEffect } from "preact/hooks";
import { useAutoScroll } from "../hooks/useAutoScroll.js";
import { useKeyboard } from "../hooks/useKeyboard.js";
import { useTimer } from "../hooks/useTimer.js";
import { settingsOpen, slides } from "../state.js";
import { ProgressBar } from "./ProgressBar.js";
import { ScrollGlow } from "./ScrollGlow.js";
import { ScrollIndicator } from "./ScrollIndicator.js";
import { Settings } from "./Settings.js";
import { SlideNav } from "./SlideNav.js";
import { SlideSection } from "./SlideSection.js";
import { Timer } from "./Timer.js";

export function Teleprompter() {
	useKeyboard();
	useAutoScroll();
	useTimer();

	// Close settings on outside click
	useEffect(() => {
		function onDocClick(e: MouseEvent) {
			if (!settingsOpen.value) {
				return;
			}
			const panel = document.getElementById("settingsPanel");
			const btn = document.getElementById("settingsBtn");
			if (
				panel &&
				btn &&
				!panel.contains(e.target as Node) &&
				!btn.contains(e.target as Node)
			) {
				settingsOpen.value = false;
			}
		}
		document.addEventListener("click", onDocClick);
		return () => document.removeEventListener("click", onDocClick);
	}, []);

	const allSlides = slides.value;
	const offsets = allSlides.reduce<number[]>((acc, _slide, i) => {
		const prev =
			i === 0
				? 0
				: acc[i - 1] +
					allSlides[i - 1].blocks.filter((b) => b.type === "line").length;
		acc.push(prev);
		return acc;
	}, []);

	return (
		<div id="teleprompter">
			<ProgressBar />
			<ScrollGlow />
			<Timer />
			<SlideNav />
			<Settings />
			<ScrollIndicator />
			<div class="container" id="mainContainer">
				<div class="hint">
					<kbd>&#8595;</kbd> start auto-scroll &nbsp;&middot;&nbsp; click
					anywhere to stop &nbsp;&middot;&nbsp; <kbd>&#8593;</kbd>
					<kbd>&#8595;</kbd> adjust speed while scrolling
					<span class="hint-divider" />
					<kbd>j</kbd>
					<kbd>k</kbd> move highlight &nbsp;&middot;&nbsp; Click paragraph to
					mark place &nbsp;&middot;&nbsp; Click timer to start/stop
				</div>
				<div id="scriptContent">
					{allSlides.map((slide, i) => (
						<SlideSection
							key={i}
							slide={slide}
							index={i}
							lineOffset={offsets[i]}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
