// Schema.org Organization + WebSite markup for the IDI domain.
// Mount once in __root.tsx so every TanStack-rendered page exposes it.

import { SITE_META } from "@/lib/site-meta";
import { JsonLd } from "./JsonLd";

export function OrganizationSchema() {
  const baseUrl = SITE_META.url;

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: SITE_META.legalName,
    alternateName: SITE_META.brandName,
    url: baseUrl,
    logo: {
      "@type": "ImageObject",
      url: `${baseUrl}${SITE_META.logo}`,
    },
    description: SITE_META.description,
    slogan: SITE_META.tagline,
    foundingDate: SITE_META.foundingDate,
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
    areaServed: SITE_META.areasServed.map((name) => ({
      "@type": "Country",
      name,
    })),
    award: [
      "Business All-Star Digital Signage Solutions Company of the Year 2024",
    ],
    brand: {
      "@type": "Brand",
      name: "Moytronix",
      description:
        "Moytronix is the in-house commercial display brand designed and supplied by Interactive Displays Ireland — covering LED/LCD digital signage, interactive touchscreens, outdoor displays and kiosks.",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: SITE_META.phone,
      email: SITE_META.email,
      contactType: "sales",
      areaServed: "IE",
      availableLanguage: ["English"],
    },
    sameAs: SITE_META.socialProfiles,
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    url: baseUrl,
    name: SITE_META.brandName,
    description: SITE_META.tagline,
    publisher: { "@id": `${baseUrl}/#organization` },
    inLanguage: "en-IE",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <JsonLd id="ld-organization" data={organization} />
      <JsonLd id="ld-website" data={website} />
    </>
  );
}
