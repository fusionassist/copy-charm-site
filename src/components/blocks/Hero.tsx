import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-navy text-white">
      {/* Decorative gradient + subtle glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--brand-blue),_transparent_55%)] opacity-80"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-32 size-96 rounded-full bg-brand-cyan/20 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-28">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-spark">
            Interactive Displays Ireland
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Discover the potential of <span className="text-brand-spark">digital signage</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/85 sm:text-xl">
            We supply, install and support LED and LCD digital signage for retail, hospitality,
            education and corporate spaces across Ireland — turning audiences into customers.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="bg-white text-brand-navy hover:bg-white/90">
              <Link to="/contact-us">Get a quote</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <a href="/shop/">Explore solutions</a>
            </Button>
          </div>
          <p className="mt-6 text-sm text-white/60">
            Nationwide installation · 3-year warranty · In-house support
          </p>
        </div>

        <div className="relative flex items-center justify-center lg:justify-end">
          <div className="relative aspect-[4/3] w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-brand-blue/40 shadow-2xl shadow-brand-cyan/10">
            <img
              src="/images/screens/hero-magic-mirror.jpg"
              alt="Wall-mounted interactive PCAP touch display"
              loading="eager"
              decoding="async"
              className="size-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
