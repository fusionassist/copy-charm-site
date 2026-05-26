import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

// Top-level nav for TanStack-rendered routes. Mirror-served pages keep
// their original WP/Elementor nav until each is migrated to a real
// TanStack route. Links to mirror-served URLs use plain <a> so the
// browser does a full page load (TanStack Router would otherwise try
// to client-navigate and 404 internally before falling through).
const NAV_LINKS = [
  { label: "Solutions", href: "/", description: "All product categories" },
  { label: "Products", href: "/shop/", description: "Browse the full catalogue" },
  { label: "Brands", href: "/brand/moytronix/", description: "Moytronix, Promethean, Vestel" },
  { label: "Insights", href: "/insights/", description: "Blog and case studies" },
  { label: "Careers", href: "/careers/", description: "Join the team" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <a
          href="/"
          className="flex items-center gap-2"
          aria-label="Interactive Displays Ireland — home"
        >
          <img
            src="/brand/idi-logo-color.png"
            alt="Interactive Displays Ireland"
            width={180}
            height={48}
            className="h-9 w-auto sm:h-10"
          />
        </a>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/contact-us">Get a quote</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="sm:hidden">
            <Link to="/contact-us">Contact</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
