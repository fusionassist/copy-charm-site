# CLAUDE.md — interactivedisplays.ie TanStack Start rebuild

> **Read this file in full before making any changes.** This project has a locked architecture, a specific build pipeline, and SEO equity that must be preserved. Do not deviate from the decisions in this document without explicit confirmation from Gerry.

---

## 1. Project at a glance

**Repository:** `fusionassist/copy-charm-site`
**What this is:** The new website for Interactive Displays Ireland, replacing the legacy WordPress + Elementor build at `interactivedisplays.ie`.
**Current state:** Lovable produced two things in this repo: (a) a **TanStack Start** scaffold with shadcn/ui primitives, and (b) a **`wget` snapshot of the legacy WordPress site** at `wp-mirror/`. The IDI design has NOT been built yet — `src/routes/__root.tsx` is the only route and still carries Lovable's default "Lovable App" metadata. Your job is to build the real IDI site on top of the scaffold using TanStack Start's idioms, sourcing content and assets from the wget mirror as needed.
**Owner:** Gerry McDonnell (Fusion Technologies — CEO). Direct, technical, decision-ready. Prefers execution-ready output over abstract advice.

**Brand context:** Interactive Displays Ireland is one of four brands under Fusion Technologies (alongside ScreenFusion, RentaScreen, and Moytronix). This site serves IDI specifically. Do not bleed in branding or content from sister brands.

---

## 2. Locked architecture decisions (do not change without permission)

| Layer | Decision | Rationale |
|---|---|---|
| Meta-framework | **TanStack Start** (`@tanstack/react-start`) | Full-stack React SSR, native file-based routing via TanStack Router, no rewrite needed — already what Lovable produced |
| Bundler | **Vite 7** with `@lovable.dev/vite-tanstack-config` | Already configured by Lovable; provides TanStack Start, Tailwind v4, tsConfigPaths, env injection |
| Routing | **TanStack Router** file-based routes in `src/routes/` | `routeTree.gen.ts` is regenerated from the file tree; do not edit it by hand |
| React | **React 19** | Already installed |
| Styling | **Tailwind CSS v4** via `@tailwindcss/vite` (NOT v3) | New `@theme` block syntax in `src/styles.css`; colors in `oklch()`, no `tailwind.config.ts` |
| UI primitives | **shadcn/ui Radix components** in `src/components/ui/` (47 already installed) | Atoms only — IDI design blocks live in `src/components/blocks/` |
| Content | **MDX with frontmatter**, parsed at build via Vite's MDX integration + `gray-matter` | Static files for products, posts, jobs, service pages — no CMS |
| Animation | **`motion` (v11+, formerly framer-motion)** | Import from `motion/react`. All motion components are client-only and must respect `prefers-reduced-motion` |
| Server adapter | **Node (for Plesk)** — replacing the current Cloudflare Workers adapter Lovable shipped | The current `src/server.ts`, `wrangler.jsonc`, and `@cloudflare/vite-plugin` are Cloudflare-targeted; swap for `@tanstack/react-start`'s Node preset |
| Hosting | **Plesk (existing IDI server)** via Node.js extension running the TanStack Start server | Same host as other IDI sites, already operated by the team. Isolated from the Odoo Azure VM |
| DNS / CDN | **Cloudflare** in front of Plesk | Existing infrastructure; WAF, DDoS, edge caching for static assets |
| Package manager | **Bun** (`bun.lock`, `bunfig.toml`) | Lovable's choice; we keep it. All `npm install ...` in this doc is interchangeable with `bun add ...` |
| Chat | **Odoo Live Chat (`im_livechat` widget)** | Replaces Tawk.to entirely; ties into Odoo CRM |
| Forms | **Odoo `crm.lead` via custom REST endpoint**, **Resend as fallback** | Lead capture lands in Odoo CRM directly; Resend only if Odoo unreachable |
| Build pipeline | Lovable (scaffold) → **Claude Code (build)** → GitHub → Plesk (CI or SSH deploy: `git pull` + `bun install` + `bun run build` + restart via Plesk Node.js panel or `pm2 reload`) | Lovable produced the scaffold; Claude Code is the engineer |

