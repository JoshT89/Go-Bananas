import Phaser from 'phaser';
import { Simulation, WIDTH, HEIGHT, PLAYER_COLOURS, PLAYER_NAMES, WORLDS, idleInput, clamp } from './simulation';
import type { Input, GameEvent, Enemy } from './simulation';
import { makeArt } from './art';
import { ArcadeAudio } from './audio';
import { heartFills } from './health';
import { controllerForPlayer } from './local-lobby';
import type { TouchControls } from './touch-controls';

export type Hooks = { ready: () => void; hud: (sim: Simulation) => void; banner: (text: string) => void; ended: (sim: Simulation) => void; pads: (pads: number[]) => void };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; colour: number };
export class JungleScene extends Phaser.Scene {
  sim = new Simulation();
  audio = new ArcadeAudio();
  paused = false;
  shake = true;
  reduced = false;
  assist = false;
  controllerOnly = false;
  touch?: TouchControls;
  private background!: Phaser.GameObjects.Image;
  private under!: Phaser.GameObjects.Graphics;
  private over!: Phaser.GameObjects.Graphics;
  private sprites = new Map<string, Phaser.GameObjects.Image>();
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private particles: Particle[] = [];
  private rings: { x: number; y: number; life: number; max: number; radius: number; colour: number }[] = [];
  private keys = new Set<string>();
  private pressed = new Set<string>();
  private padPrevious = new Map<number, boolean[]>();
  private padIds: number[] = [];
  private lastHud = 0;
  private lastPads = 0;
  private lastWorld = -1;
  private accumulator = 0;
  private finished = false;
  private floats = 0;
  private pointerBomb = false;
  private hooks: Hooks;
  constructor(hooks: Hooks) { super('jungle'); this.hooks = hooks; }
  create() {
    makeArt(this);
    this.background = this.add.image(0, 0, 'world0').setOrigin(0);
    this.under = this.add.graphics().setDepth(1);
    this.over = this.add.graphics().setDepth(10000);
    this.prepareLobby();
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => { if (pointer.rightButtonDown()) this.pointerBomb = true; });
    const keydown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === 'INPUT') return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      if (!this.keys.has(event.code)) this.pressed.add(event.code);
      this.keys.add(event.code);
    };
    const keyup = (event: KeyboardEvent) => { this.keys.delete(event.code); };
    const blur = () => { this.keys.clear(); this.pressed.clear(); };
    window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', blur);
    this.events.once('shutdown', () => { window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', blur); });
    this.hooks.ready();
  }
  prepareLobby() {
    this.sim = new Simulation(); this.sim.addPlayer(0); this.paused = false; this.particles = []; this.rings = [];
    for (const [kind, x, y] of [['chaser', 370, 280], ['pouncer', 940, 350], ['chaser', 770, 570], ['bruiser', 1100, 570], ['chaser', 1020, 200], ['chaser', 240, 520]] as const) {
      this.sim.spawnEnemy(kind); const e = this.sim.enemies.at(-1)!; e.x = x; e.y = y; e.age = 2; e.angle = Math.atan2(410 - y, 650 - x);
    }
    this.sim.drop('nuts', 800, 300); this.sim.drop('bomb', 490, 540); this.sim.drop('tank', 950, 540);
  }
  start(ids: number[]) {
    this.sim.start(ids); this.finished = false; this.paused = false; this.accumulator = 0;
    this.particles = []; this.rings = []; this.keys.clear(); this.pressed.clear(); this.pointerBomb = false;
    this.touch?.reset(); this.audio.unlock(); this.hooks.hud(this.sim);
  }
  private inputs() {
    const inputs = new Map<number, Input>();
    const pads = navigator.getGamepads?.() ?? [];
    for (const p of this.sim.players) {
      const input = idleInput();
      const padIndex = controllerForPlayer(p.id, this.controllerOnly ? 'controllers' : 'mixed', this.padIds);
      const pad = padIndex !== undefined ? pads[padIndex] : null;
      if (pad?.connected) {
        input.mx = Math.abs(pad.axes[0] ?? 0) > 0.18 ? pad.axes[0] : 0;
        input.my = Math.abs(pad.axes[1] ?? 0) > 0.18 ? pad.axes[1] : 0;
        const ax = pad.axes[2] ?? 0, ay = pad.axes[3] ?? 0;
        input.ax = Math.hypot(ax, ay) > 0.2 ? ax : Math.cos(p.angle); input.ay = Math.hypot(ax, ay) > 0.2 ? ay : Math.sin(p.angle);
        input.fire = pad.buttons[7]?.pressed || Math.hypot(ax, ay) > 0.35;
        const old = this.padPrevious.get(pad.index) ?? [];
        input.bomb = !!pad.buttons[6]?.pressed && !old[6]; input.dash = (!!pad.buttons[5]?.pressed && !old[5]) || (!!pad.buttons[0]?.pressed && !old[0]); input.revive = !!pad.buttons[2]?.pressed;
      }
      if (p.id === 0) {
        const mx = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
        const my = Number(this.keys.has('KeyS')) - Number(this.keys.has('KeyW'));
        if (mx || my || !pad) { input.mx = mx; input.my = my; }
        const pointer = this.input.activePointer;
        const touching = this.touch?.enabled;
        if ((!pointer.wasTouch && pointer.isDown) || (!touching && !pad)) { input.ax = pointer.x - p.x; input.ay = pointer.y - p.y; }
        input.fire ||= (!pointer.wasTouch && pointer.leftButtonDown()) || this.keys.has('KeyJ');
        input.dash ||= this.pressed.has('Space'); input.bomb ||= this.pointerBomb || this.pressed.has('KeyQ'); input.revive ||= this.keys.has('KeyE');
        if (touching && !this.controllerOnly) {
          const mobile = this.touch!.state.read();
          if (!mobile.fire && !input.fire) { input.ax = Math.cos(p.angle); input.ay = Math.sin(p.angle); }
          if (mobile.mx || mobile.my || this.touch!.state.movePointer !== null) { input.mx = mobile.mx; input.my = mobile.my; }
          if (mobile.fire) {
            const manualFire = input.fire;
            input.fire = true;
            if (Math.hypot(mobile.ax, mobile.ay) > 0.15) { input.ax = mobile.ax; input.ay = mobile.ay; }
            else if (!manualFire) {
              const nearest = this.sim.enemies.reduce<Enemy | undefined>((nearest, e) => !nearest || Math.hypot(e.x - p.x, e.y - p.y) < Math.hypot(nearest.x - p.x, nearest.y - p.y) ? e : nearest, undefined);
              input.ax = nearest ? nearest.x - p.x : Math.cos(p.angle); input.ay = nearest ? nearest.y - p.y : Math.sin(p.angle);
            }
          }
          input.bomb ||= mobile.bomb; input.dash ||= mobile.dash; input.revive ||= mobile.revive;
        }
      }
      const manualTouchAim = p.id === 0 && this.touch?.enabled && Math.hypot(this.touch.state.aim.x, this.touch.state.aim.y) > 0.15;
      if (this.assist && !manualTouchAim && this.sim.enemies.length && (input.fire || !pad)) {
        let enemy = this.sim.enemies[0];
        for (const e of this.sim.enemies) if (Math.hypot(e.x - p.x, e.y - p.y) < Math.hypot(enemy.x - p.x, enemy.y - p.y)) enemy = e;
        input.ax = enemy.x - p.x; input.ay = enemy.y - p.y;
      }
      inputs.set(p.id, input);
    }
    for (const pad of pads) if (pad) this.padPrevious.set(pad.index, pad.buttons.map(b => b.pressed));
    this.pressed.clear(); this.pointerBomb = false;
    return inputs;
  }
  update(time: number, delta: number) {
    if (!this.under) return;
    const dt = Math.min(0.05, delta / 1000);
    if (time - this.lastPads > 400) {
      this.lastPads = time;
      this.padIds = Array.from(navigator.getGamepads?.() ?? []).filter((p): p is Gamepad => !!p?.connected).map(p => p.index);
      this.hooks.pads(this.padIds);
    }
    if (!this.paused && (this.sim.mode === 'playing' || this.sim.mode === 'break')) {
      this.accumulator += dt;
      // Read edge-triggered actions only when they can reach a simulation step.
      const input = this.accumulator >= 1 / 60 ? this.inputs() : new Map<number, Input>();
      let steps = 0;
      while (this.accumulator >= 1 / 60 && steps < 4) {
        this.sim.update(1 / 60, input); this.accumulator -= 1 / 60; steps++;
        for (const i of input.values()) { i.bomb = false; i.dash = false; }
      }
      if (steps) this.touch?.state.consumeActions();
      for (const event of this.sim.events.splice(0)) this.effect(event);
      if ((this.sim.mode as string) === 'over' || (this.sim.mode as string) === 'won') { if (!this.finished) { this.finished = true; this.hooks.ended(this.sim); } }
    }
    if (time - this.lastHud > 90) { this.hooks.hud(this.sim); this.lastHud = time; }
    if (import.meta.env?.DEV) {
      const host = document.getElementById('game');
      if (host) { host.dataset.simulation = JSON.stringify({ mode: this.sim.mode, paused: this.paused, time: this.sim.time, delta, fps: this.game.loop.actualFps, rawDelta: this.game.loop.rawDelta, accumulator: this.accumulator, frame: time, players: this.sim.players.map(p => ({ id: p.id, x: p.x, y: p.y, hp: p.hp })), enemies: this.sim.enemies.length }); }
    }
    this.renderWorld(dt, time / 1000);
  }
  private sprite(key: string, texture: string, x: number, y: number, w: number, h: number) {
    let sprite = this.sprites.get(key);
    if (!sprite) { sprite = this.add.image(x, y, texture); this.sprites.set(key, sprite); }
    sprite.setTexture(texture).setPosition(x, y).setDisplaySize(w, h).setVisible(true).setAlpha(1).clearTint();
    return sprite;
  }
  private label(key: string, text: string, x: number, y: number, colour = '#fbedd0', size = 11) {
    let label = this.labels.get(key);
    if (!label) { label = this.add.text(x, y, text, { fontFamily: 'monospace', fontSize: size, fontStyle: 'bold', color: colour, stroke: '#1b3025', strokeThickness: 4 }).setOrigin(0.5).setDepth(9000); this.labels.set(key, label); }
    label.setText(text).setPosition(x, y).setVisible(true); return label;
  }
  private renderWorld(dt: number, time: number) {
    for (const s of this.sprites.values()) s.setVisible(false);
    for (const t of this.labels.values()) t.setVisible(false);
    if (this.lastWorld !== this.sim.world) { this.background.setTexture(`world${this.sim.world}`); this.lastWorld = this.sim.world; }
    const g = this.under, over = this.over; g.clear(); over.clear();
    const ready = this.sim.mode === 'ready';
    for (const e of this.sim.enemies) {
      if (e.windup > 0) {
        const reach = e.kind === 'boss' ? 330 : 180;
        g.lineStyle(e.kind === 'boss' ? 26 : 15, 0xf9d47a, 0.25 + Math.sin(time * 20) * 0.12);
        g.lineBetween(e.x, e.y, e.x + e.dx * reach, e.y + e.dy * reach);
        g.lineStyle(2, 0xffdc86, 0.8); g.strokeCircle(e.x + e.dx * reach, e.y + e.dy * reach, e.radius + 10);
      }
      if (e.age < 0.7) { g.lineStyle(2, 0xf3d58c, 0.8); g.strokeCircle(e.x, e.y, 26 + Math.sin(e.age * 15) * 6); }
      const size = e.kind === 'boss' ? 148 : e.kind === 'bruiser' ? 83 : 65;
      const bob = ready ? Math.sin(time * 2 + e.id) * 2 : Math.sin(e.age * 16) * 1.3;
      const s = this.sprite(`e${e.id}`, e.kind, e.x, e.y + bob, size, size * 0.86).setRotation(e.angle).setDepth(e.y + 4);
      if (e.age < 0.5) s.setAlpha(0.3 + e.age);
      if (e.flash > 0 && !this.reduced) s.setTintFill(0xfff2bf);
      if (e.hp < e.maxHp && e.kind !== 'boss') { over.fillStyle(0x233a2b, 0.85); over.fillRoundedRect(e.x - 17, e.y - 30, 34, 4, 2); over.fillStyle(0xf3bb57); over.fillRoundedRect(e.x - 17, e.y - 30, 34 * Math.max(0, e.hp / e.maxHp), 4, 2); }
      if (this.sim.world === 2) { g.lineStyle(2, 0xcddfe4, 0.45); g.strokeCircle(e.x + Math.cos(e.angle) * 15, e.y + Math.sin(e.angle) * 15, size * 0.28); }
    }
    for (const item of this.sim.pickups) {
      const y = item.y + Math.sin(time * 3 + item.id) * 3;
      const tint = item.kind === 'tank' ? 0xf0bf60 : item.kind === 'heal' ? 0xf3999e : 0xd6e694;
      g.fillStyle(tint, 0.10); g.fillCircle(item.x, item.y + 5, 30); g.lineStyle(1, tint, 0.45); g.strokeCircle(item.x, item.y + 5, 25);
      const key = item.kind === 'bomb' ? 'melon' : item.kind;
      this.sprite(`i${item.id}`, key, item.x, y, item.kind === 'tank' ? 50 : 29, item.kind === 'tank' ? 44 : 29).setDepth(item.y + 5).setAlpha(item.life < 4 ? 0.6 + Math.sin(time * 12) * 0.4 : 1);
      const title = item.kind === 'tank' ? 'TIMBER TANK' : item.kind === 'nuts' ? 'NUTCRACKER' : item.kind === 'coconut' ? 'COCONUTS' : item.kind === 'heal' ? 'HEALTH' : item.kind === 'bomb' ? 'MELON BOMBS' : 'SHIELD';
      this.label(`i${item.id}`, title, item.x, y + 31, '#e9e6b6', 9);
    }
    for (const p of this.sim.players) {
      const colour = Phaser.Display.Color.HexStringToColor(PLAYER_COLOURS[p.id]).color;
      if (!p.alive) {
        this.sprite(`p${p.id}`, `monkey${p.id}`, p.x, p.y, 55, 55).setRotation(p.angle + Math.PI / 2).setAlpha(0.45).setDepth(p.y);
        over.lineStyle(3, 0xf4a69b, 0.8); over.strokeCircle(p.x, p.y, 35);
        if (p.reviveProgress) { over.lineStyle(5, 0xb2df93, 0.9); over.beginPath(); over.arc(p.x, p.y, 35, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.reviveProgress / 1.6); over.strokePath(); }
        this.label(`p${p.id}`, p.downTime > 0 ? `REVIVE NEARBY · E / X / ♡ · ${Math.ceil(p.downTime)}s` : 'OUT FOR THIS RUN', p.x, p.y + 45, '#ffc9b0', 11); continue;
      }
      g.lineStyle(2, colour, 0.7); g.strokeEllipse(p.x, p.y + 14, 42, 22); g.fillStyle(colour, 0.12); g.fillEllipse(p.x, p.y + 14, 42, 22);
      const tank = p.vehicleTime > 0;
      const angle = ready ? -0.65 : p.angle;
      const bob = ready ? Math.sin(time * 2.5) * 1.6 : Math.sin(this.sim.time * 14) * 0.5;
      const sprite = this.sprite(`p${p.id}`, tank ? 'tank' : `monkey${p.id}`, p.x, p.y + bob, tank ? 95 : 67, tank ? 84 : 67).setRotation(angle).setDepth(p.y + 8);
      if (p.invulnerable > 0 && !this.reduced) sprite.setAlpha(0.65 + Math.sin(time * 24) * 0.35);
      if (p.shield > 0) { over.lineStyle(2, 0xabe7e4, 0.55 + Math.sin(time * 4) * 0.15); over.strokeCircle(p.x, p.y, 35); }
      if (p.dashTime > 0) { g.lineStyle(14, colour, 0.35); g.lineBetween(p.x, p.y, p.x - p.dashX * 58, p.y - p.dashY * 58); }
      this.label(`p${p.id}`, tank ? `TIMBER TANK · ${Math.ceil(p.vehicleTime)}s` : `${PLAYER_NAMES[p.id]} · P${p.id + 1}`, p.x, p.y + (tank ? 54 : 40), PLAYER_COLOURS[p.id], 10);
      const healthY = p.y - (tank ? 48 : 39);
      over.fillStyle(0x1b3025, 0.8); over.fillRoundedRect(p.x - 28, healthY - 11, 56, 21, 5);
      heartFills(p.hp).forEach((fill, index) => this.sprite(`hp${p.id}-${index}`, `health-${fill}`, p.x + (index - 1) * 17, healthY, 17, 17).setDepth(11000));
      if (p.dashCd > 0) { over.lineStyle(2, colour, 0.6); over.beginPath(); over.arc(p.x, p.y + 12, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.dashCd / 2.4)); over.strokePath(); }
    }
    for (const b of this.sim.projectiles) {
      g.lineStyle(b.kind === 'coconut' ? 4 : 3, b.kind === 'nuts' ? 0xd1a46b : 0xffdf74, 0.25);
      g.lineBetween(b.x, b.y, b.x - b.vx * 0.035, b.y - b.vy * 0.035);
      const size = b.kind === 'banana' ? 25 : b.kind === 'coconut' ? 26 : 14;
      this.sprite(`b${b.id}`, b.kind, b.x, b.y, size, size).setRotation(Math.atan2(b.vy, b.vx) + this.sim.time * 9).setDepth(3000);
    }
    for (const b of this.sim.bombs) {
      const t = b.time / b.duration, lift = Math.sin(t * Math.PI) * 95;
      g.lineStyle(1.5, 0xe9c478, 0.6); g.strokeCircle(b.targetX, b.targetY, 25 + Math.sin(time * 12) * 3);
      g.lineBetween(b.targetX - 8, b.targetY, b.targetX + 8, b.targetY); g.lineBetween(b.targetX, b.targetY - 8, b.targetX, b.targetY + 8);
      g.fillStyle(0x223b28, 0.2); g.fillEllipse(b.x, b.y + 5, 27, 13);
      this.sprite(`m${b.id}`, 'melon', b.x, b.y - lift, 38, 38).setRotation(t * 5).setDepth(4000);
    }
    if (!this.paused) {
      for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.life -= dt; }
      for (const r of this.rings) r.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.particles) { over.fillStyle(p.colour, p.life / p.max); over.fillRect(p.x, p.y, p.size, p.size * 0.7); }
    this.rings = this.rings.filter(r => r.life > 0);
    for (const r of this.rings) {
      const t = 1 - r.life / r.max;
      over.lineStyle(5 * (1 - t), r.colour, 0.8 * (1 - t)); over.strokeCircle(r.x, r.y, r.radius * (0.15 + t * 0.85));
      over.fillStyle(r.colour, (this.reduced ? 0.08 : 0.21) * (1 - t)); over.fillCircle(r.x, r.y, r.radius * t);
    }
    if (!ready && !this.assist && !this.touch?.enabled && this.sim.players.some(p => p.id === 0 && p.alive)) {
      const ptr = this.input.activePointer;
      over.lineStyle(1.5, 0xffefbb, 0.9); over.strokeCircle(ptr.x, ptr.y, 8);
      over.lineBetween(ptr.x - 13, ptr.y, ptr.x - 5, ptr.y); over.lineBetween(ptr.x + 5, ptr.y, ptr.x + 13, ptr.y); over.lineBetween(ptr.x, ptr.y - 13, ptr.x, ptr.y - 5); over.lineBetween(ptr.x, ptr.y + 5, ptr.x, ptr.y + 13);
    }
    // Destroy retired views. Projectiles never accumulate invisible objects.
    for (const [key, s] of this.sprites) if (!s.visible) { s.destroy(); this.sprites.delete(key); }
    for (const [key, s] of this.labels) if (!s.visible) { s.destroy(); this.labels.delete(key); }
  }
  private burst(x: number, y: number, n: number, colours: number[], speed = 150) {
    for (let i = 0; i < n && this.particles.length < 550; i++) {
      const angle = Math.random() * Math.PI * 2, velocity = speed * (0.2 + Math.random() * 0.8), life = 0.25 + Math.random() * 0.45;
      this.particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life, max: life, size: 2 + Math.random() * 5, colour: colours[i % colours.length] });
    }
  }
  private floating(text: string, x: number, y: number, colour: string, large = false) {
    if (this.floats > 35) return;
    this.floats++;
    const label = this.add.text(x, y - 20, text, { fontFamily: 'monospace', fontSize: large ? 18 : 12, fontStyle: 'bold', color: colour, stroke: '#213226', strokeThickness: 4 }).setOrigin(0.5).setDepth(12000);
    this.tweens.add({ targets: label, y: y - (large ? 90 : 55), alpha: 0, duration: large ? 1300 : 650, onComplete: () => { label.destroy(); this.floats--; } });
  }
  private effect(event: GameEvent) {
    const { x, y } = event;
    if (event.kind === 'shot') { this.audio.shot(event.weapon === 'coconut'); this.burst(x, y, 2, [0xffe9a1], 50); }
    if (event.kind === 'hit') { this.audio.hit(); this.burst(x, y, 4, [0xffda78, 0xe9b855]); }
    if (event.kind === 'kill') { this.burst(x, y, 12, [0xf4c365, 0xf0dc9d, 0x96aa62]); this.floating(`+${event.value}`, x, y, '#ffe3a0'); }
    if (event.kind === 'blast') {
      this.audio.blast(); this.burst(x, y, this.reduced ? 20 : 55, [0xf4c960, 0xf09672, 0xb4d776, 0xffe6a6], 370);
      this.rings.push({ x, y, life: 0.5, max: 0.5, radius: event.value ?? 100, colour: 0xffdf8a });
      if (this.shake) this.cameras.main.shake(120, 0.003);
    }
    if (event.kind === 'pickup' || event.kind === 'revive') { this.audio.pickup(); this.burst(x, y, 22, [0xc9e79a, 0xffdc83, 0xfff1bf]); this.floating(event.text ?? 'NICE!', x, y, '#eff4bd', true); }
    if (event.kind === 'hurt') { this.audio.hurt(); this.floating('−½ HEART', x, y, '#ffb1a1'); this.burst(x, y, 15, [0xf1a18d, 0xe8b66d]); if (this.shake) this.cameras.main.shake(100, 0.0025); }
    if (event.kind === 'dash') { this.audio.dash(); this.burst(x, y, 12, [0xefe3ad, 0xb3c880], 90); }
    if (event.kind === 'wave') { this.audio.wave(); this.hooks.banner(event.text ?? 'GO BANANAS!'); }
    if (event.kind === 'down') this.floating('MONKEY DOWN!', x, y, '#ffb1a1', true);
  }
  worldName() { return WORLDS[this.sim.world].name; }
}
