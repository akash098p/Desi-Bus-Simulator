/**
 * SoundManager - Synthesized game audio using the Web Audio API.
 * No external audio files required; all sounds are generated procedurally.
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineRunning = false;
  private muted = false;

  /** Lazily create the AudioContext (must be called after a user gesture). */
  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /** Unlock audio on first user interaction (click/keydown). */
  unlock(): void {
    this.ensureContext();
  }

  /** Toggle mute for all game audio. */
  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.8;
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Play a short UI click sound. */
  playClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  }

  /** Play the loud desi bus horn - layered sawtooth + square with vibrato. */
  playHorn(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const duration = 0.6;

    // --- Layer 1: Main horn (sawtooth, low-mid) ---
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(220, now);
    // Vibrato on the main tone
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 6;
    lfoGain.gain.value = 8;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfo.start(now);
    lfo.stop(now + duration);

    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.exponentialRampToValueAtTime(0.35, now + 0.05);
    gain1.gain.setValueAtTime(0.35, now + duration - 0.1);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // --- Layer 2: Higher harmonic (square, adds "honk" character) ---
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "square";
    osc2.frequency.setValueAtTime(330, now);
    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
    gain2.gain.setValueAtTime(0.12, now + duration - 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // --- Layer 3: Sub bass (adds weight) ---
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(110, now);
    gain3.gain.setValueAtTime(0.0001, now);
    gain3.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
    gain3.gain.setValueAtTime(0.25, now + duration - 0.1);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // Route through a lowpass filter for a fuller, less harsh tone
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;

    osc1.connect(gain1);
    gain1.connect(filter);
    osc2.connect(gain2);
    gain2.connect(filter);
    osc3.connect(gain3);
    gain3.connect(filter);
    filter.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
    osc3.stop(now + duration);
  }

  /** Play engine ignition/start sound. */
  playEngineStart(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;

    // Low rumble sweep up
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(40, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.4);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 400;

    osc.connect(gain);
    gain.connect(filter);
    filter.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  /** Play air-brake hiss sound. */
  playBrake(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const duration = 0.35;

    // White noise buffer for the hiss
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2500;
    filter.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + duration);
  }

  /** Play a celebratory success jingle (arpeggio). */
  playSuccess(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const master = this.masterGain;

    const now = ctx.currentTime;
    // C major arpeggio: C5, E5, G5, C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const noteDuration = 0.18;

    notes.forEach((freq, i) => {
      const start = now + i * noteDuration;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + noteDuration - 0.02);

      // Add a sparkle harmonic
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.value = freq * 2;
      gain2.gain.setValueAtTime(0.0001, start);
      gain2.gain.exponentialRampToValueAtTime(0.1, start + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.0001, start + noteDuration - 0.02);

      osc.connect(gain);
      gain.connect(master);
      osc2.connect(gain2);
      gain2.connect(master);
      osc.start(start);
      osc.stop(start + noteDuration);
      osc2.start(start);
      osc2.stop(start + noteDuration);
    });

    // Final sustained chord
    const chordStart = now + notes.length * noteDuration;
    [523.25, 659.25, 783.99].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, chordStart);
      gain.gain.exponentialRampToValueAtTime(0.2, chordStart + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, chordStart + 0.6);
      osc.connect(gain);
      gain.connect(master);
      osc.start(chordStart);
      osc.stop(chordStart + 0.65);
    });
  }

  /**
   * Start the continuous engine loop.
   * The engine pitch will be updated via setEngineSpeed().
   */
  startEngine(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.engineRunning) return;

    const now = ctx.currentTime;

    // Main engine oscillator (sawtooth for rumble)
    const osc1 = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.value = 45;

    // Second oscillator for beat/rumble character
    const osc2 = ctx.createOscillator();
    osc2.type = "square";
    osc2.frequency.value = 22.5;

    // Lowpass filter to keep it rumbly, not harsh
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 300;

    // Gain envelope - fade in
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.3);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);

    this.engineOsc = osc1;
    this.engineOsc2 = osc2;
    this.engineFilter = filter;
    this.engineGain = gain;
    this.engineRunning = true;
  }

  /** Update engine pitch based on current speed (0-100 km/h). */
  setEngineSpeed(speedKmh: number): void {
    if (!this.engineRunning || !this.engineOsc || !this.engineOsc2) return;
    const ctx = this.ctx;
    if (!ctx) return;

    // Map speed 0-100 km/h to engine frequency 45-180 Hz
    const freq = 45 + (Math.min(speedKmh, 100) / 100) * 135;
    const t = ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(freq, t, 0.1);
    this.engineOsc2.frequency.setTargetAtTime(freq / 2, t, 0.1);

    // Slightly open the filter at higher RPM
    if (this.engineFilter) {
      this.engineFilter.frequency.setTargetAtTime(
        300 + (Math.min(speedKmh, 100) / 100) * 500,
        t,
        0.1,
      );
    }
  }

  /** Stop the engine loop with a fade-out. */
  stopEngine(): void {
    if (!this.engineRunning || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    if (this.engineGain) {
      this.engineGain.gain.setTargetAtTime(0.0001, now, 0.1);
    }
    if (this.engineOsc) {
      this.engineOsc.stop(now + 0.5);
    }
    if (this.engineOsc2) {
      this.engineOsc2.stop(now + 0.5);
    }

    this.engineOsc = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.engineRunning = false;
  }
}

/** Singleton instance exported for use across the app. */
export const soundManager = new SoundManager();