**What we are NOT using:**
- ❌ No Next.js — the original ADR proposed Next.js; we pivoted to TanStack Start on 2026-05-22 because Lovable shipped it and converting was judged not worth the effort
- ❌ No Cloudflare Workers — the deploy target is Plesk; the wrangler/Workers config Lovable shipped needs removing or ignoring
- ❌ No headless CMS (Sanity, Contentful, Strapi) — content is MDX
- ❌ No Tawk.to — replaced by Odoo Live Chat
- ❌ No HubSpot — replaced by Odoo CRM
- ❌ No WordPress / WooCommerce — fully retired (legacy mirror at `wp-mirror/` is reference only)
- ❌ No client-side-only rendering — every page must SSR

---

## 3. Brand system

Extracted programmatically from the IDI logo. Use these exact values; do not approximate.

Tailwind v4 uses CSS-in-CSS via `@theme` in `src/styles.css`. Add the IDI brand colors as `oklch()` values alongside the existing semantic tokens:

```css
/* src/styles.css — add inside :root */
--brand-navy:  oklch(0.286 0.140 264);  /* #002B7A primary */
--brand-blue:  oklch(0.355 0.157 263);  /* #003E9E secondary */
--brand-cyan:  oklch(0.685 0.123 230);  /* #1B9CD3 accent */
--brand-spark: oklch(0.820 0.106 220);  /* #2CD1ED bright accent */

/* src/styles.css — add inside @theme inline */
--color-brand-navy:  var(--brand-navy);
--color-brand-blue:  var(--brand-blue);
--color-brand-cyan:  var(--brand-cyan);
--color-brand-spark: var(--brand-spark);
```

The hex equivalents (`#002B7A`, `#003E9E`, `#1B9CD3`, `#2CD1ED`) are the source of truth — if oklch conversions disagree with the hex, the hex wins.

**Typography:** Inter as the primary face. Configure via `@import url(...)` in `styles.css` or `<link>` in `__root.tsx` head. Do not regress to system fonts.
**Logo files:** Live in `public/brand/` (to be populated from `wp-mirror/wp-content/uploads/` during migration). Do not regenerate; do not modify SVGs.

---

## 4. Folder structure (locked)

This is the target structure. The Lovable scaffold already provides the skeleton — the work is to add the IDI-specific pieces inside it.

