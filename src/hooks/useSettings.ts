import { effect } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { accent, theme } from "../state.js";
import type { Accent, Theme } from "../types.js";

const VALID_THEMES: Theme[] = ["night", "navy", "day", "auto"];
const VALID_ACCENTS: Accent[] = ["gold", "teal"];

const FAVICON_PARAMS: Record<string, { border: string; line: string }> = {
	night: { border: "rgba(255,255,255,0.18)", line: "rgba(255,255,255,0.15)" },
	navy: { border: "rgba(208,216,240,0.18)", line: "rgba(208,216,240,0.15)" },
	day: { border: "rgba(26,26,26,0.18)", line: "rgba(26,26,26,0.18)" },
};

const ACCENT_HEX: Record<Accent, string> = {
	gold: "#c9a84c",
	teal: "#3dbfa8",
};

function updateFavicon(t: Theme, a: Accent): void {
	const resolved =
		t === "auto"
			? window.matchMedia("(prefers-color-scheme: dark)").matches
				? "night"
				: "day"
			: t;
	const { border, line } = FAVICON_PARAMS[resolved];
	const accentHex = ACCENT_HEX[a];
	const svg =
		`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>` +
		`<rect x='8' y='4' width='48' height='56' rx='8' fill='none' stroke='${border}' stroke-width='4'/>` +
		`<rect x='16' y='22' width='18' height='4' rx='2' fill='${line}'/>` +
		`<rect x='14' y='33' width='36' height='6' rx='3' fill='${accentHex}'/>` +
		`<rect x='16' y='46' width='22' height='4' rx='2' fill='${line}'/>` +
		`</svg>`;
	const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
	if (link) {
		link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
	}
}

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

		// Update favicon when theme or accent changes
		const disposeFavicon = effect(() => {
			updateFavicon(theme.value, accent.value);
		});

		// Re-run favicon update when OS colour scheme changes (relevant for auto theme)
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const onMqChange = () => {
			if (theme.value === "auto") {
				updateFavicon(theme.value, accent.value);
			}
		};
		mq.addEventListener("change", onMqChange);

		return () => {
			disposeTheme();
			disposeAccent();
			disposeFavicon();
			mq.removeEventListener("change", onMqChange);
		};
	}, []);
}
