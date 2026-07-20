import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/schema/JsonLd";
import { SITE_META } from "@/lib/site-meta";

// Digital Menu Boards Ireland — SEO + ad landing page (SEO plan P1b).
// Targets "digital menu boards ireland / menu board screens / restaurant
// menu screens" — historically IDI's best-converting ad keyword. New React
// route; falls through the mirror. Added to STATIC_PAGES for the sitemap.

const SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://interactivedisplays.ie").replace(/\/+$/, "");
const CANONICAL = `${SITE_URL}/digital-menu-boards`;
const PAGE_TITLE = "Digital Menu Boards Ireland | Restaurant & QSR Menu Screens — Interactive Displays Ireland";
const META_DESC =
  "Digital menu boards for Irish restaurants, cafés and QSRs — supplied, installed and supported by IDI. Change prices and menus in seconds, daypart breakfast to lunch, show allergens clearly. Commercial Moytronix panels rated for 24/7, 3-year warranty, own nationwide install team. Get a fast quote.";

const WHY = [
  { title: "Change prices & menus in seconds", body: "Update pricing across every screen and every site from a browser — no reprinting, no ladders, no waiting on a sign company. Roll out a promotion nationwide in minutes." },
  { title: "Daypart automatically", body: "Show breakfast in the morning, switch to lunch and dinner on a schedule. The right menu appears at the right time with no staff intervention." },
  { title: "Show allergens clearly", body: "Display allergen and nutritional information legibly and keep it current — far easier to maintain and update than printed boards, and simple to keep compliant." },
  { title: "Upsell with motion", body: "Video and animation lift attention and average spend in a way static menus can't. Feature high-margin items, meal deals and specials on rotation." },
];

const FAQS = [
  { q: "How much do digital menu boards cost in Ireland?", a: "It depends on how many screens, their size and mounting. A single commercial menu screen with mounting, content setup and install typically starts in the low four figures ex VAT; a multi-screen counter run is quoted per site after a free survey. We give a clear fixed quote — hardware, install and content management included." },
  { q: "Can I use a normal TV as a menu board?", a: "Not reliably. Consumer TVs aren't rated for the 12–16 hours a day, 7 days a week that a menu board runs — they dim, overheat and fail, and it voids their warranty. We supply our own Moytronix commercial-grade panels built for continuous 24/7 use, with a 3-year warranty." },
  { q: "Who updates the menu content?", a: "You can — every install includes a browser-based content management system and staff training, so a manager can change prices, swap items and schedule dayparts from any device. We can also design your first menu layouts and manage content for you if you prefer." },
  { q: "Do you install them, or just supply the screens?", a: "Both, nationwide, with our own engineer team — mounting, cabling, network setup and commissioning included. We install for QSRs, cafés, takeaways and restaurants across all 32 counties, from a single counter to a multi-site chain." },
  { q: "Can the boards handle allergen and nutritional information?", a: "Yes. Digital boards make it much easier to display allergen and nutritional details clearly and keep them current across every location, compared with reprinting static menus every time something changes." },
];

export const Route = createFileRoute("/digital-menu-boards")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: META_DESC },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: META_DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { property: "og:image", content: `${SITE_URL}/images/screens/category-self-ordering.jpg` },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: DigitalMenuBoardsPage,
});

