# ADR 0001 — TanStack Start over Next.js 15

**Status:** Accepted — 2026-05-22
**Supersedes:** `files/IDI_Architecture_Decisions.md` v1.2 (Next.js choice)

## Context

The pre-build architecture document locked in **Next.js 15 App Router** as the meta-framework, based on its SSG/ISR maturity and large ecosystem. Lovable was briefed (`files/Lovable_Session_1_Brief.md`) to produce Next.js components for Claude Code to wire up.

When the Lovable session ran, the output was a **TanStack Start** scaffold instead — React 19, Vite, file-based routing via TanStack Router, Tailwind v4. Not a SPA — full SSR meta-framework, peer of Next.js.

Three options on the table:

1. Force-convert TanStack Start → Next.js (rewrite routing, swap server entry, regenerate the design components for App Router conventions).
2. Re-run Lovable with stricter framework guidance.
3. Adopt TanStack Start, keep moving.

## Decision

Adopt **TanStack Start**. For the problem we're solving — server-rendered marketing site with MDX content, an Odoo lead funnel, a contact form, AI-agent visibility — both frameworks are functionally equivalent:

- Both server-render so crawlers and LLMs get real HTML.
- Both support file-based routing with type-safe params.
- Both produce a Node-runnable server bundle.
- Both have first-class TypeScript + React 19.

Convert-cost was estimated at 2-3 days with no measurable end-user upside, against losing the design and content scaffolding Lovable already produced.

## Consequences

**Positive:**
- Zero rework. Lovable's output drops straight in.
- React 19 + Vite stack runs anywhere Node 22+ runs (Plesk fine — see ADR 0002).
- The SEO/AI surface (sitemap, llms.txt, JSON-LD, schema markup) is framework-agnostic, so the Phase 0 audit work translated 1:1.

**Negative:**
- Smaller community than Next.js — fewer Stack Overflow answers, fewer prebuilt patterns. We've hit two edge cases (server-fn HMR, MDX plugin order with `enforce: pre`) that would have been solved problems on Next.js.
- Lovable's wrapper (`@lovable.dev/vite-tanstack-config`) auto-loads the Cloudflare plugin at build time. Setting `cloudflare: false` skips it; this needed deliberate discovery (ADR 0002).
- Image optimisation isn't built in (Next.js has `<Image>`). For the IDI catalog size (~35 products, ~7 posts) plain `<img>` with explicit width/height + `loading="lazy"` is sufficient. Revisit if the image count gets above ~200.

**Operational:**
- `CLAUDE.md` updated to reflect TanStack patterns (`createFileRoute`, `head: () => ({})`, `import.meta.glob` for MDX).
- The original v1.2 ADR doc was kept on disk but flagged as "framework section superseded".

## Alternatives considered

- **Next.js 15 (force convert)** — rejected, see Context.
- **Astro** — considered briefly; rejected because we have meaningful client interactivity (forms, eventually a configurator) and Astro's islands model would add friction.
- **Plain Vite + React Router** — would have required hand-rolling SSR. TanStack Start gives us that out of the box.

## Verification this still holds

- The `/contact-us` route ships ~18 KB of HTML server-rendered, hydrates fully — measured 55 ms TTFB cold.
- `curl` of any route returns indexable HTML with no JavaScript execution required.
- `llms.txt` is consumable by AI agents (verified end-to-end with a WebFetch round-trip).

Re-litigate this only if (a) image optimisation becomes a bottleneck OR (b) TanStack Start announces deprecation. Neither expected.
