// Run with: npm run test:emulator
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { collection, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type * as Service from './gameService';
import type { RewardInventoryItem } from './types';

let service: typeof Service;
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hasEmulator)('gamification transactions', () => {
  beforeAll(async () => {
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
    connectFirestoreEmulator(db, host, Number(port));
    service = await import('./gameService');
  });

  beforeEach(async () => {
    await fetch('http://127.0.0.1:8080/emulator/v1/projects/voice-notes-54e1a/databases/(default)/documents', { method: 'DELETE' });
  });

  it('excludes legacy completions and awards a future completion once', async () => {
    await setDoc(doc(db, 'notes', 'legacy'), { text: 'Antiga', archived: true, timestamp: 1, date: '' });
    await setDoc(doc(db, 'notes', 'future'), { text: 'Nova', archived: false, timestamp: 2, date: '' });
    await service.initializeGameProfile([
      { id: 'legacy', text: 'Antiga', archived: true, timestamp: 1, date: '' },
      { id: 'future', text: 'Nova', archived: false, timestamp: 2, date: '' },
    ]);
    expect((await getDoc(doc(db, 'notes', 'legacy'))).data()?.gameRewardState).toBe('legacy');

    await updateDoc(doc(db, 'notes', 'future'), { archived: true });
    expect(await service.awardMissionOnce('future')).toEqual({ awarded: true, leveledUp: false, xpAwarded: 10, coinsAwarded: 5 });
    expect(await service.awardMissionOnce('future')).toEqual({ awarded: false, leveledUp: false, xpAwarded: 0, coinsAwarded: 0 });
    expect((await getDoc(service.profileRef)).data()).toMatchObject({ totalXp: 10, coins: 5 });

    await updateDoc(service.profileRef, { totalXp: 90 });
    await setDoc(doc(db, 'notes', 'level-up'), { text: 'Subir nível', archived: true, timestamp: 3, date: '', xpReward: 25 });
    expect(await service.awardMissionOnce('level-up')).toEqual({ awarded: true, leveledUp: true, xpAwarded: 25, coinsAwarded: 5 });
    expect((await getDoc(service.profileRef)).data()).toMatchObject({ totalXp: 115, coins: 10 });
  });

  it('rejects a purchase without enough coins and snapshots a successful one', async () => {
    await service.initializeGameProfile([]);
    const rewardRef = doc(collection(db, 'reward_catalog'));
    await setDoc(rewardRef, { name: 'Filme', description: '', costCoins: 10, durationMinutes: 60, active: true, createdAt: 1, updatedAt: 1 });
    await expect(service.purchaseReward(rewardRef.id)).rejects.toThrow(/insuficientes/i);
    await updateDoc(service.profileRef, { coins: 10 });
    const inventoryId = await service.purchaseReward(rewardRef.id);
    expect((await getDoc(doc(db, 'reward_inventory', inventoryId))).data()).toMatchObject({ nameSnapshot: 'Filme', costSnapshot: 10, status: 'available' });
    expect((await getDoc(service.profileRef)).data()?.coins).toBe(0);
  });

  it('supports concurrent timers, cancellation, expiry and immediate rewards', async () => {
    const first = doc(db, 'reward_inventory', 'first');
    const second = doc(db, 'reward_inventory', 'second');
    const immediate = doc(db, 'reward_inventory', 'immediate');
    const base = { rewardId: 'reward', nameSnapshot: 'Pausa', descriptionSnapshot: '', costSnapshot: 5, purchasedAt: 1, status: 'available' };
    await setDoc(first, { ...base, durationMinutesSnapshot: 1 });
    await setDoc(second, { ...base, durationMinutesSnapshot: 2 });
    await setDoc(immediate, { ...base, durationMinutesSnapshot: null });

    await Promise.all([service.activateInventoryItem(first.id), service.activateInventoryItem(second.id)]);
    expect((await getDoc(first)).data()?.status).toBe('active');
    expect((await getDoc(second)).data()?.status).toBe('active');

    await service.cancelActiveItem(first.id);
    expect((await getDoc(first)).data()).toMatchObject({ status: 'used', endedReason: 'cancelled' });

    await updateDoc(second, { endsAt: 100 });
    const secondData = (await getDoc(second)).data();
    await service.finishExpiredItems([{ id: second.id, ...secondData } as RewardInventoryItem], 200);
    expect((await getDoc(second)).data()).toMatchObject({ status: 'used', endedReason: 'expired', endedAt: 100 });

    await service.activateInventoryItem(immediate.id);
    expect((await getDoc(immediate)).data()).toMatchObject({ status: 'used', endedReason: 'completed' });
  });
});
