type Stat = { value: string; label: string };

const STATS: Stat[] = [
  { value: "15+", label: "Years in business" },
  { value: "1,000+", label: "Screens installed" },
  { value: "32", label: "Counties served" },
  { value: "3yr", label: "Standard warranty" },
];

export function StatsBar() {
  return (
    <section
      aria-label="Interactive Displays Ireland at a glance"
      className="border-b border-border bg-muted/40 py-10"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <dl className="grid grid-cols-2 gap-6 sm:gap-10 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center md:text-left">
              <dt className="order-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="text-3xl font-bold text-brand-navy sm:text-4xl">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
