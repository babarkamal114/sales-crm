import { OUTREACH_SEQUENCES } from '@/domain/contacts/email-outreach-sequences';
import { normaliseCustomStepKey } from '@/domain/contacts/email-template-steps';

const SYSTEM_KEYS = new Set(OUTREACH_SEQUENCES.map((s) => s.key));

export function isSystemOutreachSequenceKey(sequenceKey: string): boolean {
  return SYSTEM_KEYS.has(sequenceKey);
}

/** Stable org-owned sequence id (not a built-in lifecycle sequence). */
export function normaliseOutreachSequenceKey(label: string): string {
  const base = normaliseCustomStepKey(label);
  const withPrefix = base.startsWith('seq_') ? base : `seq_${base}`;
  return withPrefix.slice(0, 48) || 'seq_custom';
}

export function defaultStepKeyForSequence(sequenceKey: string, stepIndex: number): string {
  return `${sequenceKey}_step_${stepIndex + 1}`.slice(0, 48);
}
