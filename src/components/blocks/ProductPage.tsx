// Reusable layout for MDX-backed product pages (/product/<slug>).
//
// The route supplies the parsed frontmatter (`product`) plus the compiled
// MDX body component (`Body`). This block renders a consistent, SEO- and
// AI-friendly product page: hero with key specs + CTAs + brochure download,
// a full specification table, the MDX prose body, an optional gallery, FAQ,
// related products, and a closing CTA. Product / Breadcrumb / FAQ JSON-LD is
// emitted so search engines and AI agents can quote it directly.

import type { ComponentType } from "react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/schema/JsonLd";
import { SITE_META } from "@/lib/site-meta";
import { getProduct, type ProductFrontmatter } from "@/lib/mdx";

type WithPath<T> = T & { path: string; slug: string };

// Human-friendly labels for the frontmatter spec keys.
const SPEC_LABELS: Record<string, string> = {
  screenSize: "Screen size",
  resolution: "Resolution",
  brightness: "Brightness",
  player: "Media player",
  os: "Operating system",
  operation: "Operation",
  contrast: "Contrast ratio",
  viewingAngle: "Viewing angle",
  connectivity: "Connectivity",
  audio: "Audio",
  orientation: "Orientation",
  power: "Power",
  dimensions: "Dimensions (W×H×D)",
  bezel: "Bezel width",
  weight: "Weight",
  mounting: "Mounting",
  battery: "Battery",
  ip_rating: "IP rating",
  warranty: "Warranty",
};

