import { defineConfig } from '@neon/config/v1';

/**
 * Sponsoro CRM — Neon branch policy (Postgres only).
 *
 * Custom auth lives in the Next.js app; we do not enable Neon Auth here.
 * After linking and deploy:
 *   1. Connect to database `sponsoro-crm` (not compliance `neondb`)
 *   2. Create `crm_app` / `crm_migrator` (docs/database-setup.md)
 *   3. `DATABASE_URL` / `DATABASE_MIGRATION_URL` → …/sponsoro-crm?sslmode=require
 *   4. `pnpm db:migrate`
 */
export default defineConfig({
  auth: false,

  branch: (branch) => {
    const isProduction =
      branch.name === 'production' || branch.isDefault === true;

    if (isProduction) {
      return {
        protected: true,
        postgres: {
          computeSettings: {
            autoscalingLimitMinCu: 0.5,
            autoscalingLimitMaxCu: 2,
          },
        },
      };
    }

    if (!branch.exists) {
      return {
        ttl: '14d',
        postgres: {
          computeSettings: {
            autoscalingLimitMinCu: 0.25,
            autoscalingLimitMaxCu: 0.25,
            suspendTimeout: '5m',
          },
        },
      };
    }

    return {};
  },
});
