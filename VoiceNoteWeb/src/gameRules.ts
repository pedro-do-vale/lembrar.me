import type { RewardDraft, RewardInventoryItem } from './types';

export const XP_PER_MISSION = 10;
export const COINS_PER_MISSION = 5;
export const XP_PER_LEVEL = 100;
export const MIN_MISSION_XP = 1;
export const MAX_MISSION_XP = 100;

export function getMissionXp(value?: number) {
  if (!Number.isFinite(value)) return XP_PER_MISSION;
  return Math.min(MAX_MISSION_XP, Math.max(MIN_MISSION_XP, Math.round(value!)));
}

export function getLevel(totalXp: number) {
  return Math.floor(Math.max(0, totalXp) / XP_PER_LEVEL) + 1;
}

export function getLevelProgress(totalXp: number) {
  return Math.max(0, totalXp) % XP_PER_LEVEL;
}

export function validateRewardDraft(draft: RewardDraft) {
  const name = draft.name.trim();
  const description = draft.description.trim();
  if (!name) throw new Error('Dê um nome à recompensa.');
  if (name.length > 80) throw new Error('Use no máximo 80 caracteres no nome.');
  if (description.length > 240) throw new Error('Use no máximo 240 caracteres na descrição.');
  if (!Number.isInteger(draft.costCoins) || draft.costCoins <= 0) {
    throw new Error('O preço deve ser um número inteiro maior que zero.');
  }
  if (draft.durationMinutes !== null &&
      (!Number.isInteger(draft.durationMinutes) || draft.durationMinutes <= 0)) {
    throw new Error('A duração deve ser um número inteiro de minutos.');
  }
  return { ...draft, name, description };
}

export function getRemainingMs(item: RewardInventoryItem, now: number) {
  if (item.status !== 'active' || !item.endsAt) return 0;
  return Math.max(0, item.endsAt - now);
}

export function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
