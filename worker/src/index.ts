import { UploadSchema } from './schema';
import { generateId } from './id';

export interface Env {
  SCRIPTS: KVNamespace;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const CSP = [
  "default-src 'self'",
  // NOTE: Task 8 must add a 'nonce-{value}' or hash to allow the teleprompter's inline <script> block.
  // 'unsafe-inline' is intentionally excluded here.
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// Minimal HTML placeholder -- replaced by full teleprompter.html in Task 8
const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Glasspane</title></head>
<body data-script-id="SCRIPT_ID_PLACEHOLDER">
<p>Teleprompter placeholder -- replace with teleprompter.html in Task 8</p>
</body>
</html>`;

function serveHtml(scriptId: string | null): Response {
  const html = scriptId
    ? HTML_TEMPLATE.replace('SCRIPT_ID_PLACEHOLDER', scriptId)
    : HTML_TEMPLATE.replace('SCRIPT_ID_PLACEHOLDER', '');

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...SECURITY_HEADERS,
    },
  });
}

async function handleUpload(request: Request, env: Env, origin: string): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const result = UploadSchema.safeParse(body);
  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error.issues[0].message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const id = generateId();
  await env.SCRIPTS.put(id, result.data.content);

  return new Response(JSON.stringify({ id, url: `${origin}/s/${id}` }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function handleGetScript(id: string, env: Env): Promise<Response> {
  const content = await env.SCRIPTS.get(id);
  if (content === null) {
    return new Response(JSON.stringify({ error: 'Script not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (method === 'POST' && pathname === '/upload') {
      return handleUpload(request, env, url.origin);
    }

    const scriptMatch = pathname.match(/^\/script\/([a-zA-Z0-9]{12})$/);
    if (method === 'GET' && scriptMatch) {
      return handleGetScript(scriptMatch[1], env);
    }

    const shareMatch = pathname.match(/^\/s\/([a-zA-Z0-9]{12})$/);
    if (method === 'GET' && shareMatch) {
      return serveHtml(shareMatch[1]);
    }

    if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      return serveHtml(null);
    }

    return new Response('Not found', { status: 404 });
  },
};
