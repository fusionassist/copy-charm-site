import { useState } from "react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

// Top-level nav for TanStack-rendered routes. Mirrors the live WP/Elementor
// site menu (Home · Screen Solutions · Services · Visitor Assist · Careers)
// so the React pages match the rest of the site. Screen Solutions is a wide
// mega-menu panel (grouped columns + a featured image tile) like the mirror
// nav's product mega-menu. Mirror-served destinations use plain <a> for a
// full page load (TanStack Router would otherwise try to client-navigate a
// mirror URL and 404 internally before falling through).

type MenuItem = { label: string; href: string };
type MegaColumn = { heading: string; items: MenuItem[] };
type MegaFeatured = { image: string; eyebrow: string; title: string; body: string; href: string };
type MenuGroup = {
  label: string;
  href: string;
  items?: MenuItem[]; // simple dropdown + mobile list
  mega?: { columns: MegaColumn[]; featured: MegaFeatured };
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
      columns: [
        {
          heading: "Popular",
          items: [
            { label: "Digital Signage", href: "/digital-signage" },
            { label: "Digital Menu Boards", href: "/digital-menu-boards" },
            { label: "Digital Menu Screens", href: "/product/network-menu-boards" },
          ],
        },
        {
          heading: "By display type",
          items: [
            { label: "Interactive Displays", href: "/product-category/interactive/" },
            { label: "Touchscreens & Kiosks", href: "/product-category/touchscreen/" },
            { label: "Outdoor Displays", href: "/product-category/outdoor/" },
            { label: "Indoor Displays", href: "/product-category/indoor/" },
          ],
        },
        {
          heading: "More",
          items: [
            { label: "LED Video Walls", href: "/product-category/led/" },
            { label: "Self-Ordering Kiosks", href: "/product-category/self-ordering/" },
            { label: "High-Brightness Displays", href: "/product-category/high-brightness/" },
            { label: "Professional Displays — Android", href: "/product/android-network-display" },
          ],
        },
      ],
      featured: {
        image: "/images/screens/menu-screens-install-3.jpg",
        eyebrow: "In stock now",
        title: "Digital Menu Screens",
        body: "43″ & 32″ commercial menu screens — fast nationwide install.",
        href: "/product/network-menu-boards",
      },
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

                {/* Mega-menu panel */}
                {group.mega && (
                  <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-all group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    <div className="grid w-[720px] max-w-[calc(100vw-2rem)] grid-cols-4 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
                      <div className="col-span-3 grid grid-cols-3 gap-x-3 gap-y-1 p-5">
                        {group.mega.columns.map((col) => (
                          <div key={col.heading}>
                            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-brand-cyan">
                              {col.heading}
                            </p>
                            <ul className="space-y-0.5">
                              {col.items.map((item) => (
                                <li key={item.href}>
                                  <a
                                    href={item.href}
                                    className="block rounded px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                                  >
                                    {item.label}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      <a href={group.mega.featured.href} className="relative col-span-1 block overflow-hidden bg-brand-navy text-white">
                        <img
                          src={group.mega.featured.image}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 size-full object-cover opacity-35"
                        />
                        <div className="relative flex h-full flex-col justify-end p-4">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-brand-spark">
                            {group.mega.featured.eyebrow}
                          </span>
                          <span className="mt-1 text-sm font-bold leading-tight">{group.mega.featured.title}</span>
                          <span className="mt-1 text-xs leading-snug text-white/80">{group.mega.featured.body}</span>
                          <span className="mt-2 text-xs font-semibold text-brand-spark">View →</span>
                        </div>
                      </a>
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
