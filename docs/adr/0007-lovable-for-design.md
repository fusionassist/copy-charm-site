# ADR 0007 — Lovable produces UI design, Claude Code engineers it

**Status:** Accepted — 2026-05-25 (after a failed first attempt to design in Claude Code)
**Related:** [ADR 0001](0001-tanstack-vs-next.md)

## Context

The original CLAUDE.md pipeline section was already clear: **Lovable (UI) → Claude Code (engineering) → GitHub → Plesk**. In practice, after Lovable's Session 1 produced the wp-mirror rather than React components, Claude Code drifted into doing both jobs — building the contact form, then the homepage, then the brand-token wiring.

The brand tokens + form + Nav/Footer work was fine. The homepage attempt was **not** fine — Gerry's feedback verbatim: "i liked the old version better, this is not at the same level visually." Specifics: too card-grid, too SaaS-looking, too minimalist, too many outline icons, no full-bleed hero, no design hierarchy. Generic 2024-pattern aesthetic instead of premium-installer.

Diagnosis: Claude Code is good at engineering decisions and integrating components. It is not good at producing the *visual concept* for a page from scratch — it defaults to shadcn-conventional layouts, equal-weight card grids, outline iconography. That's not what IDI's brand needs.

## Decision

Honour the original pipeline. Lovable owns **design**:

- New hero treatments, section composition, layout density, type scale, image treatment, photography style, what visual rhythm a page has.
- Outputs TSX files per the spec in `files/Lovable_Session_2_Brief.md`.

Claude Code owns **engineering**:

- TanStack routing, MDX pipeline, SSR plumbing, API endpoints, deployment, schema markup, content sync, integrations (Odoo, Graph API).
- Drops Lovable's TSX into the repo, fixes any TanStack-specific issues, makes it server-render correctly.
- Does NOT redesign Lovable's output unless asked.

The bad homepage attempt was rolled back to mirror (commit `15...` removing `/` from `MIRROR_EXCLUDE_EXACT`). The TSX files remain in the repo as reference; not deleted, not live.

`files/Lovable_Session_2_Brief.md` was written specifically to brief Lovable Session 2 on the homepage redesign, with explicit acceptance criteria around visual richness, hard constraints around the tech stack, and pointers to the real IDI assets.

## Consequences

**Positive:**
- Plays to each tool's strength. Lovable's design model is genuinely better at the "what should this look like" question; Claude Code's engineering is genuinely better at the "wire this up correctly" question.
- The contact between them is concrete: the brief is checked-in to git, the output goes into a specific folder (`src/components/blocks/`, `src/routes/`), the deploy story is unchanged.
- Avoids the homepage drift where Claude Code reinvents the design every commit. Lovable iterates in its own surface, hands off when good.

**Negative:**
- Round-trip latency. A design tweak requires opening Lovable, iterating, copying TSX back, deploying. For tiny tweaks (move a button, change a colour) this is overhead.
- Lovable's TSX output is sometimes not idiomatic TanStack (eg. uses `<a>` instead of `<Link>`, includes Next.js patterns, etc.). Claude Code has to clean it up on integration. Acceptable; documented as part of the integration job.
- We need Lovable credits. ~5-6 sessions estimated for full design (homepage, service pages template, product page template, blog template). Not a hard ceiling.

**Mitigation for the round-trip latency:**
- After Lovable produces the initial design for a page type, Claude Code can do *targeted* tweaks within the established design system (eg. "shrink this margin", "swap this image", "add a testimonial section using the same visual language").
- The design system tokens (ADR 0005) give Claude Code safe knobs to turn without redesigning anything.

## Alternatives considered

- **Claude Code designs everything** — what we tried, didn't work. The homepage attempt proved the failure mode.
- **Hire a human designer** — out of scope for this scale of project (single marketing site for a B2B installer). Lovable is the AI equivalent and is doing the job.
- **Use a paid template** — would constrain the design more than necessary. Lovable can match a reference site directly.

## Verification this still holds

Subjective. Test: when Lovable's Session 2 output lands and gets integrated, the homepage should reach Gerry's "this looks at parity with the legacy site, ideally cleaner" bar (criterion 8 in `files/Lovable_Session_2_Brief.md`). If it doesn't, re-brief; if it still doesn't after two sessions, re-evaluate this ADR.

## Sunset criteria

This ADR holds for the duration of the site's design phase (probably through launch). Post-launch, micro-content updates and incremental feature additions can be done in Claude Code as long as they stay within the established design system. Major redesigns reset to the Lovable pipeline.
