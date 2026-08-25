import { Coins, PackageOpen, Sparkles, Timer } from 'lucide-react';
import { MORE_EXP_DURATION_MS } from './audioManager';
import { getLevel, getLevelProgress, XP_PER_LEVEL } from './gameRules';
import type { GameProfile, RewardInventoryItem } from './types';

interface GameHudProps {
  profile: GameProfile | null;
  inventory: RewardInventoryItem[];
  syncing: boolean;
}

export default function GameHud({ profile, inventory, syncing }: GameHudProps) {
  const totalXp = profile?.totalXp ?? 0;
  const level = getLevel(totalXp);
  const progress = getLevelProgress(totalXp);
  const available = inventory.filter((item) => item.status === 'available').length;
  const active = inventory.filter((item) => item.status === 'active').length;

  return (
    <section className="game-hud" aria-label="Progresso do aventureiro">
      <div className="hud-level">
        <span className="hud-level-label">Nível</span>
        <strong>{level}</strong>
      </div>
      <div className="hud-xp">
        <div className="hud-row">
          <span><Sparkles size={15} /> Experiência</span>
          <span>{progress}/{XP_PER_LEVEL} XP</span>
        </div>
        <div className="xp-track" aria-label={`${progress} de ${XP_PER_LEVEL} pontos para o próximo nível`}>
          <span style={{ width: `${progress}%`, transitionDuration: `${MORE_EXP_DURATION_MS}ms` }} />
        </div>
      </div>
      <div className="hud-stat"><Coins size={19} /><span><strong>{profile?.coins ?? 0}</strong> moedas</span></div>
      <div className="hud-stat"><PackageOpen size={19} /><span><strong>{available}</strong> itens</span></div>
      <div className="hud-stat"><Timer size={19} /><span><strong>{active}</strong> ativos</span></div>
      {syncing && <span className="sync-badge">Sincronizando…</span>}
    </section>
  );
}
