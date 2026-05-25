# interactivedisplays.ie

Production website for **Interactive Displays Ireland**, part of Fusion Technologies.

## Stack

- **TanStack Start** (`@tanstack/react-start`) — full-stack React 19 SSR
- **TanStack Router** — file-based routing in `src/routes/`
- **Vite 7** as the bundler, **Bun** as the package manager
- **TypeScript** (strict)
- **Tailwind CSS v4** with `@tailwindcss/vite`
- **shadcn/ui** Radix primitives (47 of them, in `src/components/ui/`)
- **MDX** for all content (products, posts, jobs, service pages)
- **motion** (v11+) for animation and depth effects
- **Odoo** for live chat and CRM lead capture
- **Resend** as email fallback
- **Plesk** hosting (Node.js extension on the existing IDI server), **Cloudflare** DNS + CDN

## Getting started

```bash
# Install
bun install

# Local dev
bun dev

# Production build
bun run build

# Lint
bun run lint

# Format
bun run format
```

While Phase 2 is in progress, `bun dev` serves the legacy WordPress mirror at `wp-mirror/` for clean URLs (`/`, `/contact-us/`, `/product/<slug>/`, etc.) via the `serveMirror()` Vite plugin. As real TanStack routes are built, the mirror is gradually superseded route-by-route.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
ODOO_BASE_URL=
ODOO_DB=
ODOO_API_KEY=
ODOO_LIVECHAT_CHANNEL_ID=
RESEND_API_KEY=
RESEND_FALLBACK_INBOX=
VITE_PUBLIC_SITE_URL=https://interactivedisplays.ie
```

Server-only secrets (Odoo keys, Resend keys) have no prefix and are NOT exposed to the client. Anything prefixed `VITE_PUBLIC_` is shipped in the client bundle.

## Working with Claude Code

The `CLAUDE.md` file at the repo root is the operating contract for Claude Code. Read it before making changes. It defines:

- Locked architecture decisions
- Folder structure
- MDX frontmatter schemas for every content type
- SEO migration requirements
- Odoo integration spec
- Motion and accessibility conventions
- The current Phase 2 build plan

## Content authoring

All content lives in `src/content/` as `.mdx` files with frontmatter. See `CLAUDE.md` §5 for the exact frontmatter schema per content type.

```
src/content/
├── products/   # 35 products
├── posts/      # blog
├── jobs/       # careers
└── pages/      # service page bodies
```

To add a new product, create `src/content/products/<slug>.mdx`. The route `/product/<slug>` is generated automatically by the dynamic route in `src/routes/product/$slug.tsx`.

## The wp-mirror

`wp-mirror/` is a `wget` snapshot of the legacy WordPress site, kept as a reference for content migration and asset extraction. It is NOT served in production and lives outside `public/` on purpose. See `wp-mirror/README.md`.

## Deploy

`main` deploys to the production Node.js app on Plesk (`git pull` + `bun install` + `bun run build` + restart via the Plesk Node.js panel, or `pm2 reload` if PM2 is in use). Staging lives at `beta.interactivedisplays.ie` on the same Plesk host.

DNS is managed in Cloudflare; the apex and `www` point at the Plesk host with Cloudflare proxying enabled (orange cloud). See `CLAUDE.md` §2 for the locked hosting decision.

The current `src/server.ts` and `wrangler.jsonc` target Cloudflare Workers (Lovable's default). These will be swapped for a Node adapter as part of Phase 2 step 2.

## Project background

Migrated from WordPress + Elementor in 2026. See `CLAUDE.md` §6 for SEO continuity requirements and §12 for the source-of-truth documents from the migration.
