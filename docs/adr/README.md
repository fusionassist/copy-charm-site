# Architecture Decision Records

One Markdown file per significant decision. Lightweight ADR format (Context → Decision → Consequences → Alternatives), one screen per record.

A new ADR is created when an architecture-level choice gets locked in — meaning future work should respect it without re-litigating. Reversing one is fine, but you write a new ADR doing the reversing rather than editing the old one.

## Index

| ID | Title | Status | Date |
|---|---|---|---|
| [0001](0001-tanstack-vs-next.md) | TanStack Start over Next.js 15 | Accepted | 2026-05-22 |
| [0002](0002-plesk-hosting.md) | Plesk + Node + nginx custom directive (not Vercel, not Cloudflare Workers) | Accepted | 2026-05-25 |
| [0003](0003-mirror-first-runtime.md) | wp-mirror serves first, TanStack second (rebuild-on-top) | Accepted | 2026-05-22 |
| [0004](0004-graph-api-not-smtp.md) | M365 Graph API for outbound email, not SMTP | Accepted | 2026-05-25 |
| [0005](0005-brand-tokens-in-css.md) | Brand tokens in CSS (Tailwind v4 `@theme`), not `tailwind.config.ts` | Accepted | 2026-05-25 |
| [0006](0006-noindex-on-staging.md) | Beta walled off from search engines until cutover | Accepted | 2026-05-26 |
| [0007](0007-lovable-for-design.md) | Lovable produces UI design, Claude Code engineers it | Accepted | 2026-05-25 |
