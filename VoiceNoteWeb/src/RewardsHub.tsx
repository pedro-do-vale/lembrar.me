import { useEffect, useMemo, useState } from 'react';
import {
  Archive, Check, Clock3, Coins, Edit3, PackageOpen, Play,
  Plus, RotateCcw, Save, ShoppingBag, Square, X,
} from 'lucide-react';
import { formatRemaining, getRemainingMs } from './gameRules';
import type {
  GameProfile, RewardCatalogItem, RewardDraft, RewardInventoryItem,
} from './types';

interface RewardsHubProps {
  profile: GameProfile | null;
  catalog: RewardCatalogItem[];
  inventory: RewardInventoryItem[];
  onSaveReward: (draft: RewardDraft, id?: string) => Promise<unknown>;
  onSetRewardActive: (id: string, active: boolean) => Promise<unknown>;
  onPurchase: (id: string) => Promise<unknown>;
  onActivate: (id: string) => Promise<unknown>;
  onCancel: (id: string) => Promise<unknown>;
}

const EMPTY_DRAFT: RewardDraft = {
  name: '', description: '', costCoins: 10, durationMinutes: null, active: true,
};

function formatDate(timestamp?: number) {
  if (!timestamp) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(timestamp);
}

export default function RewardsHub({
  profile, catalog, inventory, onSaveReward, onSetRewardActive,
  onPurchase, onActivate, onCancel,
}: RewardsHubProps) {
  const [draft, setDraft] = useState<RewardDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string>();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeItems = useMemo(() => inventory.filter((item) => item.status === 'active'), [inventory]);
  const availableItems = useMemo(() => inventory.filter((item) => item.status === 'available'), [inventory]);
  const history = useMemo(() => inventory.filter((item) => item.status === 'used')
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0)), [inventory]);

  const perform = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusy(key);
    setMessage(undefined);
    try {
      await action();
      setMessage(success);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível concluir a ação.');
      return false;
    } finally {
      setBusy(undefined);
    }
  };

  const startEdit = (reward: RewardCatalogItem) => {
    setEditingId(reward.id);
    setDraft({
      name: reward.name,
      description: reward.description,
      costCoins: reward.costCoins,
      durationMinutes: reward.durationMinutes,
      active: reward.active,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setEditingId(undefined);
    setDraft(EMPTY_DRAFT);
    setShowForm(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const saved = await perform('save', () => onSaveReward(draft, editingId), editingId ? 'Recompensa atualizada.' : 'Recompensa criada.');
    if (saved) closeForm();
  };

  return (
    <div className="rewards-page">
      <section className="paper-panel shop-panel">
        <div className="section-heading">
          <div><span className="eyebrow">Troque esforço por descanso</span><h2>Loja de Recompensas</h2></div>
          <button className="rpg-button" onClick={() => { closeForm(); setShowForm(true); }}><Plus size={17} /> Nova recompensa</button>
        </div>
        <p className="section-intro">Crie permissões pessoais, compre com moedas e use quando fizer sentido.</p>
        {message && <div className="notice" role="status">{message}</div>}

        {showForm && (
          <form className="reward-form" onSubmit={submit}>
            <div className="form-title"><h3>{editingId ? 'Editar recompensa' : 'Nova recompensa'}</h3><button type="button" className="icon-button" onClick={closeForm} aria-label="Fechar"><X size={18} /></button></div>
            <label>Nome<input value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: 1 hora de filme" autoFocus /></label>
            <label>Descrição<textarea value={draft.description} maxLength={240} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Quando e como quero aproveitar esta recompensa" /></label>
            <div className="form-grid">
              <label>Preço em moedas<input type="number" min="1" step="1" value={draft.costCoins} onChange={(e) => setDraft({ ...draft, costCoins: Number(e.target.value) })} /></label>
              <label>Duração em minutos <span>(opcional)</span><input type="number" min="1" step="1" value={draft.durationMinutes ?? ''} onChange={(e) => setDraft({ ...draft, durationMinutes: e.target.value ? Number(e.target.value) : null })} placeholder="Sem cronômetro" /></label>
            </div>
            <label className="toggle-label"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Disponível na loja</label>
            <button className="rpg-button primary" disabled={busy === 'save'}><Save size={17} /> Salvar recompensa</button>
          </form>
        )}

        <div className="reward-grid">
          {catalog.length === 0 && <div className="empty-parchment"><ShoppingBag size={34} /><strong>A loja ainda está vazia</strong><span>Crie uma recompensa que realmente motive você.</span></div>}
          {catalog.map((reward) => (
            <article className={`reward-card ${!reward.active ? 'inactive' : ''}`} key={reward.id}>
              <div className="reward-card-top"><span className="reward-seal">{reward.active ? <ShoppingBag size={19} /> : <Archive size={19} />}</span><button className="icon-button" onClick={() => startEdit(reward)} aria-label={`Editar ${reward.name}`}><Edit3 size={16} /></button></div>
              <h3>{reward.name}</h3><p>{reward.description || 'Uma recompensa escolhida por você.'}</p>
              <div className="reward-meta"><span><Coins size={16} /> {reward.costCoins}</span><span><Clock3 size={16} /> {reward.durationMinutes ? `${reward.durationMinutes} min` : 'Uso simples'}</span></div>
              <div className="card-actions">
                {reward.active ? <button className="rpg-button primary" disabled={busy === `buy-${reward.id}` || (profile?.coins ?? 0) < reward.costCoins} onClick={() => perform(`buy-${reward.id}`, () => onPurchase(reward.id), `${reward.name} foi para o inventário.`)}><ShoppingBag size={16} /> Comprar</button> : <button className="rpg-button" onClick={() => perform(`toggle-${reward.id}`, () => onSetRewardActive(reward.id, true), 'Recompensa reativada.')}><RotateCcw size={16} /> Reativar</button>}
                {reward.active && <button className="text-button" onClick={() => perform(`toggle-${reward.id}`, () => onSetRewardActive(reward.id, false), 'Recompensa arquivada.')}><Archive size={15} /> Arquivar</button>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="paper-panel inventory-panel">
        <div className="section-heading"><div><span className="eyebrow">Sua mochila</span><h2>Inventário</h2></div><span className="count-chip"><PackageOpen size={16} /> {availableItems.length} disponíveis</span></div>

        {activeItems.length > 0 && <div className="inventory-section"><h3>Sessões ativas</h3><div className="session-grid">{activeItems.map((item) => (
          <article className="active-session" key={item.id}><span className="live-dot" /><div><strong>{item.nameSnapshot}</strong><span>Termina às {formatDate(item.endsAt)}</span></div><time>{formatRemaining(getRemainingMs(item, now))}</time><button className="rpg-button danger" disabled={busy === `cancel-${item.id}`} onClick={() => perform(`cancel-${item.id}`, () => onCancel(item.id), 'Sessão encerrada sem reembolso.')}><Square size={14} /> Encerrar</button></article>
        ))}</div></div>}

        <div className="inventory-section"><h3>Prontos para usar</h3><div className="inventory-list">
          {availableItems.length === 0 && <p className="muted-copy">Nenhum item disponível. Complete missões e visite a loja.</p>}
          {availableItems.map((item) => <article className="inventory-item" key={item.id}><span className="item-icon"><PackageOpen size={20} /></span><div><strong>{item.nameSnapshot}</strong><span>{item.durationMinutesSnapshot ? `${item.durationMinutesSnapshot} minutos` : 'Resgate imediato'} · comprado em {formatDate(item.purchasedAt)}</span></div><button className="rpg-button primary" disabled={busy === `use-${item.id}`} onClick={() => perform(`use-${item.id}`, () => onActivate(item.id), item.durationMinutesSnapshot ? 'Cronômetro iniciado.' : 'Recompensa utilizada.')}><Play size={15} /> Usar</button></article>)}
        </div></div>

        <div className="inventory-section history-section"><h3>Histórico</h3><div className="history-list">
          {history.length === 0 && <p className="muted-copy">As recompensas utilizadas aparecerão aqui.</p>}
          {history.slice(0, 20).map((item) => <div className="history-row" key={item.id}><Check size={15} /><span><strong>{item.nameSnapshot}</strong>{item.endedReason === 'cancelled' ? ' · encerrada antes do fim' : item.endedReason === 'expired' ? ' · tempo concluído' : ' · utilizada'}</span><time>{formatDate(item.endedAt)}</time></div>)}
        </div></div>
      </section>
    </div>
  );
}
