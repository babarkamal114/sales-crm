import 'server-only';

import { ONBOARDING_STEP } from '@/domain/onboarding/steps';
import { provisionDefaultPipeline } from '@/server/services/pipeline/provision-default-pipeline';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { markOnboardingStepComplete } from '@/server/services/onboarding/progress';

export async function confirmPipelineStep(
  tx: DbTransaction,
  session: TenantSession,
): Promise<string> {
  await provisionDefaultPipeline(tx, session);
  return markOnboardingStepComplete(tx, session, ONBOARDING_STEP.pipeline);
}
