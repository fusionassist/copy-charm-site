type Category = {
  slug: string;
  name: string;
  description: string;
  image: string;
};

const CATEGORIES: Category[] = [
  {
    slug: "interactive",
    name: "Interactive Displays",
    description: "Touch-enabled screens for retail, education and collaboration.",
    image: "/wp-content/uploads/2025/05/pcap-wall-mounted-touch-screen-dual-os-windows-android-giant-tablet-09.jpg",
  },
  {
    slug: "outdoor",
    name: "Outdoor Displays",
    description: "High-brightness, weather-rated screens for shopfronts and forecourts.",
    image: "/wp-content/uploads/2025/05/outdoor-screen-.jpg",
  },
  {
    slug: "indoor",
    name: "Indoor Displays",
    description: "Commercial-grade signage for reception, retail and corporate.",
    image: "/wp-content/uploads/2025/05/Large-format-screen-3.jpg",
  },
  {
    slug: "touchscreen",
    name: "Touchscreens & Kiosks",
    description: "Self-ordering, wayfinding and information kiosks.",
    image: "/wp-content/uploads/2025/05/gallery-self-ordering-touchscreen-kiosk-1.jpg",
  },
  {
    slug: "led",
    name: "LED Video Walls",
    description: "Seamless indoor and outdoor LED walls in any configuration.",
    image: "/wp-content/uploads/2025/05/product-elevator-screens.jpg",
  },
  {
    slug: "self-ordering",
    name: "Self-Ordering",
    description: "QSR and hospitality kiosks that increase order value.",
    image: "/wp-content/uploads/2025/05/gallery-drive-thru-screen-1.jpg",
  },
];

export function CategoryGrid() {
  return (
    <section className="bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">
            Solutions
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            A display for every space
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            From a single screen in a retail unit to a full LED wall in a stadium — we design,
            supply and install signage for any environment.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <li key={cat.slug}>
              <a
                href={`/product-category/${cat.slug}/`}
                className="group relative block h-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  <img
                    src={cat.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/60 via-brand-navy/0 to-transparent" />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-foreground">{cat.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{cat.description}</p>
                  <p className="mt-3 inline-flex items-center text-sm font-medium text-brand-blue group-hover:text-brand-navy">
                    Browse range
                    <span aria-hidden="true" className="ml-1 transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
