// Shared speed-level definitions used by useAutoScroll and ScrollIndicator.
// px = pixels per second at that level; name = display label.
export const SPEED_LEVELS = [
	{ px: 12, name: "1" },
	{ px: 18, name: "2" },
	{ px: 27, name: "3" },
	{ px: 40, name: "4" },
	{ px: 60, name: "5" },
	{ px: 90, name: "6" },
	{ px: 135, name: "7" },
] as const;