```
copy-charm-site/
├── src/
│   ├── routes/                          # File-based TanStack Router
│   │   ├── __root.tsx                   # ✅ exists — needs IDI nav, footer, schema, real meta
│   │   ├── index.tsx                    # ⏳ Homepage
│   │   ├── digital-signage.tsx          # ⏳ Service page
│   │   ├── interactive-displays.tsx
│   │   ├── self-service-kiosks.tsx
│   │   ├── ...                          # one route file per service page
│   │   ├── product/
│   │   │   └── $slug.tsx                # ⏳ /product/:slug (35 products)
│   │   ├── product-category/
│   │   │   └── $slug.tsx
│   │   ├── brand/
│   │   │   └── $slug.tsx
│   │   ├── careers/
│   │   │   ├── index.tsx
│   │   │   └── $slug.tsx                # 5 jobs
│   │   ├── insights/
│   │   │   ├── index.tsx
│   │   │   └── $slug.tsx                # 7 blog posts
│   │   ├── shop.tsx
│   │   ├── contact-us.tsx
│   │   ├── thank-you.tsx
│   │   ├── privacy-policy.tsx
│   │   ├── api/
│   │   │   └── contact.tsx              # Server route: Odoo crm.lead + Resend fallback
│   │   ├── sitemap.xml.tsx              # Dynamic sitemap
│   │   └── robots.txt.tsx               # Dynamic robots
│   ├── components/
│   │   ├── ui/                          # ✅ shadcn primitives (47 already present)
│   │   ├── blocks/                      # ⏳ The 12 IDI design blocks
│   │   │   ├── Hero.tsx
│   │   │   ├── LogoStrip.tsx
│   │   │   ├── CategoryGrid.tsx
│   │   │   ├── ProductGrid.tsx
│   │   │   ├── ProductHero.tsx
│   │   │   ├── SpecsTable.tsx
│   │   │   ├── CaseStudyCard.tsx
│   │   │   ├── FAQAccordion.tsx
│   │   │   ├── CTABanner.tsx
│   │   │   ├── BlogCard.tsx
│   │   │   ├── LeadForm.tsx
│   │   │   └── Footer.tsx
│   │   ├── motion/                      # ⏳ Client-only motion primitives
│   │   │   ├── Parallax.tsx
│   │   │   ├── DepthCard.tsx
│   │   │   └── ScrollReveal.tsx
│   │   ├── nav/Nav.tsx
│   │   └── schema/                      # ⏳ JSON-LD components
│   │       ├── Organization.tsx
│   │       ├── Product.tsx
│   │       ├── Service.tsx
│   │       ├── Article.tsx
│   │       └── FAQPage.tsx
│   ├── content/                         # ⏳ MDX content
│   │   ├── products/                    # 35 .mdx files
│   │   ├── posts/                       # 7 .mdx files
│   │   ├── jobs/                        # 5 .mdx files
│   │   └── pages/                       # service page bodies as MDX
│   ├── lib/
│   │   ├── mdx.ts                       # ⏳ Vite glob loader + frontmatter
│   │   ├── seo.ts                       # ⏳ Metadata helpers
│   │   ├── odoo.ts                      # ⏳ Odoo client (crm.lead create)
│   │   ├── motion-tokens.ts             # ⏳ Spring presets, depth scale
│   │   ├── redirects.ts                 # ⏳ From the audit workbook
│   │   ├── error-capture.ts             # ✅ exists
│   │   └── error-page.ts                # ✅ exists
│   ├── hooks/                           # ✅ exists (empty or near-empty)
│   ├── router.tsx                       # ✅ exists
│   ├── routeTree.gen.ts                 # ✅ auto-generated — DO NOT EDIT
│   ├── server.ts                        # ⚠ Cloudflare Workers entry — needs Node swap
│   ├── start.ts                         # ✅ exists
│   └── styles.css                       # ✅ exists — add brand tokens
├── public/                              # ✅ empty — for real deployed assets
│   ├── brand/                           # logos, favicons (to populate)
│   ├── images/                          # migrated from wp-mirror/wp-content/uploads
│   └── pdfs/                            # brochures, datasheets
├── wp-mirror/                           # ✅ wget snapshot of legacy WP site — REFERENCE ONLY
├── files2/                              # parent project: handoff docs (this CLAUDE.md was authored from there)
├── vite.config.ts                       # ✅ exists — serveMirror() now points at wp-mirror
├── wrangler.jsonc                       # ⚠ delete or ignore — Cloudflare-only
├── components.json                      # ✅ shadcn config
├── tsconfig.json                        # ✅ exists
├── package.json                         # ✅ exists
├── bun.lock                             # ✅ exists
├── CLAUDE.md                            # this file
├── README.md                            # human-readable overview
├── DEPENDENCIES.md                      # Phase 2 install list
└── .env.example                         # env var template
```

`✅` = already present from Lovable. `⏳` = to build. `⚠` = needs adjustment for Plesk target.

---

## 5. MDX schemas (locked)

Every content type has a fixed frontmatter shape. Do not add, remove, or rename fields without confirmation.

### 5.1 Product (`src/content/products/*.mdx`)

