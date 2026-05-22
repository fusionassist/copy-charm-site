// Production HTTP launcher for Plesk Node.js deployment.
//
// Layers (request flows top → bottom; first match wins):
//   1. wp-mirror static serving — legacy WordPress wget snapshot at
//      wp-mirror/. Serves /, /contact-us/, /product/<slug>/, etc. by
//      mapping the URL to a file on disk. As real TanStack routes are
//      built (step 6 onward in CLAUDE.md §11), they take precedence by
//      handling the route on the client; this layer is the "rebuild on
//      top" fallback.
//   2. TanStack Start SSR — the built dist/server/server.js fetch
//      handler. Handles real React routes + 404s.
//
// PORT is read from the env (Plesk injects it) and falls back to 3000.

import { serve } from "srvx/node";
import { stat, readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import handler from "./dist/server/server.js";

const MIRROR_DIR = resolve(process.cwd(), "wp-mirror");
const PORT = process.env.PORT ?? 3000;
const HOST = process.env.HOST ?? undefined;

// URL paths that should bypass the mirror and go straight to TanStack Start.
// Add a path here when a real TanStack route takes over from a mirror URL.
// Match is by exact pathname OR pathname prefix ending in "/".
const MIRROR_EXCLUDE = new Set([
  // "/contact-us/",
  // "/product/",
]);

function isMirrorExcluded(pathname) {
  if (MIRROR_EXCLUDE.has(pathname)) return true;
  for (const entry of MIRROR_EXCLUDE) {
    if (entry.endsWith("/") && pathname.startsWith(entry)) return true;
  }
  return false;
}

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".pdf": "application/pdf",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

async function isFile(path) {
  try {
    const s = await stat(path);
    return s.isFile();
  } catch {
    return false;
  }
}

async function resolveMirrorFile(rawPath, rawQuery) {
  const clean = rawPath.split("#")[0];
  const ext = extname(clean);
  const candidates = [
    join(MIRROR_DIR, clean, "index.html"),
    join(MIRROR_DIR, clean.replace(/\/$/, "") + ".html"),
    join(MIRROR_DIR, clean),
  ];
  if (rawQuery) {
    // wget saves "foo.css?ver=1" as "foo.css@ver=1.css" or "foo.css@ver=1"
    candidates.push(join(MIRROR_DIR, clean + "@" + rawQuery + ext));
    candidates.push(join(MIRROR_DIR, clean + "@" + rawQuery));
  }
  for (const c of candidates) {
    if (await isFile(c)) return c;
  }
  return null;
}

async function tryServeMirror(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  if (isMirrorExcluded(url.pathname)) return null;
  const file = await resolveMirrorFile(decodeURIComponent(url.pathname), url.search.slice(1));
  if (!file) return null;
  const ext = extname(file).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
  const body = request.method === "HEAD" ? null : await readFile(file);
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=300",
      "x-served-by": "wp-mirror",
    },
  });
}

const server = serve({
  fetch: async (request) => {
    const mirrorResponse = await tryServeMirror(request);
    if (mirrorResponse) return mirrorResponse;
    return handler.fetch(request);
  },
  port: PORT,
  hostname: HOST,
});

await server.ready();
const addr = server.node?.address?.();
const url = addr && typeof addr === "object"
  ? `http://${addr.address === "::" || addr.address === "0.0.0.0" ? "localhost" : addr.address}:${addr.port}`
  : `http://localhost:${PORT}`;
console.log(`interactivedisplays.ie — listening on ${url}`);
console.log(`  wp-mirror fallback: ${MIRROR_DIR}`);
