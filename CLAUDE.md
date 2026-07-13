# CLAUDE.md — interactivedisplays.ie

> **Read this in full before making any changes.** Operating contract for Claude Code on this project. Last full refresh: **2026-05-29**. For chronological history see [CHANGELOG.md](./CHANGELOG.md). For "why" on each major decision see [docs/adr/](./docs/adr/).

---

## 1. Project at a glance

**Repo:** `fusionassist/copy-charm-site` (currently public; flip private after the deploy-key step in [docs/PLESK_DEPLOY.md](./docs/PLESK_DEPLOY.md))
**Domain:**
- **Beta (live):** https://beta.interactivedisplays.ie — Plesk Node, TanStack Start + wp-mirror, walled off from search engines via `SITE_NOINDEX=true`
- **Production target:** https://interactivedisplays.ie — currently WordPress; gets cut over to this codebase at launch
**Owner:** Gerry McDonnell (Fusion Technologies — CEO). Direct, technical, decision-ready. Spell **Moytronix** correctly (not "Moytronics").

**What this is:** A migration from WordPress + Elementor to a Vite/TanStack Start app. Done route-by-route — mirror-first, TanStack catches the URLs we've rebuilt. The two real React routes today: `/` (homepage — currently rolled back to mirror pending Lovable redesign) and `/contact-us`. Everything else (`/product/*`, `/insights/*`, `/careers/*`, `/brand/*`, etc.) is served from the wget snapshot at `wp-mirror/`.

**Runtime precedence:** Mirror first, TanStack second. See [ADR 0003](./docs/adr/0003-mirror-first-runtime.md). To make a TanStack route the canonical version of a URL, add its path to `MIRROR_EXCLUDE` (or `MIRROR_EXCLUDE_EXACT` for `/`) in `start-node.mjs`.

---

## 2. Locked architecture (with ADR links)

| Layer | Choice | ADR |
|---|---|---|
| Meta-framework | TanStack Start (NOT Next.js) | [0001](./docs/adr/0001-tanstack-vs-next.md) |
| Hosting | Plesk Node + cron supervisor + custom nginx directive | [0002](./docs/adr/0002-plesk-hosting.md) |
| Server entry | `src/server.ts` (Fetch handler) → `start-node.mjs` (srvx/Node launcher) | [0002](./docs/adr/0002-plesk-hosting.md) |
| Routing | TanStack Router file-based, `src/routes/` | — |
| Mirror layer | `start-node.mjs` rewrites HTML on the fly: strip Tawk, inject Odoo, rewrite robots meta | [0003](./docs/adr/0003-mirror-first-runtime.md) |
| Styling | Tailwind v4 `@theme` in `src/styles.css` (NOT `tailwind.config.ts`) | [0005](./docs/adr/0005-brand-tokens-in-css.md) |
| Content | MDX in `src/content/{products,posts,jobs,pages}/`, loaded via `src/lib/mdx.ts` | — |
| Email | M365 Graph API (NOT SMTP), client-credentials flow | [0004](./docs/adr/0004-graph-api-not-smtp.md) |
| Chat | Odoo `im_livechat` (NOT Tawk.to), injected via both layers, env-driven | — |
| Indexing | Beta walled off via `SITE_NOINDEX=true`; flips at production cutover | [0006](./docs/adr/0006-noindex-on-staging.md) |
| Design pipeline | Lovable produces UI design, Claude Code engineers it | [0007](./docs/adr/0007-lovable-for-design.md) |
| Package manager | Bun (`bun.lock`, `bunfig.toml`) | — |

**What we're NOT using:** Next.js, Cloudflare Workers, Vercel, headless CMS, Tawk.to, HubSpot, SMTP, `tailwind.config.ts`-style design tokens, React Server Components.

---

## 3. Folder structure (current)

