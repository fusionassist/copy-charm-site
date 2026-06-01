# Changelog — interactivedisplays.ie

Notable changes to the beta.interactivedisplays.ie deployment, in reverse-chronological order.

Format inspired by [keepachangelog.com](https://keepachangelog.com/en/1.1.0/); not strictly versioned (single-domain product, continuous deploy). Each entry links to the commit(s) it covers.

> **Editing policy:** every meaningful change to the repo should add an entry here in the same commit (per the doc-maintenance decision on 2026-05-29). Trivial typo/whitespace commits are exempt.

## [Unreleased]

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
