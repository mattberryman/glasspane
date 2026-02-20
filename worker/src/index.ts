import { generateId } from "./id";
import { UploadSchema } from "./schema";

const CANONICAL_ORIGIN = "https://glasspane.page";

// SHA-256 hash of the inline FOUC-prevention script in teleprompter.html.
// Update this if the inline <script> content ever changes.
const FOUC_SCRIPT_HASH =
	"'sha256-GCxp9ZrwC6FTkenz2ypBB3k7iR3kmEvswmdhCYq2Ym4='";

export interface Env {
	SCRIPTS: KVNamespace;
	ASSETS: Fetcher;
}

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

const CSP = [
	"default-src 'self'",
	// 'self' covers the Vite-bundled module scripts; hash covers the inline FOUC script.
	`script-src 'self' ${FOUC_SCRIPT_HASH}`,
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
};

/**
 * Fetch teleprompter.html from Workers Static Assets and attach security
 * headers. All HTML delivery goes through this function so that headers are
 * applied consistently whether the request is for the root page or a shared
 * script link.
 */
async function fetchHtml(request: Request, env: Env): Promise<Response> {
	const htmlRequest = new Request(
		new URL("/teleprompter.html", request.url),
		request,
	);
	const asset = await env.ASSETS.fetch(htmlRequest);
	return new Response(asset.body, {
		status: asset.status,
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
	const contentLength = parseInt(
		request.headers.get("Content-Length") ?? "0",
		10,
	);
	if (contentLength > MAX_UPLOAD_BYTES) {
		return new Response(JSON.stringify({ error: "Payload too large" }), {
			status: 413,
			headers: { "Content-Type": "application/json", ...CORS_HEADERS },
		});
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
			headers: { "Content-Type": "application/json", ...CORS_HEADERS },
		});
	}

	const result = UploadSchema.safeParse(body);
	if (!result.success) {
		return new Response(
			JSON.stringify({ error: result.error.issues[0].message }),
			{
				status: 400,
				headers: { "Content-Type": "application/json", ...CORS_HEADERS },
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
			headers: { "Content-Type": "application/json", ...CORS_HEADERS },
		},
	);
}

async function handleGetScript(id: string, env: Env): Promise<Response> {
	const content = await env.SCRIPTS.get(id);
	if (content === null) {
		return new Response(JSON.stringify({ error: "Script not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json", ...CORS_HEADERS },
		});
	}
	return new Response(content, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			...CORS_HEADERS,
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
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		if (method === "POST" && pathname === "/upload") {
			return await handleUpload(request, env);
		}

		const scriptMatch = pathname.match(SCRIPT_PATH_RE);
		if (method === "GET" && scriptMatch) {
			return await handleGetScript(scriptMatch[1], env);
		}

		// Shared script link: inject the script ID as a meta tag so the app
		// fetches the stored content on mount without a full-page redirect.
		const shareMatch = pathname.match(SHARE_PATH_RE);
		if (method === "GET" && shareMatch) {
			const id = shareMatch[1];
			const htmlResponse = await fetchHtml(request, env);
			return new HTMLRewriter()
				.on("head", {
					element(el) {
						el.append(
							`<meta name="script-id" content="${id}">`,
							{ html: true },
						);
					},
				})
				.transform(htmlResponse);
		}

		// Root and /index.html both serve the teleprompter app.
		if (method === "GET" && (pathname === "/" || pathname === "/index.html")) {
			return fetchHtml(request, env);
		}

		// All remaining requests (static assets, /scripts/*, /assets/*, etc.)
		// are served directly from Workers Static Assets.
		return env.ASSETS.fetch(request);
	},
};
