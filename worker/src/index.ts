import { generateId } from "./id";
import { UploadSchema } from "./schema";
import { DEMO_SCRIPT, HTML } from "./template";

export interface Env {
	SCRIPTS: KVNamespace;
}

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

const CSP = [
	"default-src 'self'",
	// teleprompter.html uses two inline <script> blocks (DOMPurify + main IIFE).
	// 'unsafe-inline' is needed because the HTML is static and adding a build-time
	// hash would be a future improvement. All user content is sanitised by DOMPurify
	// before DOM insertion, so this is defence-in-depth rather than the primary guard.
	"script-src 'self' 'unsafe-inline'",
	"style-src 'self' 'unsafe-inline'",
	"connect-src 'self'",
	"img-src 'self' data:",
	"object-src 'none'",
	"base-uri 'self'",
].join("; ");

const SECURITY_HEADERS = {
	"Content-Security-Policy": CSP,
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
};

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

async function handleUpload(
	request: Request,
	env: Env,
	origin: string,
): Promise<Response> {
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
	await env.SCRIPTS.put(id, result.data.content);

	return new Response(JSON.stringify({ id, url: `${origin}/s/${id}` }), {
		status: 200,
		headers: { "Content-Type": "application/json", ...CORS_HEADERS },
	});
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
			return await handleUpload(request, env, url.origin);
		}

		const scriptMatch = pathname.match(SCRIPT_PATH_RE);
		if (method === "GET" && scriptMatch) {
			return await handleGetScript(scriptMatch[1], env);
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
					...CORS_HEADERS,
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
