// Legacy URL → canonical 301 redirect map.
//
// The WordPress site at interactivedisplays.ie historically exposed every
// page under TWO URL shapes:
//   1. The pretty-permalink form, eg. /product/android-a-board/
//   2. The post-ID form, eg. /?p=877
//
// Rank Math / Yoast on the legacy site issued canonical tags pointing
// at form 1, but Google's index has been split — some external sites
// linked using form 2, some pages have GSC impressions under form 2,
// and a non-trivial number of internal Elementor menu links use form 2.
//
// At cutover (when SITE_NOINDEX flips off), Google will re-crawl. Without
// this map, /?p=877 returns the wp-mirror's homepage HTML (the mirror
// resolver doesn't understand query params) — same content as `/`,
// different URL, classic duplicate-content penalty. With this map, every
// legacy form 2 URL issues a permanent 301 to its form 1 target.
//
// Built by reading the canonical tag out of each wp-mirror/index.html@p=N.html
// file (the wget snapshot preserved the original Rank Math output, so the
// mapping is authoritative). Audit date: 2026-05-29.

export type RedirectRule = {
  // Either an exact pathname (with or without query) OR a regex tested
  // against the full pathname+query string.
  match: { pathname: string; query?: string } | { regex: RegExp };
  // Where to send the visitor. Relative paths are resolved against the
  // current request's origin so this works on beta and on production
  // without per-environment edits.
  target: string;
  // 301 = permanent (default), 302 = temporary, 307/308 = method-preserving.
  status?: 301 | 302 | 307 | 308;
};

// Auto-extracted from wp-mirror/index.html@p=<id>.html canonical tags.
// 67 entries. p=924/948/957/970/988/995/999 produced no canonical
// (orphaned drafts? deleted posts?) and are intentionally omitted —
// they'll 404 cleanly rather than 301 to a wrong target.
const POST_ID_MAP: Record<string, string> = {
  "117":  "/product/pcap-touch-screen/",
  "368":  "/contact-us/",
  "589":  "/product/pcap-kiosk-screen/",
  "638":  "/how-irish-retailers-are-boosting-sales-with-digital-signage/",
  "724":  "/supply-installation/",
  "791":  "/product/slim-freestanding-totem/",
  "805":  "/product/pos-touch-screen/",
  "818":  "/product/mirror-touch-screen/",
  "825":  "/product/self-service-touchscreen-kiosk/",
  "861":  "/product/freestanding-outdoor-display/",
  "869":  "/product/mounted-outdoor-display/",
  "877":  "/product/android-a-board/",
  "886":  "/product/outdoor-self-service-kiosk/",
  "890":  "/product/ultra-high-bright-display/",
  "898":  "/product/ultra-high-bright-display-tni/",
  "905":  "/product/hanging-dual-sided-display/",
  "914":  "/product/professional-monitor/",
  "922":  "/product/large-format-signage/",
  "930":  "/product/lcd-video-wall/",
  "937":  "/product/android-network-display/",
  "945":  "/product/dual-sided-standing-totem/",
  "949":  "/product/slim-standing-totem/",
  "956":  "/product/network-menu-boards/",
  "1002": "/product/pos-advertising-display/",
  "1005": "/product/outdoor-self-service-kiosk-2/",
  "1022": "/product/self-service-kiosk/",
  "1023": "/product/drive-thru-screen/",
  "1029": "/product/slim-self-service-kiosk/",
  "1047": "/product/vestel-stm-series/",
  "1051": "/product/crystal-flex-led/",
  "1056": "/product/indoor-led-video-wall/",
  "1063": "/product/outdoor-led-video-wall/",
  "1071": "/product/transparent-led-display/",
  "1076": "/product/ar-mirror/",
  "1082": "/product/promethean-activpanel/",
  "1119": "/product/new-ifx-series/",
  "1248": "/training-support/",
  "1261": "/content-management-creation/",
  "1286": "/queue-management-system/",
  "1316": "/digital-ticket/",
  "1335": "/online-appointment/",
  "1352": "/customer-counting-solution/",
  "1361": "/satisfaction-survey/",
  "1372": "/corporate-reception-solution/",
  "1428": "/choosing-the-right-digital-signage/",
  "1448": "/how-digital-screen-displays-can-increase-footfall-and-sales/",
  "1479": "/digital-signage-in-modern-retail/",
  "1498": "/interactive-whiteboards-in-schools/",
  "1507": "/vending-machines/",
  "1598": "/product/digital-ticketing-system/",
  "1611": "/outdoor-digital-signage-in-ireland/",
  "1648": "/food-business-digital-menu-board/",
  "1762": "/product/led-box-signage/",
  "1821": "/careers/av-business-development/",
  "1912": "/careers/technical-support-specialist/",
  "1915": "/careers/stores-coordinator/",
  "1918": "/careers/account-manager/",
  "1923": "/careers/installation-and-service-technician/",
  "1926": "/careers/",
};

export const REDIRECTS: RedirectRule[] = [
  // Generic WP shapes that always redirect home for unmapped IDs.
  // (We handle the mapped IDs explicitly via resolveRedirect below — this
  // entry is just documentation of what's intentionally NOT here.)
];

/**
 * Resolve a request to a redirect target, or null if no redirect applies.
 * Pure function — depends only on its argument, safe to call from anywhere
 * in the request pipeline.
 *
 * @param pathname  Eg. "/"  (the request's url.pathname)
 * @param search    Eg. "?p=877"  (the request's url.search including leading ?)
 */
export function resolveRedirect(
  pathname: string,
  search: string,
): { target: string; status: 301 | 302 | 307 | 308 } | null {
  // 1. WordPress post-ID URLs: /?p=N or /index.php?p=N
  if (pathname === "/" || pathname === "/index.php") {
    const params = new URLSearchParams(search);
    const postId = params.get("p");
    if (postId && POST_ID_MAP[postId]) {
      return { target: POST_ID_MAP[postId], status: 301 };
    }
    // /?page_id=N — equivalent shape for static pages
    const pageId = params.get("page_id");
    if (pageId && POST_ID_MAP[pageId]) {
      return { target: POST_ID_MAP[pageId], status: 301 };
    }
  }

  // 2. wget-style URLs that slipped through (eg. external indexers caching the mirror filenames)
  //    /index.html@p=N.html  →  POST_ID_MAP[N]
  const wgetMatch = pathname.match(/^\/index\.html@p=(\d+)\.html$/);
  if (wgetMatch && POST_ID_MAP[wgetMatch[1]]) {
    return { target: POST_ID_MAP[wgetMatch[1]], status: 301 };
  }

  // 3. Custom rules from REDIRECTS (currently empty; add legacy /old-path → /new-path here)
  for (const rule of REDIRECTS) {
    if ("regex" in rule.match) {
      if (rule.match.regex.test(pathname + search)) {
        return { target: rule.target, status: rule.status ?? 301 };
      }
    } else {
      const pathMatches = rule.match.pathname === pathname;
      const queryMatches =
        rule.match.query === undefined || rule.match.query === search;
      if (pathMatches && queryMatches) {
        return { target: rule.target, status: rule.status ?? 301 };
      }
    }
  }

  return null;
}
