// Persists Google Ads click IDs (gclid/wbraid/gbraid) from the landing URL
// so the lead form can attach them to enquiries — see src/lib/click-ids.ts.

import { useEffect } from "react";

import { captureClickIds } from "@/lib/click-ids";

export function ClickIdCapture() {
  useEffect(() => {
    captureClickIds();
  }, []);
  return null;
}