```yaml
---
slug: pcap-kiosk-screen
title: PCAP Kiosk Screen
metaTitle: PCAP Kiosk Screen | Multi-Touch Display with LED Backlight
metaDescription: Discover the PCAP Kiosk Screen with 10-point touch, LED backlight, and ergonomic design — perfect for retail and hospitality.
category: kiosks
brand: idi
heroImage: /images/products/pcap-kiosk.jpg
gallery:
  - /images/products/pcap-kiosk-1.jpg
  - /images/products/pcap-kiosk-2.jpg
shortDescription: Industrial-grade multi-touch kiosk display for high-traffic environments.
specs:
  screenSize: 21.5"
  touchPoints: 10
  resolution: 1920x1080
  brightness: 350 nits
  warranty: 3 years
brochures:
  - label: Spec Sheet
    href: /pdfs/pcap-kiosk-spec.pdf
relatedProducts:
  - capacitive-kiosk-screen
  - infrared-kiosk-screen
faqs:
  - q: What is the touch latency?
    a: Under 10ms across all 10 touch points.
publishedAt: 2024-01-15
updatedAt: 2025-08-22
---

(MDX body content here — long-form description, use cases, etc.)
```

### 5.2 Blog post (`src/content/posts/*.mdx`)

```yaml
---
slug: choosing-the-right-digital-signage
title: How to Choose the Right Digital Signage
metaTitle: How to Choose the Right Digital Signage | IDI
metaDescription: A practical guide to selecting digital signage for retail, hospitality, and corporate environments.
excerpt: Selecting digital signage isn't about screens — it's about outcomes...
heroImage: /images/posts/signage-guide.jpg
author: Gerry McDonnell
category: guides
tags: [digital-signage, retail, hospitality]
publishedAt: 2024-03-10
updatedAt: 2025-06-15
---
```

### 5.3 Job (`src/content/jobs/*.mdx`)

```yaml
---
slug: senior-av-engineer
title: Senior AV Engineer
metaTitle: Senior AV Engineer — Careers at Interactive Displays Ireland
metaDescription: Join Interactive Displays Ireland as a Senior AV Engineer. Hybrid role based in Annacotty, Limerick.
location: Annacotty, Limerick
employmentType: Full-time
department: Engineering
salaryRange: €55k–€75k
publishedAt: 2025-09-01
closingDate: 2025-12-01
---
```

### 5.4 Service page (`src/content/pages/*.mdx`)

```yaml
---
slug: digital-signage
title: Digital Signage Solutions
metaTitle: Digital Signage Solutions | Interactive Displays Ireland
metaDescription: Professional digital signage for retail, hospitality, education, and corporate environments. Installation, content management, and support across Ireland.
heroImage: /images/services/digital-signage-hero.jpg
heroHeadline: Digital Signage That Earns Its Place On The Wall
heroSubhead: From single screens to networked video walls.
ctaPrimary:
  label: Get a Quote
  href: /contact-us
ctaSecondary:
  label: See Case Studies
  href: /insights
---
```

### 5.5 MDX loading pattern (TanStack Start / Vite)

Use Vite's `import.meta.glob` with `eager: true` for static build-time discovery:

```ts
// src/lib/mdx.ts
import matter from "gray-matter";

const productModules = import.meta.glob("../content/products/*.mdx", {
  eager: true,
  query: "?raw",
  import: "default",
});

export function getAllProducts() {
  return Object.entries(productModules).map(([path, raw]) => {
    const { data, content } = matter(raw as string);
    return { ...data, body: content, path };
  });
}
```

Hand-render the MDX body (or compile via `@mdx-js/rollup` at build time) into a component for the page route to consume.

---

## 6. SEO migration playbook

This site has real SEO equity (~700 clicks / 52k impressions per 3 months in GSC). Do not break it.

**Required deliverables:**
1. **`src/lib/redirects.ts`** — preserves every legacy WordPress URL pattern, including Rank Math redirects extracted in the audit. Apply via TanStack Router's middleware or via a `beforeLoad` redirect on a catch-all route. Verify each 301 hits.
2. **`src/routes/sitemap.xml.tsx`** — dynamic sitemap built from MDX content + static route list. Return `Content-Type: application/xml`.
3. **`src/routes/robots.txt.tsx`** — allow all, point at sitemap.
4. **JSON-LD schema** on every relevant page (Organization sitewide via `__root.tsx`, Product on product pages, Service on service pages, Article on posts, FAQPage where FAQs exist).
5. **Per-route metadata** via TanStack Router's `head` option on each route definition — reading from MDX frontmatter for dynamic routes.
6. **OpenGraph images** — default sitewide image at `/public/og-default.png`, per-route overrides via `head.meta`. Optional: render dynamic OG images via a server route.
7. **Canonical URLs** explicitly set on every page via `head.links` (`rel="canonical"`).

