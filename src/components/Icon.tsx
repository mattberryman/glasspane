import type { JSX } from "preact";

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
