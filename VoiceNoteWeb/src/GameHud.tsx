import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Coins, PackageOpen, Sparkles, Timer } from 'lucide-react';
import { LEVEL_UP_DURATION_MS, MORE_EXP_DURATION_MS } from './audioManager';
import { getLevel, getLevelProgress, XP_PER_LEVEL } from './gameRules';
import type { GameProfile, RewardInventoryItem } from './types';

interface GameHudProps {
  profile: GameProfile | null;
  inventory: RewardInventoryItem[];
  syncing: boolean;
}

type LevelAnimationPhase = 'idle' | 'departing' | 'arriving';
const LEVEL_SWAP_DELAY_MS = Math.round(LEVEL_UP_DURATION_MS / 2);

export default function GameHud({ profile, inventory, syncing }: GameHudProps) {
  const totalXp = profile?.totalXp ?? 0;
  const level = getLevel(totalXp);
  const progress = getLevelProgress(totalXp);
  const available = inventory.filter((item) => item.status === 'available').length;
  const active = inventory.filter((item) => item.status === 'active').length;
  const [gainingXp, setGainingXp] = useState(false);
  const [highlightLevelForXp, setHighlightLevelForXp] = useState(false);
  const [displayedLevel, setDisplayedLevel] = useState(level);
  const [levelAnimationPhase, setLevelAnimationPhase] = useState<LevelAnimationPhase>('idle');
  const previousTotalXp = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);
  const animationTimer = useRef<number | null>(null);
  const levelSwapTimer = useRef<number | null>(null);
  const levelFinishTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (previousTotalXp.current === null) {
      previousTotalXp.current = totalXp;
      setDisplayedLevel(level);
      return;
    }

    const previousLevel = getLevel(previousTotalXp.current);
    if (totalXp > previousTotalXp.current) {
      if (animationFrame.current !== null) window.cancelAnimationFrame(animationFrame.current);
      if (animationTimer.current !== null) window.clearTimeout(animationTimer.current);
      setGainingXp(false);
      setHighlightLevelForXp(false);
      animationFrame.current = window.requestAnimationFrame(() => {
        setGainingXp(true);
        if (level === previousLevel) setHighlightLevelForXp(true);
        animationTimer.current = window.setTimeout(() => {
          setGainingXp(false);
          setHighlightLevelForXp(false);
        }, MORE_EXP_DURATION_MS);
      });

      if (level > previousLevel) {
        if (levelSwapTimer.current !== null) window.clearTimeout(levelSwapTimer.current);
        if (levelFinishTimer.current !== null) window.clearTimeout(levelFinishTimer.current);
        setDisplayedLevel(previousLevel);
        setLevelAnimationPhase('departing');
        levelSwapTimer.current = window.setTimeout(() => {
          setDisplayedLevel(level);
          setLevelAnimationPhase('arriving');
        }, LEVEL_SWAP_DELAY_MS);
        levelFinishTimer.current = window.setTimeout(() => {
          setLevelAnimationPhase('idle');
        }, LEVEL_UP_DURATION_MS);
      }
    } else if (level !== previousLevel) {
      setDisplayedLevel(level);
      setLevelAnimationPhase('idle');
    }
    previousTotalXp.current = totalXp;
  }, [level, profile, totalXp]);

  useEffect(() => () => {
    if (animationFrame.current !== null) window.cancelAnimationFrame(animationFrame.current);
    if (animationTimer.current !== null) window.clearTimeout(animationTimer.current);
    if (levelSwapTimer.current !== null) window.clearTimeout(levelSwapTimer.current);
    if (levelFinishTimer.current !== null) window.clearTimeout(levelFinishTimer.current);
  }, []);

  const visibleLevel = previousTotalXp.current === null ? level : displayedLevel;
  const levelClassName = levelAnimationPhase !== 'idle'
    ? `level-${levelAnimationPhase}`
    : highlightLevelForXp ? 'gaining-xp' : undefined;

  return (
    <section className="game-hud" aria-label="Progresso do aventureiro">
      <div className="hud-level">
        <span className="hud-level-label">Nível</span>
        <strong
          className={levelClassName}
          style={{
            '--xp-gain-duration': `${MORE_EXP_DURATION_MS}ms`,
            '--level-phase-duration': `${LEVEL_SWAP_DELAY_MS}ms`,
          } as CSSProperties}
        >
          {visibleLevel}
        </strong>
      </div>
      <div className="hud-xp">
        <div className="hud-row">
          <span><Sparkles size={15} /> Experiência</span>
          <span>{progress}/{XP_PER_LEVEL} XP</span>
        </div>
        <div className="xp-track" aria-label={`${progress} de ${XP_PER_LEVEL} pontos para o próximo nível`}>
          <span
            className={gainingXp ? 'gaining-xp' : undefined}
            style={{
              width: `${progress}%`,
              transitionDuration: `${MORE_EXP_DURATION_MS}ms`,
              '--xp-gain-duration': `${MORE_EXP_DURATION_MS}ms`,
            } as CSSProperties}
          />
        </div>
      </div>
      <div className="hud-stat"><Coins size={19} /><span><strong>{profile?.coins ?? 0}</strong> moedas</span></div>
      <div className="hud-stat"><PackageOpen size={19} /><span><strong>{available}</strong> itens</span></div>
      <div className="hud-stat"><Timer size={19} /><span><strong>{active}</strong> ativos</span></div>
      {syncing && <span className="sync-badge">Sincronizando…</span>}
    </section>
  );
}
