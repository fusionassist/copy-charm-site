// MDX content loaders.
//
// Two import flavours per content type:
//   1. ?raw glob → returns the source text; parsed with gray-matter to
//      expose frontmatter. Used by getAll*() to build indexes (sitemap,
//      listing pages, etc.) without compiling every MDX file's JSX.
//   2. Compiled glob (lazy) → returns the MDX-as-React-component when a
//      specific slug is requested. Used by route loaders to render the
//      full body.
//
// MDX files live in src/content/<type>/<slug>.mdx and use the
// frontmatter shapes documented in CLAUDE.md §5.

import type { ComponentType } from "react";
import matter from "gray-matter";

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

type RawGlob = Record<string, string>;
type LazyGlob<T = unknown> = Record<string, () => Promise<T>>;
type CompiledModule = { default: ComponentType<Record<string, unknown>> };

function indexFromRaw<T>(glob: RawGlob): Array<WithPath<T>> {
  return Object.entries(glob).map(([path, raw]) => {
    const { data } = matter(raw);
    const slug = (data as { slug?: string }).slug ?? slugFromPath(path);
    return { ...(data as T), path, slug };
  });
}

function slugFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.mdx?$/, "");
}

async function componentFor(
  glob: LazyGlob<CompiledModule>,
  slug: string,
): Promise<ComponentType<Record<string, unknown>> | null> {
  const entry = Object.entries(glob).find(([path]) => path.endsWith(`/${slug}.mdx`));
  if (!entry) return null;
  const [, loader] = entry;
  const mod = await loader();
  return mod.default;
}

// ─── Products ───────────────────────────────────────────────────────────────

const productRaw = import.meta.glob<string>("../content/products/*.mdx", {
  eager: true,
  query: "?raw",
  import: "default",
}) as RawGlob;

const productComponents = import.meta.glob<CompiledModule>("../content/products/*.mdx");

export function getAllProducts(): Array<WithPath<ProductFrontmatter>> {
  return indexFromRaw<ProductFrontmatter>(productRaw).sort(
    (a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );
}

export function getProduct(slug: string): WithPath<ProductFrontmatter> | null {
  return getAllProducts().find((p) => p.slug === slug) ?? null;
}

export function getProductComponent(slug: string) {
  return componentFor(productComponents, slug);
}

// ─── Posts ──────────────────────────────────────────────────────────────────

const postRaw = import.meta.glob<string>("../content/posts/*.mdx", {
  eager: true,
  query: "?raw",
  import: "default",
}) as RawGlob;

const postComponents = import.meta.glob<CompiledModule>("../content/posts/*.mdx");

export function getAllPosts(): Array<WithPath<PostFrontmatter>> {
  return indexFromRaw<PostFrontmatter>(postRaw).sort(
    (a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );
}

export function getPost(slug: string): WithPath<PostFrontmatter> | null {
  return getAllPosts().find((p) => p.slug === slug) ?? null;
}

export function getPostComponent(slug: string) {
  return componentFor(postComponents, slug);
}

// ─── Jobs ───────────────────────────────────────────────────────────────────

const jobRaw = import.meta.glob<string>("../content/jobs/*.mdx", {
  eager: true,
  query: "?raw",
  import: "default",
}) as RawGlob;

const jobComponents = import.meta.glob<CompiledModule>("../content/jobs/*.mdx");

export function getAllJobs(): Array<WithPath<JobFrontmatter>> {
  return indexFromRaw<JobFrontmatter>(jobRaw).sort(
    (a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );
}

export function getJob(slug: string): WithPath<JobFrontmatter> | null {
  return getAllJobs().find((j) => j.slug === slug) ?? null;
}

export function getJobComponent(slug: string) {
  return componentFor(jobComponents, slug);
}

// ─── Pages (service pages) ──────────────────────────────────────────────────

const pageRaw = import.meta.glob<string>("../content/pages/*.mdx", {
  eager: true,
  query: "?raw",
  import: "default",
}) as RawGlob;

const pageComponents = import.meta.glob<CompiledModule>("../content/pages/*.mdx");

export function getAllPages(): Array<WithPath<PageFrontmatter>> {
  return indexFromRaw<PageFrontmatter>(pageRaw);
}

export function getPage(slug: string): WithPath<PageFrontmatter> | null {
  return getAllPages().find((p) => p.slug === slug) ?? null;
}

export function getPageComponent(slug: string) {
  return componentFor(pageComponents, slug);
}
