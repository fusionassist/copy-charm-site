import { createFileRoute } from "@tanstack/react-router";

import { SITE_META } from "@/lib/site-meta";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service | Interactive Displays Ireland" },
      {
        name: "description",
        content:
          "Terms of service governing your use of Interactive Displays Ireland's website, contact channels, and online services.",
      },
      { property: "og:title", content: "Terms of Service — Interactive Displays Ireland" },
      {
        property: "og:description",
        content:
          "Terms governing your use of the IDI website, contact channels, and online services. Governed by Irish law.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      {
        rel: "canonical",
        href: `${import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://interactivedisplays.ie"}/terms`,
      },
    ],
  }),
});

const SECTION_HEADING = "mt-12 mb-3 text-xl font-semibold tracking-tight text-foreground first:mt-0";
const PROSE = "max-w-3xl space-y-4 text-base leading-relaxed text-muted-foreground";

function TermsPage() {
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
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Last updated: <time dateTime={today.toISOString().split("T")[0]}>{lastUpdated}</time>
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          These Terms of Service ("Terms") govern your use of{" "}
          <a
            href={SITE_META.url}
            className="text-primary underline-offset-4 hover:underline"
          >
            interactivedisplays.ie
          </a>{" "}
          and any related online services provided by Interactive Displays Ireland ("IDI", "we",
          "us", "our"). By accessing or using the website, you agree to be bound by these Terms.
          If you do not agree, please do not use the website.
        </p>
      </header>

      <article className={PROSE}>
        {/* 1. About us */}
        <h2 className={SECTION_HEADING}>1. About us</h2>
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

        {/* 2. The website and what it does */}
        <h2 className={SECTION_HEADING}>2. The website and what it does</h2>
        <p>
          Our website provides information about our products, services, case studies, and company.
          It is a brochure-style site for business customers. We do not currently sell products or
          take payments directly through the website. To purchase or commission products and
          services, you must contact us by phone, email, the contact form, or our live chat to
          request a quote. Any resulting commercial relationship will be governed by a separate
          sales contract or order confirmation between us and you.
        </p>
        <p>
          The website may include third-party links, embedded video, or content. We are not
          responsible for the content, accuracy, or policies of third-party sites.
        </p>

        {/* 3. Acceptable use */}
        <h2 className={SECTION_HEADING}>3. Acceptable use</h2>
        <p>You agree that you will not:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Use the website for any unlawful purpose or in a way that infringes the rights of any other person.</li>
          <li>Attempt to gain unauthorised access to any part of the website, server, or network.</li>
          <li>Use automated tools (bots, scrapers) to access the site in a way that places unreasonable load on our infrastructure or circumvents access controls.</li>
          <li>Submit false information through our contact form or chat.</li>
          <li>Upload, transmit, or distribute material that contains viruses, malware, or other harmful code.</li>
          <li>Use the website to harass, defame, or impersonate any person.</li>
          <li>Copy, modify, distribute, or republish website content beyond what is reasonably required for normal use, without our prior written permission.</li>
        </ul>
        <p>
          We reserve the right to block, suspend, or restrict access to the website if we
          reasonably believe these Terms are being breached.
        </p>

        {/* 4. Quotes and orders */}
        <h2 className={SECTION_HEADING}>4. Quotes, orders, and contracts</h2>
        <p>
          Any quote we provide in response to your enquiry is an invitation to treat, not a binding
          offer. A contract for the supply of products or services only comes into existence when
          we issue a signed order confirmation, accept your purchase order in writing, or otherwise
          confirm acceptance in writing.
        </p>
        <p>
          Prices, lead times, and specifications shown on the website or in marketing material are
          indicative and may change. The terms of any specific sale will be set out in the written
          order confirmation or sales contract and supersede anything stated on the website.
        </p>

        {/* 5. Intellectual property */}
        <h2 className={SECTION_HEADING}>5. Intellectual property</h2>
        <p>
          The website, including all text, graphics, logos, photographs, video, design, and
          source code, is owned by or licensed to IDI and is protected by copyright, trademark, and
          other intellectual property laws.
        </p>
        <p>
          You may view, download, and print pages from the website for your own personal or
          internal business reference. You may not otherwise reproduce, modify, distribute, or
          commercially exploit the website's content without our prior written consent.
        </p>
        <p>
          "Interactive Displays Ireland", "IDI", "Moytronix", and our logos are our trademarks.
          Other brand names mentioned on the site (Promethean, Vestel, etc.) are the property of
          their respective owners and used here for descriptive and informational purposes only.
        </p>

        {/* 6. Availability and changes */}
        <h2 className={SECTION_HEADING}>6. Availability and changes</h2>
        <p>
          We aim to keep the website available, accurate, and up to date but we do not guarantee
          uninterrupted access. We may suspend, restrict, or modify any part of the website at any
          time without notice. We may also change these Terms from time to time; the "last updated"
          date at the top of this page will reflect when changes were made. Continued use of the
          website after changes constitutes acceptance of the revised Terms.
        </p>

        {/* 7. Disclaimers */}
        <h2 className={SECTION_HEADING}>7. Disclaimers</h2>
        <p>
          The website content is provided "as is" for general information. While we take
          reasonable care to ensure information is accurate, we make no warranties or
          representations, express or implied, that the content is complete, current, error-free,
          or fit for any particular purpose.
        </p>
        <p>
          Nothing on the website constitutes advice or recommendation that should be relied upon
          for making technical, commercial, or financial decisions. For specific advice about a
          project, contact us to discuss the requirements directly.
        </p>

        {/* 8. Liability */}
        <h2 className={SECTION_HEADING}>8. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by Irish law:
        </p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            We are not liable for any indirect, incidental, consequential, special, or punitive
            damages arising out of your use of the website, including but not limited to lost
            profits, lost data, business interruption, or loss of goodwill.
          </li>
          <li>
            Our aggregate liability for any direct loss arising from your use of the website is
            limited to one hundred euros (€100).
          </li>
          <li>
            Nothing in these Terms excludes or limits liability for fraud, fraudulent
            misrepresentation, death or personal injury caused by our negligence, or any other
            liability that cannot lawfully be excluded.
          </li>
          <li>
            These limits do not apply to liabilities arising under a separate signed sales
            contract for the supply of products or services — those liabilities are governed by
            the sales contract itself.
          </li>
        </ul>

        {/* 9. Indemnity */}
        <h2 className={SECTION_HEADING}>9. Indemnity</h2>
        <p>
          You agree to indemnify and hold IDI harmless from any claim, demand, loss, or expense
          (including reasonable legal fees) arising from your breach of these Terms or your
          violation of any law or the rights of a third party in connection with your use of the
          website.
        </p>

        {/* 10. Governing law and jurisdiction */}
        <h2 className={SECTION_HEADING}>10. Governing law and jurisdiction</h2>
        <p>
          These Terms and any dispute arising from your use of the website are governed by the
          laws of Ireland. You and we agree that the courts of Ireland have exclusive jurisdiction
          to resolve any dispute, subject to any non-waivable rights you may have as a consumer
          under your local law.
        </p>

        {/* 11. Severability */}
        <h2 className={SECTION_HEADING}>11. Severability</h2>
        <p>
          If any provision of these Terms is found by a competent court to be invalid or
          unenforceable, the remaining provisions will continue in full force and effect.
        </p>

        {/* 12. Contact */}
        <h2 className={SECTION_HEADING}>12. Contact</h2>
        <p>
          For questions about these Terms or to report a concern, contact us at:
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
          This is a general website terms of use document intended for transparency. It is not
          legal advice and does not replace a properly tailored sales contract for specific
          product or service supply. If your business needs project-specific contract terms
          (warranties, SLAs, liability allocation, payment terms), seek qualified legal counsel.
        </p>
      </article>
    </div>
  );
}
