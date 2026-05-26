import { ShieldCheck, Truck, Wrench, Users } from "lucide-react";

type Feature = {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
};

const FEATURES: Feature[] = [
  {
    icon: ShieldCheck,
    title: "3-year warranty as standard",
    body: "Every screen we supply is backed by a 3-year parts-and-labour warranty — far longer than the industry default of 12 months.",
  },
  {
    icon: Truck,
    title: "Nationwide install & rollout",
    body: "From Letterkenny to Skibbereen — our installers handle single-site fit-outs and multi-site retail rollouts across all 32 counties.",
  },
  {
    icon: Wrench,
    title: "End-to-end service",
    body: "We design, supply, install, commission and support. One contract, one accountable team — no buck-passing between vendors.",
  },
  {
    icon: Users,
    title: "Trusted Irish partner",
    body: "Family-run from Co. Meath, working with retailers, schools, hospitals, councils and corporates since 2009.",
  },
];

export function WhyChooseUs() {
  return (
    <section className="bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">
            Why IDI
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            More than just a screen supplier
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Choosing the right hardware is the easy part. We handle everything else — so your
            signage works on day one, day 100, and day 1,000.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
