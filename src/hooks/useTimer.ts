import { effect } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { timerRunning, timerElapsed } from "../state.js";

export function useTimer() {
	useEffect(() => {
		let intervalId: ReturnType<typeof setInterval> | null = null;
		let startTime = 0;

		const dispose = effect(() => {
			if (timerRunning.value) {
				const baseElapsed = timerElapsed.peek();
				startTime = Date.now() - baseElapsed;
				intervalId = setInterval(() => {
					timerElapsed.value = Date.now() - startTime;
				}, 250);
			} else {
				if (intervalId !== null) {
					clearInterval(intervalId);
					intervalId = null;
				}
			}
		});

		return () => {
			dispose();
			if (intervalId !== null) clearInterval(intervalId);
		};
	}, []);
}
