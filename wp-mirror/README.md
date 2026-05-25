# wp-mirror/

Static `wget` snapshot of the legacy WordPress site at `interactivedisplays.ie`,
taken during Phase 1 of the migration. Lovable produced this as a reference and
safety-net copy before the React rebuild begins.

**This folder is NOT served in production.** It lives outside `public/` on
purpose. Do not move files back into `public/` without an explicit decision.

## What's in here

- `index.html` — legacy WP homepage
- `index.html@p=<id>.html` — WP query-param URLs (e.g. `?p=1002`)
- `wp-content/` — themes, plugins, uploaded media (~355 MB)
- `wp-includes/`, `wp-json/` — WP core assets and REST endpoints
- Page directories: `product/`, `product-category/`, `brand/`, `careers/`,
  `insights/`, `contact-us/`, plus individual blog post slugs

## How to use it

- **Content reference** — pull product copy, blog post bodies, FAQs, etc.
  out of the static HTML when authoring MDX for the new site.
- **Asset reference** — pull product images, brochures, brand assets out of
  `wp-content/uploads/` as we migrate them into `public/images/`,
  `public/brand/`, `public/pdfs/`.
- **URL inventory** — cross-check against the audit XLSX redirect map.

## What it is NOT

- Not the production website. The production site is the TanStack Start app
  built from `src/`.
- Not the source of truth for content. As content is ported to MDX, the MDX
  becomes authoritative.
- Not deployed. The build process skips this folder.
