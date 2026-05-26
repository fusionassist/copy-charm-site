import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

type CTABannerProps = {
  eyebrow?: string;
  heading?: string;
  body?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export function CTABanner({
  eyebrow = "Let's talk",
  heading = "Ready to transform your space?",
  body = "Tell us about your project — we'll spec the right hardware, handle nationwide installation, and back it with a 3-year warranty.",
  primaryLabel = "Get a quote",
  secondaryLabel = "Call +353 44 967 2855",
  secondaryHref = "tel:+353449672855",
}: CTABannerProps) {
  return (
    <section className="bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-brand-navy px-6 py-12 text-white shadow-xl sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-brand-cyan/20 blur-3xl"
          />
          <div className="relative grid gap-8 md:grid-cols-[1.5fr_1fr] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-spark">
                {eyebrow}
              </p>
              <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{heading}</h2>
              <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">{body}</p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Button asChild size="lg" className="bg-white text-brand-navy hover:bg-white/90">
                <Link to="/contact-us">{primaryLabel}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <a href={secondaryHref}>{secondaryLabel}</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
