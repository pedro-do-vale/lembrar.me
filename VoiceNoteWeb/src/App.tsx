import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  addDoc, collection, deleteDoc, deleteField, doc, onSnapshot,
  orderBy, query, updateDoc,
} from 'firebase/firestore';
import { BookOpen, Gift, LayoutTemplate, Mic, Sparkles } from 'lucide-react';
import { db } from './firebase';
import { audioManager } from './audioManager';
import GameHud from './GameHud';
import KanbanBoard from './KanbanBoard';
import { getLevel } from './gameRules';
import {
  activateInventoryItem, awardMissionOnce, cancelActiveItem, finishExpiredItems,
  initializeGameProfile, profileRef, purchaseReward, saveRewardCatalogItem,
  setRewardActive,
} from './gameService';
import type {
  BoardList, GameProfile, RewardCatalogItem,
  RewardInventoryItem, Todo,
} from './types';

type View = 'board' | 'rewards' | 'journal';
const Analytics = lazy(() => import('./Analytics'));
const RewardsHub = lazy(() => import('./RewardsHub'));

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [lists, setLists] = useState<BoardList[]>([]);
  const [profile, setProfile] = useState<GameProfile | null>(null);
  const [catalog, setCatalog] = useState<RewardCatalogItem[]>([]);
  const [inventory, setInventory] = useState<RewardInventoryItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingLists, setLoadingLists] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [currentView, setCurrentView] = useState<View>('board');
  const [syncing, setSyncing] = useState(false);
  const [rewardToast, setRewardToast] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const initializingProfile = useRef(false);
  const requestedInbox = useRef(false);
  const awarding = useRef(new Set<string>());
  const previousLevel = useRef<number | null>(null);

  useEffect(() => {
    audioManager.startAmbient();
    return () => audioManager.stopAmbient();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'notes'), orderBy('timestamp', 'desc')),
      (snapshot) => {
        setTodos(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Todo)));
        setLoadingTasks(false);
      },
      (error) => { console.error('Firebase error tasks:', error); setLoadingTasks(false); },
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'board_lists'), orderBy('order', 'asc')),
      (snapshot) => {
        const fetched = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as BoardList));
        setLists(fetched);
        setLoadingLists(false);
        if (fetched.length === 0 && !requestedInbox.current) {
          requestedInbox.current = true;
          void addDoc(collection(db, 'board_lists'), { title: 'Caixa de Entrada', order: 0 });
        }
      },
      (error) => { console.error('Firebase error lists:', error); setLoadingLists(false); },
    );
    return unsubscribe;
  }, []);

  useEffect(() => onSnapshot(profileRef, (snapshot) => {
    setProfile(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as GameProfile : null);
    setProfileLoaded(true);
  }, (error) => { console.error('Firebase error profile:', error); setProfileLoaded(true); }), []);

  useEffect(() => {
    if (!profile) return;
    const currentLevel = getLevel(profile.totalXp);
    if (previousLevel.current !== null && currentLevel > previousLevel.current) {
      audioManager.playEffect('levelUp');
    }
    previousLevel.current = currentLevel;
  }, [profile]);

  useEffect(() => onSnapshot(
    query(collection(db, 'reward_catalog'), orderBy('createdAt', 'desc')),
    (snapshot) => setCatalog(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as RewardCatalogItem))),
    (error) => console.error('Firebase error reward catalog:', error),
  ), []);

  useEffect(() => onSnapshot(
    query(collection(db, 'reward_inventory'), orderBy('purchasedAt', 'desc')),
    (snapshot) => setInventory(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as RewardInventoryItem))),
    (error) => console.error('Firebase error inventory:', error),
  ), []);

  useEffect(() => {
    if (loadingTasks || !profileLoaded || profile || initializingProfile.current) return;
    initializingProfile.current = true;
    setSyncing(true);
    void initializeGameProfile(todos)
      .catch((error) => console.error('Game profile initialization failed:', error))
      .finally(() => { setSyncing(false); initializingProfile.current = false; });
  }, [loadingTasks, profileLoaded, profile, todos]);

  useEffect(() => {
    if (!profile?.migrationComplete) return;
    const pending = todos.filter((todo) => todo.archived && !todo.gameRewardState && !awarding.current.has(todo.id));
    pending.forEach((todo) => {
      awarding.current.add(todo.id);
      setSyncing(true);
      void awardMissionOnce(todo.id)
        .then((awarded) => {
          if (awarded) {
            setRewardToast(true);
            audioManager.playEffect('reward');
            window.setTimeout(() => setRewardToast(false), 2600);
          }
        })
        .catch((error) => console.warn('Reward reconciliation pending:', error))
        .finally(() => { awarding.current.delete(todo.id); setSyncing(false); });
    });
  }, [todos, profile?.migrationComplete, retryToken]);

  useEffect(() => {
    const retry = () => setRetryToken((value) => value + 1);
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, []);

  useEffect(() => {
    const finish = () => void finishExpiredItems(inventory).catch((error) => console.warn('Timer sync pending:', error));
    finish();
    const timer = window.setInterval(finish, 5000);
    return () => window.clearInterval(timer);
  }, [inventory]);

  useEffect(() => {
    if (loadingTasks || loadingLists || lists.length === 0) return;
    todos.forEach((todo) => {
      if (!todo.targetList || todo.listId) return;
      const targetName = todo.targetList.trim();
      const target = lists.find((list) => list.title.toLowerCase() === targetName.toLowerCase());
      if (target) {
        void updateDoc(doc(db, 'notes', todo.id), { listId: target.id, targetList: deleteField() });
        return;
      }
      const nextOrder = Math.max(...lists.map((list) => list.order)) + 1;
      void addDoc(collection(db, 'board_lists'), { title: targetName, order: nextOrder }).then((created) =>
        updateDoc(doc(db, 'notes', todo.id), { listId: created.id, targetList: deleteField() }),
      );
    });
  }, [todos, lists, loadingTasks, loadingLists]);

  const handleDeleteTodo = async (id: string) => {
    if (window.confirm('Apagar esta missão permanentemente?')) await deleteDoc(doc(db, 'notes', id));
  };
  const toggleComplete = async (id: string, completed: boolean | undefined) => {
    await updateDoc(doc(db, 'notes', id), { archived: !completed });
    if (!completed) audioManager.playEffect('scratch');
  };
  const updateTodo = async (id: string, text: string, reminderAt: number | null) =>
    updateDoc(doc(db, 'notes', id), { text, reminderAt });
  const moveTodo = async (todoId: string, listId: string) =>
    updateDoc(doc(db, 'notes', todoId), { listId });
  const createTodo = async (listId: string, text: string, reminderAt: number | null) => {
    const timestamp = Date.now();
    const createdAt = new Date(timestamp);
    const pad = (value: number) => value.toString().padStart(2, '0');
    const date = `${pad(createdAt.getDate())}/${pad(createdAt.getMonth() + 1)}/${createdAt.getFullYear()} ${pad(createdAt.getHours())}:${pad(createdAt.getMinutes())}`;
    await addDoc(collection(db, 'notes'), {
      text: text.trim(), date, timestamp, archived: false, reminderAt, listId,
    });
  };
  const createList = async (title: string) => addDoc(collection(db, 'board_lists'), {
    title, order: lists.length ? Math.max(...lists.map((list) => list.order)) + 1 : 0,
  }).then(() => undefined);
  const deleteList = async (id: string) => deleteDoc(doc(db, 'board_lists', id));

  const loading = loadingTasks || loadingLists || !profileLoaded;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup"><span className="brand-mark"><Sparkles size={20} /></span><div><h1>Lembrar.me</h1><p>Missões para uma vida com intenção</p></div></div>
        <nav className="main-nav" aria-label="Navegação principal">
          <button className={currentView === 'board' ? 'active' : ''} onClick={() => setCurrentView('board')}><LayoutTemplate size={17} /> Quadro de Missões</button>
          <button className={currentView === 'rewards' ? 'active' : ''} onClick={() => setCurrentView('rewards')}><Gift size={17} /> Recompensas</button>
          <button className={currentView === 'journal' ? 'active' : ''} onClick={() => setCurrentView('journal')}><BookOpen size={17} /> Diário</button>
        </nav>
      </header>

      <GameHud profile={profile} inventory={inventory} syncing={syncing} />

      <main className="app-main">
        <Suspense fallback={<div className="loader paper-panel">Abrindo o diário de aventuras…</div>}>
          {loading ? <div className="loader paper-panel">Abrindo o diário de aventuras…</div> : currentView === 'journal' ? (
            <Analytics todos={todos} profile={profile} inventory={inventory} />
          ) : currentView === 'rewards' ? (
            <RewardsHub profile={profile} catalog={catalog} inventory={inventory} onSaveReward={saveRewardCatalogItem} onSetRewardActive={setRewardActive} onPurchase={purchaseReward} onActivate={activateInventoryItem} onCancel={cancelActiveItem} />
          ) : todos.length === 0 && lists.length === 0 ? (
            <div className="empty-state paper-panel"><Mic size={48} /><h2>Seu mapa está vazio</h2><p>Grave uma missão no smartwatch para começar a jornada.</p></div>
          ) : (
            <section className="quest-board-section"><div className="board-title"><div><span className="eyebrow">A jornada de hoje</span><h2>Quadro de Missões</h2></div><p>Conclua uma missão pela primeira vez para ganhar <strong>10 XP</strong> e <strong>5 moedas</strong>.</p></div><KanbanBoard todos={todos} lists={lists} onToggleComplete={toggleComplete} onDeleteTodo={handleDeleteTodo} onUpdateTodo={updateTodo} onMoveTodo={moveTodo} onCreateTodo={createTodo} onCreateList={createList} onDeleteList={deleteList} /></section>
          )}
        </Suspense>
      </main>

      {rewardToast && <div className="reward-toast" role="status"><Sparkles size={22} /><div><strong>Missão concluída!</strong><span>+10 XP · +5 moedas</span></div></div>}
    </div>
  );
}

export default App;
