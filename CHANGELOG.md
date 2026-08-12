# Changelog — interactivedisplays.ie

Notable changes to the beta.interactivedisplays.ie deployment, in reverse-chronological order.

Format inspired by [keepachangelog.com](https://keepachangelog.com/en/1.1.0/); not strictly versioned (single-domain product, continuous deploy). Each entry links to the commit(s) it covers.

> **Editing policy:** every meaningful change to the repo should add an entry here in the same commit (per the doc-maintenance decision on 2026-05-29). Trivial typo/whitespace commits are exempt.

## [Unreleased]

### Removed — 2026-08-06 — Discontinued "mirror" products (Mirror Touch Screen + AR Mirror)

`rewriteMirrorHtml` now strips the **Mirror Touch Screen** and **AR Mirror** `wpr-promo-box` tiles from the WP/Elementor mega-menu + product grids sitewide (regex matches each self-contained tile by its product link + title span, then removes the whole balanced tile — verified div-neutral on the mirror snapshot). Their legacy product URLs (`/product/mirror-touch-screen/`, `/product/ar-mirror/`, both slash forms) now **301 → `/screen-solutions/`** via `resolveRedirect`, so any indexed or externally-linked URLs don't dead-end. (UK sister site had no mirror products — only two orphan unused images, deleted separately.)

### Added — 2026-08-06 — Cross-link + hreflang to the UK sister site (interactivedisplaysuk.com)

Off-site SEO to accelerate organic authority for the newly-launched UK sister site. `rewriteMirrorHtml` now (a) injects a sitewide **"In the UK? Visit our sister site → Interactive Displays UK"** link into the pre-footer strip on every mirror page (followable link → passes authority + aids discovery), and (b) on the **homepage only** (production only, `!NOINDEX`) injects an **hreflang cluster** (`en-ie` → this site, `en-gb` → interactivedisplaysuk.com, `x-default` → this site) so Google serves the right brand per country and the two don't compete for UK searchers. Homepage-scoped because the sites aren't 1:1 (a bad sitewide mapping causes GSC hreflang errors). Reciprocated by matching tags on the UK homepage. `rewriteMirrorHtml` now takes `pathname` (passed from `tryServeMirror`).

### Added — 2026-07-22 — CluScore tile in the WP/Elementor mega-menu "LED Solutions"

Follow-up to the CluScore product page: the main site's mega menu is the WordPress/Elementor promo-box grid (on all ~148 mirror pages), which the React-nav change didn't reach. `rewriteMirrorHtml` now injects a **"GAA LED Scoreboards"** promo-box tile into the **LED Solutions** tab, right after the last LED tile (LED Box Signage), cloning that tile's Elementor element classes so it inherits the same size/style. Background uses the real Moylagh install photo; links to `/product/gaa-led-scoreboards`. Guarded against double-injection.


### Added — 2026-07-22 — CluScore GAA LED Scoreboards product page + nav

New product `/product/gaa-led-scoreboards` for the CluScore GAA scoreboard line (category `led`, brand `cluscore`) — the Irish-assembled LED sports scoreboard installed at Moylagh GAA. Real install photos (from cluscore.ie), GAA-scoring/clock/sponsor-panel/phone-control copy, FAQ + Product/Breadcrumb/FAQ JSON-LD, link out to cluscore.ie. Added to the Screen Solutions mega-menu (under LED, next to LED Video Walls) + the mobile list. `ProductPage` now derives the brand display name from `frontmatter.brand` (was hardcoded "Moytronix") via a slug→name map, so CluScore — and any future non-Moytronix product — brands correctly in the hero eyebrow and Product schema.


### Added — 2026-07-13 — /product/network-menu-boards rebuilt as "Digital Menu Screens"

This-week push (ads driving menu-screen traffic). The legacy mirror product page at `/product/network-menu-boards/` is replaced by a React MDX product page titled **"Digital Menu Screens"**, taking over the same (indexed, in-nav) URL — same takeover pattern as `android-network-display`. Same Moytronix 43″/32″ Android + ScreenFusion hardware (variants comparison table; **not** BrightSign), menu-angled copy, in-stock/fast-install messaging, and **real IDI install photos** (Centra, Supermac's — optimised from Dropbox into `public/images/screens/menu-screens-install-1..4.jpg`). Mirror nav "Network Menu Boards" → "Digital Menu Screens" via `rewriteMirrorHtml`. Trailing-slash 301; stale MIRROR_PAGES sitemap entry removed. Cross-linked with the `/digital-menu-boards` landing page (whose hero is now the real Centra install shot). Old page's rankings preserved (URL kept).


### Fixed — 2026-07-13 — Internal-link + index the new landing pages; in-stock sections

The Google Ads session found `/digital-signage` and `/digital-menu-boards` weren't indexed — nothing linked to them internally (sitemap alone is slow discovery). Fixes:
- Both added to the React nav **Screen Solutions** dropdown.
- `rewriteMirrorHtml` injects a sitewide **"Popular"** internal-link strip before the footer on every mirror page (the most-crawled surface) → Google discovers + weights both routes.
- Menu-boards page now uses the **"menu screens" / "digital menu screens"** variant (Gerry's test search "digital menu screens") in an H2, hero and trusted-by line.
- **"In stock now — fast install"** section on both pages for this week's push: 55″ freestanding units + LCD menu screens, with a "check stock & book install" CTA.
- Still outstanding (Gerry action): **GSC → Request Indexing** for both URLs, and GSC property setup for interactivedisplays.ie if not done (no verification meta present). The old ranking menu pages (`/food-business-digital-menu-board/`, `/product/network-menu-boards/`) are intentionally left live (they carry current rankings) and now link forward to the new page via the strip.


### Added — 2026-07-13 — /digital-signage landing page (SEO plan Priority 1a)

First page from `docs/SEO-CONTENT-PLAN.md` (the Google Ads session handoff). `/digital-signage` was a 404 that the biggest ad group ("digital signage ireland" etc.) was landing on the homepage — dragging Quality Score. New React route `src/routes/digital-signage.tsx`: brand hero with scale proof (2,500+ installs, own-brand Moytronix, 3-yr warranty, 32 counties), Trusted-by strip (SITE_META.notableClients), "what we supply" category grid, own-install-team differentiators, survey→design→install→support process, 5-question FAQ, dual CTAs (fast quote / free site survey). Emits Service + FAQPage + BreadcrumbList JSON-LD; unique title/meta/canonical. Added to `STATIC_PAGES` (sitemap). Deleted the orphaned scaffold `src/content/pages/digital-signage.mdx` (no route rendered it; it only duplicated the URL into the sitemap + /api/pages.json). Next: `/digital-menu-boards`, then ping the ads session to repoint the ad group's final URL.


### Fixed — 2026-07-13 — Lead emails named "beta.interactivedisplays.ie" post-cutover

Contact-form notification emails (and the /api/email-test subject) had "beta.interactivedisplays.ie" hardcoded in `formatLeadEmail`, so leads landing in sales@ still referenced the beta host after production cutover. Now derived from `SITE_URL` (→ `interactivedisplays.ie` in prod). Also flipped the `start-node.mjs` `SITE_URL` fallback default from the beta host to `https://interactivedisplays.ie` to match the React routes' default (only relevant if `VITE_PUBLIC_SITE_URL` is ever unset — it's set on the host). The two remaining "beta" mentions are REDIRECT_TO_HOST comments describing the beta→prod forward, left intact.


### Fixed — 2026-07-13 — React top nav now matches the live site menu

The React `Nav` (shown on TanStack pages — product pages, contact, sectors, terms) had generic placeholder labels (Solutions / Products / Brands / Insights / Careers + "Get a quote") that didn't match the rest of the site's WP menu. Rebuilt `src/components/nav/Nav.tsx` to mirror the real menu: **Home · Screen Solutions · Services · Visitor Assist · Careers** with dropdowns (Screen Solutions → product categories + the new Professional Displays Android; Services → supply-installation / training-support / content-management; Visitor Assist → queue / ticketing / appointment / counting / survey / reception / vending), and the CTA renamed to **"Get In Touch"** to match. Added a mobile hamburger menu (React pages previously had no nav on mobile). Desktop dropdowns are CSS hover/focus (no JS); only the mobile toggle uses state. Note: the footer's column links (Solutions/Products/Brands/Insights) are a separate footer-sitemap and were left as-is.


### Changed — 2026-07-13 — Consolidate to one "Professional Displays Android" page; remove BrightSign

Repositioning of the Moy-DS60 products per Gerry: they run **Android + ScreenFusion** (IDI's own cloud platform), *not* BrightSign. The two standalone pages are merged into one, replacing the legacy Android Network Display product.

- **One combined page** at the reused `/product/android-network-display` URL (SEO-preserving) — `src/content/products/android-network-display.mdx`, title "Professional Displays — Android", showing both sizes via a new `variants` frontmatter field.
- **ProductPage supports `variants`** (`src/lib/mdx.ts` type + `ProductPage.tsx`): when present, renders a side-by-side per-size comparison spec table (43″ 4K vs 32″ 2K) instead of a single spec list.
- **BrightSign removed everywhere** — the MDX, the page, and the brochure. Media system reframed as Android + ScreenFusion (playback, remote management, scheduling). Panel/physical/connectivity specs unchanged (same TCL MOKA panel).
- **`start-node.mjs`:** `/product/android-network-display` added to `MIRROR_EXCLUDE` (React takes over the URL); `resolveRedirect` 301s the trailing-slash form + the two short-lived `/product/moy-43ds60|moy-32ds60` pages → the combined page; `rewriteMirrorHtml` renames "Android Network Display(s)" → "Professional Displays Android" across all mirror nav/menus; stale mirror sitemap entry removed (dedup).
- **Brochure redone** → `public/brochures/Moytronix-Professional-Android-Displays.pdf` (old Moy-DS60-Series.pdf deleted); linked from the page.

Verified locally: combined page 200, all three 301s resolve, zero "BrightSign" on the page, ScreenFusion present, both SKUs shown, homepage menu renamed, sitemap has the product once.


### Added — 2026-07-13 — First real React product pages: Moytronix Moy-DS60 Series

The site's first MDX-backed, TanStack-rendered `/product/*` pages — the Moytronix **Moy-43DS60** (43″ 4K) and **Moy-32DS60** (32″ 2K), IDI's rebadge of the TCL MOKA DS60P (BrightSign built-in). Until now every `/product/*` URL was mirror-served; these are the first built in React.

- **New route** `src/routes/product.$slug.tsx` — dynamic `/product/$slug`, loader throws `notFound()` for unknown slugs. Runtime precedence is unchanged: the wp-mirror serves legacy products first, and brand-new slugs (no mirror file) fall through to this route. Emits per-product `<title>`/description/canonical/og:image.
- **New block** `src/components/blocks/ProductPage.tsx` — reusable product template matching the SectorPage design language: brand-navy hero with key specs + CTAs + brochure download, full spec table, MDX prose body (styled with child-targeting utilities — no `@tailwindcss/typography` in this project), gallery, FAQ, related products, closing CTA. Emits Product + BreadcrumbList + FAQPage JSON-LD.
- **Content** `src/content/products/moy-43ds60.mdx` + `moy-32ds60.mdx`; product imagery in `public/images/screens/moy-ds60-*.jpg`; the series brochure at `public/brochures/Moytronix-Moy-DS60-Series.pdf` is linked from both pages.
- New products appear automatically in `/sitemap.xml` and `/api/products.json` via the runtime frontmatter loader — no manual list edits.

Verified locally: both pages 200, unknown slug 404, existing mirror products unaffected, sitemap + JSON API include both. (Static assets 404 on local Windows only — a `\` vs `/` path-check quirk in `tryServeClientAsset`; they serve fine on the Linux host, same path that serves `/brand/` + `/images/` on the live site today.)

Follow-ups: cross-link the two products from the mirror-served category/shop listing pages (still legacy HTML); consider a small fix to `tryServeClientAsset` so static assets also serve during local Windows testing.


### Fixed — 2026-06-12 — careers/insights card grids: grey placeholder blocks + stranded decorations

Gerry spotted two visual bugs on `/careers/`: a tall grey gradient block under every job-card image, and a lone "floating candidate" headshot (plus a lavender square) stranded in the whitespace left of the grid.

Root cause of the grey blocks: on live WordPress, Elementor's frontend JS added `elementor-has-item-ratio` to the posts container at runtime, switching card thumbnails to absolute-fill rendering inside a fixed-ratio frame (those rules ship in `widget-posts.min.css`, which the mirror has). The wget snapshot captured the DOM **without** that runtime class, so every thumbnail rendered its static `<img>` (≈241px) *plus* the 65% ratio padding (≈238px) — the padded half showed the card's grey placeholder background. Affects every `elementor-posts--skin-cards` grid: `/careers/` and `/insights/`.

Fix in `rewriteMirrorHtml()` step 7: re-add `elementor-has-item-ratio` to skin-cards containers, and inject a small script emulating the other half of Elementor's JS — tagging images wider than the frame `elementor-fit-height` once loaded so they fill the frame height instead of leaving a letterbox strip. Step 7a hides the two orphaned absolute-positioned decorations (`elementor-element-9e29f34` = headshot, `elementor-element-fcbb80b` = square) via injected CSS, scoped to pages that contain them. Fix validated empirically in a live browser session before implementation.

Follow-up (same day, Gerry request): the publish-date strip under each job card (`.elementor-post__meta-data` — holds only the date) is hidden too; stale dates made open roles look dead. Same careers-scoped injection.


### Changed — 2026-06-12 — HubSpot scrubbed from source; reCAPTCHA v3 activated

Follow-through on the two earlier entries today (commits `6c3ad96` + host-side):

- **HubSpot physically removed from the mirror source**, not just stripped at serve time: the hs-scripts loader, `leadin_wordpress` inline config, `hsq-set-content-id` stub, plugin comments, and dns-prefetch deleted from 147 wp-mirror HTML files; the dead `wp-mirror/wp-json/` discovery tree (inert `leadin/v1` JSON; path already 301s) deleted outright. The runtime rewriter strips remain as defense in depth. Verified in a live browser: no `_hsq` / `HubSpotConversations` globals.
- **reCAPTCHA v3 went live**: keys created by Gerry, added to `.env.local` on the host (never committed), full deploy run so the site key baked into the client bundle. Verified end-to-end with a real-browser careers submission (token issued → siteverify passed → Graph email delivered) and that token-less posts to both `/api/contact` and the admin-ajax bridge are now rejected.


### Fixed — 2026-06-12 — strip HubSpot loader; legacy "Apply" popup was still live

A CV arrived via "HubSpot Forms <noreply@notifications.hubspot.com>" from the careers pages — the old HubSpot WordPress plugin's loader (`js-eu1.hs-scripts.com/146197720.js`, baked into 147 mirror pages) renders the portal's pop-up CTA forms client-side, so a legacy "Apply" popup kept submitting straight to HubSpot's servers, bypassing the site entirely. The careers "Apply Now" buttons pointed at `#apply`, an anchor that only existed as that popup's trigger.

`rewriteMirrorHtml()` now strips the loader script, the `hsq-set-content-id` analytics stub, and the hs-scripts dns-prefetch link from every mirror response (same treatment as Tawk.to), and repoints `#apply` hrefs at `#careers_form` so the Apply buttons scroll to the bridged Elementor form. HubSpot was already declared out of the stack (§2 "What we're NOT using"); this closes the last live use. Side benefit: no more HubSpot tracking cookies on the site.

Note: the popup form still exists in the HubSpot portal itself — worth pausing/deleting it there so any cached pages can't submit either.


### Fixed — 2026-06-12 — admin-ajax bridge hardened against replayed WP form payloads

Within hours of the careers bridge going live, spam bots started landing in sales@ — mail.ru/bk.ru senders replaying the **homepage** Elementor form payload (fields `field_6c180a9`/`field_3c7249d`) straight at `/wp-admin/admin-ajax.php` from old WordPress spam databases. The bridge accepted any Elementor-shaped POST. Three changes in `handleAdminAjax()`:

- **Known-forms registry** (`ELEMENTOR_FORMS`): only `b9aab9c` (careers, all five job pages) and `323aa2d9` (homepage enquiry) are bridged. Unknown form_ids get a polite "use /contact-us" rejection.
- **Honeypot must be present AND empty.** Real browsers always POST hidden inputs (as empty strings); the bots omit the honeypot field entirely. Missing or filled → fake success, nothing sent. This alone kills the entire observed wave.
- **Careers requires a CV file** — every real applicant attaches one (the form marks it required client-side); the bots never do.

Homepage form submissions now email sales@ as "New website enquiry: <name> — <interest>" (they 404'd from cutover until the bridge accidentally revived the form — now it's deliberate). Verified locally with an exact replay of the bot payload (rejected), honeypot present/missing/filled variants, and real submission paths on both forms. reCAPTCHA v3 (previous entry) remains the second layer once keys are added.


### Added — 2026-06-11 — reCAPTCHA v3 spam protection on both form paths

Spam was reaching sales@ through `/api/contact`, which had no anti-bot protection at all (confirmed from the inbox: gibberish leads like "UxpWkUAKhOTGGsakVuh" with dotted-gmail addresses, plus cold outreach). Google reCAPTCHA v3 — invisible, score-based, no checkbox friction — now guards both submission paths:

- **Contact form** (`src/components/blocks/LeadForm.tsx` + new `src/lib/recaptcha.ts`): api.js loads lazily on first submit, `grecaptcha.execute(..., {action:"contact"})` token rides in the JSON body, `/api/contact` verifies it server-side.
- **Careers form bridge**: `rewriteMirrorHtml()` injects a snippet (only on mirror pages containing an Elementor form) that keeps a fresh token in a hidden `recaptcha_token` input — Elementor's submit handler builds `FormData` from the form element, so the token rides along to `/wp-admin/admin-ajax.php` where `handleAdminAjax()` verifies it. Tokens expire ~2 min server-side; the snippet refreshes every 100 s.
- **Server verification** (`verifyRecaptcha()` in `start-node.mjs`): posts to Google's `siteverify`, checks success + action match + score ≥ `RECAPTCHA_MIN_SCORE` (default 0.5). Rejections return friendly fall-back messages pointing at phone/email. Fail-open only when Google itself is unreachable — never drop a real lead to a Google outage.
- **Legacy cleanup**: Elementor's dead `recaptcha/api.js?render=explicit` loader (17 mirror pages) is stripped by the rewriter so it can't fight our api.js load.

Env-gated and inert until keys are set: `VITE_PUBLIC_RECAPTCHA_SITE_KEY` (public, also used by the mirror snippet) + `RECAPTCHA_SECRET_KEY` (server) + optional `RECAPTCHA_MIN_SCORE`. Keys are reCAPTCHA **v3** type, domains `interactivedisplays.ie` + `beta.interactivedisplays.ie`, created at google.com/recaptcha/admin. Note the client bundle bakes the site key in at build time — run a full `deploy.sh` (not just a restart) after adding the env vars.

Verified locally: missing/bogus token → 400 with friendly message on both paths (bogus token exercised against Google's real siteverify); no keys → both forms pass through unchanged; keyed mirror page carries exactly one api.js load + the token seeder.


### Fixed — 2026-06-11 — Careers CV form 404 (legacy Elementor admin-ajax bridge)

The five mirror-served careers pages carry an Elementor Pro "Careers Form" (name / email / phone / job / CV upload / message). Elementor's bundled JS posts it as multipart FormData to `/wp-admin/admin-ajax.php` with `action=elementor_pro_forms_send_form` — a WordPress endpoint that ceased to exist at cutover, so every CV submission died with a 404 and applicants saw Elementor's error state.

Fix in `start-node.mjs`: a new `handleAdminAjax()` intercepts `POST /wp-admin/admin-ajax.php` (wired in routing section 3) and bridges the submission to the existing M365 Graph email plumbing:

- Parses the exact Elementor payload (`form_fields[*]` strings + file uploads, `referer_title`, `queried_id`, `referrer`) via `request.formData()`.
- Replies with the JSON shape Elementor's form JS renders — `{ success, data: { message, errors: { <fieldId>: msg }, data: {} } }` — always HTTP 200, because Elementor only displays messages from jQuery's success callback (non-2xx is silently swallowed).
- Server-side validation mirrors the form: name + valid email required, upload capped at 10 MB (same as the form's `data-maxsize="10"`), per-field inline error messages.
- Honeypot (`field_1b0a3f6`, the hidden Elementor anti-spam field): non-empty → fake success, nothing sent.
- Email goes to `CAREERS_RECIPIENT` (new optional env var) falling back to `LEAD_RECIPIENT` → `M365_SENDER`, with Reply-To set to the applicant and the CV attached. Subject: `New CV application: <name> — <job page title>`.
- Attachments ≤ ~2.5 MB raw go inline base64 on `/sendMail` (Graph caps that request at 4 MB); larger files use a new `sendMailLargeAttachments()` draft + `createUploadSession` + 3 MB-chunk flow, so the full 10 MB the form permits actually delivers.
- Other legacy WP ajax actions (WooCommerce order-attribution beacons etc.) get a quiet 400.

Verified locally: field-validation errors render inline, honeypot drops silently, valid multipart submission with a PDF parses and reaches the Graph send, mirror page serving unaffected.


### Added — 2026-06-10 — Lead with real IDI scale (2,500+ installs, Moytronix in-house brand)

Strategic SEO/AI repositioning. The first competitor audit found IDI invisible to "digital signage Ireland" search and not named by AI agents when asked to recommend Irish signage installers — while DSD (Dundalk) was being named #1 with claims of "600+ installations" and "Ireland's most established", and Focal Media + IPC Digital Media named with their named-customer lists. Gerry's clarification: IDI has **2,500+ installations since 2009** (4× DSD's claim) and is the only Irish operator manufacturing **its own commercial display brand (Moytronix)** — competitors all resell Samsung/LG/Vestel. He also confirmed many Irish signage suppliers outsource their installs to the IDI nationwide engineer team.

These are differentiators that crush the competitive set, but **nowhere on the website were they being claimed**. The AI accurately summarised what the site said — "family-run from Co. Meath since 2009. 3-year warranty. Nationwide installation." Generic. So the AI ranked the louder competitors.

Updates:

- `src/lib/site-meta.ts`:
  - `tagline` rewritten: "Ireland's largest digital signage installer — 2,500+ installs, our own brand Moytronix, nationwide install team"
  - `description` rewritten to lead with installation count + Moytronix + "competitors outsource to our team" angle
  - New `scaleClaims` block ({ installCount: 2500, ... }) for future structured use
  - `differentiators[]` reordered — Moytronix first, then install count, then "competitors use our installers", then warranty, then nationwide, then end-to-end, then family-run, then awards
  - `socialProfiles[]` populated with real LinkedIn, Facebook, Instagram URLs (was empty)

- `src/components/schema/OrganizationSchema.tsx`:
  - Adds `slogan`, `award`, and `brand: { Brand "Moytronix", description }` fields to the Organization JSON-LD
  - `sameAs` now populates with the real social URLs

- `start-node.mjs` ORG mirror constant + `handleLlmsTxt` + `handleLlmsFullTxt`:
  - Tagline + description match site-meta
  - llms.txt and llms-full.txt now include a "What sets Interactive Displays Ireland apart" section pulled from the differentiators array — first thing an AI reads after the company name

Verification matrix after deploy: every page sample's meta description / Organization JSON-LD / llms.txt should now lead with installs count + Moytronix. The AI agents that read llms.txt should now name IDI when asked "who installs digital signage in Ireland" within their next crawl cycle.

This is content-strategy work, not just SEO. The next moves to compound it are: (a) named case studies on key customer accounts (Gerry to send list), (b) Google Business Profile + Maps already in place, (c) directory submissions, (d) industry roundup pitches.


### Fixed — 2026-06-10 — Plug legacy WP URL exposure

Audit identified four legacy WP path families still returning 200 from the mirror — small SEO clutter + one security smell. Better fix is at the redirect layer (root cause) than via GSC removals (which expire after 6 months and block ranking-signal transfer from the 301):

- `/author/<username>/` → 301 to `/`. The mirror still exposes `/author/michael_admin/` and `/author/michael_admin_new/` with HTTP 200. These leak admin usernames (attackers use this to know which login to brute-force) AND index useless WP author archive pages. The 301 hides the username AND tells Google to drop the archive page from its index.
- `/wp-json` and `/wp-json/*` → 301 to `/`. The wget mirror serves a static HTML "WP REST API discovery" page at `/wp-json/`. Useless. Real endpoints under `/wp-json/wp/v2/*` correctly return 404, so they were never a problem; only the root needed cleaning.
- `/feed/` and `/comments/feed/` → 301 to `/`. Defunct WP RSS endpoints. No active subscribers, mirror snapshots are stale.
- `/?s=<query>` → 301 to `/`. The WP search results page on the mirror's homepage URL. No search index on the new site so the URL is useless; also a parameter-spam abuse vector.

Verified after deploy: all four paths now 301 cleanly to `/`. Real WP attack-surface paths (`/wp-login.php`, `/xmlrpc.php`, `/wp-admin/index.php`, `/wp-config.php`) all return appropriate 4xx codes already.


### Added — 2026-06-09 — /terms TanStack route

Generic Ireland-law-governed Terms of Service at `/terms`. 12 sections: about us, website scope (B2B brochure-site, no e-commerce), acceptable use, quotes & contracts (quotes are invitation to treat, not binding offers), IP, availability & changes, disclaimers, limitation of liability (€100 cap on website-only direct loss; consequential loss excluded; nothing limits liability for fraud or PI from negligence), indemnity, governing law (Ireland), severability, contact.

Notable choices:
- Liability cap is website-only — explicitly carves out "separate signed sales contracts" so the website Terms don't accidentally cap commercial AV installation contract liability.
- Quotes are described as "invitation to treat" so the website itself never creates a binding offer; commercial relationships need a signed order confirmation.
- Names IDI's house brand (Moytronix) and third-party brand marks (Promethean, Vestel) accurately.
- Closing disclaimer notes this is general transparency, not legal advice — and explicitly recommends qualified counsel for project-specific contract terms.

Plumbing matches the privacy policy:
- `/terms` + trailing-slash variant in MIRROR_EXCLUDE
- Added to sitemap STATIC_PAGES at priority 0.3
- Footer link added next to Privacy policy via TanStack `<Link>`


### Added — 2026-06-09 — /privacy-policy TanStack route

Generic but project-specific privacy policy at `/privacy-policy` covering: who we are, data we collect (contact form / live chat / phone / email / analytics), legal bases, cookies (strictly-necessary / functional / analytics), sharing (Microsoft, Plesk, Cloudflare, Google/Meta/LinkedIn when tracking is active, Odoo CRM), retention periods, GDPR rights, security, children, change handling, contact.

Pulls org details (legal name, address, email, phone) from `src/lib/site-meta.ts` so updates propagate automatically. Includes a note at the end that this is general transparency, not legal advice.

Plumbing:
- Added `/privacy-policy` and `/privacy-policy/` to MIRROR_EXCLUDE so TanStack serves it rather than the legacy WP mirror.
- Added to STATIC_PAGES in sitemap.xml at priority 0.3 (legal pages are low priority for crawlers).
- Footer link converted from `<a href="/privacy-policy/">` to TanStack `<Link to="/privacy-policy">` for client-side navigation. Removed the dead "Cookie policy" link (cookie disclosures live inside the privacy policy itself).



### Fixed — 2026-06-09 — URGENT regex catastrophe: tracking strip ate stylesheets

The LEGACY_TRACKING_PATTERNS added the day before used lazy `[\s\S]*?` quantifiers that crossed HTML tag boundaries. The "inline gtag config" and "fbq init" patterns each matched from the FIRST `<script>` tag in the document, through ~25 KB of HTML (47 of 48 stylesheets, image preloads, real scripts), to the closing `</script>` of the legacy tracking block far below.

Result: every mirror page served with all CSS stripped. Images rendered at native pixel sizes (some 2048px wide). Reported by Gerry as "all the images are massive" on 2026-06-09.

Fixed by replacing `[\s\S]*?` with `[^<]*` in the inline-script patterns. `[^<]` cannot match `<` characters, so the regex physically cannot cross into another HTML tag — only matches scripts whose body is exclusively the tracking init.

Local verification on raw mirror HTML showed:
- Before fix: 291,128 bytes / 48 stylesheets
- After fix: 289,060 bytes / 48 stylesheets  (only ~2 KB tracking removed)
- All three legacy tracking IDs (GT-M3LVT37, Facebook Pixel 1422006029068970, GTM-NS2W7ML script tags) still correctly stripped

Future-proofing: added an explicit warning comment block above the patterns explaining the trap.

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
