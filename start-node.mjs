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

// Process-level error handlers — drive-by scanners, malformed URIs, and
// other unexpected exceptions should not bring the whole site down. Log
// loudly so we still see them in the supervisor's app.log, but don't
// terminate the process. The supervisor's last-line-of-defense (cron
// every minute) catches genuine crashes; this catches the noise.
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

import { serve } from "srvx/node";
import { stat, readFile, readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { z } from "zod";
import yaml from "js-yaml";
import handler from "./dist/server/server.js";

// Manual frontmatter parser — gray-matter ships with the v3 js-yaml API
// (safeLoad etc.) which was removed in js-yaml@4. We force js-yaml@4 via
// package.json overrides to fix an unrelated xmlbuilder2 issue, so we
// bypass gray-matter here and use js-yaml directly.
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  let data = {};
  try {
    data = yaml.load(match[1]) ?? {};
    if (typeof data !== "object" || Array.isArray(data)) data = {};
  } catch (err) {
    console.error("[content] frontmatter YAML parse failed:", err);
    data = {};
  }
  return { data, content: match[2] };
}

const MIRROR_DIR = resolve(process.cwd(), "wp-mirror");
const CLIENT_DIR = resolve(process.cwd(), "dist", "client");
const CONTENT_DIR = resolve(process.cwd(), "src", "content");
const SITE_URL = process.env.VITE_PUBLIC_SITE_URL ?? "https://beta.interactivedisplays.ie";
const PORT = process.env.PORT ?? 3000;
const HOST = process.env.HOST ?? undefined;

// When true (set on the beta/staging host), the whole site is walled off
// from search engines: X-Robots-Tag: noindex on every response, robots.txt
// disallows all, and the mirror's inherited "index,follow" meta is
// rewritten to noindex. Prevents the staging copy from competing with the
// live WordPress site in search. Flip to false at production cutover.
const NOINDEX = process.env.SITE_NOINDEX === "true" || process.env.SITE_NOINDEX === "1";

// Permanent 301 from the staging host to production. Set on the SAME app
// after cutover when this directory becomes production (then we still
// receive any inbound traffic to beta.interactivedisplays.ie and forward
// it permanently). When unset, request flows continue normally.
const REDIRECT_TO_HOST = process.env.REDIRECT_TO_HOST || "";

// IDI organisation metadata mirror — kept in sync with src/lib/site-meta.ts.
// Hard-coded here because start-node.mjs runs outside the Vite build and
// can't import from src/. Update both files when this changes.
const ORG = {
  name: "Interactive Displays Ireland",
  tagline: "Digital signage, touchscreens and AV installation across Ireland",
  description:
    "Interactive Displays Ireland (IDI) supplies, installs and supports LED and LCD digital signage, interactive touchscreens, outdoor displays, kiosks and LED video walls for retail, hospitality, education, healthcare and corporate clients across Ireland. Family-run from Co. Meath since 2009. 3-year warranty as standard. Nationwide installation across all 32 counties.",
  email: "sales@interactivedisplays.ie",
  phone: "+353 44 967 2855",
  address: "Dromone, Oldcastle, Co. Meath, Ireland A82 E0W4",
  categories: [
    { slug: "interactive", name: "Interactive Displays" },
    { slug: "outdoor", name: "Outdoor Displays" },
    { slug: "indoor", name: "Indoor Displays" },
    { slug: "touchscreen", name: "Touchscreens & Kiosks" },
    { slug: "led", name: "LED Video Walls" },
    { slug: "self-ordering", name: "Self-Ordering Kiosks" },
    { slug: "high-brightness", name: "High-Brightness Displays" },
    { slug: "display", name: "Displays" },
  ],
  brands: [
    { slug: "moytronix", name: "Moytronix (in-house IDI brand)" },
    { slug: "promethean", name: "Promethean" },
    { slug: "vestel", name: "Vestel" },
  ],
};

const STATIC_PAGES = [
  { path: "/", title: "Home", description: ORG.tagline, priority: "1.0", changefreq: "weekly" },
  { path: "/contact-us", title: "Contact us", description: "Sales enquiries, contact form, office details.", priority: "0.9", changefreq: "monthly" },
];

// Canonical URL targets known to the site from the wp-mirror — every URL
// in POST_ID_MAP.values() is a real page Google should index. Used by
// /sitemap.xml so Google's view of the site is comprehensive even though
// most of these pages are still mirror-served. Deduplicated + sorted at
// build time so the sitemap output is stable.
const MIRROR_PAGES = [
  // Service pages
  "/supply-installation/",
  "/training-support/",
  "/content-management-creation/",
  "/queue-management-system/",
  "/digital-ticket/",
  "/online-appointment/",
  "/customer-counting-solution/",
  "/satisfaction-survey/",
  "/corporate-reception-solution/",
  "/vending-machines/",
  "/food-business-digital-menu-board/",
  // Insights / blog
  "/choosing-the-right-digital-signage/",
  "/how-digital-screen-displays-can-increase-footfall-and-sales/",
  "/digital-signage-in-modern-retail/",
  "/interactive-whiteboards-in-schools/",
  "/how-irish-retailers-are-boosting-sales-with-digital-signage/",
  "/outdoor-digital-signage-in-ireland/",
  // Careers
  "/careers/",
  "/careers/av-business-development/",
  "/careers/technical-support-specialist/",
  "/careers/stores-coordinator/",
  "/careers/account-manager/",
  "/careers/installation-and-service-technician/",
  // Products — taken from POST_ID_MAP /product/* values
  "/product/pcap-touch-screen/",
  "/product/pcap-kiosk-screen/",
  "/product/slim-freestanding-totem/",
  "/product/pos-touch-screen/",
  "/product/mirror-touch-screen/",
  "/product/self-service-touchscreen-kiosk/",
  "/product/freestanding-outdoor-display/",
  "/product/mounted-outdoor-display/",
  "/product/android-a-board/",
  "/product/outdoor-self-service-kiosk/",
  "/product/ultra-high-bright-display/",
  "/product/ultra-high-bright-display-tni/",
  "/product/hanging-dual-sided-display/",
  "/product/professional-monitor/",
  "/product/large-format-signage/",
  "/product/lcd-video-wall/",
  "/product/android-network-display/",
  "/product/dual-sided-standing-totem/",
  "/product/slim-standing-totem/",
  "/product/network-menu-boards/",
  "/product/pos-advertising-display/",
  "/product/outdoor-self-service-kiosk-2/",
  "/product/self-service-kiosk/",
  "/product/drive-thru-screen/",
  "/product/slim-self-service-kiosk/",
  "/product/vestel-stm-series/",
  "/product/crystal-flex-led/",
  "/product/indoor-led-video-wall/",
  "/product/outdoor-led-video-wall/",
  "/product/transparent-led-display/",
  "/product/ar-mirror/",
  "/product/promethean-activpanel/",
  "/product/new-ifx-series/",
  "/product/digital-ticketing-system/",
  "/product/led-box-signage/",
  // Categories
  "/product-category/interactive/",
  "/product-category/outdoor/",
  "/product-category/indoor/",
  "/product-category/touchscreen/",
  "/product-category/led/",
  "/product-category/self-ordering/",
  "/product-category/high-brightness/",
  "/product-category/display/",
  // Brands
  "/brand/moytronix/",
  "/brand/promethean/",
  "/brand/vestel/",
  // Top-level navigation
  "/shop/",
  "/insights/",
];

