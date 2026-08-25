import {
  addDoc, collection, doc, getDoc, runTransaction, setDoc,
  updateDoc, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { COINS_PER_MISSION, getLevel, XP_PER_MISSION, validateRewardDraft } from './gameRules';
import type { RewardDraft, RewardInventoryItem, Todo } from './types';

export const PROFILE_ID = 'solo';
export const profileRef = doc(db, 'game_profiles', PROFILE_ID);

export async function initializeGameProfile(todos: Todo[]) {
  const created = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(profileRef);
    if (snapshot.exists()) return false;
    const now = Date.now();
    transaction.set(profileRef, {
      totalXp: 0,
      coins: 0,
      startedAt: now,
      migrationComplete: false,
      updatedAt: now,
    });
    return true;
  });

  const profile = await getDoc(profileRef);
  if (!created && profile.data()?.migrationComplete) return;

  const legacy = todos.filter((todo) => todo.archived && !todo.gameRewardState);
  for (let offset = 0; offset < legacy.length; offset += 400) {
    const batch = writeBatch(db);
    legacy.slice(offset, offset + 400).forEach((todo) => {
      batch.update(doc(db, 'notes', todo.id), {
        gameRewardState: 'legacy',
        rewardedXp: 0,
        rewardedCoins: 0,
      });
    });
    await batch.commit();
  }

  await setDoc(profileRef, { migrationComplete: true, updatedAt: Date.now() }, { merge: true });
}

export async function awardMissionOnce(todoId: string) {
  return runTransaction(db, async (transaction) => {
    const todoRef = doc(db, 'notes', todoId);
    const [todoSnapshot, profileSnapshot] = await Promise.all([
      transaction.get(todoRef), transaction.get(profileRef),
    ]);
    if (!todoSnapshot.exists() || !profileSnapshot.exists()) return { awarded: false, leveledUp: false };
    const todo = todoSnapshot.data() as Todo;
    const profile = profileSnapshot.data();
    if (!todo.archived || todo.gameRewardState || !profile.migrationComplete) return { awarded: false, leveledUp: false };

    const now = Date.now();
    const previousXp = profile.totalXp ?? 0;
    const nextXp = previousXp + XP_PER_MISSION;
    transaction.update(todoRef, {
      gameRewardState: 'awarded',
      rewardedAt: now,
      rewardedXp: XP_PER_MISSION,
      rewardedCoins: COINS_PER_MISSION,
    });
    transaction.update(profileRef, {
      totalXp: nextXp,
      coins: (profile.coins ?? 0) + COINS_PER_MISSION,
      updatedAt: now,
    });
    return { awarded: true, leveledUp: getLevel(nextXp) > getLevel(previousXp) };
  });
}

export async function saveRewardCatalogItem(draft: RewardDraft, id?: string) {
  const value = validateRewardDraft(draft);
  const now = Date.now();
  if (id) {
    await updateDoc(doc(db, 'reward_catalog', id), { ...value, updatedAt: now });
    return id;
  }
  const result = await addDoc(collection(db, 'reward_catalog'), {
    ...value, createdAt: now, updatedAt: now,
  });
  return result.id;
}

export async function setRewardActive(id: string, active: boolean) {
  await updateDoc(doc(db, 'reward_catalog', id), { active, updatedAt: Date.now() });
}

export async function purchaseReward(rewardId: string) {
  const inventoryRef = doc(collection(db, 'reward_inventory'));
  await runTransaction(db, async (transaction) => {
    const rewardRef = doc(db, 'reward_catalog', rewardId);
    const [profileSnapshot, rewardSnapshot] = await Promise.all([
      transaction.get(profileRef), transaction.get(rewardRef),
    ]);
    if (!profileSnapshot.exists() || !rewardSnapshot.exists()) {
      throw new Error('Recompensa indisponível.');
    }
    const profile = profileSnapshot.data();
    const reward = rewardSnapshot.data();
    if (!reward.active) throw new Error('Esta recompensa está desativada.');
    if ((profile.coins ?? 0) < reward.costCoins) throw new Error('Moedas insuficientes.');
    const now = Date.now();
    transaction.update(profileRef, {
      coins: profile.coins - reward.costCoins,
      updatedAt: now,
    });
    transaction.set(inventoryRef, {
      rewardId,
      nameSnapshot: reward.name,
      descriptionSnapshot: reward.description ?? '',
      costSnapshot: reward.costCoins,
      durationMinutesSnapshot: reward.durationMinutes ?? null,
      purchasedAt: now,
      status: 'available',
    });
  });
  return inventoryRef.id;
}

export async function activateInventoryItem(itemId: string) {
  await runTransaction(db, async (transaction) => {
    const itemRef = doc(db, 'reward_inventory', itemId);
    const snapshot = await transaction.get(itemRef);
    if (!snapshot.exists()) throw new Error('Item não encontrado.');
    const item = snapshot.data() as RewardInventoryItem;
    if (item.status !== 'available') throw new Error('Este item já foi usado.');
    const now = Date.now();
    if (item.durationMinutesSnapshot) {
      transaction.update(itemRef, {
        status: 'active', activatedAt: now,
        endsAt: now + item.durationMinutesSnapshot * 60_000,
      });
    } else {
      transaction.update(itemRef, {
        status: 'used', activatedAt: now, endedAt: now, endedReason: 'completed',
      });
    }
  });
}

export async function cancelActiveItem(itemId: string) {
  await runTransaction(db, async (transaction) => {
    const itemRef = doc(db, 'reward_inventory', itemId);
    const snapshot = await transaction.get(itemRef);
    if (!snapshot.exists() || snapshot.data().status !== 'active') return;
    transaction.update(itemRef, {
      status: 'used', endedAt: Date.now(), endedReason: 'cancelled',
    });
  });
}

export async function finishExpiredItems(items: RewardInventoryItem[], now = Date.now()) {
  const expired = items.filter((item) =>
    item.status === 'active' && item.endsAt !== undefined && item.endsAt <= now,
  );
  if (!expired.length) return;
  await Promise.all(expired.map((item) => runTransaction(db, async (transaction) => {
    const itemRef = doc(db, 'reward_inventory', item.id);
    const snapshot = await transaction.get(itemRef);
    const current = snapshot.data() as RewardInventoryItem | undefined;
    if (!current || current.status !== 'active' || !current.endsAt || current.endsAt > now) return;
    transaction.update(itemRef, {
      status: 'used', endedAt: current.endsAt, endedReason: 'expired',
    });
  })));
}
