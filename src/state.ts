import { computed, signal } from "@preact/signals";
import type { Accent, Block, Slide, Theme } from "./types.js";

export const slides = signal<Slide[]>([]);
export const activeIndex = signal<number>(-1);
export const scrollLevel = signal<number>(3); // 1–7, default 3
export const scrollActive = signal<boolean>(false);
export const timerElapsed = signal<number>(0); // ms
export const timerRunning = signal<boolean>(false);
export const theme = signal<Theme>("night");
export const accent = signal<Accent>("gold");
export const scriptLoaded = signal<boolean>(false);
export const settingsOpen = signal<boolean>(false);

// Derived — no manual bookkeeping
export const totalLines = computed(() =>
	slides.value
		.flatMap((s) => s.blocks)
		.filter((b): b is Block & { type: "line" } => b.type === "line").length,
);

export const progress = computed(() =>
	activeIndex.value < 0
		? 0
		: activeIndex.value / Math.max(1, totalLines.value - 1),
);
