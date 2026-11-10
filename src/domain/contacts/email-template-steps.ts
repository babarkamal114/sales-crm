/** Workflow step keys for contact outreach email templates (one template per step per org). */
export type EmailTemplateStepKey = (typeof EMAIL_TEMPLATE_STEP_DEFS)[number]['key'];

export const EMAIL_TEMPLATE_STEP_DEFS = [
  {
    key: 'lead_intro',
    label: 'Lead · First introduction',
    lifecycle: 'lead' as const,
    sortOrder: 10,
    defaultSubject: 'Quick intro from {{org_name}}',
    defaultBodyHtml: `<p>Hi {{first_name}},</p>
<p>I'm {{sender_name}} from {{org_name}}. I wanted to reach out about sponsorship opportunities that might fit {{company}}.</p>
<p>Would you have 15 minutes this week for a quick call?</p>
<p>Best,<br>{{sender_name}}</p>`,
  },
  {
    key: 'lead_follow_up',
    label: 'Lead · Follow-up',
    lifecycle: 'lead' as const,
    sortOrder: 20,
    defaultSubject: 'Following up — {{org_name}}',
    defaultBodyHtml: `<p>Hi {{first_name}},</p>
<p>Just checking in on my note from last week. Happy to share a one-pager or jump on a short call if helpful.</p>
<p>Thanks,<br>{{sender_name}}</p>`,
  },
  {
    key: 'lead_meeting',
    label: 'Lead · Meeting request',
    lifecycle: 'lead' as const,
    sortOrder: 30,
    defaultSubject: 'Meeting request — {{org_name}}',
    defaultBodyHtml: `<p>Hi {{first_name}},</p>
<p>I'd love to walk through how we partner with organisations like {{company}}. Are you free {{next_week}}?</p>
<p>Best,<br>{{sender_name}}</p>`,
  },
  {
    key: 'customer_welcome',
    label: 'Customer · Welcome',
    lifecycle: 'customer' as const,
    sortOrder: 40,
    defaultSubject: 'Welcome aboard — {{org_name}}',
    defaultBodyHtml: `<p>Hi {{first_name}},</p>
<p>Thank you for partnering with us. Your main point of contact is {{sender_name}} — reply anytime if you need anything.</p>
<p>Warm regards,<br>{{sender_name}}</p>`,
  },
  {
    key: 'customer_check_in',
    label: 'Customer · Check-in',
    lifecycle: 'customer' as const,
    sortOrder: 50,
    defaultSubject: 'Checking in — {{org_name}}',
    defaultBodyHtml: `<p>Hi {{first_name}},</p>
<p>Hope things are going well at {{company}}. Wanted to see how the partnership is landing and if there's anything we should adjust.</p>
<p>Best,<br>{{sender_name}}</p>`,
  },
  {
    key: 'former_win_back',
    label: 'Former customer · Win back',
    lifecycle: 'former_customer' as const,
    sortOrder: 60,
    defaultSubject: 'Reconnecting — {{org_name}}',
    defaultBodyHtml: `<p>Hi {{first_name}},</p>
<p>It's been a while since we worked together. We've refreshed our packages and I'd love to share what's new if you're open to it.</p>
<p>Best,<br>{{sender_name}}</p>`,
  },
  {
    key: 'not_a_fit_close',
    label: 'Not a fit · Polite close',
    lifecycle: 'not_a_fit' as const,
    sortOrder: 70,
    defaultSubject: 'Thanks for your time',
    defaultBodyHtml: `<p>Hi {{first_name}},</p>
<p>Thanks for the conversation. We'll step back for now — feel free to reach out if timing changes.</p>
<p>All the best,<br>{{sender_name}}</p>`,
  },
  {
    key: 'proposal_sent',
    label: 'Proposal · Sent package',
    lifecycle: 'lead' as const,
    sortOrder: 35,
    defaultSubject: 'Proposal from {{org_name}}',
    defaultBodyHtml: `<p>Hi {{first_name}},</p>
<p>As discussed, here's the sponsorship outline for {{company}}. Let me know questions or if you'd like to tweak anything.</p>
<p>Best,<br>{{sender_name}}</p>`,
  },
] as const;

export const EMAIL_MERGE_TOKEN_HELP = [
  { token: '{{first_name}}', description: 'Contact first name' },
  { token: '{{last_name}}', description: 'Contact last name' },
  { token: '{{full_name}}', description: 'Full display name' },
  { token: '{{company}}', description: 'Company name or "your organisation"' },
  { token: '{{sender_name}}', description: 'Your name' },
  { token: '{{org_name}}', description: 'Workspace name' },
  { token: '{{next_week}}', description: 'Friendly "next week" phrase' },
] as const;

export function stepLabelForKey(stepKey: string): string {
  const known = EMAIL_TEMPLATE_STEP_DEFS.find((s) => s.key === stepKey);
  if (known) return known.label;
  return stepKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function defaultStepKeyForLifecycle(lifecycle: string): string {
  switch (lifecycle) {
    case 'customer':
      return 'customer_check_in';
    case 'former_customer':
      return 'former_win_back';
    case 'not_a_fit':
      return 'not_a_fit_close';
    default:
      return 'lead_follow_up';
  }
}

export function normaliseCustomStepKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}
