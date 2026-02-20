import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: false, // serial so localStorage doesn't race
	reporter: "line",
	use: {
		baseURL: "http://localhost:5556",
		// Clear storage between tests
		storageState: undefined,
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "npx serve -l 5556 --no-port-switching dist",
		url: "http://localhost:5556",
		reuseExistingServer: !process.env.CI,
		timeout: 10_000,
	},
});
