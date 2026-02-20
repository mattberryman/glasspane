import path from "node:path";
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
	plugins: [preact()],
	// Absolute base so asset paths are /assets/... everywhere.
	// Required for /s/:id shared-link routes: relative ./assets/... would resolve
	// to /s/assets/... in the browser and 404.
	base: "/",
	build: {
		// Relative to root ("src"), so "../dist" -> repo-root dist/
		outDir: "../dist",
		emptyOutDir: true,
		rollupOptions: {
			// Explicit entry so Vite outputs dist/teleprompter.html (matching
			// v1's filename) and the E2E tests can use the same APP_URL for both.
			input: path.resolve(__dirname, "src/teleprompter.html"),
		},
	},
	root: "src",
	publicDir: "../public",
});