// AI crawler user-agents we explicitly allow in robots.txt. IDI wants
// AI-driven search to surface their products + content.
const AI_CRAWLERS_ALLOWED = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Bingbot",
  "Applebot",
  "Applebot-Extended",
  "Amazonbot",
  "CCBot",
  "DuckAssistBot",
  "cohere-ai",
  "Bytespider",
  "FacebookBot",
  "ImagesiftBot",
  "omgili",
];

// 301-redirect map — see src/lib/redirects.ts for the documented version.
// Mirrored here because start-node.mjs runs outside the Vite/TS build and
// can't import from src/. Keep this in sync with src/lib/redirects.ts —
// the source-of-truth audit lives there.
const POST_ID_MAP = {
  "117":  "/product/pcap-touch-screen/",
  "368":  "/contact-us/",
  "589":  "/product/pcap-kiosk-screen/",
  "638":  "/how-irish-retailers-are-boosting-sales-with-digital-signage/",
  "724":  "/supply-installation/",
  "791":  "/product/slim-freestanding-totem/",
  "805":  "/product/pos-touch-screen/",
  "818":  "/product/mirror-touch-screen/",
  "825":  "/product/self-service-touchscreen-kiosk/",
  "861":  "/product/freestanding-outdoor-display/",
  "869":  "/product/mounted-outdoor-display/",
  "877":  "/product/android-a-board/",
  "886":  "/product/outdoor-self-service-kiosk/",
  "890":  "/product/ultra-high-bright-display/",
  "898":  "/product/ultra-high-bright-display-tni/",
  "905":  "/product/hanging-dual-sided-display/",
  "914":  "/product/professional-monitor/",
  "922":  "/product/large-format-signage/",
  "930":  "/product/lcd-video-wall/",
  "937":  "/product/android-network-display/",
  "945":  "/product/dual-sided-standing-totem/",
  "949":  "/product/slim-standing-totem/",
  "956":  "/product/network-menu-boards/",
  "1002": "/product/pos-advertising-display/",
  "1005": "/product/outdoor-self-service-kiosk-2/",
  "1022": "/product/self-service-kiosk/",
  "1023": "/product/drive-thru-screen/",
  "1029": "/product/slim-self-service-kiosk/",
  "1047": "/product/vestel-stm-series/",
  "1051": "/product/crystal-flex-led/",
  "1056": "/product/indoor-led-video-wall/",
  "1063": "/product/outdoor-led-video-wall/",
  "1071": "/product/transparent-led-display/",
  "1076": "/product/ar-mirror/",
  "1082": "/product/promethean-activpanel/",
  "1119": "/product/new-ifx-series/",
  "1248": "/training-support/",
  "1261": "/content-management-creation/",
  "1286": "/queue-management-system/",
  "1316": "/digital-ticket/",
  "1335": "/online-appointment/",
  "1352": "/customer-counting-solution/",
  "1361": "/satisfaction-survey/",
  "1372": "/corporate-reception-solution/",
  "1428": "/choosing-the-right-digital-signage/",
  "1448": "/how-digital-screen-displays-can-increase-footfall-and-sales/",
  "1479": "/digital-signage-in-modern-retail/",
  "1498": "/interactive-whiteboards-in-schools/",
  "1507": "/vending-machines/",
  "1598": "/product/digital-ticketing-system/",
  "1611": "/outdoor-digital-signage-in-ireland/",
  "1648": "/food-business-digital-menu-board/",
  "1762": "/product/led-box-signage/",
  "1821": "/careers/av-business-development/",
  "1912": "/careers/technical-support-specialist/",
  "1915": "/careers/stores-coordinator/",
  "1918": "/careers/account-manager/",
  "1923": "/careers/installation-and-service-technician/",
  "1926": "/careers/",
};

