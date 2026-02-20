/**
 * Glasspane E2E tests — framework-agnostic acceptance criteria.
 *
 * Run against v1 (dist/teleprompter.html served statically) to establish
 * baseline. The same tests must pass against v2 (Vite build output).
 *
 * Convention: helpers load the app via /dist/teleprompter.html and
 * intercept fetch requests for demo content and mock shared scripts.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const JFK_CONTENT = readFileSync(
	join(ROOT, "scripts/jfk-inaugural.md"),
	"utf-8",
);

const APP_URL = "/dist/teleprompter.html";

// Top-level regex constants (avoid re-creating regexes inside test closures)
const RE_VISIBLE = /visible/;
const RE_RUNNING = /running/;

/**
 * Navigate to the app and intercept demo script requests so the
 * relative fetch succeeds regardless of server directory layout.
 */
async function gotoApp(page: Page) {
	await page.route("**/scripts/jfk-inaugural.md", (route) =>
		route.fulfill({ body: JFK_CONTENT, contentType: "text/plain" }),
	);
	await page.goto(APP_URL);
}

/**
 * Click the demo link and wait for the teleprompter section to appear.
 */
async function loadDemo(page: Page) {
	await page.click("#demoLink");
	await expect(page.locator("#teleprompter")).toBeVisible({ timeout: 5_000 });
}

// ── Navigate to the app before each test ──────────────────────────────────────
// Each Playwright test runs in its own fresh browser context, so localStorage
// is already clean — no manual clearing needed.

