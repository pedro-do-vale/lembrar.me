import { afterEach, describe, expect, it, vi } from 'vitest';
import { audioManager } from './audioManager';

class FakeAudio {
  static instances: FakeAudio[] = [];

  src: string;
  volume = 1;
  private listeners = new Map<string, Array<() => void>>();
  play = vi.fn(() => Promise.resolve());

  constructor(src = '') {
    this.src = src;
    FakeAudio.instances.push(this);
  }

  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  finish() {
    this.listeners.get('ended')?.forEach((listener) => listener());
  }
}

describe('audioManager', () => {
  afterEach(() => {
    FakeAudio.instances.at(-1)?.finish();
    FakeAudio.instances = [];
    vi.unstubAllGlobals();
  });

  it('queues XP and level-up effects instead of playing them together', () => {
    vi.stubGlobal('Audio', FakeAudio);

    audioManager.playEffect('reward');
    audioManager.playEffect('levelUp');

    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0].src).toContain('more_exp_sound_effect.wav');

    FakeAudio.instances[0].finish();

    expect(FakeAudio.instances).toHaveLength(2);
    expect(FakeAudio.instances[1].src).toContain('level_up_sound_effect.wav');
    expect(FakeAudio.instances[1].play).toHaveBeenCalledOnce();
  });

  it('plays the page-turn effect as an independent interface sound', () => {
    vi.stubGlobal('Audio', FakeAudio);

    audioManager.playEffect('pageTurn');

    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0].src).toContain('pageturn_sound_effect.mp3');
    expect(FakeAudio.instances[0].play).toHaveBeenCalledOnce();
  });
});
