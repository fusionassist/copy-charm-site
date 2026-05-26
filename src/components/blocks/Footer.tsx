import { Link } from "@tanstack/react-router";

const COMPANY_LINKS = [
  { label: "Solutions", href: "/" },
  { label: "Products", href: "/shop/" },
  { label: "Brands", href: "/brand/moytronix/" },
  { label: "Insights", href: "/insights/" },
  { label: "Careers", href: "/careers/" },
];

const RESOURCE_LINKS = [
  { label: "Choosing the right digital signage", href: "/choosing-the-right-digital-signage/" },
  { label: "Outdoor digital signage in Ireland", href: "/outdoor-digital-signage-in-ireland/" },
  { label: "Interactive whiteboards in schools", href: "/interactive-whiteboards-in-schools/" },
  { label: "Customer counting solution", href: "/customer-counting-solution/" },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t border-border bg-brand-navy text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <a
              href="/"
              className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight"
              aria-label="Interactive Displays Ireland — home"
            >
              <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-brand-cyan" />
              InteractiveDisplays
            </a>
            <p className="mt-4 text-sm text-white/80">
              Digital signage, interactive displays, kiosks and AV solutions for retail, hospitality,
              education and corporate Ireland.
            </p>
            <p className="mt-4 text-xs text-white/60">
              Dromone, Oldcastle, Co. Meath, Ireland A82&nbsp;E0W4
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-spark">
              Company
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <a className="text-white/80 transition-colors hover:text-white" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  className="text-white/80 transition-colors hover:text-white"
                  to="/contact-us"
                >
                  Contact us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-spark">
              Insights
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.href}>
                  <a className="text-white/80 transition-colors hover:text-white" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-spark">
              Get in touch
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="sr-only">Email</dt>
                <dd>
                  <a
                    className="text-white/80 transition-colors hover:text-white"
                    href="mailto:sales@interactivedisplays.ie"
                  >
                    sales@interactivedisplays.ie
                  </a>
                </dd>
              </div>
              <div>
                <dt className="sr-only">Phone</dt>
                <dd className="text-white/80">
                  <a className="hover:text-white" href="tel:+353449672855">
                    +353 44 967 2855
                  </a>
                </dd>
              </div>
              <div>
                <dt className="sr-only">Office hours</dt>
                <dd className="text-xs text-white/60">Mon–Fri, 09:00–17:30 IST</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/60 sm:flex-row sm:items-center">
          <p>© {year} Interactive Displays Ireland. All rights reserved.</p>
          <ul className="flex items-center gap-6">
            <li>
              <a className="hover:text-white" href="/privacy-policy/">
                Privacy policy
              </a>
            </li>
            <li>
              <a className="hover:text-white" href="/cookie-policy/">
                Cookie policy
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
