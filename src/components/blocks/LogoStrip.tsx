type Logo = { name: string; src: string };

const LOGOS: Logo[] = [
  { name: "3 Arena", src: "/wp-content/uploads/2025/05/3-arena-logo-colour.png" },
  { name: "Combilift", src: "/wp-content/uploads/2025/05/Combilift-Web-Logo_sm.png" },
  { name: "Johnson & Johnson", src: "/wp-content/uploads/2025/05/2560px-Johnson_and_Johnson_Logo.svg_-600x108.png" },
  { name: "LONDIS", src: "/wp-content/uploads/2025/05/LONDIS-Logo_edited-1-e1499693913391.png" },
  { name: "SPAR", src: "/wp-content/uploads/2025/05/SPAR-Logo-2048x1229-1-1024x615.png" },
  { name: "Supermac's", src: "/wp-content/uploads/2025/05/supermacs-logo-menu-150x53-1.png" },
  { name: "South Dublin County Council", src: "/wp-content/uploads/2025/05/South-Dublin-County-Council-logo.png" },
];

export function LogoStrip() {
  return (
    <section className="border-y border-border bg-muted/40 py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-center text-sm font-semibold uppercase tracking-widest text-brand-cyan">
          Trusted by leading Irish organisations
        </p>
        <ul className="mt-8 grid grid-cols-2 items-center gap-x-8 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {LOGOS.map((logo) => (
            <li key={logo.name} className="flex items-center justify-center">
              <img
                src={logo.src}
                alt={logo.name}
                loading="lazy"
                decoding="async"
                className="h-10 w-auto max-w-[140px] object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0 sm:h-12"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
