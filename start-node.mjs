// Production HTTP launcher for Plesk Node.js deployment.
//
// Layers (request flows top → bottom; first match wins):
//   1. /api/email-test            → sends a smoke-test email via M365 Graph API
//   2. /api/contact (planned)     → contact form handler, also via M365 Graph
//   3. wp-mirror static serving   → legacy WordPress wget snapshot at wp-mirror/
//   4. TanStack Start SSR         → built dist/server/server.js fetch handler
//
// PORT, HOST, and all M365_* env vars are loaded from .env.local via
// Node's --env-file-if-exists flag (set in ~/bin/beta-node-supervisor.sh).
// The supervisor restarts this process automatically every minute if it
// dies.

import { serve } from "srvx/node";
import { stat, readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import handler from "./dist/server/server.js";

const MIRROR_DIR = resolve(process.cwd(), "wp-mirror");
const PORT = process.env.PORT ?? 3000;
const HOST = process.env.HOST ?? undefined;

const MIRROR_EXCLUDE = new Set([
  "/api/",
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

// ─── M365 Graph API (OAuth2 client credentials → /sendMail) ─────────────────

let _cachedToken; // { token, expiresAt }

function requireEnv(...names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    throw new Error(`Missing env var(s) in .env.local: ${missing.join(", ")}`);
  }
}

async function getGraphToken() {
  // Reuse token if it has more than 60s left
  if (_cachedToken && _cachedToken.expiresAt > Date.now() + 60_000) {
    return _cachedToken.token;
  }
  requireEnv("M365_TENANT_ID", "M365_CLIENT_ID", "M365_CLIENT_SECRET");
  const tenant = process.env.M365_TENANT_ID;
  const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: process.env.M365_CLIENT_ID,
    client_secret: process.env.M365_CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`OAuth token request failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  _cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return _cachedToken.token;
}

async function sendMail({ subject, text, html, to }) {
  requireEnv("M365_SENDER");
  const sender = process.env.M365_SENDER;
  const recipient = to ?? process.env.LEAD_RECIPIENT ?? sender;
  const token = await getGraphToken();
  const payload = {
    message: {
      subject,
      body: {
        contentType: html ? "HTML" : "Text",
        content: html ?? text ?? "",
      },
      toRecipients: [{ emailAddress: { address: recipient } }],
    },
    saveToSentItems: true,
  };
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  // Graph returns 202 Accepted with empty body on success
  if (!res.ok) {
    throw new Error(`Graph sendMail failed: ${res.status} ${await res.text()}`);
  }
  return { ok: true, status: res.status, sender, recipient };
}

async function handleEmailTest(request) {
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method-not-allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }
  try {
    const result = await sendMail({
      subject: "beta.interactivedisplays.ie Graph API test",
      text: `Smoke test from the beta deployment confirming the M365 Graph API path works.\n\nTimestamp: ${new Date().toISOString()}\nSender: ${process.env.M365_SENDER}\nRecipient: ${process.env.LEAD_RECIPIENT ?? "(falls back to sender)"}`,
    });
    return new Response(JSON.stringify({ ok: true, ...result }, null, 2), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("[email-test] send failed:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }, null, 2),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}

// ─── Server ──────────────────────────────────────────────────────────────────

const server = serve({
  fetch: async (request) => {
    const url = new URL(request.url);

    // 1. Dedicated API routes (handled inline until we add proper TanStack
    //    API routes — keeps the smoke-test independent of the SSR bundle)
    if (url.pathname === "/api/email-test") {
      return handleEmailTest(request);
    }

    // 2. wp-mirror static serving
    const mirrorResponse = await tryServeMirror(request);
    if (mirrorResponse) return mirrorResponse;

    // 3. TanStack Start SSR
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
const m365Ready = !!(process.env.M365_TENANT_ID && process.env.M365_CLIENT_ID && process.env.M365_CLIENT_SECRET);
console.log(`interactivedisplays.ie — listening on ${url}`);
console.log(`  wp-mirror fallback: ${MIRROR_DIR}`);
console.log(`  /api/email-test: ${m365Ready ? "ready (Graph API)" : "NOT CONFIGURED (set M365_TENANT_ID/CLIENT_ID/CLIENT_SECRET)"}`);
