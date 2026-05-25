// Production HTTP launcher for Plesk Node.js deployment.
//
// Layers (request flows top → bottom; first match wins):
//   1. /api/email-test            → sends a smoke-test email via M365 SMTP
//   2. /api/contact (planned)     → contact form handler, also via M365 SMTP
//   3. wp-mirror static serving    → legacy WordPress wget snapshot at wp-mirror/
//   4. TanStack Start SSR          → built dist/server/server.js fetch handler
//
// PORT, HOST, and all SMTP_* env vars are loaded from .env.local via
// Node's --env-file-if-exists flag (set in ~/bin/beta-node-supervisor.sh).
// The supervisor restarts this process automatically every minute if it
// dies.

import { serve } from "srvx/node";
import { stat, readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import nodemailer from "nodemailer";
import handler from "./dist/server/server.js";

const MIRROR_DIR = resolve(process.cwd(), "wp-mirror");
const PORT = process.env.PORT ?? 3000;
const HOST = process.env.HOST ?? undefined;

// URL paths that should bypass the mirror and go straight to TanStack Start.
// Add a path here when a real TanStack route takes over from a mirror URL.
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

// ─── M365 SMTP ───────────────────────────────────────────────────────────────

let _transporter;
function getTransporter() {
  if (_transporter) return _transporter;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS must be set in .env.local");
  }
  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.office365.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false, // STARTTLS on 587
    auth: { user, pass },
  });
  return _transporter;
}

async function sendMail({ subject, text, html }) {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  const to = process.env.LEAD_RECIPIENT ?? from;
  const info = await getTransporter().sendMail({ from, to, subject, text, html });
  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  };
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
      subject: "beta.interactivedisplays.ie SMTP test",
      text: `This is a test message from the beta deployment confirming the M365 SMTP path works.\n\nTimestamp: ${new Date().toISOString()}\nFrom env SMTP_FROM: ${process.env.SMTP_FROM ?? "(unset)"}\nTo env LEAD_RECIPIENT: ${process.env.LEAD_RECIPIENT ?? "(unset)"}`,
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
console.log(`interactivedisplays.ie — listening on ${url}`);
console.log(`  wp-mirror fallback: ${MIRROR_DIR}`);
console.log(`  /api/email-test: ${process.env.SMTP_USER ? "ready" : "NOT CONFIGURED (set SMTP_USER/SMTP_PASS)"}`);