```
copy-charm-site/
├── CLAUDE.md                              # this file
├── CHANGELOG.md                           # dated change log
├── README.md, DEPENDENCIES.md, .env.example
├── deploy.sh                              # one-shot redeploy on the Plesk box
├── start-node.mjs                         # production HTTP launcher (req routing, mirror, API endpoints, chat injection, noindex)
├── vite.config.ts                         # tanstackStart + MDX (enforce: pre) + serveMirror() dev plugin
├── package.json                           # overrides: js-yaml@4.1.0 (see ADR 0001 plumbing notes)
├── public/
│   ├── brand/                             # IDI logos + favicon
│   ├── images/screens/                    # product photography
│   └── .gitkeep
├── wp-mirror/                             # 1,411-file wget snapshot of legacy WP; reference, not deployed bundle. Will be deleted at launch.
├── docs/
│   ├── PLESK_DEPLOY.md                    # deployment + supervisor + nginx setup
│   └── adr/                               # Architecture Decision Records
├── src/
│   ├── routes/
│   │   ├── __root.tsx                     # html shell, Nav, Footer, OrganizationSchema, OdooLiveChat
│   │   ├── index.tsx                      # homepage (built as React but rolled back to mirror; awaiting Lovable Session 2)
│   │   ├── contact-us.tsx                 # TanStack + LocalBusinessSchema
│   │   └── dev.mdx-test.tsx               # noindex dev route, verifies MDX pipeline
│   ├── components/
│   │   ├── ui/                            # 47 shadcn primitives (Lovable scaffold)
│   │   ├── nav/Nav.tsx                    # real IDI logo, sticky
│   │   ├── blocks/Footer.tsx              # 4-col navy footer
│   │   ├── blocks/LeadForm.tsx            # react-hook-form + zod, /api/contact
│   │   ├── blocks/{Hero,StatsBar,CategoryGrid,LogoStrip,WhyChooseUs,CTABanner}.tsx
│   │   │                                  #   ⚠ "too minimal" homepage blocks. Kept as reference; not currently rendered.
│   │   │                                  #   See ADR 0007 + files/Lovable_Session_2_Brief.md for the redesign approach.
│   │   ├── chat/OdooLiveChat.tsx          # Odoo im_livechat <script> tags
│   │   └── schema/                        # JsonLd, OrganizationSchema, LocalBusinessSchema
│   ├── content/
│   │   ├── products/                      # MDX, 1 sample
│   │   ├── posts/                         # MDX, 1 sample
│   │   ├── jobs/                          # MDX, 1 sample
│   │   └── pages/                         # MDX, 1 sample (service page schema)
│   ├── lib/
│   │   ├── mdx.ts                         # type-safe loaders, frontmatter parsing via remark-mdx-frontmatter
│   │   ├── site-meta.ts                   # ⚠ single source of truth for IDI org info. start-node.mjs has a hand-mirrored ORG constant — update both.
│   │   ├── error-capture.ts, error-page.ts
│   ├── styles.css                         # Tailwind v4 @theme inline; IDI brand tokens; Inter font
│   ├── server.ts, start.ts                # TanStack Start entry points
│   └── routeTree.gen.ts                   # auto-generated; DO NOT EDIT
└── files/                                 # original briefs / planning docs (parent project folder)
    ├── IDI_Architecture_Decisions.md      # historical, partially superseded
    ├── Lovable_Session_1_Brief.md         # historical, ran but produced wp-mirror not React rebuild
    └── Lovable_Session_2_Brief.md         # current — feed to Lovable for homepage redesign
```

---

## 4. URL surface (what's live, what's mirror, what's API)

### TanStack routes (React-rendered, served from `dist/server/server.js`)
- `/contact-us` — real React route, IDI brand, contact form, LocalBusiness schema
- `/product/$slug` — MDX-backed product pages (`src/routes/product.$slug.tsx` + `src/components/blocks/ProductPage.tsx`). Content in `src/content/products/*.mdx`. New slugs (no mirror file) fall through here from the mirror; a mirror-snapshot URL can be *taken over* by adding it to `MIRROR_EXCLUDE` (see `android-network-display`). Multi-size products use the `variants` frontmatter field → per-size comparison spec table. Live: `android-network-display` (Professional Displays Android — Moy-43DS60 / Moy-32DS60, runs Android + ScreenFusion, **not** BrightSign). Auto-added to sitemap + `/api/products.json`.
- `/dev/mdx-test` — internal noindex QA route

