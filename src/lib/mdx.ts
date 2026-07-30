// MDX content loaders.
//
// Each MDX file in src/content/<type>/<slug>.mdx is processed by
// @mdx-js/rollup with remark-mdx-frontmatter, which exposes the YAML
// frontmatter as a named export called `frontmatter`. Vite's
// import.meta.glob lets us load every file in a directory eagerly,
// giving us both the React component (default export) and the
// frontmatter (named export) in one shot.
//
// Two patterns per content type:
//   - getAll<Type>()      → frontmatter index for list pages / sitemap
//   - get<Type>Component(slug) → React component for the full page

import type { ComponentType } from "react";

// ─── Shared types ───────────────────────────────────────────────────────────

type WithPath<T> = T & { path: string; slug: string };

export type ProductFrontmatter = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  category: string;
  brand: string;
  heroImage: string;
  gallery?: string[];
  shortDescription: string;
  specs?: Record<string, string | number>;
  // Per-size (or per-model) variants — when present, ProductPage renders a
  // side-by-side comparison spec table in addition to the shared `specs`
  // highlights shown in the hero. Used for multi-size product lines.
  variants?: Array<{ name: string; specs: Record<string, string | number> }>;
  // Optional prominent external link rendered as a hero button (e.g. a
  // dedicated product microsite like cluscore.ie).
  externalLink?: { label: string; href: string };
  brochures?: Array<{ label: string; href: string }>;
  relatedProducts?: string[];
  faqs?: Array<{ q: string; a: string }>;
  publishedAt: string;
  updatedAt?: string;
};

export type PostFrontmatter = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  heroImage: string;
  author: string;
  category: string;
  tags?: string[];
  publishedAt: string;
  updatedAt?: string;
};

export type JobFrontmatter = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  location: string;
  employmentType: string;
  department?: string;
  salaryRange?: string;
  publishedAt: string;
  closingDate?: string;
};

export type PageFrontmatter = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroImage?: string;
  heroHeadline?: string;
  heroSubhead?: string;
  ctaPrimary?: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
};

// ─── Internal helpers ───────────────────────────────────────────────────────

type MdxModule<F> = {
  default: ComponentType<Record<string, unknown>>;
  frontmatter: F;
};

function indexFromGlob<F extends { slug?: string }>(
  glob: Record<string, MdxModule<F>>,
): Array<WithPath<F>> {
  return Object.entries(glob).map(([path, mod]) => {
    const slug = mod.frontmatter?.slug ?? slugFromPath(path);
    return { ...mod.frontmatter, path, slug } as WithPath<F>;
  });
}

function slugFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.mdx?$/, "");
}

function componentFromGlob<F>(
  glob: Record<string, MdxModule<F>>,
  slug: string,
): ComponentType<Record<string, unknown>> | null {
  const entry = Object.entries(glob).find(([path]) => path.endsWith(`/${slug}.mdx`));
  return entry ? entry[1].default : null;
}

// ─── Products ───────────────────────────────────────────────────────────────

const productModules = import.meta.glob<MdxModule<ProductFrontmatter>>(
  "../content/products/*.mdx",
  { eager: true },
);

export function getAllProducts(): Array<WithPath<ProductFrontmatter>> {
  return indexFromGlob(productModules).sort(
    (a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );
}

export function getProduct(slug: string): WithPath<ProductFrontmatter> | null {
  return getAllProducts().find((p) => p.slug === slug) ?? null;
}

export function getProductComponent(slug: string) {
  return componentFromGlob(productModules, slug);
}

// ─── Posts ──────────────────────────────────────────────────────────────────

const postModules = import.meta.glob<MdxModule<PostFrontmatter>>(
  "../content/posts/*.mdx",
  { eager: true },
);

export function getAllPosts(): Array<WithPath<PostFrontmatter>> {
  return indexFromGlob(postModules).sort(
    (a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );
}

export function getPost(slug: string): WithPath<PostFrontmatter> | null {
  return getAllPosts().find((p) => p.slug === slug) ?? null;
}

export function getPostComponent(slug: string) {
  return componentFromGlob(postModules, slug);
}

// ─── Jobs ───────────────────────────────────────────────────────────────────

const jobModules = import.meta.glob<MdxModule<JobFrontmatter>>(
  "../content/jobs/*.mdx",
  { eager: true },
);

export function getAllJobs(): Array<WithPath<JobFrontmatter>> {
  return indexFromGlob(jobModules).sort(
    (a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );
}

export function getJob(slug: string): WithPath<JobFrontmatter> | null {
  return getAllJobs().find((j) => j.slug === slug) ?? null;
}

export function getJobComponent(slug: string) {
  return componentFromGlob(jobModules, slug);
}

// ─── Pages (service pages) ──────────────────────────────────────────────────

const pageModules = import.meta.glob<MdxModule<PageFrontmatter>>(
  "../content/pages/*.mdx",
  { eager: true },
);

export function getAllPages(): Array<WithPath<PageFrontmatter>> {
  return indexFromGlob(pageModules);
}

export function getPage(slug: string): WithPath<PageFrontmatter> | null {
  return getAllPages().find((p) => p.slug === slug) ?? null;
}

export function getPageComponent(slug: string) {
  return componentFromGlob(pageModules, slug);
}
