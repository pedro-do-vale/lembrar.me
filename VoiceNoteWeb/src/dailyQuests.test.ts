import { describe, expect, it } from 'vitest';
import { getLocalDateKey, getMsUntilNextMidnight, isDailyQuestList } from './dailyQuests';

describe('daily quests', () => {
  it('matches the daily quest list regardless of accents and casing', () => {
    expect(isDailyQuestList('Quest Diária')).toBe(true);
    expect(isDailyQuestList('  QUEST DIARIA ')).toBe(true);
    expect(isDailyQuestList('Caixa de Entrada')).toBe(false);
  });

  it('uses local calendar days and calculates the next midnight', () => {
    const date = new Date(2026, 7, 24, 23, 59, 30);
    expect(getLocalDateKey(date)).toBe('2026-08-24');
    expect(getMsUntilNextMidnight(date)).toBe(30_000);
  });
});
