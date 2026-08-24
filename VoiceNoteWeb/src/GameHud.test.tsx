import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GameHud from './GameHud';
import type { GameProfile, RewardInventoryItem } from './types';

describe('GameHud', () => {
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
});
