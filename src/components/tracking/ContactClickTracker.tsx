// Global click delegation — fires conversion events when any tel: or
// mailto: link is clicked anywhere on the page. Saves us wiring an
// onClick per link across Nav, Footer, content body, MDX, etc.
//
// Effectively no-op until any tracker env var is set (track() guards).

import { useEffect } from "react";

import { track } from "@/lib/track";

export function ContactClickTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = (e.target as HTMLElement | null)?.closest?.("a");
      if (!target) return;
      const href = target.getAttribute("href") ?? "";
      if (href.startsWith("tel:")) {
        track({ type: "phone_click", phone: href.slice(4) });
      } else if (href.startsWith("mailto:")) {
        const email = href.slice(7).split("?")[0];
        track({ type: "email_click", email });
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
