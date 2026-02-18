import {
	createExecutionContext,
	env,
	waitOnExecutionContext,
} from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../src/index";

const ALPHANUMERIC_12_RE = /^[a-zA-Z0-9]{12}$/;

async function workerFetch(path: string, init?: RequestInit) {
	const ctx = createExecutionContext();
	const res = await worker.fetch(
		new Request(`https://glasspane.test${path}`, init),
		env,
		ctx,
	);
	await waitOnExecutionContext(ctx);
	return res;
}

describe("POST /upload", () => {
	it("returns 400 for empty content", async () => {
		const res = await workerFetch("/upload", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content: "" }),
		});
		expect(res.status).toBe(400);
	});

	it("returns 400 for oversized content", async () => {
		const res = await workerFetch("/upload", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content: "a".repeat(100_001) }),
		});
		expect(res.status).toBe(400);
	});

	it("returns 200 with id and url for valid content", async () => {
		const res = await workerFetch("/upload", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content: "## Slide One\n\nHello." }),
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as { id: string; url: string };
		expect(body.id).toMatch(ALPHANUMERIC_12_RE);
		expect(body.url).toContain("/s/");
	});
});

describe("GET /script/:id", () => {
	let scriptId: string;

	beforeAll(async () => {
		const res = await workerFetch("/upload", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content: "## Test Slide\n\nTest line." }),
		});
		const body = (await res.json()) as { id: string };
		scriptId = body.id;
	});

	it("returns the stored script content", async () => {
		const res = await workerFetch(`/script/${scriptId}`);
		expect(res.status).toBe(200);
		const text = await res.text();
		expect(text).toContain("## Test Slide");
	});

	it("returns 404 for unknown id", async () => {
		const res = await workerFetch("/script/doesnotexist0");
		expect(res.status).toBe(404);
	});
});

describe("GET /s/:id", () => {
	it("returns HTML containing the script id", async () => {
		const upload = await workerFetch("/upload", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content: "## S\n\nHello." }),
		});
		const { id } = (await upload.json()) as { id: string };

		const res = await workerFetch(`/s/${id}`);
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toContain("text/html");
		const html = await res.text();
		expect(html).toContain(id);
	});
});
