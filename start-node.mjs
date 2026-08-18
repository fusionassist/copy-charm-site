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
const SITE_URL = process.env.VITE_PUBLIC_SITE_URL ?? "https://interactivedisplays.ie";
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
  tagline:
    "Ireland's largest digital signage installer — 2,500+ installs, our own brand Moytronix, nationwide install team",
  description:
    "Interactive Displays Ireland (IDI) is Ireland's largest digital signage installer, with more than 2,500 installations completed since 2009. We manufacture our own commercial display brand, Moytronix, and supply, install and support LED and LCD digital signage, interactive touchscreens, outdoor displays, kiosks and LED video walls for retail, hospitality, education, healthcare, corporate and public-sector clients across all 32 counties of Ireland. Many other Irish signage suppliers outsource their installations to our nationwide engineer team. 3-year warranty as standard. Business All-Star Digital Signage Solutions Company of the Year 2024.",
  differentiators: [
    "Manufactures its own commercial display brand, Moytronix — competitors resell Samsung / LG / Vestel hardware",
    "Ireland's largest digital signage installer — 2,500+ installations completed since 2009",
    "Many Irish signage suppliers outsource their installations to our nationwide engineer team",
    "3-year warranty as standard (industry default is 12 months)",
    "Nationwide installation across all 32 counties of Ireland",
    "End-to-end service: design through supply, install, commission and support",
    "Family-run from Dromone, Co. Meath since 2009",
    "Business All-Star Digital Signage Solutions Company of the Year 2024 and prior consecutive years",
  ],
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
  { path: "/privacy-policy", title: "Privacy policy", description: "How we collect, use, and protect personal data.", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", title: "Terms of service", description: "Terms governing use of the IDI website and online services.", priority: "0.3", changefreq: "yearly" },
  // Sector intent pages — high commercial value for AI/SEO
  { path: "/digital-signage-for-schools", title: "Digital signage for schools Ireland", description: "School-focused digital signage and interactive whiteboards across Ireland.", priority: "0.9", changefreq: "monthly" },
  // Category / ad-landing pages (React routes, take over their own URLs)
  { path: "/digital-signage", title: "Digital Signage Ireland", description: "Digital signage supplied & installed nationwide across Ireland.", priority: "0.9", changefreq: "monthly" },
  { path: "/digital-menu-boards", title: "Digital Menu Boards Ireland", description: "Digital menu boards for restaurants, cafés and QSRs across Ireland.", priority: "0.9", changefreq: "monthly" },
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
  // "/product/ultra-high-bright-display/" removed 2026-08-18 — now an MDX
  // product page (auto-added to the sitemap by the products loader).
  // "/product/ultra-high-bright-display-tni/" removed 2026-08-18 — 301s to
  // the main range page; the tile became the 4K listing (MDX, in sitemap
  // via the products loader).
  "/product/hanging-dual-sided-display/",
  "/product/professional-monitor/",
  "/product/large-format-signage/",
  "/product/lcd-video-wall/",
  // "/product/android-network-display/" removed 2026-07-13 — now an MDX
  // product page (auto-added to the sitemap by the products loader).
  "/product/dual-sided-standing-totem/",
  "/product/slim-standing-totem/",
  // "/product/network-menu-boards/" removed 2026-07-13 — now an MDX product (Digital Menu Screens).
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
  // Professional Android Displays consolidation (2026-07-13). The 43" and
  // 32" Moytronix Android displays now live on ONE React page that took
  // over the legacy /product/android-network-display URL:
  //   - trailing-slash form → canonical no-slash (React route match)
  //   - the two short-lived standalone /product/moy-*ds60 pages → the
  //     combined page (they were merged the same day).
  const androidConsolidation = {
    "/product/android-network-display/": "/product/android-network-display",
    "/product/moy-43ds60":  "/product/android-network-display",
    "/product/moy-43ds60/": "/product/android-network-display",
    "/product/moy-32ds60":  "/product/android-network-display",
    "/product/moy-32ds60/": "/product/android-network-display",
    // Digital Menu Screens React product page took over this legacy URL.
    "/product/network-menu-boards/": "/product/network-menu-boards",
    // Ultra High Brightness Window Displays React page (2026-08-18).
    "/product/ultra-high-bright-display/": "/product/ultra-high-bright-display",
    // Legacy TNI listing folded into the main range page (all units are TNI
    // now); the old tile was repurposed as the 4K listing (2026-08-18).
    "/product/ultra-high-bright-display-tni": "/product/ultra-high-bright-display",
    "/product/ultra-high-bright-display-tni/": "/product/ultra-high-bright-display",
  };
  if (androidConsolidation[pathname]) {
    return { target: androidConsolidation[pathname], status: 301 };
  }
  // Discontinued "mirror" products removed 2026-08-06 (Mirror Touch Screen +
  // AR Mirror). 301 their legacy /product/* URLs to Screen Solutions so any
  // indexed or externally-linked URLs don't dead-end. The mega-menu/grid
  // tiles are stripped in rewriteMirrorHtml.
  const removedProductRedirects = {
    "/product/mirror-touch-screen":  "/screen-solutions/",
    "/product/mirror-touch-screen/": "/screen-solutions/",
    "/product/ar-mirror":  "/screen-solutions/",
    "/product/ar-mirror/": "/screen-solutions/",
  };
  if (removedProductRedirects[pathname]) {
    return { target: removedProductRedirects[pathname], status: 301 };
  }
  // Discontinued Visitor Assist solutions (not QFusion features) — 2026-08-18.
  // Customer Counting + Vending Machines 301 → Queue Management (the VA home).
  const removedVaRedirects = {
    "/customer-counting-solution": "/queue-management-system/",
    "/customer-counting-solution/": "/queue-management-system/",
    "/vending-machines": "/queue-management-system/",
    "/vending-machines/": "/queue-management-system/",
  };
  if (removedVaRedirects[pathname]) {
    return { target: removedVaRedirects[pathname], status: 301 };
  }
  // /elementor-6/* — legacy WordPress + Elementor homepage template path.
  // Same content as /, so any visitor (or Googlebot) hitting it gets
  // 301'd to the canonical homepage.
  if (/^\/elementor-6\/?(?:index\.html)?$/i.test(pathname)) {
    return { target: "/", status: 301 };
  }
  // Sector intent pages — 301 from any old WP-style URL ("digital-
  // signage-for-X-ireland" or "/services/digital-signage-X") to the
  // new canonical /digital-signage-for-<sector> page. Preserves any
  // SEO equity Google has accumulated against the legacy URLs.
  const sectorRedirects = {
    "/digital-signage-for-schools-ireland":   "/digital-signage-for-schools",
    "/digital-signage-for-schools-ireland/":  "/digital-signage-for-schools",
    "/digital-signage-schools-ireland":       "/digital-signage-for-schools",
    "/digital-signage-schools-ireland/":      "/digital-signage-for-schools",
    "/services/digital-signage-schools":      "/digital-signage-for-schools",
    "/services/digital-signage-schools/":     "/digital-signage-for-schools",
  };
  if (sectorRedirects[pathname]) {
    return { target: sectorRedirects[pathname], status: 301 };
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
  // /author/<username> — WP author archives. The mirror exposes
  // michael_admin and michael_admin_new which leaks admin usernames
  // (security smell) and indexes useless author pages. 301 all author
  // archive URLs to /.
  if (/^\/author(\/|$)/i.test(pathname)) {
    return { target: "/", status: 301 };
  }
  // /wp-json* — WordPress REST API root. The mirror serves a static HTML
  // discovery page that's useless and clutters the index. Real endpoints
  // (/wp-json/wp/v2/*) correctly return 404. 301 the root + any
  // sub-paths to /.
  if (/^\/wp-json(\/|$)/i.test(pathname)) {
    return { target: "/", status: 301 };
  }
  // /feed and /comments/feed — defunct WP RSS endpoints. No one
  // subscribes to them; the mirror serves stale snapshots.
  if (/^\/(feed|comments\/feed)\/?$/i.test(pathname)) {
    return { target: "/", status: 301 };
  }
  // /?s=<query> — WP search results page. Useless on the new site
  // (no search index), abuse vector for parameter spam.
  if (pathname === "/" && search) {
    const params = new URLSearchParams(search);
    if (params.has("s")) {
      return { target: "/", status: 301 };
    }
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
  "/privacy-policy",
  "/privacy-policy/",
  "/terms",
  "/terms/",
  // Sector intent pages — replace generic wp-mirror content with
  // AI-citable TanStack pages designed to win "digital signage for
  // <sector> Ireland" queries.
  "/digital-signage-for-schools",
  "/digital-signage-for-schools/",
  // Professional Android Displays (Moy-43DS60 / Moy-32DS60) — a React
  // product page took over this legacy Android Network Display URL. The
  // trailing-slash form 301s to this canonical no-slash form (see
  // resolveRedirect). Bypasses the now-stale mirror snapshot.
  "/product/android-network-display",
  // Digital Menu Screens — React product page took over the legacy
  // /product/network-menu-boards URL (2026-07-13). Trailing-slash 301s
  // to canonical no-slash (resolveRedirect).
  "/product/network-menu-boards",
  // Ultra High Brightness Window Displays (MOY-43/49/55/65/75UHBHD) —
  // React product page with per-size spec tables + downloads took over
  // this legacy URL (2026-08-18, first Product Bible range-page kit).
  "/product/ultra-high-bright-display",
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

// Tracking script snippets — env-driven, inert when env vars are unset.
// Same shape as src/components/tracking/TrackingScripts.tsx renders for
// TanStack routes. Injected into mirror HTML before </head> for top-of-
// page trackers and before </body> for the Meta Pixel <noscript>
// fallback. Click events on tel:/mailto: links bubble up via a small
// inline click handler injected with the GTM/GA4 block.
function buildTrackingSnippet() {
  const gtm = process.env.VITE_PUBLIC_GTM_ID;
  const ga4 = process.env.VITE_PUBLIC_GA4_ID;
  const ads = process.env.VITE_PUBLIC_GOOGLE_ADS_ID;
  const meta = process.env.VITE_PUBLIC_META_PIXEL_ID;
  const linkedin = process.env.VITE_PUBLIC_LINKEDIN_PARTNER_ID;
  const parts = [];

  if (gtm) {
    parts.push(`<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');</script>`);
  }
  const gtagPrimary = ga4 || ads;
  if (gtagPrimary) {
    const configs = [];
    if (ga4) configs.push(`gtag('config', '${ga4}');`);
    if (ads) configs.push(`gtag('config', '${ads}');`);
    parts.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${gtagPrimary}"></script>`);
    parts.push(`<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());${configs.join("")}</script>`);
  }
  if (meta) {
    parts.push(`<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${meta}');fbq('track', 'PageView');</script>`);
  }
  if (linkedin) {
    parts.push(`<script>_linkedin_partner_id="${linkedin}";window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];window._linkedin_data_partner_ids.push(_linkedin_partner_id);(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];var b=document.createElement("script");b.type="text/javascript";b.async=true;b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";s.parentNode.insertBefore(b,s);})(window.lintrk);</script>`);
  }

  const anyTrackerActive = parts.length > 0;

  // Google Ads click-ID capture (gclid/wbraid/gbraid → localStorage+cookie,
  // ~90-day TTL) — same logic as src/lib/click-ids.ts, inline so paid clicks
  // landing on mirror pages keep their click ID for the React lead form.
  // Always emitted (independent of tracker env vars).
  parts.push(
    `<script>(function(){try{var p=new URLSearchParams(location.search);["gclid","wbraid","gbraid"].forEach(function(k){var v=p.get(k);if(!v||!/^[A-Za-z0-9_-]{1,200}$/.test(v))return;try{localStorage.setItem("fusion_"+k,JSON.stringify({v:v,t:Date.now()}))}catch(e){}document.cookie="fusion_"+k+"="+encodeURIComponent(v)+"; max-age=7776000; path=/; SameSite=Lax"})}catch(e){}})();</script>`,
  );

  // Tel:/mailto: click delegation — same logic as the React
  // ContactClickTracker, but inline JS so it works on mirror pages too.
  // Only emit when any tracker is active.
  if (anyTrackerActive) {
    parts.push(`<script>document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a');if(!a)return;var h=a.getAttribute('href')||'';if(h.indexOf('tel:')===0){if(window.gtag)gtag('event','phone_call',{phone:h.slice(4)});if(window.fbq)fbq('track','Contact',{phone:h.slice(4)});if(window.dataLayer)dataLayer.push({event:'phone_call',phone:h.slice(4)});}else if(h.indexOf('mailto:')===0){var em=h.slice(7).split('?')[0];if(window.gtag)gtag('event','email_click',{email:em});if(window.fbq)fbq('track','Contact',{email:em});if(window.dataLayer)dataLayer.push({event:'email_click',email:em});}},true);</script>`);
  }

  return parts.join("");
}

// GTM also requires a <noscript> iframe inside the body. Built separately
// so we inject it before </body>, not inside <head>.
function buildTrackingBodyNoscript() {
  const gtm = process.env.VITE_PUBLIC_GTM_ID;
  const meta = process.env.VITE_PUBLIC_META_PIXEL_ID;
  const linkedin = process.env.VITE_PUBLIC_LINKEDIN_PARTNER_ID;
  const parts = [];
  if (gtm) {
    parts.push(`<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtm}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`);
  }
  if (meta) {
    parts.push(`<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${meta}&ev=PageView&noscript=1" alt=""/></noscript>`);
  }
  if (linkedin) {
    parts.push(`<noscript><img height="1" width="1" style="display:none" alt="" src="https://px.ads.linkedin.com/collect/?pid=${linkedin}&fmt=gif"/></noscript>`);
  }
  return parts.join("");
}

const TRACKING_HEAD_SNIPPET = buildTrackingSnippet();
const TRACKING_BODY_NOSCRIPT = buildTrackingBodyNoscript();

// reCAPTCHA v3 for the legacy Elementor forms baked into mirror HTML (the
// careers pages). Loads api.js, then keeps a fresh token in a hidden
// recaptcha_token input inside every .elementor-form — Elementor's submit
// handler builds FormData from the form element, so the token rides along
// to /wp-admin/admin-ajax.php where handleAdminAjax() verifies it. v3
// tokens expire after ~2 minutes, hence the 100 s refresh interval.
// Injected only into pages that actually contain an Elementor form; inert
// when the site key env var is unset. Note: env var is read after this
// point in module evaluation, so build lazily via function.
function buildRecaptchaMirrorSnippet() {
  const siteKey = process.env.VITE_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
  if (!siteKey) return "";
  return (
    "<script>(function(){" +
    "function seed(){if(!window.grecaptcha)return;grecaptcha.ready(function(){" +
    "function refresh(){grecaptcha.execute('" + siteKey + "',{action:'careers_form'}).then(function(t){" +
    "document.querySelectorAll('form.elementor-form').forEach(function(f){" +
    "var i=f.querySelector('input[name=recaptcha_token]');" +
    "if(!i){i=document.createElement('input');i.type='hidden';i.name='recaptcha_token';f.appendChild(i);}" +
    "i.value=t;});});}" +
    "refresh();setInterval(refresh,100000);});}" +
    "var s=document.createElement('script');" +
    "s.src='https://www.google.com/recaptcha/api.js?render=" + siteKey + "';" +
    "s.async=true;s.onload=seed;document.head.appendChild(s);" +
    "})();</script>"
  );
}
const RECAPTCHA_MIRROR_SNIPPET = buildRecaptchaMirrorSnippet();

// Legacy Tawk.to chat is baked into the wget mirror HTML. The migration
// dropped Tawk entirely in favour of Odoo Live Chat, so strip every
// trace of it from mirror responses.
const TAWK_PATTERNS = [
  /<script id="tawk-script"[\s\S]*?<\/script>/gi,
  /<script[^>]*>[\s\S]*?embed\.tawk\.to[\s\S]*?<\/script>/gi,
];

// Legacy WP tracking (gtag.js, GTM container, Meta Pixel) baked into the
// mirror HTML. IDs found in the wget snapshot:
//   GT-M3LVT37 (gtag.js)
//   GTM-NS2W7ML (Google Tag Manager)
//   1422006029068970 (Facebook Pixel)
//
// CRITICAL LESSON: every pattern here MUST be "<script>...<\/script>"
// non-greedy on `[^<]` (or equivalent), NOT `[\s\S]*?`. The lazy
// quantifier with `[\s\S]` happily eats hundreds of lines of HTML
// (stylesheets, real scripts, everything between the FIRST `<script>` in
// the document and the closing `</script>` of the legacy block) — which
// is exactly what happened on 2026-06-08 and stripped every stylesheet
// from every mirror page.
//
// The current patterns key on the SCRIPT'S src or contents only, with a
// negative-character class so the match can't cross into another tag.
const LEGACY_TRACKING_PATTERNS = [
  // gtag.js loader scripts (any ID). Script with src="...gtag/js..." and no body.
  /<script\b[^>]*src=["'][^"']*googletagmanager\.com\/gtag\/js[^"']*["'][^>]*>\s*<\/script>/gi,
  // GTM container loader scripts. Script with src="...gtm.js...".
  /<script\b[^>]*src=["'][^"']*googletagmanager\.com\/gtm\.js[^"']*["'][^>]*>\s*<\/script>/gi,
  // GTM noscript iframes. Anchored on noscript and the specific ns.html URL.
  /<noscript\b[^>]*>\s*<iframe\b[^>]*googletagmanager\.com\/ns\.html[^>]*>[^<]*<\/iframe>\s*<\/noscript>/gi,
  // Inline gtag('config', ...) script. Body MUST contain gtag('config'
  // AND the body must NOT contain another opening <script — capped by
  // matching only [^<]* between markers + a lookahead that confirms gtag.
  // Matches inline scripts whose body starts with the gtag bootstrap.
  /<script\b[^>]*>[^<]*\bgtag\s*\(\s*['"]config['"][^<]*<\/script>/gi,
  // Inline fbq('init', ...) script. Same constraint.
  /<script\b[^>]*>[^<]*\bfbq\s*\(\s*['"]init['"][^<]*<\/script>/gi,
  // Facebook Pixel noscript fallback (very specific URL).
  /<noscript\b[^>]*>\s*<img\b[^>]*facebook\.com\/tr\?id=[^>]*>\s*<\/noscript>/gi,
  // connect.facebook.net loader fragments left inline (no body)
  /<script\b[^>]*src=["'][^"']*connect\.facebook\.net[^"']*["'][^>]*>\s*<\/script>/gi,
];

function rewriteMirrorHtml(html, pathname = "") {
  let out = html;
  // 1. Strip legacy Tawk.to (always — independent of Odoo config)
  for (const pattern of TAWK_PATTERNS) {
    out = out.replace(pattern, "");
  }
  // 1a. Strip legacy GA / GTM / Meta Pixel tracking baked into the mirror.
  //     The current new tracking is env-driven and injected by the rewriter;
  //     having both running side-by-side would double-count or hit unknown
  //     accounts. Strip first, inject our own (if configured) at the end.
  for (const pattern of LEGACY_TRACKING_PATTERNS) {
    out = out.replace(pattern, "");
  }
  // 1a². Strip Elementor's legacy reCAPTCHA api.js loader (17 mirror pages,
  //      id="elementor-recaptcha_v3-api-js"). Its WP server side is gone,
  //      and a second api.js load with different render params would fight
  //      with the snippet we inject in step 6.
  out = out.replace(
    /<script\b[^>]*src=["'][^"']*google\.com\/recaptcha\/api\.js[^"']*["'][^>]*>\s*<\/script>/gi,
    "",
  );
  // 1a³. Strip the HubSpot WP-plugin loader (147 mirror pages, portal
  //      146197720). It does far more than analytics: it renders the
  //      portal's pop-up CTA forms client-side — a legacy "Apply" CV
  //      popup was still submitting to HubSpot on the careers pages
  //      (caught 2026-06-12). IDI is consolidating on Odoo; HubSpot is
  //      explicitly out of the stack (CLAUDE.md §2).
  out = out.replace(
    /<script\b[^>]*src=["'][^"']*hs-scripts\.com[^"']*["'][^>]*>\s*<\/script>/gi,
    "",
  );
  out = out.replace(
    /<script\b[^>]*class=["']hsq-set-content-id["'][^>]*>[^<]*<\/script>/gi,
    "",
  );
  out = out.replace(
    /<link\b[^>]*href=["'][^"']*hs-scripts\.com[^"']*["'][^>]*\/?>/gi,
    "",
  );
  // 1a⁴. Strip dead WordPress-backend fossils (2026-08-18). The wget snapshot
  //      missed files WP served dynamically, so on every mirror page these
  //      refs 404 and their dependent inline scripts throw ("wp is not
  //      defined", "_googlesitekit … wcdata"). The WP backend is gone:
  //      wp-hooks/wp-i18n tags + the wp-i18n-js-after inline; the emoji
  //      settings JSON + its module loader (fetches wp-emoji-release.min.js,
  //      not in the snapshot); Google Site Kit event-provider tags + their
  //      -before inline blocks (our tracking is env-injected in step 3).
  out = out.replace(/<script\b[^>]*\bid="wp-hooks-js"[^>]*>\s*<\/script>/gi, "");
  out = out.replace(/<script\b[^>]*\bid="wp-i18n-js"[^>]*>\s*<\/script>/gi, "");
  out = out.replace(/<script id="wp-i18n-js-after">[^<]*<\/script>/gi, "");
  out = out.replace(
    /<script id="wp-emoji-settings" type="application\/json">[^<]*<\/script>/gi,
    "",
  );
  out = out.replace(
    /<script type="module">\s*\/\*! This file is auto-generated \*\/\s*const a=JSON\.parse\(document\.getElementById\("wp-emoji-settings"\)[\s\S]*?<\/script>/gi,
    "",
  );
  out = out.replace(
    /<script id="googlesitekit-events-provider-[\w-]+-js-before">[^<]*<\/script>/gi,
    "",
  );
  out = out.replace(
    /<script src="[^"]*google-site-kit[^"]*"[^>]*>\s*<\/script>/gi,
    "",
  );
  // 1a⁵. Elementor stat counters: bake the final value into the markup so the
  //      homepage stats can never render as "0/10 … 0%" (what a visitor sees
  //      whenever the animation JS stumbles on a fossil error; static-correct
  //      beats animated-wrong). The counter handler still animates when
  //      healthy — it reads data-from/to-value, not the text.
  out = out.replace(
    /(<span class="elementor-counter-number"[^>]*\bdata-to-value="([^"]+)"[^>]*>)[\d.,]*(<\/span>)/g,
    "$1$2$3",
  );
  // 1a⁶. Copy fixes the WP backend can no longer receive: mirror typos.
  out = out.replace(/\bOutoor\b/g, "Outdoor");
  out = out.replace(/\/\/(Want full control)/g, "$1");
  // 1a⁶b. UHB listing restructure (Gerry 2026-08-18): every unit sold is now
  //       TNI, so two separate TNI/non-TNI listings made no sense. The old
  //       "DisplayTNI" tile becomes the 4K listing (new React page
  //       /product/ultra-high-bright-display-4k); the plain tile is renamed
  //       TNI and keeps pointing at the main TNI range page. The legacy
  //       -tni URL 301s to the main range page (resolveRedirect).
  out = out.replace(
    /href="[^"]*product\/ultra-high-bright-display-tni\/?"/gi,
    'href="/product/ultra-high-bright-display-4k"',
  );
  out = out.replace(
    /<span>Ultra High Bright DisplayTNI<\/span>/g,
    "<span>Ultra High Bright Display 4K</span>",
  );
  out = out.replace(
    /<span>Ultra High Bright Display<\/span>/g,
    "<span>Ultra High Bright Display TNI</span>",
  );
  // 1a⁷. Mobile CSS repairs (2026-08-18, from Gerry's phone screenshots).
  //      The snapshot froze the Elementor n-menu in its DESKTOP layout, so on
  //      phones the opened menu rendered as a cramped right-aligned strip
  //      overlapping the logo. Restyle the OPEN state (:has on the toggle's
  //      aria-expanded, which the still-working nested-menu JS maintains)
  //      into a full-width dark panel with stacked tap targets. Also: compact
  //      the header "Get In Touch" CTA that clipped off the right edge
  //      (shared header template, stable data-id 36f8b19), and force-hide the
  //      hero background-video container on phones (stray playback artefacts).
  if (out.includes("e-n-menu") && out.includes("</head>")) {
    const mobileFixCss =
      `<style id="idi-mobile-fixes">` +
      `@media (max-width:1024px){` +
      `.e-n-menu:has(.e-n-menu-toggle[aria-expanded="true"]) .e-n-menu-wrapper{` +
      `position:fixed !important;top:108px;left:0;right:0;z-index:99999;` +
      `background:#04122e;box-shadow:0 18px 34px rgba(0,0,0,.5);` +
      `max-height:calc(100vh - 108px);overflow-y:auto;padding:4px 0 12px;` +
      `display:block !important;width:100% !important;}` +
      `.e-n-menu .e-n-menu-heading{display:block !important;width:100% !important;height:auto !important;}` +
      `.e-n-menu .e-n-menu-item{display:block !important;width:100% !important;border-bottom:1px solid rgba(255,255,255,.09);}` +
      `.e-n-menu .e-n-menu-title{display:flex !important;align-items:center;justify-content:space-between;width:100%;}` +
      `.e-n-menu .e-n-menu-title-container{flex:1 1 auto;padding:14px 22px !important;justify-content:flex-start !important;}` +
      `.e-n-menu .e-n-menu-title-text{color:#fff !important;font-size:17px !important;font-weight:600 !important;line-height:1.2;}` +
      `.e-n-menu .e-n-menu-dropdown-icon{flex:0 0 auto;padding:14px 20px !important;background:transparent;border:0;}` +
      `.e-n-menu .e-n-menu-dropdown-icon svg{width:14px;height:14px;fill:#fff;}` +
      `.e-n-menu .e-n-menu-content{width:100% !important;max-height:58vh;overflow-y:auto;}` +
      `}` +
      `@media (max-width:767px){` +
      `.elementor-background-video-container{display:none !important;}` +
      `.elementor-element-36f8b19 .elementor-button{padding:8px 14px !important;font-size:12px !important;}` +
      `.elementor-element-36f8b19{margin-right:8px;}` +
      // Mobile typography: the Elementor kit has almost no responsive
      // overrides (desktop sizes ship to phones — 50px hero h1 at 375px).
      // Cap heading sizes so true-mobile rendering is readable without
      // zooming out.
      `h1.elementor-heading-title{font-size:32px !important;line-height:1.15 !important;}` +
      `h2.elementor-heading-title{font-size:20px !important;line-height:1.3 !important;}` +
      `h3.elementor-heading-title{font-size:18px !important;line-height:1.3 !important;}` +
      `.elementor-counter-number,.elementor-counter-number-suffix{font-size:30px !important;}` +
      `}` +
      `</style>`;
    out = out.replace("</head>", mobileFixCss + "</head>");
  }
  // The careers "Apply Now" buttons pointed at #apply — an anchor that
  // only existed as the HubSpot popup's trigger. Repoint them at the
  // on-page Elementor form so the buttons scroll to the working form.
  out = out.replace(/href="([^"]*)#apply"/gi, 'href="$1#careers_form"');
  // 1d. "Android Network Display(s)" → "Professional Displays Android"
  //     everywhere in the mirror nav/menu + promo boxes (2026-07-13
  //     rename). The href /product/android-network-display/ is left as-is;
  //     it 301s to the new combined React product page.
  out = out.replace(/Android Network Displays?/g, "Professional Displays Android");
  // Rename the mirror nav's "Network Menu Boards" item → "Digital Menu
  // Screens" (2026-07-13). The href /product/network-menu-boards/ 301s to
  // the new React product page.
  out = out.replace(/Network Menu Boards?/g, "Digital Menu Screens");
  // Inject a "GAA LED Scoreboards" (CluScore) tile into the mega-menu's
  // "LED Solutions" tab, after the last LED tile (LED Box Signage). Clones
  // that tile's element classes so it inherits the same size/styling.
  // (2026-07-22 — the mega menu is WP/Elementor promo boxes; the React nav
  // change didn't reach it.)
  if (out.includes("LED Box Signage") && !out.includes("/product/gaa-led-scoreboards")) {
    const cluscoreTile =
      '<div class="elementor-element elementor-element-365e0a7 elementor-widget__width-initial wpr-promo-box-style-cover elementor-widget elementor-widget-wpr-promo-box" data-id="365e0a7" data-element_type="widget" data-e-type="widget" data-widget_type="wpr-promo-box.default">' +
      '<div class="wpr-promo-box wpr-animation-wrap">' +
      '<a class="wpr-promo-box-link" href="/product/gaa-led-scoreboards"></a>' +
      '<div class="wpr-promo-box-image">' +
      '<div class="wpr-promo-box-bg-image wpr-bg-anim-zoom-in wpr-anim-timing-ease-default lazy" style="background-image:url(\'/images/screens/cluscore-hero.jpg\')" data-bg="/images/screens/cluscore-hero.jpg"></div>' +
      '<div class="wpr-promo-box-bg-overlay wpr-border-anim-none"></div></div>' +
      '<div class="wpr-promo-box-content"><div class="wpr-promo-box-icon"></div>' +
      '<h3 class="wpr-promo-box-title"><span>GAA LED Scoreboards</span></h3></div></div></div>';
    out = out.replace(
      /(<h3 class="wpr-promo-box-title"><span>LED Box Signage<\/span><\/h3>\s*<\/div>\s*<\/div>\s*<\/div>)/,
      `$1${cluscoreTile}`,
    );
  }
  // 1d². Remove discontinued "mirror" product tiles (Mirror Touch Screen +
  //      AR Mirror) from the WP/Elementor mega-menu + product grids sitewide
  //      (2026-08-06). Matches each self-contained wpr-promo-box tile by its
  //      product link + title and strips the whole balanced tile (verified
  //      div-neutral). The product URLs themselves 301 to /screen-solutions/
  //      via resolveRedirect.
  for (const { slug, title } of [
    { slug: "ar-mirror", title: "AR Mirror" },
    { slug: "mirror-touch-screen", title: "Mirror Touch Screen" },
  ]) {
    if (!out.includes(`product/${slug}/`)) continue;
    const tileRe = new RegExp(
      `<div class="elementor-element[^"]*elementor-widget-wpr-promo-box"[^>]*>` +
        `(?:(?!<div class="elementor-element)[\\s\\S])*?` +
        `href="[^"]*product/${slug}/"` +
        `(?:(?!<div class="elementor-element)[\\s\\S])*?` +
        `<h3 class="wpr-promo-box-title"><span>${title}</span></h3>\\s*</div>\\s*</div>\\s*</div>`,
      "g",
    );
    out = out.replace(tileRe, "");
  }
  // 1d³. Visitor Assist: ESII/Orion → QFusion rebrand (2026-08-18). The VA
  //      pages + menu were the legacy ESII "Orion" offering; we now sell our
  //      own QFusion queue platform (app.qfusion.ai). Swap the ESII product
  //      images for QFusion ones, rebrand the vendor names in text, and add a
  //      QFusion CTA on the VA pages. Customer Counting + Vending are dropped
  //      (301 → /queue-management-system/ in resolveRedirect). Runs sitewide
  //      because the VA solution thumbnails appear in the mega-menu everywhere.
  const VA_IMAGE_MAP = {
    // Precise regex (<base> + optional -NNxNN + ext) means longer and shorter
    // bases don't collide, so order is not significant.
    "queue-management-esii": "queue-management",
    "Statistique-ORION-ESII": "qms-statistics",
    "orion-appointment": "qms-online-appointment",
    "TicketVirtuel-388x388-2": "qms-digital-ticket",
    "ticket-virtuel-ticket-appel": "ticket-app",
    "Reception-Mobile": "qms-mobile",
    "digital-smartphone-ticket-1-1": "digital-ticket",
    "digital-smartphone-ticket-1": "digital-ticket",
    "digital-smartphone-ticket": "digital-ticket",
    "online-appointment-solution-2": "online-appointment",
    "online-appointment-solution-1": "oa-receive",
    "online-appointment-solution": "online-appointment",
    "Satisfaction-survey-1": "survey-simplicity",
    "Satisfaction-survey-2": "survey-confidentiality",
    "Satisfaction-survey-3": "survey-selfservice",
    "Satisfaction-survey": "satisfaction-survey",
    "corporate-reception-solution": "corporate-reception",
    "customer-counting-solution": "queue-management",
    "reception-1": "reception-1",
    "reception-2": "reception-2",
    "reception-3": "reception-4",
    "reception": "corporate-reception",
  };
  for (const [base, qf] of Object.entries(VA_IMAGE_MAP)) {
    const b = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Path separators may be "/" or JSON-escaped "\/" in the mirror HTML.
    const S = "(?:\\\\?/)";
    const re = new RegExp(
      `${S}wp-content${S}uploads${S}\\d{4}${S}\\d{2}${S}${b}(?:-\\d+x\\d+)?\\.(?:png|jpe?g|webp)`,
      "g",
    );
    out = out.replace(re, `/images/va/${qf}.jpg`);
  }
  // Rebrand the legacy vendor names in copy → QFusion.
  out = out
    .replace(/\b(?:Orion|ORION)\s+appointment/g, "QFusion appointments")
    .replace(/\b(?:Orion|ORION)\b/g, "QFusion")
    .replace(/Twana(?:&#8482;|&trade;|™)?/gi, "QFusion")
    .replace(/SmartWait(?:&#8482;|&trade;|™)?/gi, "QFusion")
    .replace(/SmartKiosk(?:&#8482;|&trade;|™)?/gi, "QFusion kiosk")
    .replace(/\bESII\b/g, "QFusion");
  // QFusion CTA on the 5 Visitor Assist pages, before the footer.
  const VA_SLUGS = [
    "queue-management-system",
    "digital-ticket",
    "online-appointment",
    "satisfaction-survey",
    "corporate-reception-solution",
  ];
  if (
    VA_SLUGS.some((s) => pathname === `/${s}/` || pathname === `/${s}`) &&
    out.includes("<footer")
  ) {
    const vaCta =
      `<div style="background:#F4F7FB;border-top:1px solid #E2E8F2;padding:18px 20px;text-align:center;` +
      `font-family:Inter,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1B2A4A;">` +
      `Visitor Assist is powered by <strong>QFusion</strong>, our own real-time queue platform. ` +
      `<a href="https://app.qfusion.ai" target="_blank" rel="noopener noreferrer" style="color:#003E9E;font-weight:600;text-decoration:none;">Explore QFusion →</a>` +
      `</div>`;
    out = out.replace(/<footer\b/i, vaCta + "<footer");
  }
  // 1e. Sitewide internal links to the new React landing pages, injected
  //     just before the footer on every mirror page. The mirror pages are
  //     the most-crawled surface, so this is how Google discovers + weights
  //     /digital-signage and /digital-menu-boards (added 2026-07-13 after
  //     GSC showed neither indexed — nothing linked to them internally).
  if (out.includes("<footer")) {
    const relatedStrip =
      `<div style="background:#F4F7FB;border-top:1px solid #E2E8F2;padding:16px 20px;text-align:center;` +
      `font-family:Inter,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;line-height:1.6;">` +
      `<span style="color:#5A6B85;font-weight:600;">Popular:</span> ` +
      `<a href="/digital-signage" style="color:#003E9E;font-weight:600;text-decoration:none;margin:0 8px;">Digital Signage Ireland</a>` +
      `<span style="color:#C5CEDE;">·</span> ` +
      `<a href="/digital-menu-boards" style="color:#003E9E;font-weight:600;text-decoration:none;margin:0 8px;">Digital Menu Boards &amp; Menu Screens</a>` +
      `<div style="margin-top:8px;font-size:13px;color:#5A6B85;">In the UK? Visit our sister site ` +
      `<a href="https://interactivedisplaysuk.com/" rel="alternate" hreflang="en-gb" style="color:#003E9E;font-weight:600;text-decoration:none;">Interactive Displays UK</a></div>` +
      `</div>`;
    out = out.replace(/<footer\b/i, relatedStrip + "<footer");
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
  // 3. Inject tracking scripts before </head> (if any tracker is
  //    configured). Inert when no env vars are set.
  if (TRACKING_HEAD_SNIPPET) {
    out = out.includes("</head>")
      ? out.replace("</head>", TRACKING_HEAD_SNIPPET + "</head>")
      : out;
  }
  // 3b. hreflang cluster on the homepage only (production only) — declares the
  //     UK sister site interactivedisplaysuk.com as the en-GB regional variant
  //     so Google serves the right brand per country and the two don't compete
  //     for UK searchers. Homepage-scoped: the sites aren't 1:1, so only the
  //     brand home is mapped (a bad sitewide mapping causes GSC hreflang errors).
  //     Reciprocated by matching tags on the UK homepage. (2026-08-06)
  if (!NOINDEX && (pathname === "/" || pathname === "/index.php") && out.includes("</head>")) {
    const hreflang =
      `<link rel="alternate" hreflang="en-ie" href="https://interactivedisplays.ie/"/>` +
      `<link rel="alternate" hreflang="en-gb" href="https://interactivedisplaysuk.com/"/>` +
      `<link rel="alternate" hreflang="x-default" href="https://interactivedisplays.ie/"/>`;
    out = out.replace("</head>", hreflang + "</head>");
  }
  // 4. Tracking noscript fallbacks immediately AFTER <body> (per GTM
  //    + Meta Pixel spec; LinkedIn doesn't care)
  if (TRACKING_BODY_NOSCRIPT) {
    out = out.replace(/<body([^>]*)>/i, `<body$1>${TRACKING_BODY_NOSCRIPT}`);
  }
  // 5. Inject Odoo Live Chat before </body> (if configured)
  if (ODOO_CHAT_SNIPPET) {
    out = out.includes("</body>")
      ? out.replace("</body>", ODOO_CHAT_SNIPPET + "</body>")
      : out + ODOO_CHAT_SNIPPET;
  }
  // 6. Seed reCAPTCHA v3 tokens into legacy Elementor forms (careers
  //    pages) so handleAdminAjax() can verify submissions. Only on pages
  //    that actually contain a form; inert without the site key.
  if (RECAPTCHA_MIRROR_SNIPPET && out.includes("elementor-form")) {
    out = out.includes("</body>")
      ? out.replace("</body>", RECAPTCHA_MIRROR_SNIPPET + "</body>")
      : out + RECAPTCHA_MIRROR_SNIPPET;
  }
  // 7. Repair the Elementor posts-grid thumbnails (careers + insights
  //    listings). On live WordPress, Elementor's frontend JS added
  //    `elementor-has-item-ratio` to the posts container, which switches
  //    the thumbnails to absolute-fill-with-ratio rendering (the rules
  //    ship in widget-posts.min.css). The wget mirror lost that runtime
  //    class, so each thumbnail rendered its static <img> PLUS the ratio
  //    padding — a big grey placeholder block under every card image.
  //    Restore the class, and emulate the other half of Elementor's JS:
  //    tagging wider-than-frame images `elementor-fit-height` so they
  //    fill the frame's height instead of leaving a letterbox strip.
  if (out.includes("elementor-posts--skin-cards")) {
    out = out.replace(
      /class="([^"]*\belementor-posts--skin-cards\b[^"]*)"/g,
      (m, classes) =>
        classes.includes("elementor-has-item-ratio")
          ? m
          : `class="${classes} elementor-has-item-ratio"`,
    );
    const fitScript =
      "<script>(function(){function fit(){document.querySelectorAll('.elementor-has-item-ratio .elementor-post__thumbnail').forEach(function(t){var img=t.querySelector('img');if(!img)return;function chk(){if(!img.naturalWidth||!t.offsetWidth)return;if(img.naturalHeight/img.naturalWidth<t.offsetHeight/t.offsetWidth)t.classList.add('elementor-fit-height');}if(img.complete)chk();else img.addEventListener('load',chk);});}if(document.readyState!=='loading')fit();else document.addEventListener('DOMContentLoaded',fit);window.addEventListener('load',fit);})();</script>";
    out = out.includes("</body>")
      ? out.replace("</body>", fitScript + "</body>")
      : out + fitScript;
  }
  // 7a. Careers-listing tidy-ups (the decoration ids only exist on that
  //     page, so this injection is effectively careers-scoped):
  //     - hide two orphaned absolute-positioned decorations from the old
  //       WP design (a floating "candidate" headshot and a pulsing
  //       lavender square) stranded in the whitespace beside the grid;
  //     - hide the publish-date strip under each job card (the meta-data
  //       bar holds nothing else) — stale dates make open roles look dead.
  if (out.includes("elementor-element-9e29f34") || out.includes("elementor-element-fcbb80b")) {
    const hideCss =
      "<style>.elementor-element-9e29f34,.elementor-element-fcbb80b,.elementor-post__meta-data{display:none!important}</style>";
    out = out.includes("</head>")
      ? out.replace("</head>", hideCss + "</head>")
      : out + hideCss;
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
    body = rewriteMirrorHtml(seoFixed, url.pathname);
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

// ─── Google reCAPTCHA v3 (server-side verification) ──────────────────────────
// Spam was reaching sales@ through /api/contact (which had no anti-bot
// protection at all — confirmed from the inbox 2026-06-11). Both form
// paths now verify a reCAPTCHA v3 token when RECAPTCHA_SECRET_KEY is set
// in .env.local; with no secret configured everything passes as before,
// so dev and key-less deploys keep working.
//
// Score model: v3 returns 0.0 (bot) – 1.0 (human). Google's recommended
// starting threshold is 0.5; tune via RECAPTCHA_MIN_SCORE after watching
// real traffic in the reCAPTCHA admin console.
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY ?? "";
const RECAPTCHA_MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE ?? "0.5");

async function verifyRecaptcha(token, expectedAction, remoteIp) {
  if (!RECAPTCHA_SECRET) return { ok: true, skipped: true };
  if (!token) return { ok: false, reason: "missing-token" };
  try {
    const body = new URLSearchParams({ secret: RECAPTCHA_SECRET, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error(`siteverify HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) {
      return { ok: false, reason: (data["error-codes"] ?? []).join(",") || "invalid-token" };
    }
    if (expectedAction && data.action && data.action !== expectedAction) {
      return { ok: false, reason: `action-mismatch:${data.action}` };
    }
    if (typeof data.score === "number" && data.score < RECAPTCHA_MIN_SCORE) {
      return { ok: false, reason: `low-score:${data.score}` };
    }
    return { ok: true, score: data.score };
  } catch (err) {
    // Google itself unreachable — fail open rather than dropping real leads.
    console.error("[recaptcha] siteverify failed:", err);
    return { ok: true, degraded: true };
  }
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

async function sendMail({ subject, text, html, to, replyTo, attachments }) {
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
  if (attachments?.length) {
    // Inline base64 attachments. Graph caps the whole /sendMail request at
    // ~4 MB — callers with bigger payloads must use sendMailLargeAttachments.
    message.attachments = attachments.map((a) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: a.name,
      contentType: a.contentType || "application/octet-stream",
      contentBytes: a.contentBytes,
    }));
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

// Send a message whose attachments are too large for the single-shot
// /sendMail call (Graph caps that request at ~4 MB total, and base64
// inflates payloads by a third). Flow: create a draft message, push each
// attachment through an upload session in 3 MB chunks, send the draft.
// Graph allows up to 150 MB per attachment this way — our callers cap at
// the careers form's 10 MB client-side limit long before that.
async function sendMailLargeAttachments({ subject, text, html, to, replyTo, files }) {
  requireEnv("M365_SENDER");
  const sender = process.env.M365_SENDER;
  const recipient = to ?? process.env.LEAD_RECIPIENT ?? sender;
  const token = await getGraphToken();
  const base = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}`;
  const jsonHeaders = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };

  const message = {
    subject,
    body: { contentType: html ? "HTML" : "Text", content: html ?? text ?? "" },
    toRecipients: [{ emailAddress: { address: recipient } }],
    ...(replyTo ? { replyTo: [{ emailAddress: { address: replyTo } }] } : {}),
  };
  let res = await fetch(`${base}/messages`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(message),
  });
  if (!res.ok) {
    throw new Error(`Graph draft create failed: ${res.status} ${await res.text()}`);
  }
  const draft = await res.json();

  for (const f of files) {
    res = await fetch(`${base}/messages/${draft.id}/attachments/createUploadSession`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        AttachmentItem: { attachmentType: "file", name: f.name, size: f.bytes.length },
      }),
    });
    if (!res.ok) {
      throw new Error(`Graph upload session failed: ${res.status} ${await res.text()}`);
    }
    const session = await res.json();
    const CHUNK = 3 * 1024 * 1024;
    for (let offset = 0; offset < f.bytes.length; offset += CHUNK) {
      const chunk = f.bytes.subarray(offset, Math.min(offset + CHUNK, f.bytes.length));
      const putRes = await fetch(session.uploadUrl, {
        method: "PUT",
        headers: {
          "content-type": "application/octet-stream",
          "content-range": `bytes ${offset}-${offset + chunk.length - 1}/${f.bytes.length}`,
        },
        body: chunk,
      });
      if (!putRes.ok) {
        throw new Error(`Graph chunk upload failed: ${putRes.status} ${await putRes.text()}`);
      }
    }
  }

  res = await fetch(`${base}/messages/${draft.id}/send`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Graph draft send failed: ${res.status} ${await res.text()}`);
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
      subject: `${SITE_URL.replace(/^https?:\/\//, "").replace(/\/+$/, "")} Graph API test`,
      text: `Smoke test from ${SITE_URL.replace(/^https?:\/\//, "").replace(/\/+$/, "")} confirming the M365 Graph API path works.\n\nTimestamp: ${new Date().toISOString()}\nSender: ${process.env.M365_SENDER}\nRecipient: ${process.env.LEAD_RECIPIENT ?? "(falls back to sender)"}`,
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
    "## What sets Interactive Displays Ireland apart",
    "",
    ...ORG.differentiators.map((d) => `- ${d}`),
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
  const diffsBlock = ORG.differentiators.map((d) => `- ${d}`).join("\n");
  sections.push(
    `# ${ORG.name} — full site content\n\n${ORG.description}\n\n## What sets Interactive Displays Ireland apart\n\n${diffsBlock}\n\n## Contact\n\n- Phone: ${ORG.phone}\n- Email: ${ORG.email}\n- Office: ${ORG.address}\n`,
  );

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

// ─── /wp-admin/admin-ajax.php — legacy Elementor careers form bridge ────────
// The wp-mirror careers pages still carry the Elementor Pro "Careers Form"
// (name/email/phone/job/CV-upload/message). Elementor's bundled form JS
// posts multipart FormData to WordPress's /wp-admin/admin-ajax.php with
// action=elementor_pro_forms_send_form — which started 404ing the moment
// the WP backend was retired, killing CV submissions. This handler accepts
// that exact payload, emails the application (CV attached) through the
// existing Graph plumbing, and answers with the JSON shape Elementor's JS
// renders:
//   success: { success: true,  data: { message, errors: {}, data: {} } }
//   error:   { success: false, data: { message, errors: { <fieldId>: msg }, data: {} } }
// Errors MUST come back HTTP 200 — Elementor only renders messages inside
// jQuery's success callback; non-2xx hits a silent error handler and the
// visitor sees nothing.

const ELEMENTOR_FIELD_LABELS = {
  name: "Name",
  email: "Email",
  message: "Other details",
  // Careers form (b9aab9c)
  field_58b5497: "Phone",
  field_992eb33: "Job applying for",
  field_37c683d: "CV/Resume",
  // Homepage enquiry form (323aa2d9)
  field_6c180a9: "Phone",
  field_3c7249d: "Interested in",
};

// Registry of the Elementor forms that exist in the mirror. Submissions
// whose form_id isn't here are rejected — spam bots replay captured WP
// form payloads (arbitrary form_ids) directly at admin-ajax.php.
//
// honeypot: the form's hidden display:none field. Real browsers ALWAYS
// post it (empty — FormData includes hidden inputs); bots replaying a
// captured field subset omit it, and dumber bots fill it. Both → fake
// success, nothing sent. This alone killed the 2026-06-12 spam wave
// (mail.ru bots posting the homepage form without field_4ed93b1).
const ELEMENTOR_FORMS = {
  // Careers CV form — shared template on all five /careers/<job>/ pages.
  b9aab9c: {
    name: "careers",
    honeypot: "field_1b0a3f6",
    requireFile: true,
    uploadField: "field_37c683d",
  },
  // Homepage enquiry form (mirror /).
  "323aa2d9": {
    name: "homepage-enquiry",
    honeypot: "field_4ed93b1",
    requireFile: false,
  },
};
const ELEMENTOR_HONEYPOT_IDS = new Set(
  Object.values(ELEMENTOR_FORMS).map((f) => f.honeypot),
);

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // matches the form's data-maxsize="10"
// Raw-bytes threshold for switching from inline base64 /sendMail (4 MB
// request cap) to the draft + upload-session flow.
const SENDMAIL_INLINE_LIMIT = 2_500_000;

function elementorJson(success, message, errors = {}) {
  return new Response(
    JSON.stringify({ success, data: { message, errors, data: {} } }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

async function handleAdminAjax(request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, data: { message: "method-not-allowed" } }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }
  // Cap before buffering the body: 10 MB CV + fields + multipart overhead.
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES + 1_000_000) {
    return elementorJson(false, "This file exceeds the maximum allowed size of 10 MB.", {
      field_37c683d: "File too large (max 10 MB).",
    });
  }
  let form;
  try {
    form = await request.formData();
  } catch (err) {
    console.error("[admin-ajax] formData parse failed:", err);
    return elementorJson(false, "Your submission could not be read. Please try again.");
  }
  if (form.get("action") !== "elementor_pro_forms_send_form") {
    // Other legacy WP ajax actions (WooCommerce order attribution etc.) —
    // nothing behind them any more. Their scripts ignore failures.
    return new Response(JSON.stringify({ success: false, data: { message: "unsupported-action" } }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const fields = {}; // fieldId → string value
  const files = [];  // { fieldId, name, contentType, bytes }
  for (const [key, value] of form.entries()) {
    const m = key.match(/^form_fields\[(.+?)\](\[\])?$/);
    if (!m) continue;
    if (typeof value === "string") {
      fields[m[1]] = value.trim();
    } else if (value && typeof value.arrayBuffer === "function" && value.size > 0) {
      files.push({
        fieldId: m[1],
        name: (value.name || "attachment").replace(/[\\/]/g, "_").slice(0, 150),
        contentType: value.type || "application/octet-stream",
        bytes: Buffer.from(await value.arrayBuffer()),
      });
    }
  }

  const formId = String(form.get("form_id") ?? "");
  const formDef = ELEMENTOR_FORMS[formId];
  if (!formDef) {
    console.warn(`[admin-ajax] unknown form_id "${formId}" — rejected`);
    return elementorJson(
      false,
      `This form is no longer in service — please use ${SITE_URL}/contact-us or email ${ORG.email}.`,
    );
  }

  // Honeypot: must be PRESENT (real browsers post hidden inputs as empty
  // strings) and EMPTY (humans can't see it to fill it).
  const honeypotValue = fields[formDef.honeypot];
  if (honeypotValue === undefined || honeypotValue) {
    console.warn(
      `[admin-ajax] honeypot ${honeypotValue === undefined ? "missing" : "filled"} on ${formDef.name} — dropped`,
    );
    return elementorJson(true, "Thank you — your message has been received.");
  }

  const errors = {};
  if (!fields.name) errors.name = "Please enter your name.";
  if (!fields.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = "Please enter a valid email address.";
  }
  const totalUpload = files.reduce((sum, f) => sum + f.bytes.length, 0);
  if (formDef.requireFile && files.length === 0) {
    errors[formDef.uploadField] = "Please attach your CV.";
  }
  if (totalUpload > MAX_UPLOAD_BYTES) {
    errors[formDef.uploadField ?? "name"] = "File too large (max 10 MB).";
  }
  if (Object.keys(errors).length) {
    return elementorJson(false, "Please correct the highlighted fields and resubmit.", errors);
  }

  // reCAPTCHA v3 — the token rides along as a hidden recaptcha_token input
  // seeded into the form by the snippet rewriteMirrorHtml() injects.
  const rawToken = form.get("recaptcha_token");
  const verdict = await verifyRecaptcha(
    typeof rawToken === "string" ? rawToken : "",
    "careers_form",
    request.headers.get("x-real-ip"),
  );
  if (!verdict.ok) {
    console.warn(`[admin-ajax] recaptcha rejected (${verdict.reason}) — submission from "${fields.email}" dropped`);
    return elementorJson(
      false,
      `We couldn't verify your submission. Please email ${ORG.email} instead.`,
    );
  }

  // Subject context: the page title the visitor applied from ("Account
  // Manager - InteractiveDisplays") with the WP site-name suffix stripped,
  // falling back to the "What job are you applying for?" answer.
  const refererTitle = String(form.get("referer_title") ?? "")
    .replace(/\s*[-–]\s*InteractiveDisplays.*$/i, "")
    .trim();
  const referrer = String(form.get("referrer") ?? "");
  let subject;
  if (formDef.name === "careers") {
    const job = refererTitle || fields.field_992eb33 || "General application";
    subject = `New CV application: ${fields.name} — ${job}`;
  } else {
    const interest = fields.field_3c7249d ? ` — ${fields.field_3c7249d}` : "";
    subject = `New website enquiry: ${fields.name}${interest}`;
  }

  const lines = [
    `New ${formDef.name === "careers" ? "careers application" : "website enquiry (homepage form)"} via ${SITE_URL.replace(/^https?:\/\//, "")}`,
    "",
    ...Object.entries(fields)
      .filter(([id]) => !ELEMENTOR_HONEYPOT_IDS.has(id))
      .map(([id, value]) => `${ELEMENTOR_FIELD_LABELS[id] ?? id}: ${value || "(not provided)"}`),
    ...files.map((f) => `Attached: ${f.name} (${Math.round(f.bytes.length / 1024)} KB)`),
    "",
    "---",
    `Submitted: ${new Date().toISOString()}`,
    `From page: ${referrer || "(unknown)"}`,
  ];

  const to =
    formDef.name === "careers"
      ? process.env.CAREERS_RECIPIENT || process.env.LEAD_RECIPIENT || process.env.M365_SENDER
      : process.env.LEAD_RECIPIENT || process.env.M365_SENDER;
  const mail = {
    subject,
    text: lines.join("\n"),
    to,
    replyTo: fields.email,
  };
  try {
    if (totalUpload > SENDMAIL_INLINE_LIMIT) {
      await sendMailLargeAttachments({ ...mail, files });
    } else {
      await sendMail({
        ...mail,
        attachments: files.map((f) => ({
          name: f.name,
          contentType: f.contentType,
          contentBytes: f.bytes.toString("base64"),
        })),
      });
    }
    return elementorJson(
      true,
      formDef.name === "careers"
        ? "Thank you — your application has been received. We'll be in touch soon."
        : "Thank you — your message has been received. We'll be in touch soon.",
    );
  } catch (err) {
    console.error(`[admin-ajax] ${formDef.name} send failed:`, err);
    return elementorJson(
      false,
      `Something went wrong sending your message. Please email ${ORG.email} instead.`,
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
  recaptchaToken: z.string().max(5000).optional(),
  sourcePage: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
  // Google Ads click IDs captured client-side on landing (src/lib/click-ids.ts).
  // Surfaced in the lead email so closed sales can be uploaded to Google Ads
  // as offline conversions with real values.
  gclid: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/).optional(),
  wbraid: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/).optional(),
  gbraid: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/).optional(),
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
  // Derive the site host from SITE_URL so lead emails name the real site
  // (interactivedisplays.ie post-cutover) rather than a hardcoded host.
  const siteHost = SITE_URL.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const lines = [
    `New contact form submission from ${siteHost}`,
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
  // Google Ads click IDs — keep the "GCLID:" label greppable; the offline
  // conversion upload flow reads it out of the sales@ email.
  if (lead.gclid) lines.push(`GCLID: ${lead.gclid}`);
  if (lead.wbraid) lines.push(`WBRAID: ${lead.wbraid}`);
  if (lead.gbraid) lines.push(`GBRAID: ${lead.gbraid}`);
  const text = lines.join("\n");
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px;">
      <p>New contact form submission from <strong>${siteHost}</strong></p>
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
        Referrer: ${escapeHtml(lead.referrer || "(direct)")}${lead.gclid ? `<br>GCLID: ${escapeHtml(lead.gclid)}` : ""}${lead.wbraid ? `<br>WBRAID: ${escapeHtml(lead.wbraid)}` : ""}${lead.gbraid ? `<br>GBRAID: ${escapeHtml(lead.gbraid)}` : ""}
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
  const verdict = await verifyRecaptcha(
    lead.recaptchaToken,
    "contact",
    request.headers.get("x-real-ip"),
  );
  if (!verdict.ok) {
    console.warn(`[contact] recaptcha rejected (${verdict.reason}) — lead from "${lead.email}" dropped`);
    return new Response(
      JSON.stringify({
        success: false,
        error: "We couldn't verify your submission. Please call us or email sales@interactivedisplays.ie directly.",
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
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
  // Legacy Elementor forms on mirror pages (careers CV submissions) still
  // post to the WordPress ajax endpoint — bridge them to Graph email.
  if (url.pathname === "/wp-admin/admin-ajax.php") return handleAdminAjax(request);

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