### Mirror routes (wp-mirror static HTML, mutated on the fly)
- `/` — homepage (rolled back pending Lovable redesign)
- `/product/<slug>/`, `/product-category/<slug>/`, `/brand/<slug>/`, `/insights/...`, `/careers/...`, `/contact-us/` (the legacy WP form — but `/contact-us` without slash hits TanStack first via MIRROR_EXCLUDE)
- All `wp-content/...` and `wp-includes/...` assets

### 301 legacy URL redirects (highest priority — runs before everything)
- `/?p=<N>` / `/index.php?p=<N>` / `/?page_id=<N>` / `/index.html@p=<N>.html` → 301 to canonical pretty-permalink target. 60 IDs mapped from the wp-mirror's preserved Rank Math canonicals. See `src/lib/redirects.ts` (documented source) and the `POST_ID_MAP` constant in `start-node.mjs` (the runtime copy — must stay in sync).

### API + AI-agent endpoints (handled in `start-node.mjs`)
- `POST /api/contact` — zod-validated, sends via Graph; Reply-To set to lead address
- `POST /wp-admin/admin-ajax.php` — legacy Elementor form bridge. The mirror careers pages' "Careers Form" (CV upload) posts here; `handleAdminAjax()` parses the Elementor multipart payload, emails it via Graph (CV attached; upload-session flow for files > ~2.5 MB), and answers Elementor's expected JSON shape. Recipient: `CAREERS_RECIPIENT` → `LEAD_RECIPIENT` → `M365_SENDER`. See CHANGELOG 2026-06-11.
- `GET /api/email-test` — smoke test
- `GET /api/{products,posts,jobs,pages}.json` — CORS-open, structured frontmatter for agents
- `GET /robots.txt` — Disallow when `SITE_NOINDEX=true`; AI-crawler allowlist when off
- `GET /sitemap.xml` — built from MDX + static pages
- `GET /llms.txt` — Karpathy-format outline for LLMs
- `GET /llms-full.txt` — full content concatenated

### Static client bundles (Vite-built, immutable cached)
- `/assets/*.{js,css}` — content-hashed; `cache-control: public, max-age=31536000, immutable`
- `/brand/*`, `/images/*`, `/favicon.png` — `cache-control: public, max-age=3600`

---

## 5. MDX schemas (locked)

Same as the original v1 doc — Product, Post, Job, Page. See `src/lib/mdx.ts` for the TypeScript types. Sample MDX for each lives in `src/content/<type>/`. Frontmatter is parsed via `remark-mdx-frontmatter` (not `?raw` + gray-matter — that pattern fails because the MDX plugin runs at `enforce: pre`).

### Product
```yaml
---
slug, title, metaTitle, metaDescription
category, brand
heroImage, gallery?
shortDescription
specs?: { ... }
brochures?: [{ label, href }]
relatedProducts?: [slug]
faqs?: [{ q, a }]
publishedAt, updatedAt?
---
```

### Post / Job / Page — see `src/lib/mdx.ts`.

---

## 6. SEO + AI-agent surface

For full reasoning see [ADR 0006](./docs/adr/0006-noindex-on-staging.md) (staging) and CHANGELOG 2026-05-26 entry (AI compatibility).

**While beta is walled off** (current state, `SITE_NOINDEX=true`):
- `robots.txt` → `Disallow: /`
- `X-Robots-Tag: noindex, nofollow` header on every response
- Mirror's inherited `<meta name="robots" content="index, follow">` rewritten to `noindex, nofollow`

**At production cutover** — remove `SITE_NOINDEX` from `.env.local` on the host, restart supervisor. Then:
- `robots.txt` returns the open form with explicit AI crawler allowlist (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended, Applebot-Extended, etc., ~20 UAs)
- `/sitemap.xml` is the authoritative URL index for Google + Bing
- `/llms.txt` is the authoritative outline for LLM agents
- JSON-LD on every page (Organization + WebSite sitewide; LocalBusiness + ContactPage on `/contact-us`)

