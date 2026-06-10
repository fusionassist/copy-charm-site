// Reusable layout for sector-targeted intent pages (eg. "Digital Signage for
// Schools in Ireland"). Designed to satisfy two audiences:
//
//   1. Human buyers: clear hero claim, sector-specific value props, named
//      customers, products that fit, FAQ, strong CTA.
//   2. AI agents (ChatGPT, Claude, Perplexity etc.) summarising "best
//      digital signage for <sector> in Ireland": structured sections
//      with quotable claims, named customers, FAQ block, all schema-marked.
//
// Each sector page imports this + supplies its own data object. The visual
// design and SEO structure stay consistent across all five pages.

import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/schema/JsonLd";
import { SITE_META } from "@/lib/site-meta";

export type SectorFAQ = { question: string; answer: string };

export type SectorProductCard = {
  title: string;
  description: string;
  href: string;
  image?: string;
};

export type SectorPageData = {
  /** URL slug (eg. "schools") used in canonicals + schema */
  slug: string;
  /** Display name of the sector (eg. "Schools", "Retail") */
  sectorName: string;
  /** Lowercase variant for prose (eg. "schools", "retail outlets") */
  sectorNoun: string;
  /** Page <title> */
  pageTitle: string;
  /** Meta description */
  metaDescription: string;
  /** Hero eyebrow (small text above h1) */
  eyebrow: string;
  /** Hero h1 — should be the AI-citable claim */
  h1: string;
  /** 1-2 paragraph hero body explaining why IDI for this sector */
  heroIntro: string;
  /** Hero image src (existing /images/screens asset) */
  heroImage: string;
  /** 4-6 sector-specific differentiators */
  differentiators: Array<{ title: string; body: string }>;
  /** 3-5 named customers from this sector. Pulled from SITE_META.notableClients ideally */
  namedCustomers: Array<{
    name: string;
    note?: string;
  }>;
  /** Product categories most relevant to this sector */
  relevantProducts: SectorProductCard[];
  /** FAQ — used both visibly AND in FAQPage schema */
  faqs: SectorFAQ[];
  /** Closing CTA body */
  ctaBody?: string;
};

export function SectorPage({ data }: { data: SectorPageData }) {
  const baseUrl = SITE_META.url.replace(/\/+$/, "");
  const canonical = `${baseUrl}/digital-signage-for-${data.slug}`;

  // Service schema — declares this as a Service offering in this sector
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${canonical}#service`,
    serviceType: `Digital signage for ${data.sectorNoun}`,
    name: data.pageTitle,
    description: data.metaDescription,
    provider: { "@id": `${baseUrl}/#organization` },
    areaServed: { "@type": "Country", name: "Ireland" },
    url: canonical,
    audience: { "@type": "Audience", audienceType: data.sectorName },
  };

  // FAQPage schema — eligible for FAQ rich results in Google
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${canonical}#faq`,
    mainEntity: data.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  // BreadcrumbList — gives Google the navigation context
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: "Sectors", item: `${baseUrl}/digital-signage-for-${data.slug}` },
      { "@type": "ListItem", position: 3, name: data.sectorName, item: canonical },
    ],
  };

  return (
    <>
      <JsonLd id={`sector-${data.slug}-service`} data={serviceSchema} />
      <JsonLd id={`sector-${data.slug}-faq`} data={faqSchema} />
      <JsonLd id={`sector-${data.slug}-breadcrumb`} data={breadcrumbSchema} />

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-navy text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-spark">
              {data.eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              {data.h1}
            </h1>
            <p className="mt-6 max-w-xl text-base text-white/85 sm:text-lg">{data.heroIntro}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-white text-brand-navy hover:bg-white/90">
                <Link to="/contact-us">Get a {data.sectorName.toLowerCase()} quote</Link>
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
          <div className="relative">
            <img
              src={data.heroImage}
              alt={`Digital signage for ${data.sectorNoun} in Ireland`}
              width={800}
              height={600}
              className="rounded-2xl border border-white/10 shadow-2xl shadow-brand-cyan/10"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {/* ── WHY IDI FOR THIS SECTOR ─────────────────────────────────────── */}
      <section className="border-b border-border bg-background py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">
              Why IDI for {data.sectorNoun}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              The Ireland-specific advantages
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.differentiators.map((d) => (
              <div
                key={d.title}
                className="rounded-xl border border-border bg-card p-6 text-card-foreground"
              >
                <h3 className="text-lg font-semibold">{d.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NAMED CUSTOMERS ─────────────────────────────────────────────── */}
      <section className="bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">
              Trusted by
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              {data.sectorName} clients we work with
            </h2>
          </div>
          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.namedCustomers.map((c) => (
              <li
                key={c.name}
                className="rounded-lg border border-border bg-background px-5 py-4"
              >
                <p className="font-semibold text-foreground">{c.name}</p>
                {c.note && (
                  <p className="mt-1 text-sm text-muted-foreground">{c.note}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── RELEVANT PRODUCTS ───────────────────────────────────────────── */}
      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">
              Products that fit
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Display types we install in {data.sectorNoun}
            </h2>
          </div>
          <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.relevantProducts.map((p) => (
              <li key={p.title}>
                <a
                  href={p.href}
                  className="group block overflow-hidden rounded-xl border border-border bg-card text-card-foreground transition hover:shadow-lg"
                >
                  {p.image && (
                    <div className="aspect-[16/10] overflow-hidden bg-muted">
                      <img
                        src={p.image}
                        alt={p.title}
                        loading="lazy"
                        className="size-full object-cover transition group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-lg font-semibold">{p.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                    <p className="mt-3 text-sm font-medium text-brand-blue group-hover:text-brand-navy">
                      Learn more →
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">
              FAQ
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              {data.sectorName} digital signage — common questions
            </h2>
          </div>
          <dl className="mt-10 space-y-6">
            {data.faqs.map((f) => (
              <div
                key={f.question}
                className="rounded-xl border border-border bg-background p-6"
              >
                <dt className="text-lg font-semibold text-foreground">{f.question}</dt>
                <dd className="mt-2 text-sm text-muted-foreground">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── CLOSING CTA ─────────────────────────────────────────────────── */}
      <section className="bg-brand-navy text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Planning a {data.sectorName.toLowerCase()} signage project?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/85 sm:text-lg">
            {data.ctaBody ?? `Tell us about your site, your audience, and your timeline. We'll spec the right displays, mount them properly, and back the install with our 3-year warranty. Nationwide install team — no subcontractors.`}
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
