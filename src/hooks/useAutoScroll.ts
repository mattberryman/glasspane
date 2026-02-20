import { effect } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { scrollActive, scrollLevel } from "../state.js";

const SPEED_LEVELS = [
	{ px: 12 },
	{ px: 18 },
	{ px: 27 },
	{ px: 40 },
	{ px: 60 },
	{ px: 90 },
	{ px: 135 },
] as const;

export function useAutoScroll() {
	useEffect(() => {
		let rafId: number | null = null;
		let lastFrameTime: number | null = null;
		let accumulator = 0;

		function scrollTick(timestamp: number) {
			if (!scrollActive.value) return;

			if (lastFrameTime === null) {
				lastFrameTime = timestamp;
				rafId = requestAnimationFrame(scrollTick);
				return;
			}

			const delta = (timestamp - lastFrameTime) / 1000;
			lastFrameTime = timestamp;
			const clampedDelta = Math.min(delta, 0.1);

			const maxScroll =
				document.documentElement.scrollHeight - window.innerHeight;
			if (window.scrollY >= maxScroll - 1) {
				scrollActive.value = false;
				return;
			}

			const speed = SPEED_LEVELS[scrollLevel.value - 1].px;
			accumulator += speed * clampedDelta;
			const pixels = Math.floor(accumulator);
			if (pixels > 0) {
				accumulator -= pixels;
				window.scrollBy(0, pixels);
			}

			rafId = requestAnimationFrame(scrollTick);
		}

		function startRAF() {
			lastFrameTime = null;
			accumulator = 0;
			document.documentElement.style.scrollBehavior = "auto";
			rafId = requestAnimationFrame(scrollTick);
		}

		function stopRAF() {
			document.documentElement.style.scrollBehavior = "smooth";
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
			lastFrameTime = null;
		}

		const dispose = effect(() => {
			if (scrollActive.value) {
				startRAF();
			} else {
				stopRAF();
			}
		});

		// Stop on wheel or blur
		function onWheel() {
			if (scrollActive.value) scrollActive.value = false;
		}
		function onBlur() {
			if (scrollActive.value) scrollActive.value = false;
		}
		window.addEventListener("wheel", onWheel, { passive: true });
		window.addEventListener("blur", onBlur);

		return () => {
			dispose();
			stopRAF();
			window.removeEventListener("wheel", onWheel);
			window.removeEventListener("blur", onBlur);
		};
	}, []);
}
