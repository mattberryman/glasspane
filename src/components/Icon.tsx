import type { JSX } from "preact";

export function SettingsIcon(): JSX.Element {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="3" />
			<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
		</svg>
	);
}

export function GlasspaneIcon(): JSX.Element {
	return (
		<svg
			class="hero-icon"
			width="48"
			height="48"
			viewBox="0 0 64 64"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<rect
				x="10"
				y="6"
				width="44"
				height="52"
				rx="6"
				stroke="var(--pip-border)"
				strokeWidth="1.2"
			/>
			<rect
				x="17"
				y="20"
				width="20"
				height="1.5"
				rx="0.75"
				fill="rgba(var(--icon-line), 0.08)"
			/>
			<rect
				x="17"
				y="25"
				width="16"
				height="1.5"
				rx="0.75"
				fill="rgba(var(--icon-line), 0.15)"
			/>
			<rect
				x="17"
				y="30"
				width="24"
				height="1.5"
				rx="0.75"
				fill="rgba(var(--icon-line), 0.25)"
			/>
			{/* Focus line — current reading position */}
			<rect x="16" y="36" width="32" height="3" rx="1.5" fill="var(--accent)" />
			<rect
				x="17"
				y="43"
				width="26"
				height="1.5"
				rx="0.75"
				fill="rgba(var(--icon-line), 0.18)"
			/>
			<rect
				x="17"
				y="48"
				width="18"
				height="1.5"
				rx="0.75"
				fill="rgba(var(--icon-line), 0.08)"
			/>
		</svg>
	);
}
