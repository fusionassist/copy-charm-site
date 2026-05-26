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

export function OdooLiveChat() {
  const baseUrl = import.meta.env.VITE_PUBLIC_ODOO_BASE_URL;
  const channelId = import.meta.env.VITE_PUBLIC_ODOO_LIVECHAT_CHANNEL_ID;
  if (!baseUrl || !channelId) return null;
  const trimmedBase = String(baseUrl).replace(/\/+$/, "");
  return (
    <>
      <script
        defer
        type="text/javascript"
        src={`${trimmedBase}/im_livechat/loader/${channelId}`}
      />
      <script
        defer
        type="text/javascript"
        src={`${trimmedBase}/im_livechat/assets_embed.js`}
      />
    </>
  );
}
