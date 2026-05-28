// Renders the Odoo Live Chat (im_livechat) script tags.
//
// Reads the Odoo base URL + channel ID from VITE_PUBLIC_ODOO_BASE_URL and
// VITE_PUBLIC_ODOO_LIVECHAT_CHANNEL_ID at build time (Vite inlines them).
// Mount inside <body> just before </body> in __root.tsx — scripts are
// defer'd so they download in parallel with HTML parsing but don't
// execute until after the document is ready, which means zero impact on
// first contentful paint.
//
// Returns null if either env var is missing so a misconfigured build
// fails gracefully (no broken script tags) rather than throwing.

function hostFromUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function OdooLiveChat() {
  const baseUrl = import.meta.env.VITE_PUBLIC_ODOO_BASE_URL;
  const channelId = import.meta.env.VITE_PUBLIC_ODOO_LIVECHAT_CHANNEL_ID;
  if (!baseUrl || !channelId) return null;
  const trimmedBase = String(baseUrl).replace(/\/+$/, "");
  // The custom fusion_ai_livechat module reads a `fusion_domain` query
  // param on the loader and stores it in the chat session for CRM /
  // helpdesk lead attribution. Derived from the site URL so it tracks the
  // real domain (beta now, interactivedisplays.ie at launch).
  const fusionDomain = hostFromUrl(import.meta.env.VITE_PUBLIC_SITE_URL);
  const loaderSrc = fusionDomain
    ? `${trimmedBase}/im_livechat/loader/${channelId}?fusion_domain=${encodeURIComponent(fusionDomain)}`
    : `${trimmedBase}/im_livechat/loader/${channelId}`;
  return (
    <>
      <script defer type="text/javascript" src={loaderSrc} />
      <script
        defer
        type="text/javascript"
        src={`${trimmedBase}/im_livechat/assets_embed.js`}
      />
    </>
  );
}
