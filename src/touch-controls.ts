import { TouchState } from './touch-state';

export class TouchControls {
  readonly state = new TouchState();
  enabled = false;
  private playing = false;
  private buttons: HTMLButtonElement[];
  constructor(private root: HTMLElement) {
    this.buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button'));
    for (const kind of ['move', 'aim'] as const) {
      const stick = root.querySelector<HTMLButtonElement>(`[data-stick="${kind}"]`)!;
      const nub = stick.querySelector<HTMLElement>('.stick-nub')!;
      const update = (event: PointerEvent) => {
        const box = stick.getBoundingClientRect(), radius = box.width * 0.35;
        this.state.moveStick(kind, event.pointerId, event.clientX - box.left - box.width / 2, event.clientY - box.top - box.height / 2, radius);
        const value = this.state[kind]; nub.style.transform = `translate(${value.x * radius}px, ${value.y * radius}px)`;
      };
      stick.addEventListener('pointerdown', event => {
        event.preventDefault(); event.stopPropagation();
        if (!this.playing || !this.state.begin(kind, event.pointerId)) return;
        stick.setPointerCapture(event.pointerId); stick.classList.add('held'); update(event);
      });
      stick.addEventListener('pointermove', event => { if (!stick.hasPointerCapture(event.pointerId)) return; event.preventDefault(); update(event); });
      const release = (event: PointerEvent) => {
        const id = kind === 'move' ? this.state.movePointer : this.state.aimPointer;
        if (id !== event.pointerId) return;
        this.state.end(event.pointerId); nub.style.transform = ''; stick.classList.remove('held');
      };
      stick.addEventListener('pointerup', release); stick.addEventListener('pointercancel', release); stick.addEventListener('lostpointercapture', release);
      // Keep the actions accessible to keyboard/switch activation as well.
      stick.addEventListener('keydown', event => {
        if (!this.playing) return;
        if (kind === 'move') { const moves: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }; const vector = moves[event.key]; if (vector) { event.preventDefault(); this.state.move = { x: vector[0], y: vector[1] }; } }
        else if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); this.state.aimHeld = true; }
      });
      stick.addEventListener('keyup', () => { if (kind === 'move') this.state.move = { x: 0, y: 0 }; else this.state.aimHeld = false; });
      stick.addEventListener('blur', () => { if (kind === 'move' && this.state.movePointer === null) this.state.move = { x: 0, y: 0 }; if (kind === 'aim' && this.state.aimPointer === null) this.state.aimHeld = false; });
    }
    for (const action of ['bomb', 'dash'] as const) root.querySelector(`[data-action="${action}"]`)!.addEventListener('click', event => { event.preventDefault(); if (this.playing) this.state.queue(action); });
    const revive = root.querySelector<HTMLButtonElement>('[data-action="revive"]')!;
    revive.addEventListener('pointerdown', event => { event.preventDefault(); if (this.playing) { revive.setPointerCapture(event.pointerId); this.state.revive = true; } });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) revive.addEventListener(type, () => { this.state.revive = false; });
    revive.addEventListener('keydown', event => { if (this.playing && (event.code === 'Space' || event.code === 'Enter')) this.state.revive = true; });
    revive.addEventListener('keyup', () => { this.state.revive = false; });
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.reset(); });
    window.addEventListener('orientationchange', () => this.reset());
  }
  setEnabled(value: boolean) { this.enabled = value; this.root.classList.toggle('hidden', !value); document.getElementById('game-frame')!.classList.toggle('touch-enabled', value); if (!value) this.reset(); }
  setPlaying(value: boolean) {
    if (this.playing === value) return;
    this.playing = value; this.root.classList.toggle('inactive', !value);
    this.buttons.forEach(button => { button.disabled = !value; }); this.reset();
  }
  reset() { this.state.reset(); this.root.querySelectorAll<HTMLElement>('.stick-nub').forEach(nub => { nub.style.transform = ''; }); this.root.querySelectorAll('.held').forEach(stick => stick.classList.remove('held')); }
}