**The site-meta single source of truth** lives at [`src/lib/site-meta.ts`](./src/lib/site-meta.ts). Changes propagate to: footer, contact aside, OrganizationSchema, LocalBusinessSchema, llms.txt. **`start-node.mjs` has a hand-mirrored `ORG` constant — update both.** Reason: `start-node.mjs` runs outside the Vite/TS build.

---

## 7. Odoo integration (current state)

### Live chat (in flight)

Embed code injected on every page (TanStack + mirror):
```html
<script defer src="https://erp.interpos.ai/im_livechat/loader/4?fusion_domain=beta.interactivedisplays.ie"></script>
<script defer src="https://erp.interpos.ai/im_livechat/assets_embed.js"></script>
```

`fusion_domain` is consumed by the custom `fusion_ai_livechat` Odoo module (sister project at `C:\Users\Gerry\OneDrive - Interactive Displays Ireland\FusionERP\`) for lead attribution.

**Status:** Website side done. **Odoo side blocked** — `https://erp.interpos.ai/im_livechat/loader/4` returns `303 → /web/database/selector`. Needs `dbfilter` set in Odoo's `odoo.conf`. Once fixed, chat appears automatically — no website redeploy needed.

### CRM lead capture (not yet wired)

Currently `/api/contact` sends via Graph (ADR 0004) to `sales@interactivedisplays.ie`. The plan is to add a parallel call to Odoo CRM's `crm.lead` create endpoint (REST or JSON-RPC). Graph fallback stays for when Odoo is unreachable. Needs:
- Odoo URL + DB + API key (or a custom unauthenticated REST endpoint)
- Field mapping spec

Not started; will pick up when the chat is verified working.

---

## 8. Deployment

Full guide: [docs/PLESK_DEPLOY.md](./docs/PLESK_DEPLOY.md).

```bash
ssh beta_displays@78.153.200.34
cd ~/apps/copy-charm-site
./deploy.sh
```

That script does: `git pull --ff-only`, `bun install`, `bun run build`, kills the Node PID, re-invokes the supervisor to start the new process. ~60 seconds end-to-end.

The supervisor (`~/bin/beta-node-supervisor.sh`) runs every minute via cron; if the Node process is dead it starts a new one and writes the PID to `logs/app.pid`. Logs to `logs/app.log`.

nginx is configured via Plesk → `beta.interactivedisplays.ie` → Apache & nginx → Additional nginx directives:
```nginx
location ~ ^/ {
    proxy_pass http://127.0.0.1:3417;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
    proxy_buffering off;
}
```

---

## 9. Env vars

Lives in `~/apps/copy-charm-site/.env.local` on the host. Never committed.

```bash
# Site identity (public — shipped in client bundle as VITE_PUBLIC_*)
VITE_PUBLIC_SITE_URL=https://beta.interactivedisplays.ie

# Staging gate (remove at production cutover)
SITE_NOINDEX=true

# M365 Graph API (server-only)
M365_TENANT_ID=5fd2b32a-...
M365_CLIENT_ID=1bed80cf-...
M365_CLIENT_SECRET=...                                          # rotate before launch
M365_SENDER=gerry@interactivedisplays.ie
LEAD_RECIPIENT=sales@interactivedisplays.ie
# CAREERS_RECIPIENT=careers@interactivedisplays.ie              # optional — careers CV submissions; falls back to LEAD_RECIPIENT

# Odoo Live Chat (public)
VITE_PUBLIC_ODOO_BASE_URL=https://erp.interpos.ai
VITE_PUBLIC_ODOO_LIVECHAT_CHANNEL_ID=4

# Google reCAPTCHA v3 — spam protection on /api/contact + careers bridge.
# Inert until both are set. Site key is baked into the client bundle at
# build time — full deploy.sh after changing, not just a restart.
VITE_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=
# RECAPTCHA_MIN_SCORE=0.5

# Plesk Node runtime
PORT=3417
HOST=127.0.0.1
NODE_ENV=production
```

---

## 10. Conventions

- **TypeScript strict.** No `any`, no `@ts-ignore` without a comment.
- **Named exports** for components (except route files which export the TanStack `Route` const).
- **Tailwind utilities preferred** over custom CSS; brand colours via the `brand-*` utilities or `--brand-*` CSS variables. Don't introduce raw hex values.
- **Images:** plain `<img>` with explicit `width`, `height`, `loading="lazy"` (`eager` + `fetchpriority="high"` for above-the-fold hero). No third-party image lib unless we hit a real problem.
- **Links:** internal `<Link to="/...">` from `@tanstack/react-router`. External `<a target="_blank" rel="noopener noreferrer">`. Mirror-served paths use plain `<a>` (TanStack would try to client-navigate and miss).
- **Forms:** client-side fetch to `/api/*`. Never `<form action>`.
- **Env vars:** secret in `.env.local`. Public prefixed `VITE_PUBLIC_` so Vite inlines them.
- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). Per-commit CHANGELOG.md update is part of "done" (see §11).
- **Branches:** `main` is production-deployable. Feature branches `feat/<name>`.

