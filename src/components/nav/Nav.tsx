import { useState } from "react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

// Top-level nav for TanStack-rendered routes. Mirrors the live WP/Elementor
// site menu (Home · Screen Solutions · Services · Visitor Assist · Careers)
// so the React pages match the rest of the site. Screen Solutions is a wide
// image-tile mega-menu panel (like the mirror nav's WP/Elementor product
// mega-menu). Mirror-served destinations use plain <a> for a
// full page load (TanStack Router would otherwise try to client-navigate a
// mirror URL and 404 internally before falling through).

type MenuItem = { label: string; href: string };
type MegaTile = { label: string; href: string; image: string };
type MenuGroup = {
  label: string;
  href: string;
  items?: MenuItem[]; // simple dropdown + mobile list
  mega?: { tiles: MegaTile[] }; // desktop image-tile mega panel
};

const SCREEN_SOLUTIONS_ITEMS: MenuItem[] = [
  { label: "Digital Signage", href: "/digital-signage" },
  { label: "Digital Menu Boards", href: "/digital-menu-boards" },
  { label: "Digital Menu Screens", href: "/product/network-menu-boards" },
  { label: "Interactive Displays", href: "/product-category/interactive/" },
  { label: "Touchscreens & Kiosks", href: "/product-category/touchscreen/" },
  { label: "Outdoor Displays", href: "/product-category/outdoor/" },
  { label: "Indoor Displays", href: "/product-category/indoor/" },
  { label: "LED Video Walls", href: "/product-category/led/" },
  { label: "GAA LED Scoreboards", href: "/product/gaa-led-scoreboards" },
  { label: "Self-Ordering Kiosks", href: "/product-category/self-ordering/" },
  { label: "High-Brightness Displays", href: "/product-category/high-brightness/" },
  { label: "Professional Displays — Android", href: "/product/android-network-display" },
];

const MENU: MenuGroup[] = [
  { label: "Home", href: "/" },
  {
    label: "Screen Solutions",
    href: "/screen-solutions/",
    items: SCREEN_SOLUTIONS_ITEMS,
    mega: {
      tiles: [
        { label: "Digital Signage", href: "/digital-signage", image: "/images/screens/moy-ds60-portrait.jpg" },
        { label: "Digital Menu Screens", href: "/product/network-menu-boards", image: "/images/screens/menu-screens-install-3.jpg" },
        { label: "LED Video Walls", href: "/product-category/led/", image: "/images/screens/category-led.jpg" },
        { label: "GAA LED Scoreboards", href: "/product/gaa-led-scoreboards", image: "/images/screens/cluscore-hero.jpg" },
        { label: "Interactive Displays", href: "/product-category/interactive/", image: "/images/screens/category-interactive.jpg" },
        { label: "Touchscreens & Kiosks", href: "/product-category/touchscreen/", image: "/images/screens/category-touchscreen.jpg" },
        { label: "Outdoor Displays", href: "/product-category/outdoor/", image: "/images/screens/category-outdoor.jpg" },
        { label: "Indoor Displays", href: "/product-category/indoor/", image: "/images/screens/category-indoor.jpg" },
        { label: "Self-Ordering Kiosks", href: "/product-category/self-ordering/", image: "/images/screens/category-self-ordering.jpg" },
        { label: "Professional Displays — Android", href: "/product/android-network-display", image: "/images/screens/moy-ds60-hero.jpg" },
      ],
    },
  },
  {
    label: "Services",
    href: "/supply-installation/",
    items: [
      { label: "Supply & Installation", href: "/supply-installation/" },
      { label: "Training & Support", href: "/training-support/" },
      { label: "Content Management & Creation", href: "/content-management-creation/" },
    ],
  },
  {
    label: "Visitor Assist",
    href: "/queue-management-system/",
    items: [
      { label: "Queue Management System", href: "/queue-management-system/" },
      { label: "Digital Ticketing", href: "/digital-ticket/" },
      { label: "Online Appointment", href: "/online-appointment/" },
      { label: "Customer Counting", href: "/customer-counting-solution/" },
      { label: "Satisfaction Survey", href: "/satisfaction-survey/" },
      { label: "Corporate Reception", href: "/corporate-reception-solution/" },
      { label: "Vending Machines", href: "/vending-machines/" },
    ],
  },
  { label: "Careers", href: "/careers/" },
];

const Chevron = () => (
  <svg
    className="size-3 opacity-60 transition-transform group-hover:rotate-180"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2" aria-label="Interactive Displays Ireland — home">
          <img
            src="/brand/idi-logo-color.png"
            alt="Interactive Displays Ireland"
            width={180}
            height={48}
            className="h-9 w-auto sm:h-10"
          />
        </a>

        {/* Desktop menu — CSS hover/focus dropdowns, no JS needed */}
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {MENU.map((group) => (
              <li key={group.label} className="group relative">
                <a
                  href={group.href}
                  className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                >
                  {group.label}
                  {(group.items || group.mega) && <Chevron />}
                </a>

                {/* Mega-menu panel — image tiles (matches the WP mega menu) */}
                {group.mega && (
                  <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 opacity-0 transition-all group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    <div className="w-[820px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-popover p-3 shadow-xl">
                      <ul className="grid grid-cols-5 gap-2.5">
                        {group.mega.tiles.map((tile) => (
                          <li key={tile.href}>
                            <a
                              href={tile.href}
                              className="group/tile relative block aspect-[4/3] overflow-hidden rounded-lg ring-1 ring-black/5"
                            >
                              <img
                                src={tile.image}
                                alt=""
                                aria-hidden="true"
                                loading="lazy"
                                className="absolute inset-0 size-full object-cover transition duration-300 group-hover/tile:scale-110"
                              />
                              <span className="absolute inset-0 bg-gradient-to-t from-brand-navy/95 via-brand-navy/40 to-brand-navy/5" />
                              <span className="absolute inset-x-0 bottom-0 p-2 text-xs font-semibold leading-tight text-white drop-shadow">
                                {tile.label}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Simple dropdown */}
                {group.items && !group.mega && (
                  <div className="invisible absolute left-0 top-full z-50 min-w-64 pt-2 opacity-0 transition-all group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    <ul className="overflow-hidden rounded-xl border border-border bg-popover py-2 shadow-lg">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <a
                            href={item.href}
                            className="block px-4 py-2 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                          >
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/contact-us">Get In Touch</Link>
          </Button>
          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex size-9 items-center justify-center rounded-md text-foreground/80 hover:bg-accent hover:text-foreground lg:hidden"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {mobileOpen ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <nav aria-label="Mobile" className="border-t border-border bg-background lg:hidden">
          <ul className="mx-auto max-w-7xl divide-y divide-border px-4 py-2 sm:px-6">
            {MENU.map((group) => (
              <li key={group.label} className="py-1">
                <a href={group.href} className="block py-2 text-sm font-semibold text-foreground">
                  {group.label}
                </a>
                {group.items && (
                  <ul className="pb-1 pl-3">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <a href={item.href} className="block py-1.5 text-sm text-foreground/70 hover:text-foreground">
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            <li className="py-3">
              <Link
                to="/contact-us"
                className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Get In Touch
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
