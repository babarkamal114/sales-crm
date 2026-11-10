/** Single professional palette for all onboarding steps. */
export const ONBOARDING_THEME = {
  accent: '#6473e8',
  accentSoft: 'rgba(100, 115, 232, 0.1)',
  glow: 'rgba(100, 115, 232, 0.22)',
} as const;

export function getOnboardingTheme() {
  return ONBOARDING_THEME;
}