function resolveRedirect(pathname, search) {
  // /?p=N or /index.php?p=N or /?page_id=N
  if (pathname === "/" || pathname === "/index.php") {
    const params = new URLSearchParams(search);
    const postId = params.get("p") ?? params.get("page_id");
    if (postId && POST_ID_MAP[postId]) {
      return { target: POST_ID_MAP[postId], status: 301 };
    }
  }
  // /index.html@p=N.html  — wget cached form (rare in the wild but harmless to handle)
  const wgetMatch = pathname.match(/^\/index\.html@p=(\d+)\.html$/);
  if (wgetMatch && POST_ID_MAP[wgetMatch[1]]) {
    return { target: POST_ID_MAP[wgetMatch[1]], status: 301 };
  }
  // /elementor-6/* — legacy WordPress + Elementor homepage template path.
  // Same content as /, so any visitor (or Googlebot) hitting it gets
  // 301'd to the canonical homepage.
  if (/^\/elementor-6\/?(?:index\.html)?$/i.test(pathname)) {
    return { target: "/", status: 301 };
  }
  // /interactivedisplays.ie/* — wget-mangled relative path resolved
  // wrong. Any visitor hitting it (Google, a cached external link)
  // forwards to /.
  if (/^\/interactivedisplays\.ie\/?(?:index\.html)?$/i.test(pathname)) {
    return { target: "/", status: 301 };
  }
  // Legacy Rank Math sitemap paths — the WP site used a multi-file
  // sitemap index (sitemap_index.xml + per-type sitemaps). Google Search
  // Console, external SEO tools, and other sites linking to those URLs
  // get a 301 to our new combined /sitemap.xml so no submission record
  // dead-ends at a 404.
  if (
    pathname === "/sitemap_index.xml" ||
    /^\/(post|page|product|product_cat|product-cat|product_tag|product-tag|category|brand|author)-sitemap\d*\.xml$/i.test(pathname)
  ) {
    return { target: "/sitemap.xml", status: 301 };
  }
  return null;
}

// URL paths that should bypass the mirror and go straight to TanStack Start
// (or our inline API handlers above the mirror layer).
// Paths handled by TanStack Start (or our inline API handlers) instead of
// the wp-mirror. Add new entries here as routes are migrated. Exact match
// or prefix-match for entries ending in "/".
const MIRROR_EXCLUDE = new Set([
  "/api/",
  "/contact-us",
  "/contact-us/",
  "/llms.txt",
  "/llms-full.txt",
  "/robots.txt",
  "/sitemap.xml",
]);
// Exact-only matches (the homepage gets added back here when the React
// homepage redesign is ready — for now it serves from the wp-mirror).
const MIRROR_EXCLUDE_EXACT = new Set();

function isMirrorExcluded(pathname) {
  if (MIRROR_EXCLUDE_EXACT.has(pathname)) return true;
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

// Serves any file from dist/client/ — Vite puts both its hashed bundles
// (/assets/*) and anything copied from public/ (e.g. /brand/, /images/)
// there during build. Hashed asset names are immutable; everything else
// gets a shorter cache window so brand assets can be swapped without a
// rebuild-only deploy.
async function tryServeClientAsset(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  if (url.pathname === "/" || url.pathname === "") return null;
  // Defense in depth: resolve the path and ensure it stays inside CLIENT_DIR
  const stripped = url.pathname.replace(/^\/+/, "");
  if (!stripped) return null;
  const file = resolve(CLIENT_DIR, stripped);
  if (!file.startsWith(CLIENT_DIR + "/") && file !== CLIENT_DIR) return null;
  if (!(await isFile(file))) return null;
  const ext = extname(file).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
  const body = request.method === "HEAD" ? null : await readFile(file);
  const isHashed = url.pathname.startsWith("/assets/");
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": isHashed
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600",
      "x-served-by": "dist-client",
    },
  });
}

// Builds the Odoo Live Chat <script> tags from env vars. Same shape as
// what src/components/chat/OdooLiveChat.tsx renders for TanStack routes —
// we keep both in sync so the chat bubble looks identical regardless of
// which layer is rendering the page.
function buildOdooChatSnippet() {
  const base = (process.env.VITE_PUBLIC_ODOO_BASE_URL ?? "").replace(/\/+$/, "");
  const channel = process.env.VITE_PUBLIC_ODOO_LIVECHAT_CHANNEL_ID;
  if (!base || !channel) return "";
  // fusion_domain → CRM/helpdesk attribution in the custom fusion_ai_livechat
  // module. Derive the host from the configured site URL.
  let fusionDomain = "";
  try {
    fusionDomain = new URL(SITE_URL).hostname;
  } catch {
    fusionDomain = "";
  }
  const loaderSrc = fusionDomain
    ? `${base}/im_livechat/loader/${channel}?fusion_domain=${encodeURIComponent(fusionDomain)}`
    : `${base}/im_livechat/loader/${channel}`;
  return [
    `<script defer type="text/javascript" src="${loaderSrc}"></script>`,
    `<script defer type="text/javascript" src="${base}/im_livechat/assets_embed.js"></script>`,
  ].join("");
}

const ODOO_CHAT_SNIPPET = buildOdooChatSnippet();

// Legacy Tawk.to chat is baked into the wget mirror HTML. The migration
// dropped Tawk entirely in favour of Odoo Live Chat, so strip every
// trace of it from mirror responses.
const TAWK_PATTERNS = [
  /<script id="tawk-script"[\s\S]*?<\/script>/gi,
  /<script[^>]*>[\s\S]*?embed\.tawk\.to[\s\S]*?<\/script>/gi,
];

