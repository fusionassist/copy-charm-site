# Dependencies — Phase 2 additions

This is a reference for the IDI rebuild on top of the TanStack Start scaffold Lovable produced. Most of the heavy lifting is already done in `package.json` — the lists below are the **additions** Phase 2 needs.

Package manager is **Bun**. `npm install ...` and `bun add ...` are interchangeable — use `bun add` to keep `bun.lock` authoritative.

## Already installed (don't reinstall)

- `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/router-plugin`
- `@tanstack/react-query`
- React 19 (`react`, `react-dom`)
- Tailwind v4 (`tailwindcss`, `@tailwindcss/vite`)
- 47 shadcn/ui primitives (`@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `cmdk`, `embla-carousel-react`, etc.)
- `react-hook-form`, `@hookform/resolvers`, `zod` — form handling already wired
- `date-fns`, `recharts`, `lucide-react`, `sonner`, `vaul`, `react-day-picker`
- `vite`, `vite-tsconfig-paths`, `@vitejs/plugin-react`
- ESLint, Prettier, TypeScript 5.8
- `@lovable.dev/vite-tanstack-config` — wraps the standard Lovable Vite + TanStack Start config

## Phase 2 additions

### MDX pipeline (step 4 in CLAUDE.md §11)

```bash
bun add @mdx-js/rollup gray-matter
bun add -D @types/mdx
```

Optional sugar:
```bash
# Code-block syntax highlighting inside MDX
bun add rehype-pretty-code shiki

# Tailwind typography plugin for blog post body styles
bun add -D @tailwindcss/typography
```

### Motion (step 5)

```bash
bun add motion
```

Import from `motion/react`, **not** `framer-motion`. The package was renamed at v11. `framer-motion` aliases still work but `motion` is the current canonical path.

### Email fallback (step 10)

```bash
bun add resend
```

Used only when Odoo is unreachable. `zod` is already installed for payload validation.

### SEO (step 11)

No extra packages needed. TanStack Router has `head: () => ({ meta, links })` per route for metadata. Sitemap and robots are built as regular route files that return text content.

If a richer sitemap generator is wanted later:
```bash
bun add -D fast-xml-parser
```

### Optional: responsive image helper (any step)

TanStack Start has no built-in image optimisation. If hand-rolling `srcset` becomes painful:

```bash
bun add unpic @unpic/react
```

Discuss with Gerry before pulling this in — for ~35 products it may not be worth the dependency.

## Phase 2 removals (step 2)

Once the Node adapter swap is done and verified, remove Cloudflare-specific packages:

```bash
bun remove @cloudflare/vite-plugin
```

Delete files:
- `wrangler.jsonc`
- Anything in `src/server.ts` referring to Cloudflare's `env` / `ctx` / `Assets` binding (replace with Node-friendly equivalents)

The `@lovable.dev/vite-tanstack-config` package may also pull in Cloudflare config implicitly — review its source before fully removing the dependency, or override its options in `vite.config.ts`.

## Testing (optional, but recommended for the API route)

```bash
bun add -D vitest @testing-library/react @testing-library/jest-dom happy-dom
```

`happy-dom` is lighter than `jsdom` and matches Bun's defaults better than `@vitejs/plugin-react`'s typical setup.

## Order of operations

Do not bulk-install everything at once. Each step in CLAUDE.md §11 lists what it needs — add packages only when the step that uses them is starting, and confirm `bun run build` and `bun dev` still pass before moving on.
