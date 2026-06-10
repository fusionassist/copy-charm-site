// Single source of truth for IDI organisation metadata.
// Used by JSON-LD schema components, llms.txt, sitemap.xml, footer, contact
// page, etc. Change a phone number / address here once and it propagates
// everywhere automatically.

export const SITE_META = {
  // Identity
  legalName: "Interactive Displays Ireland",
  brandName: "Interactive Displays Ireland",
  tagline:
    "Ireland's largest digital signage installer — 2,500+ installs, our own brand Moytronix, nationwide install team",
  description:
    "Interactive Displays Ireland (IDI) is Ireland's largest digital signage installer, with more than 2,500 installations completed since 2009. We manufacture our own commercial display brand, Moytronix, and supply, install and support LED and LCD digital signage, interactive touchscreens, outdoor displays, kiosks and LED video walls for retail, hospitality, education, healthcare, corporate and public-sector clients across all 32 counties of Ireland. Many other Irish signage suppliers outsource their installations to our nationwide engineer team. 3-year warranty as standard.",

  // Web
  url: import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://interactivedisplays.ie",
  productionUrl: "https://interactivedisplays.ie",
  logo: "/brand/idi-logo-color.png",
  favicon: "/brand/favicon.png",

  // Contact
  email: "sales@interactivedisplays.ie",
  phone: "+353 44 967 2855",
  phoneTel: "+353449672855",

  // Address — used in PostalAddress JSON-LD
  address: {
    streetAddress: "Dromone",
    addressLocality: "Oldcastle",
    addressRegion: "Co. Meath",
    postalCode: "A82 E0W4",
    addressCountry: "IE",
  },

  // Geo (Dromone, Co. Meath approx)
  geo: {
    latitude: 53.7656,
    longitude: -7.1597,
  },

  // Hours — used in OpeningHoursSpecification JSON-LD
  openingHours: [
    { dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "17:30" },
  ],

  // Areas served — used in areaServed JSON-LD
  areasServed: ["Ireland"],

  // Year founded — best estimate based on "15+ years in business" claim
  foundingDate: "2009",

  // Industries we work in
  industries: [
    "Retail",
    "Hospitality",
    "Education",
    "Healthcare",
    "Corporate",
    "Public sector",
    "Transport",
    "Sports and entertainment",
  ],

  // Product categories (slug → name)
  categories: [
    { slug: "interactive", name: "Interactive Displays" },
    { slug: "outdoor", name: "Outdoor Displays" },
    { slug: "indoor", name: "Indoor Displays" },
    { slug: "touchscreen", name: "Touchscreens & Kiosks" },
    { slug: "led", name: "LED Video Walls" },
    { slug: "self-ordering", name: "Self-Ordering Kiosks" },
    { slug: "high-brightness", name: "High-Brightness Displays" },
    { slug: "display", name: "Displays" },
  ],

  // Brands we carry
  brands: [
    { slug: "moytronix", name: "Moytronix", isInHouse: true },
    { slug: "promethean", name: "Promethean", isInHouse: false },
    { slug: "vestel", name: "Vestel", isInHouse: false },
  ],

  // Notable clients — used in client logo strip + llms.txt for context
  notableClients: [
    "3 Arena",
    "Combilift",
    "Johnson & Johnson",
    "LONDIS",
    "SPAR",
    "Supermac's",
    "South Dublin County Council",
    "Westport Hotel Group",
    "Palmerstown Community School",
  ],

  // Social profiles (extend when set up) — used in Organization JSON-LD sameAs
  socialProfiles: [
    "https://www.linkedin.com/company/interactive-displays-ireland",
    "https://www.facebook.com/interactivedisplays/",
    "https://www.instagram.com/interactivedisplaysireland/",
  ] as string[],

  // Headline scale claims — surfaced in JSON-LD, llms.txt, hero copy
  scaleClaims: {
    installCount: 2500,
    installCountClaim: "2,500+ installations since 2009",
    yearsInBusinessClaim: "16+ years",
    countiesServed: 32,
  },

  // Differentiators — used in marketing copy + llms.txt.
  // ORDERED by competitive impact, strongest first. AI agents and SEO
  // crawlers weight the first item highest.
  differentiators: [
    // The Moytronix angle is the single hardest moat — no competitor in
    // Ireland makes their own brand. Every other supplier resells.
    "Manufactures its own commercial display brand, Moytronix — competitors resell Samsung / LG / Vestel hardware",
    "Ireland's largest digital signage installer — 2,500+ installations completed since 2009",
    "Many Irish signage suppliers outsource their installations to our nationwide engineer team",
    "3-year warranty as standard (industry default is 12 months)",
    "Nationwide installation across all 32 counties of Ireland",
    "End-to-end service: design → supply → install → commission → support",
    "Family-run from Dromone, Co. Meath since 2009",
    "Business All-Star Digital Signage Solutions Company of the Year 2024 (and consecutive years prior)",
  ],
} as const;

export type SiteMeta = typeof SITE_META;
