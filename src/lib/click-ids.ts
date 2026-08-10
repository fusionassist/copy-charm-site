// Google Ads click-ID capture (gclid / wbraid / gbraid).
//
// Purpose: offline conversion tracking. When a paid click lands anywhere on
// the site, the click ID from the URL is persisted for ~90 days (Google's
// click-to-conversion attribution window). The lead form sends it along with
// the enquiry so it reaches the sales@ inbox, and closed sales can later be
// uploaded to Google Ads (ConversionUploadService) with their real value.
//
// Storage: localStorage (with timestamp for expiry) + cookie fallback.
// No consent-mode interaction — same first-party storage footprint as the
// existing trackers.

const CLICK_ID_KEYS = ["gclid", "wbraid", "gbraid"] as const;

export type ClickIds = Partial<Record<(typeof CLICK_ID_KEYS)[number], string>>;

const TTL_SECONDS = 90 * 24 * 60 * 60; // ~90 days
const PREFIX = "fusion_";

// Click IDs are URL-safe token strings; anything else is noise or abuse.
const VALID = /^[A-Za-z0-9_-]{1,200}$/;

function readCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** Store any click IDs present in the current URL. Call once on page load. */
export function captureClickIds(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    for (const key of CLICK_ID_KEYS) {
      const value = params.get(key);
      if (!value || !VALID.test(value)) continue;
      try {
        window.localStorage.setItem(
          PREFIX + key,
          JSON.stringify({ v: value, t: Date.now() }),
        );
      } catch {
        // localStorage full/blocked — cookie below still covers us.
      }
      document.cookie = `${PREFIX}${key}=${encodeURIComponent(value)}; max-age=${TTL_SECONDS}; path=/; SameSite=Lax`;
    }
  } catch {
    // Never let tracking break the page.
  }
}

/** Read stored (non-expired) click IDs. Safe to call anywhere client-side. */
export function getClickIds(): ClickIds {
  const out: ClickIds = {};
  if (typeof window === "undefined") return out;
  // A fresh landing may not have run capture yet (or storage was cleared
  // mid-session) — re-capture from the URL first so submit-time reads win.
  captureClickIds();
  for (const key of CLICK_ID_KEYS) {
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (raw) {
        const rec = JSON.parse(raw) as { v?: string; t?: number };
        if (
          rec?.v &&
          VALID.test(rec.v) &&
          typeof rec.t === "number" &&
          Date.now() - rec.t < TTL_SECONDS * 1000
        ) {
          out[key] = rec.v;
          continue;
        }
        window.localStorage.removeItem(PREFIX + key);
      }
    } catch {
      // fall through to cookie
    }
    try {
      const fromCookie = readCookie(PREFIX + key);
      if (fromCookie && VALID.test(fromCookie)) out[key] = fromCookie;
    } catch {
      // give up on this key
    }
  }
  return out;
}
