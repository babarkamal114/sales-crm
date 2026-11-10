export interface AuthBrandPanelContent {
  badge: string;
  headlineLines: readonly string[];
  mobileHeadline: string;
  description: string;
  benefits: readonly string[];
}

export const crmBrandPanelContent: AuthBrandPanelContent = {
  badge: 'Built for sales teams',
  headlineLines: ['Every lead,', 'one place to work.'],
  mobileHeadline: 'Every lead, one place to work.',
  description:
    'Capture opportunities, keep conversations together, and move deals through your pipeline without losing the thread.',
  benefits: [
    'Pipelines and stages that match how your team sells.',
    'Contacts, companies and tasks in one workspace.',
    'A consistent look and feel your team can rely on.',
  ],
};
