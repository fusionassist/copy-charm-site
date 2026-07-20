import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/schema/JsonLd";
import { SITE_META } from "@/lib/site-meta";

// Digital Signage Ireland — top-of-funnel category + ad landing page.
// Targets "digital signage ireland / screens / advertising screens". This is
// the final URL for the Digital Signage ad group (previously homepage → poor
// Quality Score). New React route; falls through the mirror. Add to
// STATIC_PAGES in start-node.mjs for the sitemap.

const SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://interactivedisplays.ie").replace(/\/+$/, "");
const CANONICAL = `${SITE_URL}/digital-signage`;
const PAGE_TITLE = "Digital Signage Ireland | Supplied & Installed Nationwide — Interactive Displays Ireland";
const META_DESC =
  "Digital signage in Ireland — supplied, installed and supported nationwide by IDI, Ireland's largest digital signage installer. 2,500+ installs since 2009, our own Moytronix commercial displays, 3-year warranty, own install team across all 32 counties. Get a fast quote or free site survey.";

const SUPPLY = [
  { title: "Indoor Digital Signage", body: "Foyer, retail and corridor screens for menus, wayfinding and promotions.", href: "/product-category/indoor/", image: "/images/screens/category-indoor.jpg" },
  { title: "Outdoor & Window Displays", body: "High-brightness, weatherproof screens readable in direct sun and shopfront windows.", href: "/product-category/outdoor/", image: "/images/screens/category-outdoor.jpg" },
  { title: "Digital Menu Boards", body: "Restaurant and QSR menu screens — change prices in seconds, daypart breakfast to lunch.", href: "/digital-menu-boards", image: "/images/screens/category-self-ordering.jpg" },
  { title: "LED Video Walls", body: "Seamless large-format LED for arenas, retail and reception — built and installed by us.", href: "/product-category/led/", image: "/images/screens/category-led.jpg" },
  { title: "Touchscreens & Kiosks", body: "Interactive touch displays and self-service kiosks for wayfinding and ordering.", href: "/product-category/touchscreen/", image: "/images/screens/category-touchscreen.jpg" },
  { title: "Interactive Displays", body: "Multi-touch displays and interactive whiteboards for education and corporate.", href: "/product-category/interactive/", image: "/images/screens/category-interactive.jpg" },
];

const PROCESS = [
  { step: "1", title: "Site survey", body: "We visit (or review your plans), measure the space, check sightlines, power and mounting, and recommend the right screens — free of charge." },
  { step: "2", title: "Design & quote", body: "A clear fixed quote covering hardware, mounting, content management and install. We help design the first content if you need it." },
  { step: "3", title: "Nationwide install", body: "Our own engineers install, mount and commission — not couriers or subcontractors. Most sites go live in a day." },
  { step: "4", title: "Support & warranty", body: "3-year parts-and-labour warranty as standard, plus ongoing content and technical support across all 32 counties." },
];

const FAQS = [
  { q: "How much does digital signage cost in Ireland?", a: "It depends on screen size, brightness, quantity and mounting. A single commercial indoor screen with mounting, content management and install typically starts in the low four figures ex VAT; LED video walls are priced per square metre. We give a clear fixed quote after a free site survey — no surprises." },
  { q: "Do you install the screens, or just supply them?", a: "Both — and the install is done by our own nationwide engineer team, not couriers or subcontractors. Many other Irish signage suppliers actually outsource their installs to us. Supply, mounting, network setup and commissioning are all included." },
  { q: "What makes commercial digital signage different from a normal TV?", a: "Commercial displays are rated for 24/7 operation, run far brighter (essential for shop windows and sunlit spaces), and are built for continuous use over years. Consumer TVs are not — they dim, overheat and void warranty in commercial use. We manufacture our own commercial brand, Moytronix." },
  { q: "Can staff update the content themselves?", a: "Yes. Every install includes a browser-based content management system (CMS) and staff training, so you can schedule promotions, change menus and push updates from any device. We can also manage content for you." },
  { q: "Do you cover the whole of Ireland?", a: "Yes — we supply, install and support across all 32 counties, from a single screen to a multi-site rollout. We're family-run from Dromone, Co. Meath, in business since 2009." },
];

export const Route = createFileRoute("/digital-signage")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: META_DESC },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: META_DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { property: "og:image", content: `${SITE_URL}/images/screens/category-led.jpg` },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: DigitalSignagePage,
});

