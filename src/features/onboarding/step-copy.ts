import { ONBOARDING_STEP, type OnboardingStepSlug } from '@/domain/onboarding/steps';

export function stepTitle(step: OnboardingStepSlug): string {
  switch (step) {
    case ONBOARDING_STEP.profile:
      return 'Your profile';
    case ONBOARDING_STEP.organisation:
      return 'Organisation details';
    case ONBOARDING_STEP.agreements:
      return 'Terms & data processing';
    case ONBOARDING_STEP.pipeline:
      return 'Sales pipeline';
    case ONBOARDING_STEP.leads:
      return 'Import leads';
    case ONBOARDING_STEP.team:
      return 'Invite your team';
    case ONBOARDING_STEP.tools:
      return 'Integrations';
    case ONBOARDING_STEP.tour:
      return 'Quick tour';
    case ONBOARDING_STEP.complete:
      return 'You’re all set';
    default:
      return 'Setup';
  }
}

export function stepDescription(step: OnboardingStepSlug): string {
  switch (step) {
    case ONBOARDING_STEP.profile:
      return 'Tell us how to show your name across CRM.';
    case ONBOARDING_STEP.organisation:
      return 'Confirm how your organisation appears to sponsors and your team.';
    case ONBOARDING_STEP.agreements:
      return 'Review and accept the agreements required to use CRM.';
    case ONBOARDING_STEP.pipeline:
      return 'Start with our default sponsorship pipeline — you can customise stages later.';
    case ONBOARDING_STEP.leads:
      return 'Optionally add your first leads or skip and do this from the dashboard.';
    case ONBOARDING_STEP.team:
      return 'Invite colleagues now or skip and manage access from Settings.';
    case ONBOARDING_STEP.tools:
      return 'Connect email or calendar tools when you are ready.';
    case ONBOARDING_STEP.tour:
      return 'A short walkthrough of the CRM (optional).';
    case ONBOARDING_STEP.complete:
      return 'Your workspace is ready. Head to the dashboard to start working.';
    default:
      return '';
  }
}
