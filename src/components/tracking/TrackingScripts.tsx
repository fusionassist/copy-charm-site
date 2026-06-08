// Tracking script injection for TanStack-rendered routes.
//
// Renders the right <script> tags based on which env vars are populated:
//   VITE_PUBLIC_GTM_ID       — Google Tag Manager container (one wrapper for all tags)
//   VITE_PUBLIC_GA4_ID       — Google Analytics 4 (direct gtag.js)
//   VITE_PUBLIC_GOOGLE_ADS_ID — Google Ads conversion tracking (direct gtag.js)
//   VITE_PUBLIC_META_PIXEL_ID — Meta Pixel
//   VITE_PUBLIC_LINKEDIN_PARTNER_ID — LinkedIn Insight Tag
//
// All inert until the corresponding env var is set. Setting any single one
// activates only that tracker — they're independent.
//
// Conversion / event hooks live in src/lib/track.ts and dispatch to
// whatever tracker is configured. Place this component in __root.tsx
// AFTER children so trackers don't block first paint.

// TypeScript globals for the trackers we install.
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _linkedin_partner_id?: string;
    _linkedin_data_partner_ids?: string[];
  }
}

export function TrackingScripts() {
  const gtmId = import.meta.env.VITE_PUBLIC_GTM_ID;
  const ga4Id = import.meta.env.VITE_PUBLIC_GA4_ID;
  const adsId = import.meta.env.VITE_PUBLIC_GOOGLE_ADS_ID;
  const metaPixelId = import.meta.env.VITE_PUBLIC_META_PIXEL_ID;
  const linkedInId = import.meta.env.VITE_PUBLIC_LINKEDIN_PARTNER_ID;

  // Build the gtag config block. If both GA4 and Ads are configured we
  // load one gtag.js for whichever is set first and call config() for each.
  const gtagPrimaryId = ga4Id || adsId;
  const gtagConfigs: string[] = [];
  if (ga4Id) gtagConfigs.push(`gtag('config', '${ga4Id}');`);
  if (adsId) gtagConfigs.push(`gtag('config', '${adsId}');`);

  return (
    <>
      {gtmId && (
        <>
          {/* GTM head snippet */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`,
            }}
          />
          {/* GTM noscript fallback */}
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        </>
      )}

      {gtagPrimaryId && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${gtagPrimaryId}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${gtagConfigs.join("\n")}`,
            }}
          />
        </>
      )}

      {metaPixelId && (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${metaPixelId}');
fbq('track', 'PageView');`,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {linkedInId && (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html: `_linkedin_partner_id = "${linkedInId}";
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};
window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];
var b=document.createElement("script");b.type="text/javascript";b.async=true;
b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";
s.parentNode.insertBefore(b,s);})(window.lintrk);`,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://px.ads.linkedin.com/collect/?pid=${linkedInId}&fmt=gif`}
            />
          </noscript>
        </>
      )}
    </>
  );
}
