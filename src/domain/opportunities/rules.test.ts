import { describe, expect, it } from 'vitest';
import {
  canMoveToStage,
  daysInStage,
  effectiveProbability,
  isRotting,
  positionBetween,
  statusForStage,
  weightedValuePence,
} from '@/domain/opportunities/rules';

const pipelineId = '11111111-1111-4111-8111-111111111111';
const stageOpen: Parameters<typeof canMoveToStage>[1] = {
  id: '22222222-2222-4222-8222-222222222222',
  pipelineId,
  kind: 'open',
  probability: 40,
  rottingDays: 7,
};
const stageLost: Parameters<typeof canMoveToStage>[1] = {
  id: '33333333-3333-4333-8333-333333333333',
  pipelineId,
  kind: 'lost',
  probability: 0,
  rottingDays: null,
};
const stageWon: Parameters<typeof canMoveToStage>[1] = {
  id: '44444444-4444-4444-8444-444444444444',
  pipelineId,
  kind: 'won',
  probability: 100,
  rottingDays: null,
};

describe('statusForStage', () => {
  it('maps stage kinds to deal status', () => {
    expect(statusForStage({ kind: 'open' })).toBe('open');
    expect(statusForStage({ kind: 'won' })).toBe('won');
    expect(statusForStage({ kind: 'lost' })).toBe('lost');
  });
});

describe('canMoveToStage', () => {
  it('rejects cross-pipeline moves', () => {
    const result = canMoveToStage(
      { pipelineId: 'other', stageId: stageOpen.id, status: 'open' },
      stageOpen,
    );
    expect(result).toEqual({ ok: false, code: 'PIPELINE_MISMATCH' });
  });

  it('requires a lost reason when moving to lost', () => {
    const result = canMoveToStage(
      { pipelineId, stageId: stageOpen.id, status: 'open' },
      stageLost,
    );
    expect(result).toEqual({ ok: false, code: 'LOST_REASON_REQUIRED' });
  });

  it('allows lost when a reason is provided', () => {
    const result = canMoveToStage(
      { pipelineId, stageId: stageOpen.id, status: 'open' },
      stageLost,
      { lostReasonId: 'reason-1' },
    );
    expect(result).toEqual({ ok: true });
  });

  it('blocks moving a won deal except through reopen', () => {
    const deal = { pipelineId, stageId: stageWon.id, status: 'won' as const };
    expect(canMoveToStage(deal, stageOpen)).toEqual({ ok: false, code: 'REOPEN_REQUIRED' });
    expect(canMoveToStage(deal, stageOpen, { reopen: true })).toEqual({ ok: true });
  });
});

describe('effectiveProbability and weightedValuePence', () => {
  it('uses override, then stage probability, with won/lost fixed', () => {
    expect(effectiveProbability({ probabilityOverride: 55 }, stageOpen)).toBe(55);
    expect(effectiveProbability({ probabilityOverride: null }, stageOpen)).toBe(40);
    expect(effectiveProbability({ probabilityOverride: null }, stageWon)).toBe(100);
    expect(effectiveProbability({ probabilityOverride: null }, stageLost)).toBe(0);
  });

  it('computes weighted value in pence', () => {
    expect(
      weightedValuePence({ valuePence: 100_000, probabilityOverride: null }, stageOpen),
    ).toBe(40_000);
    expect(
      weightedValuePence({ valuePence: 100_000, probabilityOverride: 25 }, stageOpen),
    ).toBe(25_000);
  });
});

describe('isRotting', () => {
  const stageEnteredAt = new Date('2026-10-01T12:00:00.000Z');
  const now = new Date('2026-10-15T12:00:00.000Z');

  it('flags idle open deals past rotting threshold without open tasks', () => {
    expect(
      isRotting(
        { status: 'open', stageEnteredAt, lastActivityAt: null },
        stageOpen,
        false,
        now,
        'Europe/London',
      ),
    ).toBe(true);
  });

  it('is false when an open task exists', () => {
    expect(
      isRotting(
        { status: 'open', stageEnteredAt, lastActivityAt: null },
        stageOpen,
        true,
        now,
        'Europe/London',
      ),
    ).toBe(false);
  });
});

describe('daysInStage', () => {
  it('counts local calendar days from stage entry', () => {
    const days = daysInStage(
      {
        stageEnteredAt: new Date('2026-10-01T23:00:00.000Z'),
        lastActivityAt: null,
      },
      new Date('2026-10-03T10:00:00.000Z'),
      'Europe/London',
    );
    expect(days).toBeGreaterThanOrEqual(1);
  });
});

describe('positionBetween', () => {
  it('returns a key between neighbours', () => {
    const mid = positionBetween('a', 'c');
    expect(mid > 'a' && mid < 'c').toBe(true);
  });

  it('generates first and last keys', () => {
    expect(positionBetween(null, null)).toBe('n');
    const beforeFirst = positionBetween(null, 'm');
    expect(beforeFirst < 'm').toBe(true);
    const afterLast = positionBetween('m', null);
    expect(afterLast > 'm').toBe(true);
  });
});