function DigitalSignagePage() {
  const orgId = `${SITE_URL}/#organization`;

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    serviceType: "Digital signage supply and installation",
    name: "Digital Signage Ireland",
    description: META_DESC,
    provider: { "@id": orgId },
    areaServed: { "@type": "Country", name: "Ireland" },
    url: CANONICAL,
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${CANONICAL}#faq`,
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Digital Signage", item: CANONICAL },
    ],
  };

  return (
    <>
      <JsonLd id="digital-signage-service" data={serviceSchema} />
      <JsonLd id="digital-signage-faq" data={faqSchema} />
      <JsonLd id="digital-signage-breadcrumb" data={breadcrumbSchema} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-navy text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-spark">
              Digital signage · supplied &amp; installed in Ireland
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Digital Signage Ireland — supplied &amp; installed nationwide
            </h1>
            <p className="mt-6 max-w-xl text-base text-white/85 sm:text-lg">
              Interactive Displays Ireland is Ireland's largest digital signage installer — over{" "}
              <strong className="text-white">2,500 installations since 2009</strong>. We manufacture our
              own commercial display brand, Moytronix, and supply, install and support digital signage
              screens for retail, hospitality, education and more, across all 32 counties — with our own
              engineer team, not couriers.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="bg-white text-brand-navy hover:bg-white/90">
                <a href="/contact-us">Get a fast quote</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <a href="/contact-us">Book a free site survey</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <a href={`tel:${SITE_META.phoneTel}`}>Call {SITE_META.phone}</a>
              </Button>
            </div>
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 sm:max-w-lg sm:grid-cols-4">
              {[
                { n: "2,500+", l: "installs since 2009" },
                { n: "32", l: "counties covered" },
                { n: "3-year", l: "warranty as standard" },
                { n: "Own", l: "brand: Moytronix" },
              ].map((s) => (
                <div key={s.l}>
                  <dt className="text-2xl font-bold text-brand-spark">{s.n}</dt>
                  <dd className="mt-1 text-xs text-white/75">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <img
              src="/images/screens/category-led.jpg"
              alt="Digital signage LED video wall supplied and installed in Ireland by Interactive Displays Ireland"
              width={800}
              height={600}
              className="w-full rounded-2xl border border-white/10 object-cover shadow-2xl shadow-brand-cyan/10"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {/* ── TRUSTED BY ───────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-background py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Trusted by leading Irish brands &amp; venues
          </p>
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {SITE_META.notableClients.map((c) => (
              <li key={c} className="text-base font-semibold text-foreground/70">
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── IN STOCK NOW ─────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-brand-cyan/10 py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-2xl border border-brand-cyan/30 bg-background p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-brand-cyan/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-blue">
                  In stock now · fast install
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight">
                  55&Prime; freestanding display units — ready to install
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  We're holding stock of 55-inch freestanding digital signage units and commercial LCD
                  menu screens right now — survey, supply and install within days, not weeks. Perfect for
                  a launch, refit or a busy season when you can't wait on a long lead time.
                </p>
              </div>
              <div className="shrink-0">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <a href="/contact-us">Check stock &amp; book install</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT WE SUPPLY ───────────────────────────────────────────────── */}
      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">What we supply</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Every kind of digital signage screen</h2>
            <p className="mt-3 text-muted-foreground">
              From a single shopfront screen to a nationwide multi-site rollout — indoor, outdoor, menu
              boards, LED video walls, touchscreens and kiosks, all supplied and installed by us.
            </p>
          </div>
          <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SUPPLY.map((c) => (
              <li key={c.title}>
                <a href={c.href} className="group block overflow-hidden rounded-xl border border-border bg-card text-card-foreground transition hover:shadow-lg">
                  <div className="aspect-[16/10] overflow-hidden bg-muted">
                    <img src={c.image} alt={`${c.title} — Ireland`} loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-semibold">{c.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
                    <p className="mt-3 text-sm font-medium text-brand-blue group-hover:text-brand-navy">Learn more →</p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── OWN INSTALL TEAM ─────────────────────────────────────────────── */}
      <section className="bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">Why IDI</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Our own install team — not couriers</h2>
            <p className="mt-3 text-muted-foreground">
              Most Irish signage suppliers drop-ship a screen and leave you to mount it. We're the team
              they outsource their own installs to. That's the difference between a box on a pallet and a
              working display on your wall.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SITE_META.differentiators.slice(0, 6).map((d) => (
              <div key={d} className="rounded-xl border border-border bg-background p-6">
                <p className="text-sm text-foreground/90">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESS ──────────────────────────────────────────────────────── */}
      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">How it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Survey → design → install → support</h2>
          </div>
          <ol className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((p) => (
              <li key={p.step} className="rounded-xl border border-border bg-card p-6">
                <div className="flex size-9 items-center justify-center rounded-full bg-brand-navy text-sm font-bold text-white">
                  {p.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Digital signage in Ireland — common questions</h2>
          </div>
          <dl className="mt-10 space-y-5">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-xl border border-border bg-background p-6">
                <dt className="text-lg font-semibold text-foreground">{f.q}</dt>
                <dd className="mt-2 text-sm text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── CLOSING CTA ──────────────────────────────────────────────────── */}
      <section className="bg-brand-navy text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Planning a digital signage project?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/85 sm:text-lg">
            Tell us about your site and what you want to show. We'll survey it free, spec the right
            screens, install them nationwide with our own team, and back the lot with a 3-year warranty.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-white text-brand-navy hover:bg-white/90">
              <a href="/contact-us">Get a fast quote</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <a href={`tel:${SITE_META.phoneTel}`}>Call {SITE_META.phone}</a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
