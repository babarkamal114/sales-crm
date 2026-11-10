/** Client-safe Turnstile config (NEXT_PUBLIC_* only). */

export type TurnstileAuthAction = 'signin' | 'signup';

export function getTurnstileSiteKey(): string | null {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return siteKey && siteKey.length > 0 ? siteKey : null;
}

export function isTurnstileConfiguredOnClient(): boolean {
  return getTurnstileSiteKey() !== null;
}