function rewriteMirrorHtml(html) {
  let out = html;
  // 1. Strip legacy Tawk.to (always — independent of Odoo config)
  for (const pattern of TAWK_PATTERNS) {
    out = out.replace(pattern, "");
  }
  // 1b. WordPress + Elementor served the homepage template at
  // /elementor-6/index.html and link rewrites in the mirror still point
  // every nav-to-home / logo-click at it (~150 mirror files). The URL is
  // ugly, hurts SEO (duplicate content with /), and is meaningless to
  // anyone outside the WP backend. Fold every such link back to /.
  out = out.replace(
    /href="(?:\.\.\/)*elementor-6\/(?:index\.html)?"/gi,
    'href="/"',
  );
  out = out.replace(
    /href="\/elementor-6\/(?:index\.html)?"/gi,
    'href="/"',
  );
  // 1c. wget mangled some self-domain links on inner pages to point at
  // a "folder" matching the domain — eg. href="../../../interactivedisplays.ie/index.html".
  // The browser resolves that to /interactivedisplays.ie/index.html, a
  // 404. ~146 mirror files affected. Fold all depths back to "/".
  out = out.replace(
    /href="(?:\.\.\/)+interactivedisplays\.ie\/(?:index\.html)?"/gi,
    'href="/"',
  );
  out = out.replace(
    /href="\/interactivedisplays\.ie\/(?:index\.html)?"/gi,
    'href="/"',
  );
  // 2. On staging, neutralise the mirror's inherited "index, follow" robots
  //    meta so the staging copy isn't invited into search indexes. The
  //    X-Robots-Tag header is authoritative, but rewriting the meta avoids
  //    a confusing mixed signal.
  if (NOINDEX) {
    out = out.replace(
      /<meta\s+name=["']robots["'][^>]*>/gi,
      '<meta name="robots" content="noindex, nofollow"/>',
    );
  }
  // 3. Inject Odoo Live Chat before </body> (if configured)
  if (ODOO_CHAT_SNIPPET) {
    out = out.includes("</body>")
      ? out.replace("</body>", ODOO_CHAT_SNIPPET + "</body>")
      : out + ODOO_CHAT_SNIPPET;
  }
  return out;
}

// Rewrite SEO metadata that wget mangled when it snapshotted the legacy
// WP site. Three failure modes seen on disk:
//   homepage:  canonical="../interactivedisplays.ie/index.html"
//   product:   canonical="../../product/android-a-board/"
//   category:  canonical="index.html"  (just the local file name)
//   og:url:    content="/index.html" or content="/"
// Replace them all with the absolute URL Google should treat as canonical:
// SITE_URL + the current request path. At cutover we flip SITE_URL from
// beta to interactivedisplays.ie and every canonical follows automatically.
// Extract og:* / meta content values from mirror HTML. Returns null when
// not present. Used by both rewriteSeoTags() (to absolutize og:image) and
// buildPageSchema() (to mint Product / Service / Article JSON-LD).
function extractMeta(html, selector) {
  // selector: { property: "og:image" } or { name: "description" }
  const key = selector.property ? "property" : "name";
  const val = selector.property ?? selector.name;
  const re = new RegExp(
    `<meta\\s+[^>]*${key}\\s*=\\s*["']${val.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}["'][^>]*content\\s*=\\s*["']([^"']*)["']`,
    "i",
  );
  const m = html.match(re);
  if (m) return m[1];
  // Fallback: content might come before the property
  const re2 = new RegExp(
    `<meta\\s+[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*${key}\\s*=\\s*["']${val.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}["']`,
    "i",
  );
  const m2 = html.match(re2);
  return m2 ? m2[1] : null;
}

function absolutizeUrl(maybeRelative) {
  if (!maybeRelative) return null;
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
  const base = SITE_URL.replace(/\/+$/, "");
  if (maybeRelative.startsWith("/")) return base + maybeRelative;
  return `${base}/${maybeRelative}`;
}

function htmlDecode(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function escapeJsonLd(str) {
  if (!str) return "";
  // Backslash-escape any </ that could close the script tag.
  return String(str).replace(/<\/(script)/gi, "<\\/$1");
}

// Build a JSON-LD <script> block appropriate for the page type. URL pattern
// is the primary classifier; og:type from the existing Rank Math meta is the
// secondary signal (eg. /training-support/ has og:type=article on disk but
// it's really a service page).
function buildPageSchema(html, requestPath, canonicalUrl) {
  const title = htmlDecode(extractMeta(html, { property: "og:title" }) ?? "");
  const description = htmlDecode(
    extractMeta(html, { property: "og:description" }) ??
      extractMeta(html, { name: "description" }) ??
      "",
  );
  const ogImage = absolutizeUrl(extractMeta(html, { property: "og:image" }));
  const ogType = extractMeta(html, { property: "og:type" });
  const ogUpdated = extractMeta(html, { property: "og:updated_time" });
  const articlePublished = extractMeta(html, { property: "article:published_time" });
  const articleModified = extractMeta(html, { property: "article:modified_time" });
  const productCurrency = extractMeta(html, { property: "product:price:currency" });
  const productAvailability = extractMeta(html, { property: "product:availability" });

  if (!title) return ""; // Don't emit empty schema

  const orgRef = {
    "@type": "Organization",
    "@id": `${SITE_URL.replace(/\/+$/, "")}/#organization`,
    name: "Interactive Displays Ireland",
    url: SITE_URL,
  };

  let payload;

  // 1. Product pages → Product schema
  if (requestPath.startsWith("/product/")) {
    payload = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: title,
      description,
      url: canonicalUrl,
      brand: orgRef,
      ...(ogImage ? { image: ogImage } : {}),
      ...(productCurrency
        ? {
            offers: {
              "@type": "Offer",
              priceCurrency: productCurrency,
              availability:
                productAvailability === "instock"
                  ? "https://schema.org/InStock"
                  : "https://schema.org/PreOrder",
              url: canonicalUrl,
              seller: orgRef,
            },
          }
        : {}),
    };
  }
  // 2. Insights / blog posts → Article schema
  else if (
    requestPath.startsWith("/insights/") ||
    requestPath.match(
      /^\/(choosing-the-right-digital-signage|digital-signage-in-modern-retail|how-irish-retailers-are-boosting-sales-with-digital-signage|how-digital-screen-displays-can-increase-footfall-and-sales|interactive-whiteboards-in-schools|outdoor-digital-signage-in-ireland|food-business-digital-menu-board)\/$/,
    )
  ) {
    payload = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      url: canonicalUrl,
      ...(ogImage ? { image: ogImage } : {}),
      author: orgRef,
      publisher: orgRef,
      ...(articlePublished ? { datePublished: articlePublished } : {}),
      ...(articleModified
        ? { dateModified: articleModified }
        : ogUpdated
          ? { dateModified: ogUpdated }
          : {}),
      mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    };
  }
  // 3. Career listings → JobPosting (sparse — full data isn't in the meta)
  else if (requestPath.startsWith("/careers/") && requestPath !== "/careers/") {
    payload = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title,
      description,
      url: canonicalUrl,
      ...(ogImage ? { image: ogImage } : {}),
      hiringOrganization: orgRef,
      ...(articlePublished ? { datePosted: articlePublished } : {}),
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressCountry: "IE",
          addressRegion: "Ireland",
        },
      },
    };
  }
  // 4. Top-level service pages → Service schema
  else if (
    requestPath.match(
      /^\/(supply-installation|training-support|content-management-creation|queue-management-system|digital-ticket|online-appointment|customer-counting-solution|satisfaction-survey|corporate-reception-solution|vending-machines)\/$/,
    )
  ) {
    payload = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: title,
      description,
      url: canonicalUrl,
      ...(ogImage ? { image: ogImage } : {}),
      provider: orgRef,
      areaServed: { "@type": "Country", name: "Ireland" },
      serviceType: title,
    };
  }
  // 5. Product category / brand listing pages → CollectionPage
  else if (
    requestPath.startsWith("/product-category/") ||
    requestPath.startsWith("/brand/")
  ) {
    payload = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description,
      url: canonicalUrl,
      ...(ogImage ? { image: ogImage } : {}),
      isPartOf: orgRef,
    };
  } else {
    return ""; // Page type we don't have a schema mapping for — skip
  }

  const json = escapeJsonLd(JSON.stringify(payload));
  return `<script type="application/ld+json" data-injected="mirror">${json}</script>`;
}

