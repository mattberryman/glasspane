import { useRef } from "preact/hooks";
import { parseScript } from "../parser.js";
import { scriptLoaded, slides } from "../state.js";

function loadText(text: string) {
	slides.value = parseScript(text);
	scriptLoaded.value = true;
}

export function DropZone() {
	const inputRef = useRef<HTMLInputElement>(null);
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
		if (file) handleFile(file);
	}

	function onFileChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) handleFile(file);
	}

	function onDemoClick(e: Event) {
		e.preventDefault();
		fetch("./scripts/jfk-inaugural.md")
			.then((r) => {
				if (!r.ok) throw new Error(`Demo script not found (${r.status})`);
				return r.text();
			})
			.then(loadText)
			.catch((err: Error) => alert(`Could not load demo: ${err.message}`));
	}

	return (
		<div id="drop-zone">
			<div class="wordmark">
				Glasspane
				<span class="wordmark-sub">Browser teleprompter</span>
			</div>
			<label class="drop-label" for="fileInput">
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
				ref={inputRef}
				accept=".md,text/markdown"
				onChange={onFileChange}
			/>
			<a href="#" id="demoLink" onClick={onDemoClick}>
				Try the demo
			</a>
			<a href="/guide" target="_blank" rel="noopener" id="guideLink">
				How to write a script
			</a>
		</div>
	);
}
