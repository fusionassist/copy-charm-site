# ADR 0005 — Brand tokens in CSS (Tailwind v4 `@theme`), not `tailwind.config.ts`

**Status:** Accepted — 2026-05-25

## Context

Tailwind v3 had a `tailwind.config.{js,ts}` file as the canonical home for design tokens — colours, fonts, radii. Tailwind v4 reverses this: tokens live in CSS via `@theme` blocks, and the JS/TS config is optional.

Lovable's scaffold shipped Tailwind v4 with a `src/styles.css` that already used the v4 `@theme inline { ... }` syntax with shadcn's neutral grey tokens.

Two paths for the IDI brand colours (navy `#002B7A`, blue `#003E9E`, cyan `#1B9CD3`, spark `#2CD1ED`):

1. Add a `tailwind.config.ts` with the IDI brand under `theme.extend.colors.brand`. Mixes v3-style config with v4 CSS tokens.
2. Add the IDI brand directly to `styles.css` `@theme inline { ... }`. Pure v4.

## Decision

Add the brand tokens to `src/styles.css` `@theme inline`, in `oklch()` colour space, and **rebind the semantic `--primary` token to `var(--brand-navy)`**.

```css
:root {
  --brand-navy:  oklch(0.286 0.140 264);  /* #002B7A */
  --brand-blue:  oklch(0.355 0.157 263);  /* #003E9E */
  --brand-cyan:  oklch(0.685 0.123 230);  /* #1B9CD3 */
  --brand-spark: oklch(0.820 0.106 220);  /* #2CD1ED */
  --primary: var(--brand-navy);
  --ring: var(--brand-cyan);
}

@theme inline {
  --color-brand-navy: var(--brand-navy);
  --color-brand-blue: var(--brand-blue);
  --color-brand-cyan: var(--brand-cyan);
  --color-brand-spark: var(--brand-spark);
}
```

This generates `bg-brand-navy`, `text-brand-cyan`, etc. utility classes. Every existing shadcn `<Button>` becomes IDI navy without per-component edits.

Inter font loaded via Google Fonts `@import` at the top of styles.css, set as `--font-sans`.

## Consequences

**Positive:**
- Single file owns the design system. Easy to find, easy to PR-review.
- The semantic token rebind (`--primary: var(--brand-navy)`) means every shadcn primitive — button, input focus state, link colour, ring — picks up the brand automatically. We don't have to refactor 47 shadcn components.
- oklch values give us perceptually-uniform colour math. Useful when we add darker/lighter variants (eg. `bg-brand-navy/90` for hover) — the alpha modifier produces a visually correct shade, not the wrong gamma-mixed brown that hex-based mixing produces.
- No `tailwind.config.ts` to keep in sync. The Tailwind config file in the repo can stay empty.

**Negative:**
- Tailwind v4 is newer; some IDE Tailwind extensions don't fully understand `@theme inline` yet (the IntelliSense for our custom `brand-*` utilities is hit-or-miss in VS Code).
- The Lovable redesign for the homepage (Session 2 brief) needs to be told to use these tokens, not invent its own. The brief explicitly lists them.
- If we ever need design-system values inside JS (eg. a chart needs the exact navy colour for a data series), we'd have to duplicate them. None today; if it comes up, export a `src/lib/brand-tokens.ts` that mirrors the CSS values, with a comment to keep them in sync.

## Alternatives considered

- **`tailwind.config.ts` with v3-style extend** — would work but mixes v3 + v4 idioms and Lovable's wrapper might overwrite the file on regenerate.
- **Inline hex values everywhere** — no design system. Hard to update. Reject.
- **CSS variables but NOT in `@theme`** — would lose the Tailwind utility classes; we'd have to write `style={{ color: 'var(--brand-navy)' }}` everywhere. Wors ergonomics than the chosen approach.

## Verification this still holds

```bash
curl -sk https://beta.interactivedisplays.ie/assets/styles-*.css | grep -oE 'brand-navy|brand-cyan|Inter' | sort -u
# expected: Inter, brand-navy, brand-cyan
```

Tokens currently live in `src/styles.css`. The new Lovable homepage design will reference them by name.