function DigitalMenuBoardsPage() {
  const orgId = `${SITE_URL}/#organization`;

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    serviceType: "Digital menu board supply and installation",
    name: "Digital Menu Boards Ireland",
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
      { "@type": "ListItem", position: 2, name: "Digital Signage", item: `${SITE_URL}/digital-signage` },
      { "@type": "ListItem", position: 3, name: "Digital Menu Boards", item: CANONICAL },
    ],
  };

  return (
    <>
      <JsonLd id="menu-boards-service" data={serviceSchema} />
      <JsonLd id="menu-boards-faq" data={faqSchema} />
      <JsonLd id="menu-boards-breadcrumb" data={breadcrumbSchema} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-navy text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-spark">
              Digital menu boards · supplied &amp; installed in Ireland
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Digital Menu Boards Ireland
            </h1>
            <p className="mt-6 max-w-xl text-base text-white/85 sm:text-lg">
              Bright, commercial-grade menu screens for restaurants, cafés, takeaways and QSRs — change
              prices in seconds, daypart breakfast to lunch, and show allergens clearly. Supplied,
              installed and supported nationwide by Ireland's largest digital signage installer, on our
              own Moytronix panels built for 24/7 use.
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
            <p className="mt-8 text-sm text-white/70">
              Digital menu boards &amp; menu screens trusted by Irish hospitality &amp; QSR brands including{" "}
              <span className="font-semibold text-white">Supermac's</span>,{" "}
              <span className="font-semibold text-white">SPAR</span> and{" "}
              <span className="font-semibold text-white">LONDIS</span>.
            </p>
          </div>
          <div className="relative">
            <img
              src="/images/screens/menu-screens-install-3.jpg"
              alt="Digital menu screens installed above the deli counter at Centra Stewardstown by Interactive Displays Ireland"
              width={800}
              height={600}
              className="w-full rounded-2xl border border-white/10 object-cover shadow-2xl shadow-brand-cyan/10"
              loading="eager"
              fetchPriority="high"
            />
          </div>
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
                  LCD menu screens &amp; 55&Prime; freestanding units — ready to install
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  We're holding stock of commercial LCD digital menu screens and 55-inch freestanding
                  display units right now — so we can survey, supply and install within days, not weeks.
                  Ideal if you need menu boards or digital menu screens up and running for a launch,
                  refit or busy season.
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

      {/* ── WHY DIGITAL MENUS ────────────────────────────────────────────── */}
      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">Why go digital</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Why restaurants switch to digital menu boards</h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {WHY.map((w) => (
              <div key={w.title} className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold text-brand-navy">{w.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HARDWARE: COMMERCIAL VS CONSUMER ─────────────────────────────── */}
      <section className="bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">The hardware</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Commercial Moytronix panels — not consumer TVs</h2>
            <p className="mt-3 text-muted-foreground">
              A menu board runs 12–16 hours a day, every day. Consumer TVs aren't built for it — they dim,
              overheat and void warranty. We manufacture our own commercial brand, so you get the right
              hardware at the right price, installed and warrantied by the same team.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { t: "Rated for 24/7", b: "Commercial panels built for continuous all-day operation, not evening TV use." },
              { t: "Bright & anti-glare", b: "Readable under bright counter and window lighting where a consumer TV washes out." },
              { t: "3-year warranty", b: "Parts and labour as standard — three times the typical consumer TV warranty." },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-border bg-background p-6 text-center">
                <h3 className="text-lg font-semibold">{c.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.b}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            See the{" "}
            <a href="/product/network-menu-boards" className="font-medium text-brand-blue underline underline-offset-2 hover:text-brand-navy">
              digital menu screens we install
            </a>{" "}
            — 43&Prime; &amp; 32&Prime; commercial panels, in stock now — or the underlying{" "}
            <a href="/product/android-network-display" className="font-medium text-brand-blue underline underline-offset-2 hover:text-brand-navy">
              Moytronix Android display
            </a>{" "}
            spec.
          </p>
        </div>
      </section>

      {/* ── INCLUDED ─────────────────────────────────────────────────────── */}
      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">What's included</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Screens, install, content &amp; support — one team</h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "Free site survey", b: "We measure your counter, check sightlines and power, and recommend the layout." },
              { t: "Nationwide install", b: "Our own engineers mount and commission — not couriers. All 32 counties." },
              { t: "Content design", b: "We can design your first menu layouts and set up dayparting and scheduling." },
              { t: "Ongoing support", b: "CMS training, content help and a 3-year parts-and-labour warranty." },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold">{c.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Digital menu boards — common questions</h2>
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
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to upgrade your menu?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/85 sm:text-lg">
            Tell us how many screens and where. We'll survey your site free, spec commercial panels that
            last, install them nationwide with our own team, and back them with a 3-year warranty.
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
