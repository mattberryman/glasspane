import { useEffect } from "preact/hooks";
import {
	activeIndex,
	scrollActive,
	scrollLevel,
	settingsOpen,
	totalLines,
} from "../state.js";

export function useKeyboard() {
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				e.preventDefault();
				if (scrollActive.value) {
					scrollActive.value = false;
				}
				if (settingsOpen.value) {
					settingsOpen.value = false;
				}
				return;
			}

			if (e.key === "ArrowDown") {
				e.preventDefault();
				if (scrollActive.value) {
					const next = scrollLevel.value + 1;
					if (next <= 7) {
						scrollLevel.value = next;
					}
				} else {
					scrollActive.value = true;
				}
				return;
			}

			if (e.key === "ArrowUp") {
				e.preventDefault();
				if (scrollActive.value) {
					const prev = scrollLevel.value - 1;
					if (prev >= 1) {
						scrollLevel.value = prev;
					}
				}
				return;
			}

			if (e.key === "j") {
				e.preventDefault();
				const next = Math.min(activeIndex.value + 1, totalLines.value - 1);
				activeIndex.value = next;
				if (!scrollActive.value) {
					const lines = document.querySelectorAll(".line");
					lines[next]?.scrollIntoView({
						behavior: "smooth",
						block: "center",
					});
				}
				return;
			}

			if (e.key === "k") {
				e.preventDefault();
				const prev = Math.max(activeIndex.value - 1, 0);
				activeIndex.value = prev;
				if (!scrollActive.value) {
					const lines = document.querySelectorAll(".line");
					lines[prev]?.scrollIntoView({
						behavior: "smooth",
						block: "center",
					});
				}
				return;
			}
		}

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, []);
}
