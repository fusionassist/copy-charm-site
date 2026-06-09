import { createFileRoute } from "@tanstack/react-router";

import { SITE_META } from "@/lib/site-meta";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy | Interactive Displays Ireland" },
      {
        name: "description",
        content:
          "How Interactive Displays Ireland collects, uses and protects your personal data when you visit our website, submit our contact form, use our live chat, or contact us by phone or email.",
      },
      { property: "og:title", content: "Privacy Policy — Interactive Displays Ireland" },
      {
        property: "og:description",
        content:
          "Read our privacy policy: what we collect, how we use it, and your rights under GDPR.",
      },
      { property: "og:type", content: "website" },
      // Search engines don't surface privacy pages prominently — keep
      // indexable but de-prioritised in the sitemap.
    ],
    links: [
      {
        rel: "canonical",
        href: `${import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://interactivedisplays.ie"}/privacy-policy`,
      },
    ],
  }),
});

const SECTION_HEADING = "mt-12 mb-3 text-xl font-semibold tracking-tight text-foreground first:mt-0";
const SUB_HEADING = "mt-6 mb-2 text-base font-semibold text-foreground";
const PROSE = "max-w-3xl space-y-4 text-base leading-relaxed text-muted-foreground";

function PrivacyPolicyPage() {
  const today = new Date();
  const lastUpdated = today.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-10 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-cyan">
          Interactive Displays Ireland
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Last updated: <time dateTime={today.toISOString().split("T")[0]}>{lastUpdated}</time>
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          This privacy policy explains how Interactive Displays Ireland ("IDI", "we", "us", "our")
          collects, uses, and protects personal data when you visit{" "}
          <a
            href={SITE_META.url}
            className="text-primary underline-offset-4 hover:underline"
          >
            interactivedisplays.ie
          </a>
          , submit our contact form, use our live chat, or contact us by phone or email.
        </p>
      </header>

      <article className={PROSE}>
        {/* 1. Who we are */}
        <h2 className={SECTION_HEADING}>1. Who we are</h2>
        <p>
          Interactive Displays Ireland is a digital signage, interactive display, kiosk and AV
          installation company based in Ireland. Our registered office is:
        </p>
        <p>
          <strong>{SITE_META.legalName}</strong>
          <br />
          {SITE_META.address.streetAddress}, {SITE_META.address.addressLocality},{" "}
          {SITE_META.address.addressRegion}
          <br />
          {SITE_META.address.postalCode}, Ireland
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
        <p>
          We are the data controller for personal data collected through our website and customer
          contact channels. If you have any questions about this policy or how we handle your data,
          contact us at{" "}
          <a
            href={`mailto:${SITE_META.email}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {SITE_META.email}
          </a>
          .
        </p>

        {/* 2. What we collect and why */}
        <h2 className={SECTION_HEADING}>2. What we collect and why</h2>

        <h3 className={SUB_HEADING}>Contact form submissions</h3>
        <p>
          When you submit our contact form, we collect: your name, email address, phone number (if
          provided), company name (if provided), and the message you send. We use this information
          solely to respond to your enquiry. The submission is sent to our sales team via Microsoft
          365 email and may also be logged in our internal CRM for follow-up.
        </p>
        <p>
          <strong>Legal basis:</strong> legitimate interest in responding to enquiries, and
          performance of pre-contractual steps where you are requesting a quote.
        </p>

        <h3 className={SUB_HEADING}>Live chat</h3>
        <p>
          If you use the live chat widget on our site, the messages you send and the page you
          contacted us from are stored in our customer relationship system (Odoo) to allow our team
          to respond and to maintain a record of the conversation. The chat widget is provided by
          our own infrastructure (Odoo Live Chat) — no third-party chat operator sees your messages.
        </p>
        <p>
          <strong>Legal basis:</strong> legitimate interest in responding to enquiries.
        </p>

        <h3 className={SUB_HEADING}>Phone calls and email</h3>
        <p>
          If you call our office or email us directly, we keep a record of the contact and any
          notes from the conversation to provide quotes, support and follow-up. Call recordings are
          not made unless explicitly notified at the start of the call.
        </p>

        <h3 className={SUB_HEADING}>Automatically collected information</h3>
        <p>
          When you visit our site, our hosting infrastructure logs technical information including
          your IP address, browser type, operating system, the page you visited, and the page that
          referred you. This data is used for security, performance monitoring and aggregate
          analytics. Logs are kept for a reasonable period (typically 30 days) and are not used to
          personally identify you.
        </p>

        <h3 className={SUB_HEADING}>Analytics and advertising tracking</h3>
        <p>
          We use industry-standard analytics and advertising-attribution tools to understand which
          marketing channels bring visitors to our site and which content is useful. Depending on
          configuration these may include Google Analytics, Google Ads conversion tracking, Meta
          (Facebook/Instagram) Pixel, and LinkedIn Insight Tag. These tools may set cookies and may
          process anonymised identifiers and event data on Google's, Meta's and LinkedIn's servers
          respectively.
        </p>
        <p>
          <strong>Legal basis:</strong> consent (in EU jurisdictions). Where consent is required,
          tracking is loaded only after you accept it via our cookie banner. You can change your
          consent at any time using your browser settings or by clearing cookies.
        </p>

        {/* 3. Cookies */}
        <h2 className={SECTION_HEADING}>3. Cookies</h2>
        <p>
          We use a small number of cookies and similar technologies. They fall into three
          categories:
        </p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Strictly necessary cookies</strong> — required for the site to work (session
            management, security). These are always set; no consent is required under GDPR/PECR.
          </li>
          <li>
            <strong>Functional cookies</strong> — remember preferences you've expressed during your
            visit (eg. cookie banner choice).
          </li>
          <li>
            <strong>Analytics and advertising cookies</strong> — set by Google Analytics, Google
            Ads, Meta Pixel, LinkedIn Insight Tag (when these tools are active). These cookies are
            only set after you give consent.
          </li>
        </ul>
        <p>
          You can block or delete cookies via your browser settings. Blocking cookies will not
          affect your ability to use the core functionality of the site.
        </p>

        {/* 4. Sharing */}
        <h2 className={SECTION_HEADING}>4. Who we share data with</h2>
        <p>We do not sell your personal data. We share data only with:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Microsoft</strong> — our email is hosted on Microsoft 365. Form submissions are
            delivered to our sales inbox via Microsoft Graph API.
          </li>
          <li>
            <strong>Plesk / our hosting provider</strong> — server logs and uptime data.
          </li>
          <li>
            <strong>Cloudflare</strong> (where DNS is proxied) — IP addresses and request metadata,
            for DDoS protection and CDN delivery.
          </li>
          <li>
            <strong>Google, Meta, LinkedIn</strong> (where analytics and advertising tracking is
            active and you have consented) — anonymised page views and conversion events.
          </li>
          <li>
            <strong>Our internal CRM system (Odoo)</strong> — for managing customer relationships
            and quotes. Hosted on our own infrastructure.
          </li>
          <li>
            <strong>Third parties when legally required</strong> — eg. in response to a valid
            court order or regulatory request.
          </li>
        </ul>
        <p>
          Microsoft, Google, Meta, LinkedIn and Cloudflare are international companies. Data may be
          transferred outside the EEA under the EU–US Data Privacy Framework or under Standard
          Contractual Clauses, as applicable.
        </p>

        {/* 5. Retention */}
        <h2 className={SECTION_HEADING}>5. How long we keep data</h2>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Contact form submissions and customer enquiries</strong> — retained in our CRM
            for as long as the commercial relationship is active and for 7 years thereafter for tax
            and contractual purposes.
          </li>
          <li>
            <strong>Server logs</strong> — typically 30 days.
          </li>
          <li>
            <strong>Analytics data</strong> — according to the provider's defaults (eg. Google
            Analytics: up to 14 months for event data).
          </li>
          <li>
            <strong>Marketing consent</strong> — until you withdraw it.
          </li>
        </ul>

        {/* 6. Your rights */}
        <h2 className={SECTION_HEADING}>6. Your rights under GDPR</h2>
        <p>
          If you are in the EU/EEA or the UK, you have the following rights with respect to your
          personal data:
        </p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Access</strong> — request a copy of the personal data we hold about you.
          </li>
          <li>
            <strong>Rectification</strong> — ask us to correct inaccurate or incomplete data.
          </li>
          <li>
            <strong>Erasure</strong> — request deletion of your personal data, subject to legal
            obligations to retain certain records.
          </li>
          <li>
            <strong>Restriction</strong> — ask us to limit how we use your data.
          </li>
          <li>
            <strong>Portability</strong> — receive your data in a structured, machine-readable
            format.
          </li>
          <li>
            <strong>Objection</strong> — object to processing based on legitimate interests or
            direct marketing.
          </li>
          <li>
            <strong>Consent withdrawal</strong> — where processing is based on consent, withdraw it
            at any time without affecting the lawfulness of prior processing.
          </li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{" "}
          <a
            href={`mailto:${SITE_META.email}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {SITE_META.email}
          </a>
          . We will respond within 30 days.
        </p>
        <p>
          You also have the right to lodge a complaint with the Irish Data Protection Commission
          (DPC) at{" "}
          <a
            href="https://www.dataprotection.ie/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            dataprotection.ie
          </a>{" "}
          if you believe we have not handled your data appropriately.
        </p>

        {/* 7. Security */}
        <h2 className={SECTION_HEADING}>7. Security</h2>
        <p>
          We take appropriate technical and organisational measures to protect personal data,
          including HTTPS encryption for all site traffic, access controls on our internal systems,
          and regular security review. No system is perfectly secure, however, and we cannot
          guarantee absolute security of data transmitted over the internet.
        </p>

        {/* 8. Children */}
        <h2 className={SECTION_HEADING}>8. Children's data</h2>
        <p>
          Our website and services are intended for business customers. We do not knowingly
          collect personal data from anyone under 16. If you believe we have inadvertently
          collected data from a child, please contact us and we will delete it.
        </p>

        {/* 9. Changes */}
        <h2 className={SECTION_HEADING}>9. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. The "last updated" date at the top of this
          page will reflect when changes were made. Significant changes will be communicated by an
          appropriate means (eg. a notice on this site).
        </p>

        {/* 10. Contact */}
        <h2 className={SECTION_HEADING}>10. Contact us</h2>
        <p>
          For any privacy-related question or to exercise your data protection rights, please
          contact:
        </p>
        <p>
          <strong>{SITE_META.legalName}</strong>
          <br />
          {SITE_META.address.streetAddress}, {SITE_META.address.addressLocality},{" "}
          {SITE_META.address.addressRegion}
          <br />
          {SITE_META.address.postalCode}, Ireland
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

        <p className="mt-12 text-sm text-muted-foreground/80">
          This is a general privacy policy intended for transparency. It is not legal advice. If
          your business has specific compliance requirements (eg. processing health data, large
          volumes of EU personal data, child-directed services), seek qualified legal counsel.
        </p>
      </article>
    </div>
  );
}
