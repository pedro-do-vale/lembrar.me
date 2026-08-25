const AUDIO_PATHS = {
  desert: '/audio/ambient_sound_Desert_Sirocco.wav',
  frost: '/audio/ambient_sound_Frost_Mountain_Aura.wav',
  scratch: '/audio/scratch_sound_effect.mp3',
  reward: '/audio/more_exp_sound_effect.wav',
  levelUp: '/audio/level_up_sound_effect.wav',
} as const;

const AMBIENT_SEQUENCE = [
  AUDIO_PATHS.desert,
  AUDIO_PATHS.desert,
  AUDIO_PATHS.desert,
  AUDIO_PATHS.frost,
] as const;

const DEFAULT_AMBIENT_VOLUME = 0.22;
const EFFECT_VOLUME = 0.7;
const CROSSFADE_SECONDS = 4;

// Measured from the bundled audio files so visual feedback stays synchronized.
export const MORE_EXP_DURATION_MS = 3118;
export const LEVEL_UP_DURATION_MS = 2995;
export const SCRATCH_DURATION_MS = 480;

type Effect = 'scratch' | 'reward' | 'levelUp';

class AudioManager {
  private ambientPlayers: [HTMLAudioElement, HTMLAudioElement] | null = null;
  private activePlayer = 0;
  private sequenceIndex = 0;
  private crossfading = false;
  private wantsAmbient = false;
  private unlockListenersAttached = false;
  private ambientVolume = DEFAULT_AMBIENT_VOLUME;
  private activeEffects = new Set<HTMLAudioElement>();
  private exclusiveEffectPlaying = false;
  private exclusiveEffectQueue: Effect[] = [];

  startAmbient() {
    if (typeof Audio === 'undefined') return;
    this.wantsAmbient = true;
    this.ensureAmbientPlayers();
    const player = this.ambientPlayers![this.activePlayer];

    void player.play()
      .then(() => this.removeUnlockListeners())
      .catch(() => this.attachUnlockListeners());
  }

  stopAmbient() {
    this.wantsAmbient = false;
    this.removeUnlockListeners();
    this.ambientPlayers?.forEach((player) => player.pause());
  }

  setAmbientVolume(volume: number) {
    this.ambientVolume = Math.min(1, Math.max(0, volume));
    if (!this.ambientPlayers || this.crossfading) return;
    this.ambientPlayers[this.activePlayer].volume = this.ambientVolume;
  }

  playEffect(effect: Effect) {
    if (typeof Audio === 'undefined') return;

    if (effect !== 'scratch') {
      this.exclusiveEffectQueue.push(effect);
      this.playNextExclusiveEffect();
      return;
    }

    this.playSound(effect);
  }

  private playSound(effect: Effect, onFinished?: () => void) {
    const sound = new Audio(AUDIO_PATHS[effect]);
    sound.volume = EFFECT_VOLUME;
    this.activeEffects.add(sound);
    let finished = false;
    const release = () => {
      if (finished) return;
      finished = true;
      this.activeEffects.delete(sound);
      onFinished?.();
    };
    sound.addEventListener('ended', release, { once: true });
    sound.addEventListener('error', release, { once: true });
    void sound.play().catch(release);
  }

  private playNextExclusiveEffect() {
    if (this.exclusiveEffectPlaying) return;
    const effect = this.exclusiveEffectQueue.shift();
    if (!effect) return;

    this.exclusiveEffectPlaying = true;
    this.playSound(effect, () => {
      this.exclusiveEffectPlaying = false;
      this.playNextExclusiveEffect();
    });
  }

  private ensureAmbientPlayers() {
    if (this.ambientPlayers) return;

    const first = new Audio(AMBIENT_SEQUENCE[0]);
    const second = new Audio();
    [first, second].forEach((player) => {
      player.preload = 'auto';
      player.addEventListener('timeupdate', () => this.maybeCrossfade(player));
      player.addEventListener('ended', () => this.advanceWithoutFade(player));
    });
    first.volume = this.ambientVolume;
    second.volume = 0;
    this.ambientPlayers = [first, second];
  }

  private maybeCrossfade(player: HTMLAudioElement) {
    if (!this.ambientPlayers || player !== this.ambientPlayers[this.activePlayer]) return;
    if (!Number.isFinite(player.duration) || player.duration - player.currentTime > CROSSFADE_SECONDS) return;
    void this.crossfadeToNext();
  }

  private advanceWithoutFade(player: HTMLAudioElement) {
    if (!this.ambientPlayers || this.crossfading || player !== this.ambientPlayers[this.activePlayer]) return;
    this.sequenceIndex = (this.sequenceIndex + 1) % AMBIENT_SEQUENCE.length;
    player.src = AMBIENT_SEQUENCE[this.sequenceIndex];
    player.currentTime = 0;
    player.volume = this.ambientVolume;
    if (this.wantsAmbient) void player.play().catch(() => this.attachUnlockListeners());
  }

  private async crossfadeToNext() {
    if (!this.ambientPlayers || this.crossfading) return;
    this.crossfading = true;

    const outgoing = this.ambientPlayers[this.activePlayer];
    const incomingIndex = this.activePlayer === 0 ? 1 : 0;
    const incoming = this.ambientPlayers[incomingIndex];
    const nextSequenceIndex = (this.sequenceIndex + 1) % AMBIENT_SEQUENCE.length;
    incoming.src = AMBIENT_SEQUENCE[nextSequenceIndex];
    incoming.currentTime = 0;
    incoming.volume = 0;

    try {
      await incoming.play();
    } catch {
      this.crossfading = false;
      this.attachUnlockListeners();
      return;
    }

    const startedAt = performance.now();
    const fade = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / (CROSSFADE_SECONDS * 1000));
      outgoing.volume = this.ambientVolume * (1 - progress);
      incoming.volume = this.ambientVolume * progress;

      if (progress < 1 && this.wantsAmbient) {
        requestAnimationFrame(fade);
        return;
      }

      outgoing.pause();
      outgoing.currentTime = 0;
      outgoing.volume = 0;
      this.activePlayer = incomingIndex;
      this.sequenceIndex = nextSequenceIndex;
      this.crossfading = false;
    };
    requestAnimationFrame(fade);
  }

  private unlock = () => {
    if (this.wantsAmbient) this.startAmbient();
  };

  private attachUnlockListeners() {
    if (this.unlockListenersAttached) return;
    this.unlockListenersAttached = true;
    document.addEventListener('pointerdown', this.unlock, true);
    document.addEventListener('keydown', this.unlock, true);
  }

  private removeUnlockListeners() {
    if (!this.unlockListenersAttached) return;
    this.unlockListenersAttached = false;
    document.removeEventListener('pointerdown', this.unlock, true);
    document.removeEventListener('keydown', this.unlock, true);
  }
}

export const audioManager = new AudioManager();
