import { calendarDaysBetweenInTimeZone } from '@/lib/dates';
import type {
  DealForRules,
  DealTimingForRules,
  DealValueForRules,
  OpportunityStatus,
  StageForRules,
} from '@/domain/opportunities/types';

export type MoveValidation =
  | { ok: true }
  | { ok: false; code: 'PIPELINE_MISMATCH' | 'REOPEN_REQUIRED' | 'LOST_REASON_REQUIRED' };

export type CanMoveOptions = {
  /** When true, a won/lost deal may move to an open stage (reopen flow). */
  reopen?: boolean;
  /** Required when the target stage kind is `lost` (unless reopening). */
  lostReasonId?: string | null;
};

export function statusForStage(stage: Pick<StageForRules, 'kind'>): OpportunityStatus {
  if (stage.kind === 'won') return 'won';
  if (stage.kind === 'lost') return 'lost';
  return 'open';
}

export function canMoveToStage(
  deal: DealForRules,
  targetStage: StageForRules,
  options: CanMoveOptions = {},
): MoveValidation {
  if (deal.pipelineId !== targetStage.pipelineId) {
    return { ok: false, code: 'PIPELINE_MISMATCH' };
  }

  const closed = deal.status === 'won' || deal.status === 'lost';
  const targetOpen = targetStage.kind === 'open';

  if (closed && !options.reopen) {
    return { ok: false, code: 'REOPEN_REQUIRED' };
  }

  if (options.reopen && !targetOpen) {
    return { ok: false, code: 'REOPEN_REQUIRED' };
  }

  if (targetStage.kind === 'lost' && !options.reopen) {
    const reason = options.lostReasonId?.trim();
    if (!reason) {
      return { ok: false, code: 'LOST_REASON_REQUIRED' };
    }
  }

  return { ok: true };
}

export function effectiveProbability(
  deal: Pick<DealValueForRules, 'probabilityOverride'>,
  stage: Pick<StageForRules, 'kind' | 'probability'>,
): number {
  if (stage.kind === 'won') return 100;
  if (stage.kind === 'lost') return 0;
  if (deal.probabilityOverride != null) {
    return clampProbability(deal.probabilityOverride);
  }
  if (stage.probability == null) return 0;
  return clampProbability(stage.probability);
}

export function weightedValuePence(
  deal: DealValueForRules,
  stage: Pick<StageForRules, 'kind' | 'probability'>,
): number {
  const probability = effectiveProbability(deal, stage);
  if (deal.valuePence <= 0 || probability <= 0) return 0;
  return Math.round((deal.valuePence * probability) / 100);
}

export function isRotting(
  deal: DealTimingForRules & { status: OpportunityStatus },
  stage: Pick<StageForRules, 'kind' | 'rottingDays'>,
  hasOpenTask: boolean,
  now: Date,
  timeZone: string,
): boolean {
  if (deal.status !== 'open' || stage.kind !== 'open') return false;
  if (hasOpenTask) return false;
  if (stage.rottingDays == null || stage.rottingDays <= 0) return false;

  const anchor =
    deal.lastActivityAt && deal.lastActivityAt.getTime() > deal.stageEnteredAt.getTime()
      ? deal.lastActivityAt
      : deal.stageEnteredAt;

  const idleDays = calendarDaysBetweenInTimeZone(anchor, now, timeZone);
  return idleDays > stage.rottingDays;
}

export function daysInStage(
  deal: DealTimingForRules,
  now: Date,
  timeZone: string,
): number {
  const anchor =
    deal.lastActivityAt && deal.lastActivityAt.getTime() > deal.stageEnteredAt.getTime()
      ? deal.lastActivityAt
      : deal.stageEnteredAt;
  return Math.max(0, calendarDaysBetweenInTimeZone(anchor, now, timeZone));
}

const FRACTIONAL_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Generates a lexicographic key strictly between `before` and `after` (fractional indexing).
 * `null` means unbounded on that side.
 */
export function positionBetween(before: string | null, after: string | null): string {
  if (before !== null && after !== null && before >= after) {
    throw new Error('positionBetween: before must be less than after');
  }

  if (before === null && after === null) {
    return 'n';
  }

  if (before === null) {
    return decrementKey(after!);
  }

  if (after === null) {
    return incrementKey(before);
  }

  return midpointKey(before, after);
}

function clampProbability(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function decrementKey(key: string): string {
  const chars = key.split('');
  let index = chars.length - 1;
  while (index >= 0) {
    const charIndex = FRACTIONAL_ALPHABET.indexOf(chars[index]!);
    if (charIndex > 0) {
      chars[index] = FRACTIONAL_ALPHABET[charIndex - 1]!;
      return chars.join('');
    }
    chars[index] = FRACTIONAL_ALPHABET[FRACTIONAL_ALPHABET.length - 1]!;
    index -= 1;
  }
  return '!' + key;
}

function incrementKey(key: string): string {
  const chars = key.split('');
  let index = chars.length - 1;
  while (index >= 0) {
    const charIndex = FRACTIONAL_ALPHABET.indexOf(chars[index]!);
    if (charIndex >= 0 && charIndex < FRACTIONAL_ALPHABET.length - 1) {
      chars[index] = FRACTIONAL_ALPHABET[charIndex + 1]!;
      return chars.join('');
    }
    chars[index] = FRACTIONAL_ALPHABET[0]!;
    index -= 1;
  }
  return key + FRACTIONAL_ALPHABET[0];
}

function midpointKey(before: string, after: string): string {
  let left = before;
  let right = after;
  let result = '';

  while (left.length < right.length) {
    left += FRACTIONAL_ALPHABET[0]!;
  }
  while (right.length < left.length) {
    right += FRACTIONAL_ALPHABET[0]!;
  }

  for (let i = 0; i < left.length; i += 1) {
    const leftIndex = FRACTIONAL_ALPHABET.indexOf(left[i]!);
    const rightIndex = FRACTIONAL_ALPHABET.indexOf(right[i]!);
    if (leftIndex < 0 || rightIndex < 0) {
      throw new Error('positionBetween: invalid character in key');
    }
    if (rightIndex - leftIndex > 1) {
      const mid = Math.floor((leftIndex + rightIndex) / 2);
      return result + FRACTIONAL_ALPHABET[mid];
    }
    result += left[i];
  }

  return left + FRACTIONAL_ALPHABET[Math.floor(FRACTIONAL_ALPHABET.length / 2)];
}
