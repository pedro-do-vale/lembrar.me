import { describe, expect, it } from 'vitest';
import { formatRemaining, getLevel, getLevelProgress, getMissionXp, getRemainingMs, validateRewardDraft } from './gameRules';
import type { RewardInventoryItem } from './types';

describe('game rules', () => {
  it('calculates levels in fixed 100 XP bands', () => {
    expect(getLevel(0)).toBe(1);
    expect(getLevel(99)).toBe(1);
    expect(getLevel(100)).toBe(2);
    expect(getLevelProgress(235)).toBe(35);
  });

  it('normalizes manually assigned mission XP and preserves the legacy default', () => {
    expect(getMissionXp()).toBe(10);
    expect(getMissionXp(25)).toBe(25);
    expect(getMissionXp(0)).toBe(1);
    expect(getMissionXp(150)).toBe(100);
  });

  it('validates prices and optional durations', () => {
    expect(validateRewardDraft({ name: ' Filme ', description: '', costCoins: 15, durationMinutes: 60, active: true }).name).toBe('Filme');
    expect(() => validateRewardDraft({ name: '', description: '', costCoins: 15, durationMinutes: null, active: true })).toThrow(/nome/i);
    expect(() => validateRewardDraft({ name: 'Filme', description: '', costCoins: 0, durationMinutes: null, active: true })).toThrow(/preço/i);
    expect(() => validateRewardDraft({ name: 'Filme', description: '', costCoins: 5, durationMinutes: -1, active: true })).toThrow(/duração/i);
  });

  it('derives timers from persisted timestamps', () => {
    const item = { status: 'active', endsAt: 61_000 } as RewardInventoryItem;
    expect(getRemainingMs(item, 1_000)).toBe(60_000);
    expect(formatRemaining(60_000)).toBe('01:00');
    expect(getRemainingMs(item, 70_000)).toBe(0);
  });
});
