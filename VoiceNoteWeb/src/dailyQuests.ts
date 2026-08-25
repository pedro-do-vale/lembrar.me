export const DAILY_QUEST_LIST_NAME = 'quest diaria';

export function normalizeListTitle(title: string) {
  return title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

export function isDailyQuestList(title: string) {
  return normalizeListTitle(title) === DAILY_QUEST_LIST_NAME;
}

export function getLocalDateKey(date = new Date()) {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getMsUntilNextMidnight(now = new Date()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}
