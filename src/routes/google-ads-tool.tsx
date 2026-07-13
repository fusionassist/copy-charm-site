import { createFileRoute } from "@tanstack/react-router";

import { SITE_META } from "@/lib/site-meta";

export const Route = createFileRoute("/google-ads-tool")({
  component: GoogleAdsToolPage,
  head: () => ({
    meta: [
      { title: "Google Ads Tool | Interactive Displays Ireland" },
      {
        name: "description",
        content:
          "About google-ads-mcp, the internal advertising-operations tool Interactive Displays Ireland uses to manage its own Google Ads accounts via the official Google Ads API.",
      },
      { property: "og:title", content: "Google Ads Tool — Interactive Displays Ireland" },
      {
        property: "og:description",
        content:
          "What our internal Google Ads API tool is, what it does, and who uses it.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      {
        rel: "canonical",
        href: `${import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://interactivedisplays.ie"}/google-ads-tool`,
      },
    ],
  }),
});

const SECTION_HEADING = "mt-12 mb-3 text-xl font-semibold tracking-tight text-foreground first:mt-0";
const PROSE = "max-w-3xl space-y-4 text-base leading-relaxed text-muted-foreground";

function GoogleAdsToolPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-10 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-cyan">
          Interactive Displays Ireland
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Our Google Ads Tool (google-ads-mcp)
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          This page describes <strong>google-ads-mcp</strong>, the internal
          advertising-operations application that Interactive Displays Ireland uses to manage its
          own Google Ads accounts through the official Google Ads API.
        </p>
      </header>

      <article className={PROSE}>
        <h2 className={SECTION_HEADING}>What the tool is</h2>
        <p>
          google-ads-mcp is an internal software tool built by Interactive Displays Ireland on top
          of Google&apos;s official Google Ads API client library. It lets our own staff review
          advertising performance, create and adjust campaigns, manage budgets and keywords, and
          generate reports for the Google Ads accounts that we own and operate for our own brands.
        </p>

        <h2 className={SECTION_HEADING}>What it does</h2>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Reporting</strong> — retrieves campaign, ad group, keyword and conversion
            performance for our accounts using Google Ads Query Language (GAQL).
          </li>
          <li>
            <strong>Campaign management</strong> — creates and updates campaigns, budgets, ad
            groups, ads, keywords and creative assets in our own accounts, with every change
            initiated and reviewed by a member of our staff.
          </li>
          <li>
            <strong>Optimisation</strong> — reviews Google&apos;s optimisation recommendations,
            manages bidding strategies, and uploads conversion data from our own sales records.
          </li>
        </ul>

        <h2 className={SECTION_HEADING}>Who uses it</h2>
        <p>
          The tool is used exclusively by Interactive Displays Ireland employees to manage
          advertising for our own company websites and brands. It is not offered for sale, is not
          available to customers or any third party, and does not access any Google Ads account
          other than the accounts owned by our company under our own manager account.
        </p>

        <h2 className={SECTION_HEADING}>Data and privacy</h2>
        <p>
          The tool accesses advertising data (campaign settings and performance metrics) from our
          own Google Ads accounts only. This data is used solely for managing our own advertising
          and is never sold or shared with third parties. API credentials are held securely on
          company infrastructure. For how we handle personal data generally, see our{" "}
          <a href="/privacy-policy" className="text-primary underline-offset-4 hover:underline">
            privacy policy
          </a>
          .
        </p>

        <h2 className={SECTION_HEADING}>Contact</h2>
        <p>
          <strong>{SITE_META.legalName}</strong>
          <br />
          {SITE_META.address.streetAddress}, {SITE_META.address.addressLocality},{" "}
          {SITE_META.address.addressRegion}, {SITE_META.address.postalCode}, Ireland
          <br />
          Email:{" "}
          <a
            href={`mailto:${SITE_META.email}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {SITE_META.email}
          </a>
          <br />
          Phone:{" "}
          <a
            href={`tel:${SITE_META.phoneTel}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {SITE_META.phone}
          </a>
        </p>
      </article>
    </div>
  );
}