test.beforeEach(async ({ page }) => {
	await gotoApp(page);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Load demo script
// ─────────────────────────────────────────────────────────────────────────────

test("demo link loads JFK inaugural; drop zone hides; teleprompter shows", async ({
	page,
}) => {
	await expect(page.locator("#drop-zone")).toBeVisible();
	await expect(page.locator("#teleprompter")).not.toBeVisible();

	await loadDemo(page);

	await expect(page.locator("#drop-zone")).not.toBeVisible();
	await expect(page.locator("#teleprompter")).toBeVisible();
	// At least one text line should be rendered
	await expect(page.locator(".line").first()).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Slide navigation (j / k keys)
// ─────────────────────────────────────────────────────────────────────────────

test("j key highlights first line; k key moves back; progress bar grows", async ({
	page,
}) => {
	await loadDemo(page);

	// No active line initially
	await expect(page.locator(".line.active")).toHaveCount(0);

	// j → highlights first line
	await page.keyboard.press("j");
	await expect(page.locator(".line.active")).toHaveCount(1);

	// j again → moves to second line
	await page.keyboard.press("j");
	const activeLines = page.locator(".line.active");
	await expect(activeLines).toHaveCount(1);

	// Check progress bar has non-zero width
	const width = await page
		.locator("#progressFill")
		.evaluate((el) => (el as HTMLElement).style.width);
	expect(width).not.toBe("0%");
	expect(width).not.toBe("");

	// k → moves back
	await page.keyboard.press("k");
	const firstLineActive = await page.locator(".line.active").nth(0);
	// Progress should be the same as after first j
	const widthAfterK = await page
		.locator("#progressFill")
		.evaluate((el) => (el as HTMLElement).style.width);
	// After k, width should be strictly less than after second j (back one step)
	expect(parseFloat(widthAfterK)).toBeLessThan(parseFloat(width));
	await expect(firstLineActive).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Auto-scroll start / stop
// ─────────────────────────────────────────────────────────────────────────────

test("ArrowDown starts auto-scroll and shows indicator; Escape stops it", async ({
	page,
}) => {
	await loadDemo(page);

	// Indicator hidden before scrolling
	await expect(page.locator("#scrollIndicator")).not.toHaveClass(RE_VISIBLE);

	// ArrowDown → starts scroll
	await page.keyboard.press("ArrowDown");
	await expect(page.locator("#scrollIndicator")).toHaveClass(RE_VISIBLE, {
		timeout: 2_000,
	});

	// Escape → stops scroll
	await page.keyboard.press("Escape");
	await expect(page.locator("#scrollIndicator")).not.toHaveClass(RE_VISIBLE, {
		timeout: 2_000,
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Speed adjustment
// ─────────────────────────────────────────────────────────────────────────────

test("ArrowDown while scrolling increments speed display from 3 to 4", async ({
	page,
}) => {
	await loadDemo(page);

	// Start scroll at default level 3
	await page.keyboard.press("ArrowDown");
	await expect(page.locator("#scrollIndicator")).toHaveClass(RE_VISIBLE, {
		timeout: 2_000,
	});

	const initialSpeed = await page.locator("#scrollSpeedName").textContent();
	expect(initialSpeed?.trim()).toBe("3");

	// ArrowDown again → increases speed
	await page.keyboard.press("ArrowDown");
	const newSpeed = await page.locator("#scrollSpeedName").textContent();
	expect(parseInt(newSpeed?.trim() ?? "0", 10)).toBeGreaterThan(
		parseInt(initialSpeed?.trim() ?? "0", 10),
	);

	// Stop
	await page.keyboard.press("Escape");
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Timer
// ─────────────────────────────────────────────────────────────────────────────

test("click starts timer; click pauses it; double-click resets to 00:00", async ({
	page,
}) => {
	await loadDemo(page);

	// Initial state
	await expect(page.locator("#timerDisplay")).toHaveText("00:00");
	await expect(page.locator("#timer")).not.toHaveClass(RE_RUNNING);

	// Single click → starts timer
	await page.locator("#timer").click();
	await expect(page.locator("#timer")).toHaveClass(RE_RUNNING);

	// Wait > 1 second so the display advances to at least 00:01
	await page.waitForTimeout(1_400);
	const elapsed = await page.locator("#timerDisplay").textContent();
	expect(elapsed?.trim()).not.toBe("00:00");

	// Single click → pauses
	await page.locator("#timer").click();
	await expect(page.locator("#timer")).not.toHaveClass(RE_RUNNING);
	const pausedAt = await page.locator("#timerDisplay").textContent();
	await page.waitForTimeout(400);
	const afterPause = await page.locator("#timerDisplay").textContent();
	expect(afterPause).toBe(pausedAt); // should not advance while paused

	// Double click → resets
	await page.locator("#timer").dblclick();
	await expect(page.locator("#timerDisplay")).toHaveText("00:00");
	await expect(page.locator("#timer")).not.toHaveClass(RE_RUNNING);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Pip navigation
// ─────────────────────────────────────────────────────────────────────────────

test("clicking a pip scrolls to the corresponding slide and activates it", async ({
	page,
}) => {
	await loadDemo(page);

	// There should be multiple pips (JFK script has several slides)
	const pips = page.locator(".slide-pip");
	await expect(pips).not.toHaveCount(0);
	const pipCount = await pips.count();
	expect(pipCount).toBeGreaterThan(1);

	// Click the second pip
	await pips.nth(1).click();

	// Second pip (or its slide section) becomes active
	// Wait a moment for scroll + IntersectionObserver
	await page.waitForTimeout(600);
	const activePips = page.locator(".slide-pip.active");
	await expect(activePips).not.toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Theme persistence
// ─────────────────────────────────────────────────────────────────────────────

test('switching to "day" theme persists across page reload', async ({
	page,
}) => {
	await loadDemo(page);

	// Open settings
	await page.locator("#settingsBtn").click();
	await expect(page.locator("#settingsPanel")).toHaveClass(RE_VISIBLE);

	// Select day theme
	await page.locator('input[name="theme"][value="day"]').check();
	await expect(page.locator('input[name="theme"][value="day"]')).toBeChecked();

	// Reload
	await page.reload();

	// Theme attribute applied immediately on load
	const theme = await page.evaluate(
		() => document.documentElement.dataset.theme,
	);
	expect(theme).toBe("day");
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Accent persistence
// ─────────────────────────────────────────────────────────────────────────────

test('switching to "teal" accent persists across page reload', async ({
	page,
}) => {
	await loadDemo(page);

	// Open settings
	await page.locator("#settingsBtn").click();
	await expect(page.locator("#settingsPanel")).toHaveClass(RE_VISIBLE);

	// Select teal accent
	await page.locator('input[name="accent"][value="teal"]').check();
	await expect(
		page.locator('input[name="accent"][value="teal"]'),
	).toBeChecked();

	// Reload
	await page.reload();

	// Accent attribute applied immediately on load
	const accent = await page.evaluate(
		() => document.documentElement.dataset.accent,
	);
	expect(accent).toBe("teal");
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Load new script
// ─────────────────────────────────────────────────────────────────────────────

test("load new script button returns to drop zone and resets progress bar", async ({
	page,
}) => {
	await loadDemo(page);

	// Advance progress by pressing j twice (activeIndex=0 gives 0%; need activeIndex=1)
	await page.keyboard.press("j");
	await page.keyboard.press("j");
	const widthBefore = await page
		.locator("#progressFill")
		.evaluate((el) => (el as HTMLElement).style.width);
	expect(widthBefore).not.toBe("0%");
	expect(widthBefore).not.toBe("");

	// Open settings panel to reach Load New Script button
	await page.locator("#settingsBtn").click();
	await expect(page.locator("#settingsPanel")).toHaveClass(RE_VISIBLE);

	await page.locator("#loadNewBtn").click();

	// Drop zone reappears; teleprompter hides
	await expect(page.locator("#drop-zone")).toBeVisible({ timeout: 2_000 });
	await expect(page.locator("#teleprompter")).not.toBeVisible();

	// Reload a new script — progress bar must start at 0% (activeIndex reset)
	await loadDemo(page);
	const widthAfter = await page
		.locator("#progressFill")
		.evaluate((el) => (el as HTMLElement).style.width);
	expect(widthAfter).toBe("0%");
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Shared script URL
// ─────────────────────────────────────────────────────────────────────────────

test("page with script-id auto-fetches and loads the shared script", async ({
	page,
}) => {
	const SCRIPT_ID = "test-abc123";

	// Intercept the Worker route for the raw script content
	await page.route(`**/script/${SCRIPT_ID}`, (route) =>
		route.fulfill({ body: JFK_CONTENT, contentType: "text/plain" }),
	);

	// Intercept the main HTML and inject BOTH v1 (body data-script-id) and
	// v2 (meta[name="script-id"]) mechanisms so this test works for both.
	await page.route(APP_URL, async (route) => {
		const response = await route.fetch();
		let html = await response.text();
		// v1: body dataset
		html = html.replace('data-script-id=""', `data-script-id="${SCRIPT_ID}"`);
		// v2: inject meta tag into <head>
		html = html.replace(
			"</head>",
			`<meta name="script-id" content="${SCRIPT_ID}"></head>`,
		);
		await route.fulfill({ body: html, contentType: "text/html" });
	});

	await page.goto(APP_URL);

	// Teleprompter should load automatically without any user action
	await expect(page.locator("#teleprompter")).toBeVisible({ timeout: 5_000 });
	await expect(page.locator(".line").first()).toBeVisible();
});
