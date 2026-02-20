import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
	plugins: [preact()],
	build: {
		// Relative to root ("src"), so "../dist" → repo-root dist/
		outDir: "../dist",
		emptyOutDir: true,
	},
	root: "src",
	publicDir: "../public",
});
