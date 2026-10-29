// Google Analytics 4 custom events. `track()` is a no-op when analytics isn't loaded (no
// measurement ID in this build, `astro dev`, or gtag blocked), so callers never need guards.
// Whether GA may store cookies is decided by Consent Mode (ConsentBanner.astro), not here.

type Gtag = (...args: unknown[]) => void;

export function track(name: string, params: Record<string, string | number | boolean> = {}) {
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag === 'function') gtag('event', name, params);
}
