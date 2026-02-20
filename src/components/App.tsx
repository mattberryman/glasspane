import { useEffect } from "preact/hooks";
import { scriptLoaded, slides } from "../state.js";
import { parseScript } from "../parser.js";
import { DropZone } from "./DropZone.js";
import { Teleprompter } from "./Teleprompter.js";

export function App() {
	// On mount: check for shared script via meta[name="script-id"]
	useEffect(() => {
		const id = document.head
			.querySelector('meta[name="script-id"]')
			?.getAttribute("content");
		if (id) {
			fetch(`/script/${id}`)
				.then((r) => {
					if (!r.ok) throw new Error("Script not found");
					return r.text();
				})
				.then((text) => {
					slides.value = parseScript(text);
					scriptLoaded.value = true;
				})
				.catch(() => {
					// Script not found — stay on drop zone
				});
		}
	}, []);

	return scriptLoaded.value ? <Teleprompter /> : <DropZone />;
}
