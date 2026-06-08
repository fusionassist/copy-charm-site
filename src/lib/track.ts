// Lightweight tracking event dispatcher.
//
// Call from anywhere on the client (eg. form submit success, link click)
// and it fans out to whatever trackers are configured via window-globals.
// Each tracker call is wrapped in a try-catch so a single broken tracker
// can't break the rest.
//
// Server renders this code path too (TanStack SSR), so we guard against
// `window` being undefined.

type TrackingEvent =
  | { type: "lead_form_submit"; value?: number; currency?: string }
  | { type: "phone_click"; phone: string }
  | { type: "email_click"; email: string }
  | { type: "chat_opened" }
  | { type: "custom"; name: string; params?: Record<string, unknown> };

export function track(event: TrackingEvent): void {
  if (typeof window === "undefined") return;

  // Google Ads conversion tracking. The actual conversion ID + label
  // comes from VITE_PUBLIC_GOOGLE_ADS_ID + a per-event label that gets
  // wired up here when conversion actions are created in Google Ads UI.
  // Form: send_to: 'AW-123456789/AbCdEfG1HiJ_K2L3'
  // For now we emit a generic event the dataLayer can pick up.
  try {
    const w = window;
    const eventName = eventToGAName(event);
    if (typeof w.gtag === "function" && eventName) {
      const params = eventToParams(event);
      w.gtag("event", eventName, params);
    }
  } catch (err) {
    console.warn("[track] gtag emit failed:", err);
  }

  // GTM dataLayer push — bypasses gtag.js for users on GTM-only setups
  try {
    const w = window;
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event: eventToGAName(event), ...eventToParams(event) });
    }
  } catch (err) {
    console.warn("[track] dataLayer push failed:", err);
  }

  // Meta Pixel
  try {
    const w = window;
    if (typeof w.fbq === "function") {
      const fbEvent = eventToMetaName(event);
      if (fbEvent) {
        w.fbq("track", fbEvent, eventToParams(event));
      }
    }
  } catch (err) {
    console.warn("[track] fbq emit failed:", err);
  }
}

// Map our internal event shape to GA4's recommended event names.
// https://developers.google.com/analytics/devguides/collection/ga4/reference/events
function eventToGAName(event: TrackingEvent): string {
  switch (event.type) {
    case "lead_form_submit": return "generate_lead";
    case "phone_click":      return "phone_call";
    case "email_click":      return "email_click";
    case "chat_opened":      return "chat_open";
    case "custom":           return event.name;
  }
}

// Map to Meta Pixel standard events.
// https://www.facebook.com/business/help/402791146561655
function eventToMetaName(event: TrackingEvent): string | null {
  switch (event.type) {
    case "lead_form_submit": return "Lead";
    case "phone_click":      return "Contact";
    case "email_click":      return "Contact";
    case "chat_opened":      return "Contact";
    case "custom":           return null;
  }
}

function eventToParams(event: TrackingEvent): Record<string, unknown> {
  switch (event.type) {
    case "lead_form_submit":
      return {
        ...(event.value !== undefined ? { value: event.value } : {}),
        ...(event.currency ? { currency: event.currency } : {}),
      };
    case "phone_click":
      return { phone: event.phone };
    case "email_click":
      return { email: event.email };
    case "chat_opened":
      return {};
    case "custom":
      return event.params ?? {};
  }
}
