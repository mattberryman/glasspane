import { generateId } from "./id";
import { UploadSchema } from "./schema";

const CANONICAL_ORIGIN = "https://glasspane.page";

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
	// 'self' covers the Vite-bundled module scripts and the external fouc.js.
	"script-src 'self'",
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
 * Fetch an HTML asset from Workers Static Assets and attach security headers.
 * Creates a clean request (no client headers forwarded) to avoid leaking
 * cookies or other sensitive headers into the internal asset fetch.
 */
async function fetchAssetHtml(
	assetPath: string,
	request: Request,
	env: Env,
): Promise<Response> {
	const assetRequest = new Request(
		new URL(assetPath, request.url).toString(),
	);
	const asset = await env.ASSETS.fetch(assetRequest);
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
			const htmlResponse = await fetchAssetHtml(
				"/teleprompter.html",
				request,
				env,
			);
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
			return fetchAssetHtml("/teleprompter.html", request, env);
		}

		// Guide page.
		if (method === "GET" && pathname === "/guide") {
			return fetchAssetHtml("/guide.html", request, env);
		}

		// All remaining requests (static assets, /scripts/*, /assets/*, etc.)
		// are served from Workers Static Assets with security headers applied.
		const assetRes = await env.ASSETS.fetch(request);
		return new Response(assetRes.body, {
			status: assetRes.status,
			headers: {
				...Object.fromEntries(assetRes.headers),
				...SECURITY_HEADERS,
			},
		});
	},
};
