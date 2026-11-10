import { z } from 'zod';

export const dashboardPeriodSchema = z.enum([
  'today',
  'week',
  'month',
  'quarter',
]);

export const dashboardScopeSchema = z.enum(['mine', 'team']);

export const dashboardFiltersSchema = z.object({
  pipeline: z.union([z.literal('all'), z.uuid()]),
  period: dashboardPeriodSchema,
  scope: dashboardScopeSchema,
  viewAsUser: z.uuid().optional(),
});

export type DashboardFiltersInput = z.infer<typeof dashboardFiltersSchema>;

export const dashboardWidgetSchema = z.enum([
  'kpis',
  'pipeline',
  'tasks',
  'conversations',
  'sources',
  'payments',
  'activity',
  'team',
  'nudge',
  'next-call',
]);

export type DashboardWidgetName = z.infer<typeof dashboardWidgetSchema>;

export const dashboardScenarioSchema = z.enum([
  'populated',
  'empty',
  'new-org',
  'member',
  'error-kpis',
  'slow-pipeline',
  'stripe-disconnected',
  'module-unavailable',
]);

export type DashboardScenario = z.infer<typeof dashboardScenarioSchema>;
