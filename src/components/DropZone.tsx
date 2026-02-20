import { useRef } from "preact/hooks";
import { parseScript } from "../parser.js";
import { scriptLoaded, slides } from "../state.js";
import { GlasspaneIcon } from "./Icon.js";

function loadText(text: string) {
	slides.value = parseScript(text);
	scriptLoaded.value = true;
}

export function DropZone() {
	const dropTargetRef = useRef<HTMLDivElement>(null);

	function handleFile(file: File) {
		const reader = new FileReader();
		reader.onload = () => loadText(reader.result as string);
		reader.readAsText(file);
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		dropTargetRef.current?.classList.add("drag-over");
	}

	function onDragLeave() {
		dropTargetRef.current?.classList.remove("drag-over");
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dropTargetRef.current?.classList.remove("drag-over");
		const file = e.dataTransfer?.files[0];
		if (file) {
			handleFile(file);
		}
	}

	function onFileChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) {
			handleFile(file);
		}
	}

	function onDemoClick() {
		fetch("./scripts/jfk-inaugural.md")
			.then((r) => {
				if (!r.ok) {
					throw new Error(`Demo script not found (${r.status})`);
				}
				return r.text();
			})
			.then(loadText)
			.catch(() => {
				// demo fetch failed — nothing to display; user can drop a file instead
			});
	}

	return (
		<div id="drop-zone">
			<header class="hero">
				<GlasspaneIcon />
				<div class="wordmark">Glasspane</div>
				<h1 class="hero-headline">Read to the room.</h1>
				<p class="hero-sub">
					A browser teleprompter built for professionals. No account. No cloud
					sync. No distractions.
				</p>
				<ul class="hero-features">
					<li>
						<strong>Script stays local</strong> — your file is read in-browser;
						nothing is uploaded unless you choose to share it.
					</li>
					<li>
						<strong>Keyboard-driven</strong> — j/k to advance line by line;
						arrows to control scroll speed.
					</li>
					<li>
						<strong>Optional sharing</strong> — generate a link; your
						co-presenter opens it and the script loads automatically.
					</li>
				</ul>
			</header>
			<label class="drop-label" for="fileInput">
				{/* biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop target; keyboard users use the file input instead */}
				<div
					id="dropTarget"
					ref={dropTargetRef}
					onDragOver={onDragOver}
					onDragLeave={onDragLeave}
					onDrop={onDrop}
				>
					Drop a .md script here
					<span class="drop-or">or click to browse</span>
				</div>
			</label>
			<input
				type="file"
				id="fileInput"
				accept=".md,text/markdown"
				onChange={onFileChange}
			/>
			<button type="button" id="demoLink" onClick={onDemoClick}>
				Try the demo
			</button>
			<a href="/guide" target="_blank" rel="noopener" id="guideLink">
				How to write a script
			</a>
		</div>
	);
}
