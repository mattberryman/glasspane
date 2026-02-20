import { effect } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { theme, accent } from "../state.js";
import type { Theme, Accent } from "../types.js";

const VALID_THEMES: Theme[] = ["night", "navy", "day", "auto"];
const VALID_ACCENTS: Accent[] = ["gold", "teal"];

export function useSettings() {
	useEffect(() => {
		// Read persisted preferences
		const savedTheme = localStorage.getItem("gp-theme") as Theme | null;
		const savedAccent = localStorage.getItem("gp-accent") as Accent | null;
		if (savedTheme && VALID_THEMES.includes(savedTheme)) {
			theme.value = savedTheme;
		}
		if (savedAccent && VALID_ACCENTS.includes(savedAccent)) {
			accent.value = savedAccent;
		}

		// Apply theme to <html> and persist on change
		const disposeTheme = effect(() => {
			document.documentElement.dataset.theme = theme.value;
			localStorage.setItem("gp-theme", theme.value);
		});

		// Apply accent to <html> and persist on change
		const disposeAccent = effect(() => {
			document.documentElement.dataset.accent = accent.value;
			localStorage.setItem("gp-accent", accent.value);
		});

		return () => {
			disposeTheme();
			disposeAccent();
		};
	}, []);
}