function labelFor(key: string): string {
  if (SPEC_LABELS[key]) return SPEC_LABELS[key];
  // Fallback: camelCase / snake_case → Title Case
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

export function ProductPage({
  product,
  Body,
}: {
  product: WithPath<ProductFrontmatter>;
  Body: ComponentType<Record<string, unknown>>;
}) {
  const baseUrl = SITE_META.url.replace(/\/+$/, "");
  const canonical = `${baseUrl}/product/${product.slug}`;
  const heroAbs = product.heroImage.startsWith("http")
    ? product.heroImage
    : `${baseUrl}${product.heroImage}`;

  const specEntries = Object.entries(product.specs ?? {});
  const heroSpecs = specEntries.slice(0, 6);

  const related = (product.relatedProducts ?? [])
    .map((slug) => getProduct(slug))
    .filter((p): p is WithPath<ProductFrontmatter> => Boolean(p));

  // ── Schema ──────────────────────────────────────────────────────────────
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${canonical}#product`,
    name: product.title,
    description: product.metaDescription ?? product.shortDescription,
    image: heroAbs,
    category: product.category,
    brand: { "@type": "Brand", name: "Moytronix" },
    manufacturer: { "@id": `${baseUrl}/#organization` },
    url: canonical,
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      priceCurrency: "EUR",
      seller: { "@id": `${baseUrl}/#organization` },
      url: canonical,
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: "Products", item: `${baseUrl}/shop/` },
      { "@type": "ListItem", position: 3, name: product.title, item: canonical },
    ],
  };

  const faqSchema =
    product.faqs && product.faqs.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `${canonical}#faq`,
          mainEntity: product.faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  return (
    <>
      <JsonLd id={`product-${product.slug}`} data={productSchema} />
      <JsonLd id={`product-${product.slug}-breadcrumb`} data={breadcrumbSchema} />
      {faqSchema && <JsonLd id={`product-${product.slug}-faq`} data={faqSchema} />}

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-navy text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <nav aria-label="Breadcrumb" className="mb-5 text-sm text-white/60">
              <Link to="/" className="hover:text-white">Home</Link>
              <span className="px-2">/</span>
              <a href="/shop/" className="hover:text-white">Products</a>
              <span className="px-2">/</span>
              <span className="text-white/90">{product.title}</span>
            </nav>
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-spark">
              Moytronix · {product.category} display
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              {product.title}
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/85 sm:text-lg">
              {product.shortDescription}
            </p>

            {heroSpecs.length > 0 && (
              <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 sm:max-w-lg">
                {heroSpecs.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-brand-spark/80">
                      {labelFor(key)}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-white">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="bg-white text-brand-navy hover:bg-white/90">
                <Link to="/contact-us">Get a quote</Link>
              </Button>
              {product.brochures?.[0] && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <a href={product.brochures[0].href} target="_blank" rel="noopener noreferrer">
                    Download brochure (PDF)
                  </a>
                </Button>
              )}
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <a href={`tel:${SITE_META.phoneTel}`}>Call {SITE_META.phone}</a>
              </Button>
            </div>
          </div>

          <div className="relative">
            <img
              src={product.heroImage}
              alt={product.title}
              width={800}
              height={600}
              className="w-full rounded-2xl border border-white/10 object-cover shadow-2xl shadow-brand-cyan/10"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {/* ── SPECIFICATIONS ──────────────────────────────────────────────── */}
      {specEntries.length > 0 && (
        <section className="border-b border-border bg-background py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">
              Specifications
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">At a glance</h2>
            <dl className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border">
              {specEntries.map(([key, value], i) => (
                <div
                  key={key}
                  className={`grid grid-cols-1 gap-1 px-5 py-3.5 sm:grid-cols-3 sm:gap-4 ${
                    i % 2 ? "bg-muted/30" : "bg-background"
                  }`}
                >
                  <dt className="text-sm font-semibold text-muted-foreground">{labelFor(key)}</dt>
                  <dd className="text-sm font-medium text-foreground sm:col-span-2">
                    {String(value)}
                  </dd>
                </div>
              ))}
            </dl>
            {product.brochures && product.brochures.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {product.brochures.map((b) => (
                  <a
                    key={b.href}
                    href={b.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-brand-blue transition hover:border-brand-cyan hover:text-brand-navy"
                  >
                    ↓ {b.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── MDX BODY ────────────────────────────────────────────────────── */}
      {/* No @tailwindcss/typography plugin in this project — style MDX
          elements explicitly with child-targeting utilities. */}
      <section className="bg-background py-16 sm:py-20">
        <div
          className="mx-auto max-w-3xl px-4 sm:px-6
            [&_h2]:mt-10 [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-foreground
            [&_h2:first-child]:mt-0
            [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground
            [&_p]:mt-4 [&_p]:text-base [&_p]:leading-relaxed [&_p]:text-muted-foreground
            [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5
            [&_li]:text-muted-foreground [&_li]:marker:text-brand-cyan
            [&_strong]:font-semibold [&_strong]:text-foreground
            [&_a]:font-medium [&_a]:text-brand-blue [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-brand-navy"
        >
          <Body />
        </div>
      </section>

      {/* ── GALLERY ─────────────────────────────────────────────────────── */}
      {product.gallery && product.gallery.length > 1 && (
        <section className="border-t border-border bg-muted/30 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {product.gallery.map((src) => (
                <div key={src} className="overflow-hidden rounded-xl border border-border bg-background">
                  <img
                    src={src}
                    alt={product.title}
                    loading="lazy"
                    className="aspect-[16/10] w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      {product.faqs && product.faqs.length > 0 && (
        <section className="border-y border-border bg-background py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Common questions</h2>
            <dl className="mt-8 space-y-5">
              {product.faqs.map((f) => (
                <div key={f.q} className="rounded-xl border border-border bg-card p-6">
                  <dt className="text-lg font-semibold text-foreground">{f.q}</dt>
                  <dd className="mt-2 text-sm text-muted-foreground">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {/* ── RELATED PRODUCTS ────────────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="bg-muted/30 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight">Related products</h2>
            <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link
                    to="/product/$slug"
                    params={{ slug: p.slug }}
                    className="group block overflow-hidden rounded-xl border border-border bg-card transition hover:shadow-lg"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-muted">
                      <img
                        src={p.heroImage}
                        alt={p.title}
                        loading="lazy"
                        className="size-full object-cover transition group-hover:scale-105"
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-semibold">{p.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{p.shortDescription}</p>
                      <p className="mt-3 text-sm font-medium text-brand-blue group-hover:text-brand-navy">
                        View product →
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── CLOSING CTA ─────────────────────────────────────────────────── */}
      <section className="bg-brand-navy text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Interested in the {product.title}?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/85 sm:text-lg">
            Tell us about your site and how many screens you need. We'll spec it, supply it,
            install it nationwide with our own team, and back it with our 3-year warranty.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-white text-brand-navy hover:bg-white/90">
              <Link to="/contact-us">Get a free quote</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <a href={`tel:${SITE_META.phoneTel}`}>Call {SITE_META.phone}</a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
