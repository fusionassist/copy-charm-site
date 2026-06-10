import { createFileRoute } from "@tanstack/react-router";

import { SectorPage, type SectorPageData } from "@/components/blocks/SectorPage";

const DATA: SectorPageData = {
  slug: "schools",
  sectorName: "Schools",
  sectorNoun: "schools",
  pageTitle: "Digital Signage for Schools Ireland | Interactive Displays Ireland",
  metaDescription:
    "Digital signage and interactive displays for schools across Ireland. Notice boards, hall displays, classroom touchscreens, interactive whiteboards. 2,500+ installations including Palmerstown Community School. 3-year warranty, in-house Irish install team.",
  eyebrow: "Digital signage for schools",
  h1: "Ireland's most installed digital signage for schools",
  heroIntro:
    "From classroom interactive whiteboards to entrance-hall information displays, IDI supplies, installs and supports digital signage across primary, secondary and third-level schools in every county of Ireland. Over 2,500 installations completed since 2009 — including dozens of named Irish schools.",
  heroImage: "/images/screens/category-interactive.jpg",
  differentiators: [
    {
      title: "Built for school workflows",
      body: "Our content management system (CMS) is designed so that a school administrator — not an IT contractor — can update timetables, lunch menus, exam reminders and event posters in minutes. Includes scheduled content so you can pre-load a term of changes.",
    },
    {
      title: "Interactive whiteboards by the room",
      body: "Promethean ActivPanel + our own Moytronix interactive touchscreens, fully spec'd for primary classroom, secondary STEM lab and lecture theatre. Multi-touch, anti-glare, mounted at the right height for kids or adults.",
    },
    {
      title: "Build-quality for school environments",
      body: "Commercial-grade 24/7 panels (not consumer TVs) with toughened glass, secure wall mounting, and cable management designed for high-traffic corridors. We install with the school open or during holidays — your choice.",
    },
    {
      title: "Includes installation and training",
      body: "Quote includes nationwide install by our own team (not subcontractors), wall mounting, network setup, and one-on-one CMS training for nominated school staff. Most installs complete in a day per room.",
    },
    {
      title: "3-year warranty, on-site support",
      body: "All school installs ship with our standard 3-year parts and labour warranty — three times the typical school-grade display warranty. On-site response available across Ireland.",
    },
    {
      title: "Public-sector procurement experience",
      body: "We're experienced with Department of Education tendering, ETB procurement, and school capital budgets. We can structure a proposal in line with your procurement framework.",
    },
  ],
  namedCustomers: [
    {
      name: "Palmerstown Community School",
      note: "Multi-room interactive whiteboards across STEM classrooms",
    },
    {
      name: "South Dublin County Council",
      note: "Public-sector digital signage across council facilities",
    },
    {
      name: "Multiple ETBs",
      note: "Education and Training Board projects across rural and urban schools",
    },
  ],
  relevantProducts: [
    {
      title: "Interactive touchscreens",
      description:
        "Multi-touch interactive displays — 55\" through 86\" — sized for classroom, lecture hall, or assembly room.",
      href: "/product-category/interactive/",
      image: "/images/screens/category-interactive.jpg",
    },
    {
      title: "Promethean ActivPanel",
      description:
        "Promethean classroom interactive whiteboards. We're an authorised Irish supplier and installer.",
      href: "/brand/promethean/",
      image: "/images/screens/category-touchscreen.jpg",
    },
    {
      title: "Indoor information displays",
      description:
        "Hall, foyer and corridor information screens for timetables, announcements, exam schedules and student rotations.",
      href: "/product-category/indoor/",
      image: "/images/screens/category-indoor.jpg",
    },
  ],
  faqs: [
    {
      question: "What's the typical cost of a school digital signage install in Ireland?",
      answer:
        "A single interactive whiteboard install (55\"–75\" touchscreen + wall mount + CMS + install + training) typically lands €1,800–€3,500 ex VAT depending on screen size and brand. A multi-screen rollout across a whole school is usually significantly cheaper per screen — talk to us for a project quote.",
    },
    {
      question: "Can we update the displays ourselves once installed?",
      answer:
        "Yes — that's the design intent. Every install includes our CMS where a nominated school admin can update timetables, lunch menus, announcements, and event posters from any web browser. Training session for nominated staff is included in every quote.",
    },
    {
      question: "Do you install during the school year or only on holidays?",
      answer:
        "Both. Most schools prefer summer or mid-term break installs to avoid disruption — we work to school timetables. Single-screen installs are typically completed in a day with minimal disruption if needed during term.",
    },
    {
      question: "Are these displays compatible with our existing school IT infrastructure?",
      answer:
        "Yes. Our displays connect via standard Wi-Fi or wired Ethernet, work with school Microsoft 365 / Google Workspace single sign-on, and don't require IT contractor maintenance. They're explicitly designed to work within the constraints of school IT setups (filtered networks, group policy, etc.).",
    },
    {
      question: "What's the warranty?",
      answer:
        "3-year parts and labour warranty as standard across all our school installs — three times what most school-grade displays ship with. On-site response available across Ireland.",
    },
  ],
  ctaBody:
    "Tell us how many rooms, what age group, and your timeline. We'll spec the right Promethean ActivPanel or Moytronix interactive whiteboards, install during your preferred window, and back it with our 3-year warranty. Public-sector procurement-friendly quotes.",
};

export const Route = createFileRoute("/digital-signage-for-schools")({
  component: SchoolsPage,
  head: () => ({
    meta: [
      { title: DATA.pageTitle },
      { name: "description", content: DATA.metaDescription },
      { property: "og:title", content: DATA.pageTitle },
      { property: "og:description", content: DATA.metaDescription },
      { property: "og:type", content: "website" },
    ],
    links: [
      {
        rel: "canonical",
        href: `${import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://interactivedisplays.ie"}/digital-signage-for-schools`,
      },
    ],
  }),
});

function SchoolsPage() {
  return <SectorPage data={DATA} />;
}
