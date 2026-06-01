# ADR 0003 — wp-mirror serves first, TanStack second

**Status:** Accepted — 2026-05-22

## Context

Lovable's session produced a TanStack Start scaffold **plus** a `wget` snapshot of the legacy WordPress site at `interactivedisplays.ie`. ~1,400 files in `public/` (later moved to `wp-mirror/`). The IDI design itself wasn't rebuilt as React — what Lovable produced was a working static mirror of the live site.

The migration plan requires gradually replacing each WP/Elementor page with a TanStack route over weeks. The question is what visitors see between now and "everything's a real route":

| Option | Pros | Cons |
|---|---|---|
| Serve the empty TanStack scaffold first; mirror as fallback. | Clean React-first model. | Until we build a route, every URL returns Lovable's default 404. Beta looks broken. |
| Serve the mirror first; TanStack only catches URLs in `MIRROR_EXCLUDE`. | Beta looks like the real site immediately. Each new TanStack route swaps a single mirror page. | Have to maintain an exclusion list; mirror layer always runs first. |
| Serve only what's built; redirect everything else to live WP. | Zero confusion. | Cross-domain redirects, broken UX, no parity to demo. |

## Decision

**Mirror first, TanStack catches explicit exclusions.** Concretely in `start-node.mjs`:

1. API endpoints (`/api/contact`, `/api/email-test`, `/api/*.json`)
2. AI-agent endpoints (`/llms.txt`, `/llms-full.txt`, `/robots.txt`, `/sitemap.xml`)
3. Static client assets (`/assets/...`)
4. Mirror — for any path that has a file in `wp-mirror/` AND isn't in `MIRROR_EXCLUDE`
5. TanStack SSR — last resort, catches the excluded paths

To make a TanStack route the canonical version of a URL, add its path to `MIRROR_EXCLUDE` (prefix-match for trailing-slash entries) or `MIRROR_EXCLUDE_EXACT` (single URLs like `/`). Currently `/api/`, `/contact-us`, `/contact-us/`, `/llms.txt`, `/llms-full.txt`, `/robots.txt`, `/sitemap.xml` are excluded.

## Consequences

**Positive:**
- Beta has felt like the real IDI site from day one. Visitors can navigate, products are findable, the brand is intact.
- Mirror pages get **enhanced** as they pass through the Node layer — old Tawk.to widget stripped, Odoo Live Chat scripts injected, `<meta name="robots">` rewritten for noindex. The legacy HTML is never served as-is.
- Each TanStack route ships independently. We can run `/contact-us` in production-quality TanStack while `/product/foo` still serves Elementor markup. Same URL space, no cross-domain hops.

**Negative:**
- The mirror is a 355 MB blob of WP/Elementor + wp-content/uploads files. It ships with every git clone. Acceptable until launch; we'll delete `wp-mirror/` after the last mirror-served URL gets a real TanStack route.
- The `MIRROR_EXCLUDE` constants in `start-node.mjs` are the source of truth for "which pages are real". A migration is incomplete until both the route file exists AND the path is excluded.
- The `serveMirror` plugin in `vite.config.ts` (for `bun dev` mode) must stay in sync with the production rewriter in `start-node.mjs`. Hasn't drifted but worth watching.

**Operational:**
- New TanStack route checklist:
  1. Create `src/routes/<path>.tsx`.
  2. Build verifies (`bun run build`).
  3. Add path to `MIRROR_EXCLUDE` in `start-node.mjs`.
  4. Add path to the `serveMirror()` exclusion in `vite.config.ts` if it exists in the mirror.
  5. Deploy + verify `curl -I https://beta.interactivedisplays.ie/<path>` returns TanStack-rendered HTML (no `x-served-by: wp-mirror` header — that header is set by the mirror handler).

## Alternatives considered

Already enumerated above. Empty-scaffold-first was the runner-up; we'd switch to it only if maintaining the exclusion list became painful (currently 6 entries, trivial). Cross-domain redirects are off the table — would damage SEO equity.

## Sunset criteria

When `wp-mirror/` has nothing left that visitors hit (i.e. every URL is either in `MIRROR_EXCLUDE` or genuinely 404), delete `wp-mirror/`, delete `serveMirror()` from `vite.config.ts`, delete the mirror layer + HTML rewriter from `start-node.mjs`. Probably a single commit, two-line changes plus `git rm -r wp-mirror`. Saves 355 MB.