function rewriteSeoTags(html, requestPath) {
  if (!SITE_URL) return html;
  // Normalise path: keep the leading slash; for the homepage `/`, drop the
  // trailing slash so canonicals read as `https://host` (Google treats them
  // as equivalent but the trailing-slash form is common WP convention).
  const cleanPath = requestPath === "/" ? "/" : requestPath.replace(/\/+$/, "/");
  const canonicalUrl = `${SITE_URL.replace(/\/+$/, "")}${cleanPath === "/" ? "/" : cleanPath}`;
  const baseUrl = SITE_URL.replace(/\/+$/, "");

  let out = html;

  // 1. <link rel="canonical" href="...">  — replace with absolute URL
  out = out.replace(
    /<link\s+[^>]*rel\s*=\s*["']canonical["'][^>]*>/gi,
    `<link rel="canonical" href="${canonicalUrl}"/>`,
  );

  // 2. <meta property="og:url" content="..."> — same target
  out = out.replace(
    /<meta\s+[^>]*property\s*=\s*["']og:url["'][^>]*>/gi,
    `<meta property="og:url" content="${canonicalUrl}"/>`,
  );

  // 3. <meta name="twitter:url" content="..."> — same target
  out = out.replace(
    /<meta\s+[^>]*name\s*=\s*["']twitter:url["'][^>]*>/gi,
    `<meta name="twitter:url" content="${canonicalUrl}"/>`,
  );

  // 4. <meta property="og:image" content="/relative/path"> — absolutize to
  //    SITE_URL so social platforms (LinkedIn, WhatsApp, Slack, Discord)
  //    can fetch the image for their preview cards. Same for og:image:secure_url
  //    and twitter:image.
  const baseAbs = SITE_URL.replace(/\/+$/, "");
  const FALLBACK_OG = `${baseAbs}/brand/og-default.png`;
  const absolutizeImg = (raw) => {
    if (!raw) return raw;
    return raw.replace(
      /content\s*=\s*["']([^"']+)["']/i,
      (_, src) => {
        // Some legacy WP og:image refs point at files that don't exist
        // in the mirror (eg. the homepage's interactive-displays-logo.png).
        // Substitute the branded default image for known-bad WP-uploads
        // references to the homepage logo.
        if (/wp-content\/uploads\/2025\/07\/interactive-displays-logo\.png/i.test(src)) {
          return `content="${FALLBACK_OG}"`;
        }
        const abs = absolutizeUrl(src);
        return `content="${abs}"`;
      },
    );
  };
  out = out.replace(
    /<meta\s+[^>]*property\s*=\s*["']og:image["'][^>]*>/gi,
    (m) => absolutizeImg(m),
  );
  out = out.replace(
    /<meta\s+[^>]*property\s*=\s*["']og:image:secure_url["'][^>]*>/gi,
    (m) => absolutizeImg(m),
  );
  out = out.replace(
    /<meta\s+[^>]*name\s*=\s*["']twitter:image["'][^>]*>/gi,
    (m) => absolutizeImg(m),
  );

  // 6. Normalise www.interactivedisplays.ie references → bare domain. Rank
  //    Math wrote its JSON-LD with full www. URLs and relative @id refs
  //    ("@id":"/#organization"). Both need normalising so Google sees one
  //    consistent canonical entity.
  out = out.replace(/https:\/\/www\.interactivedisplays\.ie/gi, baseAbs);
  // Relative @id refs ("@id":"/#organization", "@id":"/foo/#bar") need an
  // absolute prefix so Schema.org's identity graph resolves correctly.
  out = out.replace(/"@id":"\/#/g, `"@id":"${baseAbs}/#`);

  // 5. Build a Schema.org JSON-LD block for the page type. Injected just
  //    before </head> so it sits with the other meta tags. Uses the existing
  //    og:* values, so this is purely additive — no duplication of data,
  //    just a parsed form that Google/Bing/AI agents can read directly.
  const schemaBlock = buildPageSchema(html, requestPath, canonicalUrl);
  if (schemaBlock) {
    out = out.includes("</head>")
      ? out.replace("</head>", schemaBlock + "</head>")
      : out + schemaBlock;
  }

  // Silence unused warning — baseUrl reserved for future per-section logic
  void baseUrl;
  return out;
}

// Decode a URL path safely. Malformed %-encoding (eg. /%FF from drive-by
// scanners and fuzzers) throws URIError; we swallow and return null so
// the request lands in 404-fallthrough instead of crashing the process.
function safeDecodePath(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

async function tryServeMirror(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  if (isMirrorExcluded(url.pathname)) return null;
  const decoded = safeDecodePath(url.pathname);
  if (decoded === null) return null;
  const file = await resolveMirrorFile(decoded, url.search.slice(1));
  if (!file) return null;
  const ext = extname(file).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
  const isHtml = contentType.startsWith("text/html");
  let body;
  if (request.method === "HEAD") {
    body = null;
  } else if (isHtml) {
    // Read HTML as utf8 so we can run the rewriter pipeline:
    //   strip Tawk → fix wget-mangled canonical/og:url → optional noindex
    //   meta rewrite → inject Odoo chat
    const raw = await readFile(file, "utf8");
    const seoFixed = rewriteSeoTags(raw, url.pathname);
    body = rewriteMirrorHtml(seoFixed);
  } else {
    body = await readFile(file);
  }
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

// ─── MDX content loaded from disk (mirror of src/lib/mdx.ts) ─────────────────
// These handlers run from start-node.mjs which is outside the Vite/MDX
// build. Read raw .mdx files at runtime and parse frontmatter with
// gray-matter — independent of the SSR bundle.

async function loadContent(type) {
  const dir = join(CONTENT_DIR, type);
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const items = [];
  for (const filename of entries) {
    if (!filename.endsWith(".mdx")) continue;
    const fullPath = join(dir, filename);
    try {
      const raw = await readFile(fullPath, "utf8");
      const { data, content } = parseFrontmatter(raw);
      const slug = data.slug ?? filename.replace(/\.mdx$/, "");
      items.push({ slug, frontmatter: data, body: content.trim(), filename });
    } catch (err) {
      console.error(`[content] failed to load ${fullPath}:`, err);
    }
  }
  return items;
}

function pathForContent(type, slug) {
  switch (type) {
    case "products": return `/product/${slug}`;
    case "posts":    return `/insights/${slug}`;
    case "jobs":     return `/careers/${slug}`;
    case "pages":    return `/${slug}`;
    default:         return `/${slug}`;
  }
}

// ─── /robots.txt ─────────────────────────────────────────────────────────────

function handleRobots() {
  let lines;
  if (NOINDEX) {
    // Staging: keep everything out of search indexes.
    lines = [
      "# robots.txt — STAGING (beta). Indexing disabled until production cutover.",
      "User-agent: *",
      "Disallow: /",
      "",
    ];
  } else {
    lines = [
      "# robots.txt — interactivedisplays.ie",
      "# AI crawlers are explicitly allowed; IDI wants products and",
      "# content to surface in AI-powered search and chat agents.",
      "",
      "User-agent: *",
      "Allow: /",
      "Disallow: /api/",
      "Disallow: /dev/",
      "",
      ...AI_CRAWLERS_ALLOWED.flatMap((ua) => [`User-agent: ${ua}`, "Allow: /", ""]),
      `Sitemap: ${SITE_URL}/sitemap.xml`,
      "",
    ];
  }
  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

// ─── /sitemap.xml ────────────────────────────────────────────────────────────

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function handleSitemap() {
  const [products, posts, jobs, pages] = await Promise.all([
    loadContent("products"),
    loadContent("posts"),
    loadContent("jobs"),
    loadContent("pages"),
  ]);

  const today = new Date().toISOString().split("T")[0];

  // Normalise any date-like value to the W3C date format Google's sitemap
  // schema accepts (YYYY-MM-DD or full ISO 8601). js-yaml auto-parses
  // unquoted YAML dates (`updatedAt: 2025-08-22`) to JavaScript Date
  // objects — without this normalisation they get stringified as
  // "Fri Aug 22 2025 01:00:00 GMT+0100 (...)", which GSC rejects as
  // "Invalid date".
  const isoDate = (val) => {
    if (!val) return today;
    if (val instanceof Date) {
      if (Number.isNaN(val.getTime())) return today;
      return val.toISOString().split("T")[0];
    }
    if (typeof val === "string") {
      // Already in YYYY-MM-DD or ISO 8601 — accept as-is
      if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(val)) {
        return val;
      }
      // Otherwise try to coerce
      const d = new Date(val);
      if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0];
    }
    return today;
  };

  const entries = [
    ...MIRROR_PAGES.map((path) => ({
      loc: SITE_URL + path,
      lastmod: today,
      changefreq: path.startsWith("/product/") ? "monthly" : "weekly",
      priority: path.startsWith("/product/") ? "0.7" : "0.6",
    })),
    ...STATIC_PAGES.map((p) => ({
      loc: SITE_URL + p.path,
      lastmod: today,
      changefreq: p.changefreq,
      priority: p.priority,
    })),
    ...products.map((p) => ({
      loc: SITE_URL + pathForContent("products", p.slug),
      lastmod: isoDate(p.frontmatter.updatedAt ?? p.frontmatter.publishedAt),
      changefreq: "monthly",
      priority: "0.7",
    })),
    ...posts.map((p) => ({
      loc: SITE_URL + pathForContent("posts", p.slug),
      lastmod: isoDate(p.frontmatter.updatedAt ?? p.frontmatter.publishedAt),
      changefreq: "monthly",
      priority: "0.6",
    })),
    ...jobs.map((j) => ({
      loc: SITE_URL + pathForContent("jobs", j.slug),
      lastmod: isoDate(j.frontmatter.publishedAt),
      changefreq: "weekly",
      priority: "0.5",
    })),
    ...pages.map((p) => ({
      loc: SITE_URL + pathForContent("pages", p.slug),
      lastmod: today,
      changefreq: "monthly",
      priority: "0.8",
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) =>
      `  <url>
    <loc>${xmlEscape(e.loc)}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

// ─── /llms.txt ───────────────────────────────────────────────────────────────
// Karpathy-proposed standard (https://llmstxt.org/). A markdown outline
// of the site for LLM agents to consume.

async function handleLlmsTxt() {
  const [products, posts, jobs, pages] = await Promise.all([
    loadContent("products"),
    loadContent("posts"),
    loadContent("jobs"),
    loadContent("pages"),
  ]);

  const lines = [
    `# ${ORG.name}`,
    "",
    `> ${ORG.description}`,
    "",
    "## Contact",
    "",
    `- Phone: ${ORG.phone}`,
    `- Email: ${ORG.email}`,
    `- Office: ${ORG.address}`,
    `- Website: ${SITE_URL}`,
    `- Contact form: ${SITE_URL}/contact-us`,
    "",
    "## Product categories",
    "",
    ...ORG.categories.map(
      (c) => `- [${c.name}](${SITE_URL}/product-category/${c.slug}/)`,
    ),
    "",
    "## Brands we carry",
    "",
    ...ORG.brands.map((b) => `- [${b.name}](${SITE_URL}/brand/${b.slug}/)`),
    "",
    `## Products (${products.length})`,
    "",
    ...products.map((p) => {
      const desc = p.frontmatter.shortDescription ?? p.frontmatter.metaDescription ?? "";
      return `- [${p.frontmatter.title ?? p.slug}](${SITE_URL}${pathForContent("products", p.slug)}) — ${desc}`;
    }),
    "",
    `## Insights / blog (${posts.length})`,
    "",
    ...posts.map((p) => {
      const excerpt = p.frontmatter.excerpt ?? p.frontmatter.metaDescription ?? "";
      return `- [${p.frontmatter.title ?? p.slug}](${SITE_URL}${pathForContent("posts", p.slug)}) — ${excerpt}`;
    }),
    "",
    `## Service pages (${pages.length})`,
    "",
    ...pages.map((p) => {
      const desc = p.frontmatter.metaDescription ?? "";
      return `- [${p.frontmatter.title ?? p.slug}](${SITE_URL}${pathForContent("pages", p.slug)}) — ${desc}`;
    }),
    "",
    `## Careers (${jobs.length})`,
    "",
    ...jobs.map((j) => {
      const loc = j.frontmatter.location ?? "";
      const type = j.frontmatter.employmentType ?? "";
      return `- [${j.frontmatter.title ?? j.slug}](${SITE_URL}${pathForContent("jobs", j.slug)}) — ${loc}, ${type}`;
    }),
    "",
    "## Optional resources for agents",
    "",
    `- [Full site content as markdown](${SITE_URL}/llms-full.txt) — every product, post, page and job concatenated`,
    `- [XML sitemap](${SITE_URL}/sitemap.xml) — every public URL with lastmod`,
    `- [Products as JSON](${SITE_URL}/api/products.json) — structured product data`,
    `- [Posts as JSON](${SITE_URL}/api/posts.json) — structured blog data`,
    `- [Jobs as JSON](${SITE_URL}/api/jobs.json) — open positions`,
    `- [Pages as JSON](${SITE_URL}/api/pages.json) — service pages`,
    `- [Contact form API](${SITE_URL}/api/contact) — POST JSON { name, email, phone?, company?, message } to create a lead. Returns { success: boolean, error?: string }.`,
    "",
  ];
  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=600",
    },
  });
}

// ─── /llms-full.txt ──────────────────────────────────────────────────────────
// Full content of the site assembled as one markdown document. Designed
// for an LLM to consume in a single fetch.

async function handleLlmsFullTxt() {
  const [products, posts, jobs, pages] = await Promise.all([
    loadContent("products"),
    loadContent("posts"),
    loadContent("jobs"),
    loadContent("pages"),
  ]);

  const sections = [];
  sections.push(`# ${ORG.name} — full site content\n\n${ORG.description}\n\n## Contact\n\n- Phone: ${ORG.phone}\n- Email: ${ORG.email}\n- Office: ${ORG.address}\n`);

  const renderItem = (item, type) => {
    const fm = item.frontmatter;
    const url = SITE_URL + pathForContent(type, item.slug);
    const meta = [
      `URL: ${url}`,
      fm.publishedAt ? `Published: ${fm.publishedAt}` : null,
      fm.updatedAt ? `Updated: ${fm.updatedAt}` : null,
      fm.category ? `Category: ${fm.category}` : null,
      fm.brand ? `Brand: ${fm.brand}` : null,
      fm.author ? `Author: ${fm.author}` : null,
      fm.location ? `Location: ${fm.location}` : null,
    ].filter(Boolean).join(" · ");
    return `## ${fm.title ?? item.slug}\n\n${meta}\n\n${fm.metaDescription ?? fm.shortDescription ?? fm.excerpt ?? ""}\n\n${item.body}\n`;
  };

  if (products.length) {
    sections.push(`---\n\n# Products (${products.length})`);
    for (const p of products) sections.push(renderItem(p, "products"));
  }
  if (pages.length) {
    sections.push(`---\n\n# Service pages (${pages.length})`);
    for (const p of pages) sections.push(renderItem(p, "pages"));
  }
  if (posts.length) {
    sections.push(`---\n\n# Insights / blog (${posts.length})`);
    for (const p of posts) sections.push(renderItem(p, "posts"));
  }
  if (jobs.length) {
    sections.push(`---\n\n# Open positions (${jobs.length})`);
    for (const j of jobs) sections.push(renderItem(j, "jobs"));
  }

  return new Response(sections.join("\n"), {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=600",
    },
  });
}

// ─── /api/{type}.json ────────────────────────────────────────────────────────
// Structured JSON endpoints so agents don't have to parse HTML.

async function handleContentJson(type) {
  const items = await loadContent(type);
  const payload = {
    type,
    count: items.length,
    items: items.map((item) => ({
      slug: item.slug,
      url: SITE_URL + pathForContent(type, item.slug),
      ...item.frontmatter,
    })),
  };
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=600",
      "access-control-allow-origin": "*",
    },
  });
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

async function route(request) {
  const url = new URL(request.url);

  // -1. Permanent host redirect — when REDIRECT_TO_HOST is set, any request
  //     whose Host header doesn't match the target hostname gets a 301 to
  //     the same path + query on the target host. Used after cutover so
  //     traffic to beta.interactivedisplays.ie permanently forwards to
  //     interactivedisplays.ie. Verification crawlers' paths are exempt so
  //     ownership doesn't depend on which hostname is hit.
  if (REDIRECT_TO_HOST && url.host !== REDIRECT_TO_HOST) {
    const isExemptPath =
      url.pathname === "/robots.txt" ||
      url.pathname === "/BingSiteAuth.xml" ||
      /^\/google[0-9a-f]+\.html$/i.test(url.pathname);
    if (!isExemptPath) {
      const targetUrl = `https://${REDIRECT_TO_HOST}${url.pathname}${url.search}`;
      return new Response(null, {
        status: 301,
        headers: {
          location: targetUrl,
          "cache-control": "public, max-age=86400",
          "x-served-by": "host-redirect",
        },
      });
    }
  }

  // 0. Legacy URL → canonical 301 (highest priority — preserves SEO equity
  //    on every link Google/Bing has indexed under WP's ?p=N shape).
  //    Runs before everything else so cached legacy URLs never touch the
  //    mirror or SSR layers.
  if (request.method === "GET" || request.method === "HEAD") {
    const redirect = resolveRedirect(url.pathname, url.search);
    if (redirect) {
      const targetUrl = new URL(redirect.target, url.origin).toString();
      return new Response(null, {
        status: redirect.status,
        headers: {
          location: targetUrl,
          "cache-control": "public, max-age=86400",
          "x-served-by": "redirect",
        },
      });
    }
  }

  // 0.5 Webmaster ownership verification files. These MUST work even when
  //     SITE_NOINDEX is on — verification crawlers fetch them pre-launch.
  //     ENV-driven so you don't commit verification IDs:
  //       GSC_VERIFICATION=googleXXXXXXXXXXXX.html    (the filename only)
  //       BING_VERIFICATION_CODE=XXXXXX...            (the value inside BingSiteAuth.xml)
  //     Drop the actual verification ID into .env.local when you add the
  //     property in Google Search Console / Bing Webmaster Tools.
  if (url.pathname.match(/^\/google[0-9a-f]+\.html$/i)) {
    const expected = process.env.GSC_VERIFICATION;
    if (expected && url.pathname.slice(1).toLowerCase() === expected.toLowerCase()) {
      const tag = expected.replace(/\.html$/i, "");
      return new Response(`google-site-verification: ${tag}\n`, {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
  }
  if (url.pathname === "/BingSiteAuth.xml") {
    const code = process.env.BING_VERIFICATION_CODE;
    if (code) {
      const xml = `<?xml version="1.0"?>\n<users>\n  <user>${code}</user>\n</users>\n`;
      return new Response(xml, {
        status: 200,
        headers: { "content-type": "application/xml; charset=utf-8" },
      });
    }
  }

  // 1. AI-agent + SEO endpoints
  if (url.pathname === "/robots.txt")     return handleRobots();
  if (url.pathname === "/sitemap.xml")    return handleSitemap();
  if (url.pathname === "/llms.txt")       return handleLlmsTxt();
  if (url.pathname === "/llms-full.txt")  return handleLlmsFullTxt();

  // 2. Content JSON endpoints
  if (url.pathname === "/api/products.json") return handleContentJson("products");
  if (url.pathname === "/api/posts.json")    return handleContentJson("posts");
  if (url.pathname === "/api/jobs.json")     return handleContentJson("jobs");
  if (url.pathname === "/api/pages.json")    return handleContentJson("pages");

  // 3. Form + email API
  if (url.pathname === "/api/contact")    return handleContact(request);
  if (url.pathname === "/api/email-test") return handleEmailTest(request);

  // 4. Vite-built client assets (CSS/JS bundles for our TanStack routes)
  const assetResponse = await tryServeClientAsset(request);
  if (assetResponse) return assetResponse;

  // 5. wp-mirror static serving
  const mirrorResponse = await tryServeMirror(request);
  if (mirrorResponse) return mirrorResponse;

  // 6. TanStack Start SSR
  return handler.fetch(request);
}

// Paths that MUST NOT carry X-Robots-Tag: noindex even on staging —
// webmaster tools verification crawlers and robots.txt itself need to be
// readable for ownership / policy discovery to work.
function isNoindexExempt(pathname) {
  if (pathname === "/robots.txt") return true;
  if (pathname === "/BingSiteAuth.xml") return true;
  if (/^\/google[0-9a-f]+\.html$/i.test(pathname)) return true;
  return false;
}

const server = serve({
  fetch: async (request) => {
    const response = await route(request);
    // On staging, stamp X-Robots-Tag on every response so search engines
    // keep the whole beta out of their indexes (authoritative over any
    // page-level meta robots tag). Exempt paths bypass — see isNoindexExempt.
    if (NOINDEX && response && !isNoindexExempt(new URL(request.url).pathname)) {
      try {
        response.headers.set("x-robots-tag", "noindex, nofollow");
      } catch {
        /* some streamed responses have immutable headers — safe to skip */
      }
    }
    return response;
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
