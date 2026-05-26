// Schema.org LocalBusiness + ContactPage markup for /contact-us.
// LocalBusiness covers the physical office; ContactPage marks the route
// as the canonical contact page so agents/search engines route enquiries
// here.

import { SITE_META } from "@/lib/site-meta";
import { JsonLd } from "./JsonLd";

const DAY_ABBREV: Record<string, string> = {
  Monday: "Mo",
  Tuesday: "Tu",
  Wednesday: "We",
  Thursday: "Th",
  Friday: "Fr",
  Saturday: "Sa",
  Sunday: "Su",
};

export function LocalBusinessSchema() {
  const baseUrl = SITE_META.url;
  const contactUrl = `${baseUrl}/contact-us`;

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${baseUrl}/#localbusiness`,
    name: SITE_META.legalName,
    url: baseUrl,
    logo: `${baseUrl}${SITE_META.logo}`,
    image: `${baseUrl}${SITE_META.logo}`,
    description: SITE_META.description,
    email: SITE_META.email,
    telephone: SITE_META.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE_META.address.streetAddress,
      addressLocality: SITE_META.address.addressLocality,
      addressRegion: SITE_META.address.addressRegion,
      postalCode: SITE_META.address.postalCode,
      addressCountry: SITE_META.address.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE_META.geo.latitude,
      longitude: SITE_META.geo.longitude,
    },
    openingHoursSpecification: SITE_META.openingHours.map((slot) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: slot.dayOfWeek,
      opens: slot.opens,
      closes: slot.closes,
    })),
    // Convenience flattened form for crawlers that prefer it
    openingHours: SITE_META.openingHours.flatMap((slot) =>
      slot.dayOfWeek.map((day) => `${DAY_ABBREV[day] ?? day} ${slot.opens}-${slot.closes}`),
    ),
    areaServed: SITE_META.areasServed,
    priceRange: "€€",
  };

  const contactPage = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${contactUrl}#contactpage`,
    url: contactUrl,
    name: "Contact Interactive Displays Ireland",
    description:
      "Contact form and direct details for sales, technical questions, and installation enquiries.",
    isPartOf: { "@id": `${baseUrl}/#website` },
    about: { "@id": `${baseUrl}/#organization` },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
        { "@type": "ListItem", position: 2, name: "Contact us", item: contactUrl },
      ],
    },
    mainEntity: { "@id": `${baseUrl}/#localbusiness` },
  };

  return (
    <>
      <JsonLd id="ld-localbusiness" data={localBusiness} />
      <JsonLd id="ld-contactpage" data={contactPage} />
    </>
  );
}
