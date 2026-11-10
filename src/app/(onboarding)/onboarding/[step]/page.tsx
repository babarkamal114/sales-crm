import { Sparkles } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { OnboardingAccountMenu } from '@/components/onboarding/onboarding-account-menu';
import { OnboardingStepFooter } from '@/components/onboarding/onboarding-step-footer';
import { OnboardingPageShell } from '@/components/onboarding/onboarding-page-shell';
import {
  ONBOARDING_STEP,
  onboardingStepPath,
  previousOnboardingStep,
  type OnboardingStepSlug,
} from '@/domain/onboarding/steps';
import { AgreementsStepForm } from '@/features/onboarding/agreements-step-form';
import { CompleteStepVisual } from '@/features/onboarding/complete-step-visual';
import { OnboardingStepActions } from '@/features/onboarding/onboarding-step-actions';
import { OrganisationStepForm } from '@/features/onboarding/organisation-step-form';
import { PipelineStagePreview } from '@/features/onboarding/pipeline-stage-preview';
import { LeadsStepForm } from '@/features/onboarding/leads-step-form';
import { ProfileStepForm } from '@/features/onboarding/profile-step-form';
import { TeamInviteForm } from '@/features/onboarding/team-invite-form';
import { ToolsStepPanel } from '@/features/onboarding/tools-step-panel';
import { PlaceholderStepCard } from '@/features/onboarding/placeholder-step-card';
import { getOnboardingStepDefinition } from '@/features/onboarding/step-content';
import { getActiveSession } from '@/server/auth/require-session';
import { getProfileStepInitialValues } from '@/server/actions/onboarding';
import { loadOnboardingPageModel } from '@/server/onboarding/load-onboarding-page';
import { loadToolsStepIntegrations } from '@/server/onboarding/load-tools-step';

const STEP_SLUGS = new Set<string>(Object.values(ONBOARDING_STEP));

type PageProps = {
  params: Promise<{ step: string }>;
};

export default async function OnboardingStepPage({ params }: PageProps) {
  const { step: stepParam } = await params;
  if (!STEP_SLUGS.has(stepParam)) {
    notFound();
  }
  const step = stepParam as OnboardingStepSlug;

  const session = await getActiveSession();
  if (!session) {
    redirect('/sign-in');
  }

  const loaded = await loadOnboardingPageModel(session, step);
  if (!loaded.ok) {
    redirect(loaded.redirectTo);
  }
  const { model } = loaded;
  const previousStep = previousOnboardingStep({
    current: step,
    path: model.path,
  });
  const backHref = previousStep ? onboardingStepPath(previousStep) : null;
  const backLabel = previousStep
    ? `Back to ${getOnboardingStepDefinition(previousStep).label}`
    : 'Back';

  const profileInitial =
    step === ONBOARDING_STEP.profile
      ? await getProfileStepInitialValues()
      : null;

  const toolsIntegrations =
    step === ONBOARDING_STEP.tools
      ? await loadToolsStepIntegrations(session)
      : null;

  let body: React.ReactNode = null;
  let footer: React.ReactNode = undefined;

  switch (step) {
    case ONBOARDING_STEP.profile:
      body = profileInitial ? (
        <ProfileStepForm
          initial={profileInitial}
          backHref={backHref}
          backLabel={backLabel}
        />
      ) : null;
      break;
    case ONBOARDING_STEP.organisation:
      body = (
        <OrganisationStepForm
          initial={model.settings}
          backHref={backHref}
          backLabel={backLabel}
        />
      );
      break;
    case ONBOARDING_STEP.agreements:
      body = <AgreementsStepForm backHref={backHref} backLabel={backLabel} />;
      break;
    case ONBOARDING_STEP.pipeline:
      body = <PipelineStagePreview />;
      footer = (
        <OnboardingStepFooter backHref={backHref} backLabel={backLabel} embedded>
          <OnboardingStepActions primaryLabel="Use default pipeline" action={{ kind: 'pipeline' }} />
        </OnboardingStepFooter>
      );
      break;
    case ONBOARDING_STEP.leads:
      body = <LeadsStepForm backHref={backHref} backLabel={backLabel} />;
      break;
    case ONBOARDING_STEP.team:
      body = <TeamInviteForm backHref={backHref} backLabel={backLabel} />;
      break;
    case ONBOARDING_STEP.tools:
      body = toolsIntegrations ? (
        <ToolsStepPanel
          integrations={toolsIntegrations}
          backHref={backHref}
          backLabel={backLabel}
        />
      ) : null;
      break;
    case ONBOARDING_STEP.complete:
      body = <CompleteStepVisual />;
      footer = (
        <OnboardingStepFooter backHref={backHref} backLabel={backLabel} embedded>
          <OnboardingStepActions primaryLabel="Go to dashboard" action={{ kind: 'finish' }} />
        </OnboardingStepFooter>
      );
      break;
    case ONBOARDING_STEP.tour:
      body = (
        <PlaceholderStepCard
          icon={Sparkles}
          title="Product tour"
          body="Open Getting started in the sidebar for the setup checklist and inline configuration."
        />
      );
      footer = (
        <OnboardingStepFooter backHref={backHref} backLabel={backLabel} embedded>
          <OnboardingStepActions
            primaryLabel="Skip tour"
            action={{ kind: 'skip', step: ONBOARDING_STEP.tour }}
          />
        </OnboardingStepFooter>
      );
      break;
    default:
      notFound();
  }

  const showProgressTrack = model.path === 'A' && model.role === 'admin';

  return (
    <OnboardingPageShell
      step={step}
      userName={session.fullName}
      organisationName={model.organisationName}
      stepIndex={model.stepIndex}
      stepTotal={model.stepTotal}
      completedSteps={model.completedSteps}
      showStepper={showProgressTrack}
      headerActions={
        <OnboardingAccountMenu email={session.email} fullName={session.fullName} />
      }
      footer={footer}
    >
      {body}
    </OnboardingPageShell>
  );
}
