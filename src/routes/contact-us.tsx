import { createFileRoute } from "@tanstack/react-router";

import { LeadForm } from "@/components/blocks/LeadForm";
import { LocalBusinessSchema } from "@/components/schema/LocalBusinessSchema";

export const Route = createFileRoute("/contact-us")({
  component: ContactUsPage,
  head: () => ({
    meta: [
      { title: "Contact Us | Interactive Displays Ireland" },
      {
        name: "description",
        content:
          "Get in touch with Interactive Displays Ireland — digital signage, interactive displays, kiosks and AV solutions for retail, hospitality, and corporate environments across Ireland.",
      },
      { property: "og:title", content: "Contact Interactive Displays Ireland" },
      {
        property: "og:description",
        content: "Talk to the IDI team about digital signage, kiosks and interactive displays.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      {
        rel: "canonical",
        href: `${import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://interactivedisplays.ie"}/contact-us`,
      },
    ],
  }),
});

function ContactUsPage() {
  // <main> is provided by __root.tsx (so we don't nest mains here).
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <LocalBusinessSchema />
      <header className="mb-10 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-cyan">
          Interactive Displays Ireland
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Contact us</h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Tell us about your project — digital signage, interactive displays, kiosks, or a
          full-room AV install. A member of the team will respond within one business day.
        </p>
      </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
          <section aria-labelledby="form-heading">
            <h2 id="form-heading" className="sr-only">
              Send us a message
            </h2>
            <LeadForm />
          </section>

          <aside className="space-y-6 rounded-xl border bg-card p-6 text-card-foreground">
            <div>
              <h2 className="text-lg font-semibold">Other ways to reach us</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Prefer to talk to someone directly?
              </p>
            </div>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-medium text-foreground">Email</dt>
                <dd className="mt-1">
                  <a
                    className="text-primary underline-offset-4 hover:underline"
                    href="mailto:sales@interactivedisplays.ie"
                  >
                    sales@interactivedisplays.ie
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Phone</dt>
                <dd className="mt-1">
                  <a
                    className="text-primary underline-offset-4 hover:underline"
                    href="tel:+353449672855"
                  >
                    +353 44 967 2855
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Office</dt>
                <dd className="mt-1 text-muted-foreground">
                  Dromone, Oldcastle, Co. Meath, Ireland A82&nbsp;E0W4
                </dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              Office hours: Monday–Friday, 09:00–17:30 IST.
            </p>
          </aside>
        </div>
    </div>
  );
}
