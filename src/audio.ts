export class ArcadeAudio {
  enabled = true;
  music = true;
  private context?: AudioContext;
  private master?: GainNode;
  private lastHit = 0;
  private timer?: ReturnType<typeof setInterval>;
  private beat = 0;
  private noise?: AudioBuffer;
  async unlock() {
    try {
      this.context ??= new AudioContext();
      if (!this.master) { this.master = this.context.createGain(); this.master.gain.value = 0.21; this.master.connect(this.context.destination); }
      await this.context.resume();
      if (!this.timer) this.timer = setInterval(() => this.tick(), 230);
    } catch { /* Audio is optional when a browser blocks it. */ }
  }
  setEnabled(value: boolean) { this.enabled = value; if (this.master) this.master.gain.value = value ? 0.21 : 0; }
  private tone(frequency: number, end: number, duration: number, type: OscillatorType, gain: number, delay = 0) {
    if (!this.context || !this.master || !this.enabled) return;
    const start = this.context.currentTime + delay, oscillator = this.context.createOscillator(), amp = this.context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start); oscillator.frequency.exponentialRampToValueAtTime(Math.max(12, end), start + duration);
    amp.gain.setValueAtTime(gain, start); amp.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(amp); amp.connect(this.master); oscillator.start(start); oscillator.stop(start + duration + 0.02);
  }
  shot(heavy = false) { this.tone(heavy ? 115 : 390, heavy ? 40 : 145, heavy ? 0.17 : 0.065, 'triangle', heavy ? 0.45 : 0.18); }
  hit() { const now = performance.now(); if (now - this.lastHit < 55) return; this.lastHit = now; this.tone(210, 70, 0.065, 'sine', 0.18); }
  pickup() { [480, 600, 720].forEach((n, i) => this.tone(n, n * 1.1, 0.13, 'triangle', 0.3, i * 0.065)); }
  hurt() { this.tone(180, 55, 0.25, 'sawtooth', 0.3); }
  dash() { this.tone(110, 580, 0.11, 'sine', 0.3); }
  wave() { [260, 330, 390, 520].forEach((n, i) => this.tone(n, n, 0.21, 'triangle', 0.25, i * 0.07)); }
  blast() {
    this.tone(100, 22, 0.4, 'sine', 1.1);
    if (!this.context || !this.master || !this.enabled) return;
    if (!this.noise) { this.noise = this.context.createBuffer(1, this.context.sampleRate / 2, this.context.sampleRate); const data = this.noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1; }
    const source = this.context.createBufferSource(), amp = this.context.createGain(), filter = this.context.createBiquadFilter();
    source.buffer = this.noise; filter.type = 'lowpass'; filter.frequency.value = 900;
    amp.gain.setValueAtTime(0.65, this.context.currentTime); amp.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.4);
    source.connect(filter); filter.connect(amp); amp.connect(this.master); source.start(); source.stop(this.context.currentTime + 0.45);
  }
  private tick() {
    if (!this.music || !this.enabled || this.context?.state !== 'running') return;
    const n = this.beat++ % 16;
    if (n % 4 === 0) this.tone(82, 38, 0.14, 'sine', 0.28);
    else if (n % 2 === 0) this.tone(280, 140, 0.06, 'triangle', 0.08);
    if (n % 2 === 1) { const notes = [392, 0, 523, 587, 0, 440, 392, 330]; const note = notes[Math.floor(n / 2)]; if (note) this.tone(note, note * 0.99, 0.12, 'sine', 0.11); }
  }
}
