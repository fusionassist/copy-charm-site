import { createFileRoute } from "@tanstack/react-router";

import { getAllProducts, getAllPosts, getAllJobs, getAllPages } from "@/lib/mdx";

// Internal dev/QA route — verifies the MDX pipeline loads frontmatter correctly.
// Not linked from anywhere; reach it directly at /dev/mdx-test.
// Safe to delete once the content routes (/product/[slug], /insights/[slug], etc.)
// are built — that's when the real verification happens.

export const Route = createFileRoute("/dev/mdx-test")({
  component: MdxTestPage,
  head: () => ({
    meta: [
      { title: "MDX pipeline test" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function MdxTestPage() {
  const products = getAllProducts();
  const posts = getAllPosts();
  const jobs = getAllJobs();
  const pages = getAllPages();

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold">MDX pipeline test</h1>
        <p className="mt-2 text-muted-foreground">
          If you see frontmatter loaded for each content type below, the MDX loader works.
        </p>
      </header>

      <Section
        title={`Products (${products.length})`}
        items={products.map((p) => ({
          slug: p.slug,
          title: p.title,
          extra: `${p.category} · ${p.brand} · ${p.publishedAt}`,
        }))}
      />
      <Section
        title={`Posts (${posts.length})`}
        items={posts.map((p) => ({
          slug: p.slug,
          title: p.title,
          extra: `${p.author} · ${p.publishedAt}`,
        }))}
      />
      <Section
        title={`Jobs (${jobs.length})`}
        items={jobs.map((j) => ({
          slug: j.slug,
          title: j.title,
          extra: `${j.location} · ${j.employmentType}`,
        }))}
      />
      <Section
        title={`Pages (${pages.length})`}
        items={pages.map((p) => ({
          slug: p.slug,
          title: p.title,
          extra: p.metaDescription.slice(0, 80) + "…",
        }))}
      />
    </div>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: Array<{ slug: string; title: string; extra: string }>;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">(none loaded)</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.slug} className="rounded-md bg-muted/40 p-3">
              <div className="font-medium">{item.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                slug: <code className="text-foreground">{item.slug}</code> · {item.extra}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
