import 'server-only';

export {
  ENTRY_ROUTES,
  ONBOARDING_ALLOWLIST_PREFIXES,
  canAccessOnboardingStep,
  isOnboardingAllowlistedPath,
  redirectForIncompleteOnboarding,
  resolveEntry,
} from '@/domain/onboarding/resolve-entry';

export type { EntryResolution } from '@/domain/onboarding/entry-types';
