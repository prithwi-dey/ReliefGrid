// Web Audio API Synthesizer for Tactical Telemetry Audio Feedback
class TelemetrySoundFX {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (val) this.initCtx();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // Tactical radar ping
  public ping(frequency = 880, duration = 0.15) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, this.ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // AudioContext muted/ignored
    }
  }

  // Critical SOS alert tone (two quick urgent beeps)
  public alertCritical() {
    if (!this.enabled) return;
    this.ping(1050, 0.08);
    setTimeout(() => this.ping(1400, 0.12), 90);
  }

  // Safe rescue chime (soothing ascending fifth)
  public rescueChime() {
    if (!this.enabled) return;
    this.ping(523.25, 0.1); // C5
    setTimeout(() => this.ping(659.25, 0.12), 110); // E5
    setTimeout(() => this.ping(783.99, 0.2), 220); // G5
  }

  // Flood hazard warning klaxon
  public hazardWarning() {
    if (!this.enabled) return;
    this.ping(440, 0.18);
    setTimeout(() => this.ping(370, 0.22), 160);
  }
}

export const soundFX = new TelemetrySoundFX();
