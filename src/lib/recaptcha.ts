// Google reCAPTCHA v3 (invisible, score-based) — client-side token fetch.
//
// Inert when VITE_PUBLIC_RECAPTCHA_SITE_KEY is unset: getRecaptchaToken()
// resolves to undefined and the server (which is gated on its own
// RECAPTCHA_SECRET_KEY) accepts the submission as before. The api.js
// script is loaded lazily on first use so visitors who never touch a form
// don't pay for it.
//
// Fail-open by design: if Google's script can't load (offline, blocked),
// we submit without a token and let the server decide. The server fails
// open only when Google itself is unreachable — a missing token with a
// configured secret is rejected there.

const SITE_KEY = import.meta.env.VITE_PUBLIC_RECAPTCHA_SITE_KEY as string | undefined;

type Grecaptcha = {
  ready(cb: () => void): void;
  execute(siteKey: string, opts: { action: string }): Promise<string>;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

let loadPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("reCAPTCHA script failed to load"));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

export async function getRecaptchaToken(action: string): Promise<string | undefined> {
  if (!SITE_KEY || typeof window === "undefined") return undefined;
  try {
    await loadScript();
    const grecaptcha = window.grecaptcha;
    if (!grecaptcha) return undefined;
    await new Promise<void>((resolve) => grecaptcha.ready(resolve));
    return await grecaptcha.execute(SITE_KEY, { action });
  } catch {
    return undefined;
  }
}
