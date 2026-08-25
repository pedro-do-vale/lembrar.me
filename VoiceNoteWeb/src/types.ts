export interface Todo {
  id: string;
  text: string;
  date: string;
  timestamp: number;
  archived?: boolean;
  reminderAt?: number | null;
  xpReward?: number;
  listId?: string | null;
  position?: number;
  dailyResetDate?: string;
  targetList?: string;
  gameRewardState?: 'legacy' | 'awarded';
  rewardedAt?: number;
  rewardedXp?: number;
  rewardedCoins?: number;
}

export interface BoardList {
  id: string;
  title: string;
  order: number;
}

export interface GameProfile {
  id: string;
  totalXp: number;
  coins: number;
  startedAt: number;
  migrationComplete: boolean;
  updatedAt: number;
}

export interface RewardCatalogItem {
  id: string;
  name: string;
  description: string;
  costCoins: number;
  durationMinutes: number | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export type InventoryStatus = 'available' | 'active' | 'used';
export type InventoryEndReason = 'completed' | 'expired' | 'cancelled';

export interface RewardInventoryItem {
  id: string;
  rewardId: string;
  nameSnapshot: string;
  descriptionSnapshot: string;
  costSnapshot: number;
  durationMinutesSnapshot: number | null;
  purchasedAt: number;
  status: InventoryStatus;
  activatedAt?: number;
  endsAt?: number;
  endedAt?: number;
  endedReason?: InventoryEndReason;
}

export interface RewardDraft {
  name: string;
  description: string;
  costCoins: number;
  durationMinutes: number | null;
  active: boolean;
}
