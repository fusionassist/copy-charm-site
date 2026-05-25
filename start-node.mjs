// Production HTTP launcher for Plesk Node.js deployment.
//
// Layers (request flows top → bottom; first match wins):
//   1. /api/contact      → contact form handler, sends via M365 Graph API
//   2. /api/email-test   → smoke-test endpoint for the Graph plumbing
//   3. wp-mirror static  → legacy WordPress wget snapshot at wp-mirror/
//                          (excludes /api/* and /contact-us* — handled above
//                          and by TanStack respectively)
//   4. TanStack Start    → built dist/server/server.js fetch handler
//
// PORT, HOST, and all M365_* env vars are loaded from .env.local via
// Node's --env-file-if-exists flag (set in ~/bin/beta-node-supervisor.sh).

import { serve } from "srvx/node";
import { stat, readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { z } from "zod";
import handler from "./dist/server/server.js";

const MIRROR_DIR = resolve(process.cwd(), "wp-mirror");
const PORT = process.env.PORT ?? 3000;
const HOST = process.env.HOST ?? undefined;

// URL paths that should bypass the mirror and go straight to TanStack Start
// (or our inline API handlers above the mirror layer).
const MIRROR_EXCLUDE = new Set([
  "/api/",
  "/contact-us",
  "/contact-us/",
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

async function sendMail({ subject, text, html, to, replyTo }) {
  requireEnv("M365_SENDER");
  const sender = process.env.M365_SENDER;
  const recipient = to ?? process.env.LEAD_RECIPIENT ?? sender;
  const token = await getGraphToken();
  const message = {
    subject,
    body: {
      contentType: html ? "HTML" : "Text",
      content: html ?? text ?? "",
    },
    toRecipients: [{ emailAddress: { address: recipient } }],
  };
  if (replyTo) {
    message.replyTo = [{ emailAddress: { address: replyTo } }];
  }
  const payload = { message, saveToSentItems: true };
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Graph sendMail failed: ${res.status} ${await res.text()}`);
  }
  return { ok: true, status: res.status, sender, recipient };
}

// ─── /api/email-test ─────────────────────────────────────────────────────────

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

// ─── /api/contact ────────────────────────────────────────────────────────────

const leadSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional().or(z.literal("")),
  company: z.string().max(120).optional().or(z.literal("")),
  message: z.string().min(10).max(5000),
  sourcePage: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
});

function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatLeadEmail(lead) {
  const lines = [
    `New contact form submission from beta.interactivedisplays.ie`,
    ``,
    `Name:    ${lead.name}`,
    `Email:   ${lead.email}`,
    `Phone:   ${lead.phone || "(not provided)"}`,
    `Company: ${lead.company || "(not provided)"}`,
    ``,
    `Message:`,
    lead.message,
    ``,
    `---`,
    `Submitted: ${new Date().toISOString()}`,
    `From page: ${lead.sourcePage || "(unknown)"}`,
    `Referrer:  ${lead.referrer || "(direct)"}`,
  ];
  const text = lines.join("\n");
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px;">
      <p>New contact form submission from <strong>beta.interactivedisplays.ie</strong></p>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Name</td><td><strong>${escapeHtml(lead.name)}</strong></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Email</td><td><a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Phone</td><td>${escapeHtml(lead.phone || "(not provided)")}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Company</td><td>${escapeHtml(lead.company || "(not provided)")}</td></tr>
      </table>
      <h3 style="margin-top: 24px;">Message</h3>
      <p style="white-space: pre-wrap; background: #f6f6f6; padding: 12px; border-radius: 6px;">${escapeHtml(lead.message)}</p>
      <hr style="margin-top: 24px; border: none; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px;">
        Submitted ${new Date().toISOString()}<br>
        From page: ${escapeHtml(lead.sourcePage || "(unknown)")}<br>
        Referrer: ${escapeHtml(lead.referrer || "(direct)")}
      </p>
    </div>
  `;
  return { text, html };
}

async function handleContact(request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "method-not-allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: "invalid-json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "validation-failed",
        issues: parsed.error.flatten().fieldErrors,
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  const lead = parsed.data;
  const { text, html } = formatLeadEmail(lead);
  try {
    const result = await sendMail({
      subject: `New IDI website lead: ${lead.name}${lead.company ? " (" + lead.company + ")" : ""}`,
      text,
      html,
      replyTo: lead.email,
    });
    return new Response(JSON.stringify({ success: true, messageStatus: result.status }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("[contact] send failed:", err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message ?? String(err) }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}

// ─── Server ──────────────────────────────────────────────────────────────────

const server = serve({
  fetch: async (request) => {
    const url = new URL(request.url);

    // 1. Dedicated API routes (handled inline)
    if (url.pathname === "/api/contact") return handleContact(request);
    if (url.pathname === "/api/email-test") return handleEmailTest(request);

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
console.log(`  /api/email-test + /api/contact: ${m365Ready ? "ready (Graph API)" : "NOT CONFIGURED (set M365_* in .env.local)"}`);
