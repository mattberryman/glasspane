import { generateId } from "./id";
import { UploadSchema } from "./schema";
import {
	CSP_SCRIPT_HASHES,
	DEMO_SCRIPT,
	GUIDE_CSS,
	GUIDE_HTML,
	HTML,
	TELEPROMPTER_CSS,
} from "./template";

const CANONICAL_ORIGIN = "https://glasspane.page";

export interface Env {
	SCRIPTS: KVNamespace;
}

const ALLOWED_CORS_ORIGINS = new Set([
	CANONICAL_ORIGIN,
	"http://localhost:8787",
	"http://127.0.0.1:8787",
]);

const CSP = [
	"default-src 'self'",
	// Build-time SHA-256 hashes cover the two inline <script> blocks (DOMPurify +
	// main IIFE), removing the need for 'unsafe-inline'.
	`script-src 'self' ${CSP_SCRIPT_HASHES}`,
	"style-src 'self' 'unsafe-inline'",
	"connect-src 'self'",
	"img-src 'self' data:",
	"object-src 'none'",
	"base-uri 'self'",
	"frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = {
	"Content-Security-Policy": CSP,
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
	"Cross-Origin-Opener-Policy": "same-origin",
	"Cross-Origin-Resource-Policy": "same-origin",
	"Permissions-Policy":
		"accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()",
};

function buildCorsHeaders(request: Request): Headers {
	const headers = new Headers({
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		Vary: "Origin",
	});
	const origin = request.headers.get("Origin");
	if (origin && ALLOWED_CORS_ORIGINS.has(origin)) {
		headers.set("Access-Control-Allow-Origin", origin);
	}
	return headers;
}

function serveHtml(scriptId: string | null): Response {
	// Inject the script ID into the data-script-id attribute. The browser reads
	// this on page load and fetches /script/:id to retrieve the stored content.
	const html = scriptId
		? HTML.replace('data-script-id=""', `data-script-id="${scriptId}"`)
		: HTML;

	return new Response(html, {
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			...SECURITY_HEADERS,
		},
	});
}

// 90-day TTL — scripts auto-expire and are never stored indefinitely.
const SCRIPT_TTL_SECONDS = 60 * 60 * 24 * 90;

// Pre-parse body size cap: reject oversized payloads before attempting JSON.parse.
const MAX_UPLOAD_BYTES = 200_000;

async function handleUpload(request: Request, env: Env): Promise<Response> {
	const corsHeaders = Object.fromEntries(buildCorsHeaders(request));
	const contentLength = parseInt(
		request.headers.get("Content-Length") ?? "0",
		10,
	);
	if (contentLength > MAX_UPLOAD_BYTES) {
		return new Response(JSON.stringify({ error: "Payload too large" }), {
			status: 413,
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});
	}

	const result = UploadSchema.safeParse(body);
	if (!result.success) {
		return new Response(
			JSON.stringify({ error: result.error.issues[0].message }),
			{
				status: 400,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			},
		);
	}

	const id = generateId();
	await env.SCRIPTS.put(id, result.data.content, {
		expirationTtl: SCRIPT_TTL_SECONDS,
	});

	return new Response(
		JSON.stringify({ id, url: `${CANONICAL_ORIGIN}/s/${id}` }),
		{
			status: 200,
			headers: { "Content-Type": "application/json", ...corsHeaders },
		},
	);
}

async function handleGetScript(
	id: string,
	request: Request,
	env: Env,
): Promise<Response> {
	const corsHeaders = Object.fromEntries(buildCorsHeaders(request));
	const content = await env.SCRIPTS.get(id);
	if (content === null) {
		return new Response(JSON.stringify({ error: "Script not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});
	}
	return new Response(content, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			...corsHeaders,
		},
	});
}

const SCRIPT_PATH_RE = /^\/script\/([a-zA-Z0-9]{12})$/;
const SHARE_PATH_RE = /^\/s\/([a-zA-Z0-9]{12})$/;

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const { pathname } = url;
		const method = request.method;

		if (method === "OPTIONS") {
			const origin = request.headers.get("Origin");
			if (origin && !ALLOWED_CORS_ORIGINS.has(origin)) {
				return new Response("Forbidden origin", { status: 403 });
			}
			return new Response(null, {
				status: 204,
				headers: buildCorsHeaders(request),
			});
		}

		if (method === "POST" && pathname === "/upload") {
			return await handleUpload(request, env);
		}

		const scriptMatch = pathname.match(SCRIPT_PATH_RE);
		if (method === "GET" && scriptMatch) {
			return await handleGetScript(scriptMatch[1], request, env);
		}

		const shareMatch = pathname.match(SHARE_PATH_RE);
		if (method === "GET" && shareMatch) {
			return serveHtml(shareMatch[1]);
		}

		if (method === "GET" && (pathname === "/" || pathname === "/index.html")) {
			return serveHtml(null);
		}

		if (method === "GET" && pathname === "/scripts/jfk-inaugural.md") {
			return new Response(DEMO_SCRIPT, {
				headers: {
					"Content-Type": "text/plain; charset=utf-8",
					...Object.fromEntries(buildCorsHeaders(request)),
				},
			});
		}

		if (method === "GET" && pathname === "/guide") {
			return new Response(GUIDE_HTML, {
				headers: {
					"Content-Type": "text/html; charset=utf-8",
					...SECURITY_HEADERS,
				},
			});
		}

		if (method === "GET" && pathname === "/styles/teleprompter.css") {
			return new Response(TELEPROMPTER_CSS, {
				headers: {
					"Content-Type": "text/css; charset=utf-8",
					"Cache-Control": "public, max-age=3600",
					...SECURITY_HEADERS,
				},
			});
		}

		if (method === "GET" && pathname === "/styles/guide.css") {
			return new Response(GUIDE_CSS, {
				headers: {
					"Content-Type": "text/css; charset=utf-8",
					"Cache-Control": "public, max-age=3600",
					...SECURITY_HEADERS,
				},
			});
		}

		// Silence the browser's automatic favicon request
		if (method === "GET" && pathname === "/favicon.ico") {
			return new Response(null, { status: 204 });
		}

		return new Response("Not found", { status: 404 });
	},
};