---

## 11. Doc maintenance contract

Decided 2026-05-29. Every meaningful change includes doc updates in the **same commit**:

- **CHANGELOG.md** — always. New entry under `[Unreleased]` describing what changed and why.
- **CLAUDE.md** — when the affected section is no longer accurate. Eg. add a new locked decision row to §2, or update §7 Odoo status.
- **`docs/adr/`** — when a new architectural choice is locked in or an existing one is reversed. New ADR file (next number); update `docs/adr/README.md` index.

Trivial changes (typo fixes, whitespace, dependency bumps without behaviour change) are exempt.

---

## 12. Working with Gerry

- Lead with the answer. Skip preamble.
- He has ADHD-flavoured hyperfocus. Long, well-structured docs are welcome; vague suggestions are not.
- Prefer execution-ready output: file paths, exact commands, paste-ready code blocks.
- When in doubt about scope, ask one targeted question rather than making assumptions.
- If a decision conflicts with an ADR or this file, **flag it explicitly** and ask before deviating.

---

## 13. Open work (as of 2026-05-29)

| Item | Owner | Blocker |
|---|---|---|
| Lovable Session 2 — homepage redesign | Gerry / Lovable | Brief is checked in at `files/Lovable_Session_2_Brief.md`, awaiting Gerry's Lovable session |
| Odoo live chat actually renders | Other Odoo session | `dbfilter` in `odoo.conf` on `erp.interpos.ai` |
| Rotate the leaked M365 client secret | Gerry | Tracked in CHANGELOG 2026-05-25 entry |
| Move repo out of OneDrive | Gerry | OneDrive sync intermittently locks `vite.config.ts` mid-build on Windows. Server builds are unaffected. |
| Restrict M365 app permissions via `New-ApplicationAccessPolicy` | Gerry | Cosmetic security hardening before launch |
| Flip repo back to private + add deploy key | Gerry | Documented in PLESK_DEPLOY.md |
| Wire `/api/contact` to Odoo `crm.lead` | Claude Code (next session) | Odoo URL/DB/API key |

---

## 14. Source-of-truth docs (outside the repo)

- **IDI_Migration_Audit_v2.xlsx** — Phase 0 audit workbook (URL inventory, redirect map, GSC data).
- **`files/IDI_Architecture_Decisions.md`** — v1.2 ADR set. Framework section superseded by ADR 0001 in this repo.
- **`files/Lovable_Session_1_Brief.md`** — historical, ran and produced the wp-mirror.
- **`files/Lovable_Session_2_Brief.md`** — current homepage redesign brief.
- **`C:\Users\Gerry\OneDrive - Interactive Displays Ireland\FusionERP\CLAUDE.md`** — sister project, custom Odoo addons including `fusion_ai_livechat` (the chat module on the Odoo side).

---

*Last full refresh: 2026-05-29. Treat as living. Update §13 and CHANGELOG every meaningful change.*