**Specific issues from the audit to fix during migration:**
- HTTP/HTTPS split was bleeding homepage traffic — enforce HTTPS at Plesk (Let's Encrypt cert) and via Cloudflare "Always Use HTTPS" + HSTS.
- Lorem ipsum was live on a product page — audit content during MDX migration and flag any placeholder text before publishing.
- Two conflicting cache plugins (legacy WP issue) — no longer relevant on Plesk + Cloudflare, but verify Cloudflare cache rules don't double-cache HTML when ISR-style revalidation is added.
- Duplicate product URLs existed — the new `/product/[slug]` route is the canonical pattern; redirect old `/product-category/...` and `?p=123` style URLs.
- Elementor-only pages with hundreds of GSC impressions but zero semantic content — these must be rebuilt as proper MDX with real content, not just stub pages.

---

## 7. Odoo integration (locked)

### 7.1 Live chat

- **Widget:** `im_livechat` from Odoo
- **Loading strategy:** Defer until after first contentful paint. Inject the three Odoo script tags inside `__root.tsx`'s `RootShell` body, after the children. Don't block render.
- **Channel ID and base URL:** Stored in env vars `ODOO_LIVECHAT_CHANNEL_ID` and `ODOO_BASE_URL`. Do not hardcode.

### 7.2 Contact form → CRM lead

- **Endpoint:** `src/routes/api/contact.tsx` (server route, POST) — or use a TanStack Start server function and call from `LeadForm.tsx` with `useServerFn`.
- **Primary action:** Create a `crm.lead` record in Odoo via JSON-RPC or a custom REST endpoint.
- **Fallback:** If Odoo is unreachable (timeout > 3s or non-2xx), send via Resend to a backup inbox.
- **Required fields:** name, email, phone, message, source page, UTM params.
- **Hidden fields to capture:** referrer, landing page, session ID.
- **Never log PII to console in production.**

```ts
// src/lib/odoo.ts skeleton
export async function createLead(payload: LeadPayload): Promise<LeadResult> {
  // 1. POST to ODOO_BASE_URL/web/dataset/call_kw
  //    model: crm.lead, method: create
  // 2. Map payload → Odoo fields (name, email_from, phone, description, source_id)
  // 3. Return { success: true, leadId } or { success: false, error }
  // 4. AbortController with 3s timeout
}
```

**Env vars required:**
```
ODOO_BASE_URL=
ODOO_DB=
ODOO_API_KEY=
ODOO_LIVECHAT_CHANNEL_ID=
RESEND_API_KEY=
RESEND_FALLBACK_INBOX=
```

---

## 8. Motion & depth conventions

`motion` (v11+) is to be installed. Import from `motion/react`. All motion components are client-rendered.

### 8.1 Tokens (`src/lib/motion-tokens.ts`)

```ts
export const springs = {
  gentle:   { type: 'spring', stiffness: 120, damping: 20 },
  snappy:   { type: 'spring', stiffness: 300, damping: 25 },
  dramatic: { type: 'spring', stiffness: 80,  damping: 14 },
} as const;

export const depth = {
  0: { z: 0,    shadow: 'none' },
  1: { z: 8,    shadow: '0 2px 8px rgba(0,0,0,0.06)' },
  2: { z: 16,   shadow: '0 4px 16px rgba(0,0,0,0.08)' },
  3: { z: 32,   shadow: '0 8px 32px rgba(0,0,0,0.12)' },
  4: { z: 64,   shadow: '0 16px 48px rgba(0,0,0,0.16)' },
  5: { z: 128,  shadow: '0 32px 64px rgba(0,0,0,0.2)'  },
} as const;
```

### 8.2 Accessibility (mandatory)

Every motion component must respect `prefers-reduced-motion`. Use `useReducedMotion()` from `motion/react` and degrade to instant transitions when set. Do not ship a component without this check.

### 8.3 SSR safety

TanStack Start renders every route on the server by default. Components that use browser APIs (`window`, `document`, observers, `motion` hooks) must guard against SSR — either check `typeof window !== 'undefined'`, use `useEffect`, or wrap in TanStack's `ClientOnly` pattern. There is no `"use client"` boundary like in Next.js App Router; instead, the entire tree SSRs and hydrates.

---

## 9. Conventions

- **TypeScript strict mode** — no `any`, no `@ts-ignore` without a comment explaining why.
- **Named exports for components** unless a route file requires a default (TanStack route files export a `Route` constant — named is fine).
- **Tailwind v4 utilities preferred** over custom CSS. If you need custom CSS, use CSS variables defined in `styles.css`, not raw colours.
- **Images** — TanStack Start does not ship an `<Image>` component. Use plain `<img>` with explicit `width`, `height`, `loading="lazy"` (except above-the-fold hero images, which should be eager + `fetchpriority="high"`). For responsive images, consider `unpic` or hand-roll `srcset`. Discuss before adding a heavy image library.
- **Links** — internal: `<Link>` from `@tanstack/react-router`. External: plain `<a>` with `target="_blank" rel="noopener noreferrer"`.
- **Forms** — never `<form action>` posting. Either client-side fetch to `/api/*` routes, or TanStack Start `useServerFn`.
- **Env vars** — anything secret in `.env.local` (gitignored). Anything public prefixed `VITE_PUBLIC_` so Vite exposes it.
- **Commit messages** — conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`).
- **Branch strategy** — `main` is production-deployable. Feature work in `feat/<name>` branches. Open PRs for review even when solo.

---

## 10. Working with Gerry

- Gerry is technical and decision-ready. Skip preamble. Lead with the answer.
- He has ADHD-flavoured hyperfocus. Long, well-structured docs are welcome; vague suggestions are not.
- Spell **Moytronix** correctly (not "Moytronics").
- When in doubt about scope, ask one targeted question rather than making assumptions.
- If a decision conflicts with this document, **flag it explicitly** and ask before deviating.
- Prefer execution-ready output: file paths, exact commands, paste-ready code blocks.

---

## 11. Current session: Phase 2 — build the IDI site on the TanStack Start scaffold

The Lovable scaffold gives us TanStack Start running, Tailwind v4 wired, and the 47 shadcn primitives. Nothing IDI-specific is built yet. The wget mirror at `wp-mirror/` is reference material — content, copy, and image sources for the rebuild, not the runtime.

Suggested order — do not skip steps; each is a logical unit and should commit cleanly before the next starts:

1. **Inventory & smoke-test.** Run `bun install` and `bun dev`. Confirm the scaffold boots. Visit `/` — the wget mirror's homepage should serve via the `serveMirror()` Vite plugin (now pointed at `wp-mirror/`). Confirm dev URLs like `/contact-us/`, `/product/lift-and-learn-screen/` resolve to mirror HTML.
2. **Swap the server adapter.** Replace the Cloudflare Workers fetch handler in `src/server.ts` with a Node adapter for Plesk. Remove `@cloudflare/vite-plugin` from the Vite config, delete `wrangler.jsonc`. Confirm `bun run build` produces a Node-runnable output.
3. **Wire IDI brand tokens.** Add the four brand colours to `src/styles.css` per §3. Add Inter font. Smoke-test a button or card class to confirm the tokens resolve.
4. **Set up the MDX pipeline.** Add `@mdx-js/rollup` and `gray-matter`. Build `src/lib/mdx.ts` with loaders for each content type using `import.meta.glob`. Add a first sample product MDX to verify end-to-end.
5. **Build the 12 base blocks.** Each block is a TanStack-friendly React component in `src/components/blocks/`. Use the shadcn primitives from `src/components/ui/` as building blocks. Reference the wget mirror's visual style and copy, but rebuild in modern React — no Elementor HTML carried over.
6. **Build `Nav.tsx` and `Footer.tsx`.** Use the legacy mirror's menu structure as the content source. Add to `__root.tsx`.
7. **Build the homepage at `src/routes/index.tsx`.** Compose from blocks. Replace the default Lovable metadata in `__root.tsx` with real IDI meta.
8. **Add the service pages** (`digital-signage`, `interactive-displays`, `self-service-kiosks`, etc.) as route files, each loading content from `src/content/pages/<slug>.mdx`.
9. **Add the dynamic routes** — `product/$slug.tsx`, `product-category/$slug.tsx`, `brand/$slug.tsx`, `careers/$slug.tsx`, `insights/$slug.tsx`. Each route's `loader` reads frontmatter from `src/content/<type>/<slug>.mdx`. `notFoundComponent` returns 404 for missing slugs.
10. **Add `/contact-us` and the API route.** Build `LeadForm.tsx` and wire it to `src/routes/api/contact.tsx`. Implement `src/lib/odoo.ts` with the timeout + Resend fallback.
11. **Add sitemap, robots, redirects.** Build the three dynamic routes / lib files. Cross-check the redirect map against the audit XLSX.
12. **Add JSON-LD schema components** in `src/components/schema/` and wire them into each route's `head:` block.
13. **SEO final pass.** Verify per-route metadata, canonical URLs, OG images on every important route. Run Lighthouse on staging.
14. **Deploy to Plesk staging** (`beta.interactivedisplays.ie`). Configure the Plesk Node.js app: env vars, `bun install`, `bun run build`, start command. Smoke-test from outside.
15. **Cutover planning.** DNS switch plan documented; rollback plan in place (keep WP host live for 14 days post-cutover).

**Do not start step N+1 before step N is committed.** Each step is a logical unit and should produce a working state.

---

## 12. Source-of-truth documents

These exist outside this repo and inform decisions made here. If they conflict with this file, ask Gerry which is current before acting.

- **IDI_Migration_Audit_v2.xlsx** — Phase 0 audit workbook with URL inventory, redirects map, content issues, GSC data.
- **Architecture Decision Document v1.2** (`../files/IDI_Architecture_Decisions.md`) — the formal ADR set. **Partially superseded:** the framework choice changed from Next.js to TanStack Start on 2026-05-22. Other decisions in v1.2 (brand tokens, Odoo integration, Plesk hosting, MDX content, URL preservation) remain authoritative.
- **Lovable Session 1 Brief** (`../files/Lovable_Session_1_Brief.md`) — the brief that was supposed to produce the React design rebuild. **It did not** — Lovable produced a wget mirror instead. The brief is now historical; do not re-run it without first rewriting it in TanStack Start terms.

---

## 13. What "done" looks like

The migration is complete when all of the following are true:

- [ ] Every URL in the audit redirects correctly (301) or resolves to a real page
- [ ] All 35 products, 7 posts, 5 jobs, and all service pages render from MDX
- [ ] Sitemap includes all pages and is submitted to GSC
- [ ] Schema validates on every relevant page (Schema.org validator + Google Rich Results test)
- [ ] Lighthouse mobile scores: Performance ≥ 90, Accessibility ≥ 95, SEO = 100
- [ ] Contact form lands in Odoo CRM as a `crm.lead` (verified end-to-end)
- [ ] Odoo Live Chat widget loads and connects to the correct channel
- [ ] DNS cutover plan documented and Cloudflare ready to flip
- [ ] No Cloudflare Workers references remain in the codebase (`wrangler.jsonc` deleted, `@cloudflare/vite-plugin` removed)
- [ ] `wp-mirror/` is not served in production (verified by checking the built asset bundle)
- [ ] `prefers-reduced-motion` honoured across all motion components

---

*Last updated: 2026-05-22. This file is the operating contract for Claude Code on this project. Update it when decisions change; don't let it drift.*
