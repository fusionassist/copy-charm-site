# Changelog — interactivedisplays.ie

Notable changes to the beta.interactivedisplays.ie deployment, in reverse-chronological order.

Format inspired by [keepachangelog.com](https://keepachangelog.com/en/1.1.0/); not strictly versioned (single-domain product, continuous deploy). Each entry links to the commit(s) it covers.

> **Editing policy:** every meaningful change to the repo should add an entry here in the same commit (per the doc-maintenance decision on 2026-05-29). Trivial typo/whitespace commits are exempt.

## [Unreleased]

### Fixed — 2026-06-08 — Strip legacy WP tracking baked into mirror

When verifying the pre-wired tracking infrastructure didn't leak, discovered the wp-mirror HTML had **legacy gtag.js + GTM + Meta Pixel scripts hard-coded** from the previous WP install:
- Google Tag `GT-M3LVT37` loading on every mirror page
- GTM container `GTM-NS2W7ML` (noscript iframe)
- Meta Pixel `1422006029068970` firing PageView on every mirror page

These were firing to whatever accounts they belong to every time someone visited a mirror page — could be the old WP setup, could be someone else's accounts. Either way they're orphaned and shouldn't be running.

Added `LEGACY_TRACKING_PATTERNS` to the mirror rewriter that strips: gtag.js loaders (any ID), GTM container loaders, GTM noscript iframes, inline gtag('config', ...) blocks, Meta Pixel loader + fbq('init', ...), Meta noscript fallback, and `connect.facebook.net` script fragments. Runs before our env-driven tracking injection so old + new can't double-fire.

### Added — 2026-06-08 — Tracking script injection (pre-wired, env-gated)

Built the plumbing for Google Tag Manager, Google Analytics 4, Google Ads conversion tracking, Meta Pixel, and LinkedIn Insight Tag. **Inert until env vars are set** — no tracking scripts ship until you populate `VITE_PUBLIC_GTM_ID`, `VITE_PUBLIC_GA4_ID`, `VITE_PUBLIC_GOOGLE_ADS_ID`, `VITE_PUBLIC_META_PIXEL_ID`, or `VITE_PUBLIC_LINKEDIN_PARTNER_ID` in `.env.local`. Each tracker is independent — setting just one activates only that tracker.

Components added:
- `src/components/tracking/TrackingScripts.tsx` — renders the right `<script>` tags into the TanStack route HTML based on which env vars are set. Reads `import.meta.env.VITE_PUBLIC_*` at build time. Mounted in `__root.tsx` body.
- `src/components/tracking/ContactClickTracker.tsx` — global click delegation that emits `phone_click` / `email_click` events for any `tel:` or `mailto:` link clicked anywhere on the page. Mounted in `__root.tsx`.
- `src/lib/track.ts` — `track(event)` dispatcher. Single API for emitting conversion events; fans out to `gtag`, `dataLayer.push`, and `fbq` as available. Map our internal event shape to standard GA4 + Meta event names. Used by `LeadForm.tsx` to fire `lead_form_submit` (→ `generate_lead` / Meta `Lead`) on form success.

For mirror pages, `start-node.mjs:rewriteMirrorHtml` now also injects the same tracking snippets — `<script>` blocks before `</head>` and `<noscript>` fallbacks immediately after `<body>`. Same inline click-delegation handler for `tel:`/`mailto:` so phone/email click events fire on legacy WP pages too. All env-driven from the same VITE_PUBLIC_* vars.

When IDs are added later: SSH in → `nano ~/apps/copy-charm-site/.env.local` → set the IDs → `kill $(cat logs/app.pid) && ~/bin/beta-node-supervisor.sh` (or `./deploy.sh` if also rebuilding). Tracking activates within seconds, no code change needed.

### Fixed — 2026-06-08 — Sitemap "Invalid date" errors in GSC

After GSC accepted the sitemap (77 URLs discovered), the validator reported 3 URLs with "Invalid date" lastmod values. Diagnosed: js-yaml auto-parses unquoted YAML dates like `updatedAt: 2025-08-22` to JavaScript Date objects. When concatenated into XML without normalisation, those Date objects stringify as `Fri Aug 22 2025 01:00:00 GMT+0100 (Irish Standard Time)` — not Google's accepted W3C date format.

Added an `isoDate()` helper in the sitemap handler. Accepts Date objects (formats via `toISOString().split("T")[0]`), accepts strings already in YYYY-MM-DD or ISO 8601 format as-is, falls back to today's date for anything else. Applied to all 3 MDX-sourced lastmod lookups (products, posts, jobs).

Verified: every lastmod in `/sitemap.xml` now matches `^\d{4}-\d{2}-\d{2}$`. GSC's "Sitemap can be read, but has errors" should clear on next read.

### Fixed — 2026-06-08 — Legacy Rank Math sitemap URLs 404'd in GSC

Google Search Console's existing sitemap submission for `interactivedisplays.ie` pointed at `/sitemap_index.xml` — Rank Math's multi-file sitemap index from the legacy WP site. wget never captured those dynamic files, so GSC was hitting 404s and showing "Couldn't fetch".

Added 301 redirects for all Rank Math sitemap shapes — `/sitemap_index.xml` plus per-type `/post-sitemap.xml`, `/page-sitemap.xml`, `/product-sitemap.xml`, `/product_cat-sitemap.xml`, `/product_tag-sitemap.xml`, `/category-sitemap.xml`, `/brand-sitemap.xml`, `/author-sitemap.xml` (with optional digit suffix). All forward to our new combined `/sitemap.xml`.

Means anyone who has the old sitemap URL bookmarked (search engines, SEO tools, external sites referencing it) follows a clean 301 to the new sitemap. GSC's stale "Couldn't fetch" status will clear once we resubmit.

### Fixed — 2026-06-08 — Post-cutover SEO assessment cleanup

Ran a comprehensive external SEO probe immediately after the prod cutover (sitemap reachability, per-page meta, JSON-LD structure, AI-agent endpoints, social previews, performance, legacy URL equity). Three real findings to address:

1. **Hard-coded `https://beta.interactivedisplays.ie` URLs in TanStack source.** The Vite bundle bakes these into the static client at build time, so even after flipping `VITE_PUBLIC_SITE_URL` the deployed client kept the beta URLs. Fixed in 5 places (`src/lib/site-meta.ts`, `src/routes/{__root,index,contact-us}.tsx`) by reading `import.meta.env.VITE_PUBLIC_SITE_URL` at build time with a prod default fallback. Now `bun run build` produces a bundle that takes the env var at build-time, no hard-coded staging URLs.

2. **Homepage og:image points at a 0-byte WP-content file.** Rank Math wrote the legacy og:image as `/wp-content/uploads/2025/07/interactive-displays-logo.png` — wget preserved the meta but the file in the mirror is 0 bytes, so LinkedIn/WhatsApp/Slack previews showed no image. Mirror rewriter now substitutes the branded `/brand/og-default.png` (1200×630 IDI navy card) for that specific URL.

3. **Rank Math JSON-LD used `https://www.interactivedisplays.ie` + relative `@id` refs.** Our preferred canonical is the bare domain. Mirror rewriter now (a) replaces every `https://www.interactivedisplays.ie` with `SITE_URL`, and (b) absolutizes relative `"@id":"/#organization"` refs to `"@id":"${SITE_URL}/#organization"` so Google sees one consistent entity in the Schema.org identity graph.

Per the doc maintenance contract — CHANGELOG.md updated. CLAUDE.md unchanged (no architecture shift).

### Fixed — 2026-06-08 — /interactivedisplays.ie/index.html URL leak

Same family as the elementor-6 fix: wget mangled self-domain links on inner pages to `href="../../../interactivedisplays.ie/index.html"`. Browser resolves to `https://interactivedisplays.ie/interactivedisplays.ie/index.html` → 404. ~146 mirror files affected, five different `../` depths.

Folded into the existing two-layer pattern: rewriter strips every depth + absolute form, redirect handler 301s any direct hit on `/interactivedisplays.ie/...` to `/`.

### Fixed — 2026-06-08 — /elementor-6/ URL leak

The legacy WP site stored its homepage as an Elementor template at /elementor-6/index.html. wget preserved internal relative links to that path in ~150 mirror HTML files — clicking the logo or the "Home" nav link on any mirror page navigated the browser to https://interactivedisplays.ie/elementor-6/index.html. Ugly URL, duplicate-content collision with /, and meaningless to anyone outside the WP backend.

Two-layer fix in start-node.mjs:

1. Mirror HTML rewriter — folds every variant of the link back to "/":
   `href="elementor-6/index.html"` / `href="../elementor-6/index.html"` /
   `href="/elementor-6/"` etc.

2. Permanent 301 — any request for /elementor-6/* (with or without index.html, with or without trailing slash) gets a 301 to /. Catches inbound external links and Google's existing index of the path.

Verified with curl after deploy.

### Added — 2026-06-08 — REDIRECT_TO_HOST env flag for atomic prod cutover

Adds an env-driven permanent host redirect. When `REDIRECT_TO_HOST=<host>` is set and a request arrives with a different `Host` header, the server returns a 301 to `https://<host>${pathname}${search}`.

Designed for post-cutover use: after the same Node app starts serving `interactivedisplays.ie`, set `REDIRECT_TO_HOST=interactivedisplays.ie` on the SAME app and any inbound traffic to `beta.interactivedisplays.ie` permanently forwards to the prod URL. Preserves any external links indexed under beta + transfers their PageRank to the prod equivalent.

Webmaster verification paths (`/robots.txt`, `/google*.html`, `/BingSiteAuth.xml`) are exempt — ownership checks must work on both hosts independently. (Verification crawlers fetch on the literal hostname they were registered for; a 301 would fail the check.)

Inert until cutover. Currently `REDIRECT_TO_HOST` is unset on the server, so request flow is unchanged.

### Fixed — 2026-06-08 — 502 Bad Gateway / process crash on malformed URIs

Production was returning 502 across the whole site. Two compounding bugs:

1. `decodeURIComponent(url.pathname)` in `tryServeMirror` threw `URIError: URI malformed` whenever a request came in with bad %-encoding (drive-by scanners hit `/%FF`, `/%E0%A4%A`, etc. all day). Unhandled → Node 24 terminated the process.
2. The cron supervisor's PID check (`kill -0 $(cat pidfile)`) returned success for a stale PID. The supervisor thought the app was running for hours after it actually died.

Three layers of defence added:
- `safeDecodePath()` wraps `decodeURIComponent` — returns `null` on malformed input, mirror handler falls through to TanStack 404 instead of throwing
- Process-level `uncaughtException` + `unhandledRejection` handlers log loudly but don't exit. Any other unforeseen async exception is now a logged warning, not a process death.
- Supervisor rewritten on the server with a stricter `is_app_healthy()`: PID exists AND belongs to a process whose cmdline contains `start-node.mjs` AND something is listening on port 3417. Stale PID files no longer fool it; if any check fails, the supervisor kills the lingering PID and starts fresh. Logged restart events go to app.log with timestamp.

Verified: `curl /%FF` used to crash → now returns 400 cleanly without affecting subsequent requests. Process stayed alive through several deliberate bad-URL hits.

### Added — 2026-06-08 — Default OG image + per-page schema injection on mirror

Three SEO improvements in one commit:

**Default OG image (`public/brand/og-default.png`, 1200×630, ~140 KB).** Brand-navy gradient background, white IDI logo, white tagline ("Digital signage that earns its place"), cyan dot accent. Used by TanStack `__root.tsx` as the default `og:image` + `twitter:image` for routes that don't override it. Built programmatically via .NET drawing — full source in the commit message of [this commit].

**TanStack root meta cleaned up.** The original `__root.tsx` carried Lovable-default meta (`title: "Lovable App"`, `description: "Lovable Generated Project"`, `twitter:site: @Lovable`). Replaced with proper IDI defaults: real title, real description, `og:site_name`, `og:locale=en_IE`, `og:image`, `twitter:card=summary_large_image`, `twitter:image`. Per-route `head()` overrides on more specific pages (`/contact-us` etc.) still win.

**Schema.org JSON-LD injection on mirror pages.** The mirror's WP/Rank Math meta provides high-quality data (`og:title`, `og:description`, `og:image`, `og:type`, `article:published_time`, `product:price:currency`, etc.) but no JSON-LD. The mirror HTML rewriter now extracts those values and emits an appropriate JSON-LD block in `<head>` per URL pattern:
- `/product/*` → Product schema with name, description, image, brand, offer (currency + availability)
- `/insights/*` and the 6 legacy direct-mounted blog paths → Article schema (with publisher, datePublished, dateModified)
- `/careers/<slug>` (not `/careers/` index) → JobPosting schema with hiringOrganization + jobLocation
- Top-level service pages (training-support, supply-installation, etc.) → Service schema with provider + areaServed
- `/product-category/*` and `/brand/*` → CollectionPage schema

Schema reads from existing meta on every page render — no per-page hard-coded data. Adding a new product is just dropping its HTML in `wp-mirror/`; the schema appears automatically.

**Same rewriter also absolutizes og:image URLs** — they were relative (`/wp-content/...`), which broke previews in LinkedIn, WhatsApp, Slack, Discord. Now they're absolute `${SITE_URL}/wp-content/...` and social previews will render with the actual product photo.

### Added — 2026-06-08 — Webmaster Tools verification endpoints

`GET /google<random>.html` and `GET /BingSiteAuth.xml` handlers added. Both are env-driven:
- `GSC_VERIFICATION=googleXXXX.html` — set to the verification filename Google Search Console gives you
- `BING_VERIFICATION_CODE=XXXX...` — set to the code inside Bing's `BingSiteAuth.xml`

When unset, the handlers don't match — fall through cleanly. When set, they emit the verification content needed.

**Critically, these endpoints are exempt from the `X-Robots-Tag: noindex` wrapper** that's applied to every other response while `SITE_NOINDEX=true`. Verification crawlers must be able to fetch the verification content before launch (when the beta is still walled off from search). New `isNoindexExempt()` helper in the serve wrapper centralises the exemption list — currently `/robots.txt`, `/google*.html`, `/BingSiteAuth.xml`.

To wire up: in Google Search Console / Bing Webmaster Tools, register `beta.interactivedisplays.ie` (or eventually production), pick the HTML file verification method, copy the verification filename/code into the server's `.env.local`, restart. Verification succeeds; can then submit sitemap, monitor coverage, etc.

### Added — 2026-05-29 — 301 redirect map for legacy WP post-ID URLs

Catalogued every `?p=N` URL the legacy WP site exposed. 67 distinct post-IDs mapped to their canonical pretty-permalink path, extracted by reading the `<link rel="canonical">` out of each `wp-mirror/index.html@p=<id>.html` file. 7 IDs (924/948/957/970/988/995/999) produced no canonical (orphaned/deleted) and are intentionally omitted — they 404 cleanly rather than redirect somewhere wrong.

Wired into `start-node.mjs` as a top-priority route layer (runs before `/robots.txt`, before mirror, before SSR). `resolveRedirect(pathname, search)` handles three input shapes:
- `/?p=N` (the WP canonical legacy form)
- `/index.php?p=N` and `/?page_id=N` (equivalent WP forms)
- `/index.html@p=N.html` (the wget cached form — rare but harmless)

All redirects are 301 (permanent) with `Cache-Control: max-age=86400`. Verified with `curl -I` across ~10 sample IDs that they target the right page.

Why this matters: at production cutover, Google's index has these `?p=N` URLs from years of WP serving. Without the map, every one becomes a duplicate-content collision (the mirror's resolver doesn't understand query params, so `/?p=877` serves the same HTML as `/`). With the map, every legacy URL Google has indexed inherits its rank into the canonical equivalent.

Source-of-truth audit lives at `src/lib/redirects.ts` (documented, with the full `RedirectRule` type for future custom rules). `start-node.mjs` mirrors the data inline because it runs outside the Vite/TS build (same pattern as the ORG constant). Update both when adding a new rule.

Also expanded `sitemap.xml` from 6 URLs to ~75 — added every canonical URL known to the site (products, categories, brands, service pages, careers, blog posts) so Google has a comprehensive list to crawl post-launch. Sitemap URLs anchor on `SITE_URL` so they flip automatically at cutover.

### Fixed — 2026-05-29 — Mirror SEO tags (wget-mangled canonicals + og:url)

The wp-mirror's HTML carries wget-mangled SEO metadata:
- Homepage: `<link rel="canonical" href="../interactivedisplays.ie/index.html">`
- Product: `<link rel="canonical" href="../../product/<slug>/">`
- Category / brand: `<link rel="canonical" href="index.html">`
- `<meta property="og:url" content="/">`

All would point Google at non-existent / wrong URLs the moment beta becomes indexable at production cutover (canonicals are the strongest signal Google uses to deduplicate near-identical pages, and wrong canonicals cause de-indexing).

Added `rewriteSeoTags()` to the mirror HTML pipeline in `start-node.mjs`. For every text/html mirror response it rewrites:
- `<link rel="canonical">` → `<link rel="canonical" href="${SITE_URL}${path}">`
- `<meta property="og:url">` → `<meta property="og:url" content="${SITE_URL}${path}">`
- `<meta name="twitter:url">` → same target

Anchored on `VITE_PUBLIC_SITE_URL`. At production cutover we change that env var from `https://beta.interactivedisplays.ie` to `https://interactivedisplays.ie` and every canonical follows automatically — no per-page edit, no SEO debt carried over.

Why this matters NOW even though beta is noindexed: the day we flip noindex off, Google will discover and re-evaluate these canonicals. Fixing it pre-cutover means launch-day rankings inherit cleanly. Mirror was sitting on a launch-day landmine.

Verified by curling a few page types before/after deploy — homepage, product, category, brand all now emit a canonical that points back at themselves on the configured site URL.

### Added — 2026-05-29 — Documentation system

- `CHANGELOG.md` (this file) — back-filled with every commit since the wp-mirror move.
- `docs/adr/` — seven Architecture Decision Records covering the major locked-in choices (TanStack vs Next.js, Plesk hosting, mirror-first runtime, Graph API for email, brand-tokens-in-CSS, noindex-on-staging, Lovable-for-homepage-design).
- `CLAUDE.md` — full refresh to match current production state.

Maintenance contract: future commits update CHANGELOG (always) and CLAUDE.md/ADRs (when architecture shifts), in the same PR/commit as the change.

### Added — 2026-05-26 — Beta walled off from search engines

- New `SITE_NOINDEX` env var (`start-node.mjs`). When set (currently `true` on beta):
  - Every response gets `X-Robots-Tag: noindex, nofollow` header.
  - `robots.txt` returns `User-agent: * / Disallow: /`.
  - Mirror HTML's inherited `<meta name="robots" content="index, follow">` is rewritten to `noindex, nofollow` on the fly.
- Reason: prevent the wget-mirror copy of the live WP site from competing with `interactivedisplays.ie` for search rankings. Flips off at production cutover.
- See `docs/adr/0006-noindex-on-staging.md`.
- Verified: `curl -I https://beta.interactivedisplays.ie/` returns the header on TanStack routes, mirror pages, and assets.

### Performance baseline — 2026-05-26

Cold TTFB on the Plesk Node app:

| URL | TTFB | Total | Size (on-wire) |
|---|---|---|---|
| `/` (mirror) | 95 ms | 129 ms | 288 KB raw |
| `/contact-us` (TanStack SSR) | 55 ms | 61 ms | 18 KB |
| `/assets/index-*.js` (cold, gzip) | 37 ms | 59 ms | 121 KB gz |
| `/assets/styles-*.css` (cold, gzip) | 37 ms | 43 ms | 14 KB gz |
| `/api/products.json` (gzip) | 66 ms | — | 707 B gz |

All inside the green zone for server-side Core Web Vitals. Lighthouse score post-Lovable redesign depends on the design choices; the infrastructure is not the bottleneck.

### Added — 2026-05-26 — AI-agent compatibility surface

Commits: `b1cb171`, `86fe52e`.

- `GET /llms.txt` — Karpathy-format outline (3.3 KB) of the site for LLM agents.
- `GET /llms-full.txt` — concatenated markdown of every product/post/job/page (7.5 KB and growing).
- `GET /robots.txt` — explicit allowlist for ~20 AI crawlers (GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-Web, anthropic-ai, PerplexityBot, Google-Extended, Applebot-Extended, Amazonbot, CCBot, etc.). When `SITE_NOINDEX` is on (currently), this is overridden by Disallow.
- `GET /sitemap.xml` — generated from MDX + static routes with `lastmod`. 6 URLs today, grows as content lands.
- `GET /api/{products,posts,jobs,pages}.json` — structured JSON for agents that don't parse HTML.
- `src/lib/site-meta.ts` — single source of truth for IDI org info (name, address, phone, geo, hours, brands, categories). All schema components and llms.txt read from it. Mirror constant in `start-node.mjs` (manually synced — flagged in CLAUDE.md §2).
- JSON-LD on every TanStack route via `OrganizationSchema` + `WebSite`. On `/contact-us`: also `LocalBusiness`, `ContactPage`, `PostalAddress`, `GeoCoordinates`, `OpeningHoursSpecification`, `BreadcrumbList`. 14 distinct `@type`s confirmed in the rendered HTML.
- Fixed: gray-matter 4.0.3 calls the removed `js-yaml.safeLoad()` API; we pinned `js-yaml@4.1.0` (overrides) for the @mdx-js chain, so frontmatter was parsing to empty `{}`. Replaced with a 20-line inline parser using `yaml.load()` directly.

### Added — 2026-05-26 — Odoo Live Chat embed

Commits: `c3e774e`, `ca4586e`, `e94d99d`.

- `src/components/chat/OdooLiveChat.tsx` — renders the two `defer` script tags on every TanStack route via `__root.tsx` body.
- `start-node.mjs` HTML rewriter (`rewriteMirrorHtml`) — injects the same scripts before `</body>` on every `text/html` mirror response.
- Env-driven: `VITE_PUBLIC_ODOO_BASE_URL=https://erp.interpos.ai`, `VITE_PUBLIC_ODOO_LIVECHAT_CHANNEL_ID=4`.
- Includes `?fusion_domain=<host>` query param consumed by the custom `fusion_ai_livechat` Odoo module for CRM/helpdesk lead attribution. Optional in that controller (guarded by `if fd:`).
- Legacy **Tawk.to** widget stripped sitewide — `<script id="tawk-script">` blocks removed from every mirror HTML response.
- **Outstanding** (Odoo-side, not website-side): `https://erp.interpos.ai/im_livechat/loader/4` currently returns `303 → /web/database/selector`. Needs `dbfilter = ^<prod-db>$` in `odoo.conf` on the Odoo box. Confirmed via reading `fusion_ai_livechat/controllers/main.py` that the route is `auth='public'` — so it's purely a DB-selection issue, not auth/domain. Once that returns 200 with JS, the chat appears automatically — no website-side redeploy needed.

### Added — 2026-05-25 — MDX content pipeline (Phase 2 step 4)

Commits: `f6fa6f7`, `8a07170`.

- `@mdx-js/rollup` + `remark-mdx-frontmatter` wired into Vite (`enforce: pre`).
- `src/lib/mdx.ts` — type-safe loaders for products, posts, jobs, pages. Eager glob per content type returning both the React component (`default`) and frontmatter (named export). Sort + index helpers.
- Four sample MDX files (one per content type) per the schemas in CLAUDE.md §5.
- `src/routes/dev.mdx-test.tsx` (noindex) — proves the pipeline end-to-end. Currently lists 1 of each type.
- Fix: first attempt used `?raw` + gray-matter — failed because the MDX plugin (`enforce: pre`) intercepts the file before `?raw` resolution. Switched to `remark-mdx-frontmatter` which adds a named `frontmatter` export to the compiled MDX module.
- Fix: `js-yaml@4.1.1` was published broken (missing `index.js`); pinned via `overrides: { "js-yaml": "4.1.0" }`.

### Added — 2026-05-25 — Lovable Session 2 brief for homepage redesign

- After shipping a TanStack homepage I considered too minimal (Hero+StatsBar+CategoryGrid+LogoStrip+WhyChooseUs+CTABanner with shadcn defaults), rolled back `/` to the mirror.
- `files/Lovable_Session_2_Brief.md` — refined brief specifically calling out: photography-led, premium-installer mood, no outline-icon-card-grid templates, real assets from `public/`, hard tech constraints (TanStack Start NOT Next.js), the 8 acceptance criteria. Hand to Lovable, get back TSX, I integrate.

### Added — 2026-05-25 — IDI brand tokens + Inter font (Phase 2 step 3)

Commits: `24ee305`, `1189f13`.

- Tailwind v4 `@theme inline` in `src/styles.css` exposes `brand-navy`, `brand-blue`, `brand-cyan`, `brand-spark` as oklch tokens + utility classes.
- Semantic `--primary` re-bound to `var(--brand-navy)` — every default shadcn `<Button>` instantly becomes IDI navy without per-component changes.
- `--ring` re-bound to `var(--brand-cyan)` for on-brand focus states.
- Inter loaded (Google Fonts, weights 400/500/600/700/800), set as `--font-sans`.
- Fix (separate commit `1189f13`): TanStack-rendered HTML referenced `/assets/styles-*.css` and `/assets/index-*.js` but the Node launcher had no handler for that path — pages were rendering as unstyled HTML and React never hydrated. Added `tryServeClientAsset()` before the mirror layer.

### Added — 2026-05-25 — Real `/contact-us` route + Graph API email

Commits: `3e81631`.

- `src/components/blocks/LeadForm.tsx` — react-hook-form + zod + shadcn primitives. Submit / success / error states inline.
- `src/routes/contact-us.tsx` — two-column layout (form left, contact aside right).
- `start-node.mjs:/api/contact` — validates with same zod schema, formats HTML+text email, sets Reply-To to lead's address, calls Graph `sendMail`.
- M365 Graph API replaces SMTP plumbing (commits `cf40162` → `c38e56b`):
  - Adds `@azure/msal-node`-free OAuth2 client-credentials flow against `login.microsoftonline.com/{tenant}/oauth2/v2.0/token`.
  - Token cached with 60s safety margin.
  - `POST /users/{sender}/sendMail` Graph endpoint, 202 Accepted on success.
- Env: `M365_TENANT_ID`, `M365_CLIENT_ID`, `M365_CLIENT_SECRET`, `M365_SENDER=gerry@interactivedisplays.ie`, `LEAD_RECIPIENT=sales@interactivedisplays.ie`.
- Mail.Send (Application, admin-consented) permission granted on the Entra app registration `interactivedisplays-beta-mail`.
- `/contact-us` added to `MIRROR_EXCLUDE` so the Elementor form HTML doesn't shadow our route.

### Added — 2026-05-25 — Nav + Footer on every TanStack route (Phase 2 step 1)

Commits: `851d28a`, `b206b09`.

- `src/components/nav/Nav.tsx` — sticky white nav, real IDI landscape colour logo, 5 nav links to legacy mirror sections, brand-navy "Get a quote" CTA.
- `src/components/blocks/Footer.tsx` — 4-column navy footer with company info, real client logo, spark-coloured section headings, brand-cyan accents.
- Mounted via `src/routes/__root.tsx` so every TanStack route inherits.
- Followed by a quick fix to use the real IDI address: Dromone, Oldcastle, Co. Meath A82 E0W4, +353 44 967 2855.

### Added — 2026-05-25 — Live deployment at beta.interactivedisplays.ie

Commits: `df80279`, `01ef8a5`.

- Plesk subdomain `beta.interactivedisplays.ie` configured.
- Let's Encrypt cert (R13 issuer) issued via Plesk panel.
- Plesk's Node.js per-domain UI doesn't appear on this install despite permissions being on; chose a manual workaround.
- App runs at `/var/www/vhosts/interactivedisplays.ie/apps/copy-charm-site`. Cron supervisor at `~/bin/beta-node-supervisor.sh` keeps a Node 24 process alive on `127.0.0.1:3417`. nginx routes via "Additional nginx directives" with `location ~ ^/ { proxy_pass http://127.0.0.1:3417; ... }` (regex form because Plesk's auto-generated `location /` prefix conflicts otherwise).
- `deploy.sh` at repo root — one-shot `git pull && bun install && bun run build && restart`.
- `docs/PLESK_DEPLOY.md` rewritten to document the actual architecture.

### Added — 2026-05-22 — Plumbing pivot: Cloudflare Workers → Node + srvx

Commits: `8ab7e99`.

- Lovable's scaffold shipped with the Cloudflare Workers adapter (`@cloudflare/vite-plugin`, `wrangler.jsonc`, `src/server.ts` with `env`/`ctx`).
- Plesk deploys Node so we swapped to a plain `fetch(req)` SSR entry + `srvx/node` launcher.
- `start-node.mjs` (new) at repo root — production HTTP launcher, reads PORT from env.
- Cloudflare config + Wrangler removed. `package.json` adds `start` script + `srvx` dep.
- Dev mode (`bun dev` + serveMirror) still works.

### Added — 2026-05-22 — Repo housekeeping + TanStack Start operating contract

Commits: `cf6c016`, `1501531`.

- `wget` mirror moved from `public/` to `wp-mirror/` (1,411 file rename) — the mirror was the wrong location for "files Vite copies to the deploy bundle"; it's reference material.
- Empty `public/.gitkeep` so TanStack Start's expected directory survives.
- `wp-mirror/README.md` explains the role.
- `CLAUDE.md` v1 written for TanStack Start (replaced the original Vite-SPA-to-Next.js handoff doc) — covers locked architecture, brand tokens, folder structure, MDX schemas, Odoo integration, conventions, Phase 2 plan.
- `README.md`, `DEPENDENCIES.md`, `.env.example` aligned with the actual stack.

### Decided — 2026-05-22 — Framework pivot from Next.js to TanStack Start

ADR: `docs/adr/0001-tanstack-vs-next.md`.

- The original v1.2 architecture decision document specified Next.js 15 App Router.
- Lovable instead produced a TanStack Start scaffold (with React 19, Tailwind v4, file-based routing).
- Rather than convert (estimated multi-day rework with no real upside), we adopted TanStack Start as the locked framework choice. For SEO and AI viewability the semantics are equivalent — both produce server-rendered HTML with no JS required.

---

*Earlier than 2026-05-22 the project lived as audit + briefing documents, not code. See `files/IDI_Architecture_Decisions.md` for the pre-pivot historical record.*
