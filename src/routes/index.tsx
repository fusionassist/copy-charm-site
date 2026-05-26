import { createFileRoute } from "@tanstack/react-router";

import { Hero } from "@/components/blocks/Hero";
import { CategoryGrid } from "@/components/blocks/CategoryGrid";
import { LogoStrip } from "@/components/blocks/LogoStrip";
import { CTABanner } from "@/components/blocks/CTABanner";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "InteractiveDisplays Ireland — Digital Signage, Touchscreens & Kiosks" },
      {
        name: "description",
        content:
          "Interactive Displays Ireland supplies and installs LED and LCD digital signage, interactive touchscreens, outdoor displays, kiosks and AV solutions across Ireland.",
      },
      { property: "og:title", content: "InteractiveDisplays Ireland — Digital Signage" },
      {
        property: "og:description",
        content:
          "LED/LCD digital signage, interactive touchscreens, outdoor displays and self-ordering kiosks for retail, hospitality, education and corporate Ireland.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://beta.interactivedisplays.ie/" }],
  }),
});

function HomePage() {
  return (
    <>
      <Hero />
      <CategoryGrid />
      <LogoStrip />
      <CTABanner />
    </>
  );
}
