import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LEVEL_UP_DURATION_MS, MORE_EXP_DURATION_MS } from './audioManager';
import GameHud from './GameHud';
import type { GameProfile, RewardInventoryItem } from './types';

describe('GameHud', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows derived level, balance and inventory status', () => {
    const profile: GameProfile = {
      id: 'solo', totalXp: 125, coins: 30, startedAt: 1,
      migrationComplete: true, updatedAt: 1,
    };
    const inventory = [
      { id: 'a', status: 'available' },
      { id: 'b', status: 'active' },
    ] as RewardInventoryItem[];

    render(<GameHud profile={profile} inventory={inventory} syncing={false} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('25/100 XP')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('itens')).toBeInTheDocument();
    expect(screen.getByText('ativos')).toBeInTheDocument();
  });

  it('highlights the XP fill in yellow only while XP is increasing', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const baseProfile: GameProfile = {
      id: 'solo', totalXp: 20, coins: 0, startedAt: 1,
      migrationComplete: true, updatedAt: 1,
    };
    const { container, rerender } = render(<GameHud profile={baseProfile} inventory={[]} syncing={false} />);

    rerender(<GameHud profile={{ ...baseProfile, totalXp: 30 }} inventory={[]} syncing={false} />);

    const fill = screen.getByLabelText('30 de 100 pontos para o próximo nível').firstElementChild;
    const levelNumber = container.querySelector('.hud-level strong');
    expect(fill).toHaveClass('gaining-xp');
    expect(levelNumber).toHaveClass('gaining-xp');

    act(() => vi.advanceTimersByTime(MORE_EXP_DURATION_MS));
    expect(fill).not.toHaveClass('gaining-xp');
    expect(levelNumber).not.toHaveClass('gaining-xp');
  });

  it('changes the level number only at the white midpoint of a level-up', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const baseProfile: GameProfile = {
      id: 'solo', totalXp: 90, coins: 0, startedAt: 1,
      migrationComplete: true, updatedAt: 1,
    };
    const { container, rerender } = render(<GameHud profile={baseProfile} inventory={[]} syncing={false} />);

    rerender(<GameHud profile={{ ...baseProfile, totalXp: 100 }} inventory={[]} syncing={false} />);

    const levelNumber = container.querySelector('.hud-level strong');
    expect(levelNumber).toHaveTextContent('1');
    expect(levelNumber).toHaveClass('level-departing');

    act(() => vi.advanceTimersByTime(Math.round(LEVEL_UP_DURATION_MS / 2)));
    expect(levelNumber).toHaveTextContent('2');
    expect(levelNumber).toHaveClass('level-arriving');

    act(() => vi.advanceTimersByTime(LEVEL_UP_DURATION_MS - Math.round(LEVEL_UP_DURATION_MS / 2)));
    expect(levelNumber).toHaveTextContent('2');
    expect(levelNumber).not.toHaveClass('level-arriving');
  });
});
