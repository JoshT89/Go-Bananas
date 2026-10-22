// Browser-independent rules. The same simulation can later run in a game room.
import { MAX_HEALTH, REVIVE_HEALTH } from './health';
export const WIDTH = 1280;
export const HEIGHT = 768;
export const PLAYER_COLOURS = ['#f4bd4f', '#79c5dd', '#ed8f9b', '#b5d77e'];
export const PLAYER_NAMES = ['MANGO', 'COCO', 'KIWI', 'PIP'];
export const WORLDS = [
  { name: 'JUNGLE JAM', short: 'THE JUNGLE', sub: 'Somewhere deep in the wrong jungle.', tint: '#7da364' },
  { name: 'BANANA LABS', short: 'THE LAB', sub: 'Science has gone absolutely bananas.', tint: '#76c4b4' },
  { name: 'ORBIT OF THE APES', short: 'OUTER SPACE', sub: 'One small step. One giant food fight.', tint: '#aa9edb' },
];
export type Weapon = 'banana' | 'nuts' | 'coconut';
export const WEAPONS = {
  banana: { name: 'BANANA BLASTER', interval: 0.15, damage: 24, speed: 790, radius: 5, ttl: 1.1 },
  nuts: { name: 'NUTCRACKER', interval: 0.48, damage: 19, speed: 680, radius: 4, ttl: 0.66 },
  coconut: { name: 'COCONUT CANNON', interval: 0.65, damage: 72, speed: 490, radius: 9, ttl: 1.65 },
};
export type EnemyKind = 'chaser' | 'pouncer' | 'bruiser' | 'boss';
export type PickupKind = 'nuts' | 'coconut' | 'bomb' | 'heal' | 'tank' | 'shield';
export type Input = { mx: number; my: number; ax: number; ay: number; fire: boolean; dash: boolean; bomb: boolean; revive: boolean };
export const idleInput = (): Input => ({ mx: 0, my: 0, ax: 1, ay: 0, fire: false, dash: false, bomb: false, revive: false });
export type Player = {
  id: number; x: number; y: number; angle: number; hp: number; invulnerable: number;
  dashCd: number; dashTime: number; dashX: number; dashY: number; fireCd: number;
  bombs: number; weapon: Weapon; weaponTime: number; vehicleTime: number;
  shield: number; alive: boolean; downTime: number; reviveProgress: number; kills: number;
};
export type Enemy = {
  id: number; kind: EnemyKind; x: number; y: number; angle: number; hp: number; maxHp: number;
  radius: number; speed: number; age: number; cooldown: number; windup: number;
  leapTime: number; dx: number; dy: number; flash: number; stun: number;
};
export type Projectile = { id: number; owner: number; x: number; y: number; px: number; py: number; vx: number; vy: number; life: number; damage: number; kind: Weapon; radius: number };
export type Bomb = { id: number; owner: number; x: number; y: number; startX: number; startY: number; targetX: number; targetY: number; time: number; duration: number };
export type Pickup = { id: number; x: number; y: number; kind: PickupKind; life: number; age: number };
export type GameEvent = { kind: 'shot' | 'hit' | 'kill' | 'blast' | 'pickup' | 'hurt' | 'wave' | 'dash' | 'revive' | 'down'; x: number; y: number; value?: number; text?: string; owner?: number; weapon?: Weapon };
export const OBSTACLES = [{ x: 290, y: 278, r: 25 }, { x: 990, y: 278, r: 25 }, { x: 390, y: 536, r: 26 }, { x: 890, y: 536, r: 26 }];
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
export class Simulation {
  players: Player[] = [];
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  bombs: Bomb[] = [];
  pickups: Pickup[] = [];
  events: GameEvent[] = [];
  mode: 'ready' | 'playing' | 'break' | 'over' | 'won' = 'ready';
  wave = 0;
  world = 0;
  score = 0;
  kills = 0;
  combo = 0;
  comboTime = 0;
  bestCombo = 0;
  time = 0;
  breakTime = 0;
  toSpawn = 0;
  waveTotal = 0;
  spawnClock = 0;
  continues = 2;
  bossSpawned = false;
  private serial = 0;
  private seed: number;
  constructor(seed = 12345) { this.seed = seed >>> 0; }
  random() { this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0; return this.seed / 4294967296; }
  addPlayer(id: number) {
    if (this.players.some(p => p.id === id) || this.players.length >= 4) return;
    this.players.push({ id, x: WIDTH / 2 + (id - 1.5) * 52, y: HEIGHT / 2 + 55,
      angle: -Math.PI / 2, hp: MAX_HEALTH, invulnerable: 2, dashCd: 0, dashTime: 0, dashX: 0, dashY: 0,
      fireCd: 0, bombs: 3, weapon: 'banana', weaponTime: 0, vehicleTime: 0, shield: 0,
      alive: true, downTime: 0, reviveProgress: 0, kills: 0 });
  }
  start(ids: number[]) {
    const fresh = new Simulation((Date.now() & 0xffffffff) >>> 0);
    Object.assign(this, fresh);
    ids.slice(0, 4).forEach(id => this.addPlayer(id));
    if (!this.players.length) this.addPlayer(0);
    this.beginWave();
  }
  beginWave() {
    this.wave++;
    this.world = Math.min(2, Math.floor((this.wave - 1) / 6));
    this.mode = 'playing';
    this.bossSpawned = false;
    const localWave = (this.wave - 1) % 6 + 1;
    this.waveTotal = Math.round((10 + localWave * 4 + this.world * 5) * (1 + (this.players.length - 1) * 0.55));
    this.toSpawn = this.waveTotal;
    this.spawnClock = 0.65;
    if (localWave === 6) { this.spawnEnemy('boss'); this.bossSpawned = true; this.waveTotal++; }
    for (const p of this.players) {
      if (!p.alive && p.downTime <= 0 && this.continues > 0) { this.continues--; p.alive = true; p.hp = REVIVE_HEALTH; p.invulnerable = 3; }
      p.bombs = Math.min(5, p.bombs + (this.wave > 1 ? 1 : 0));
    }
    this.events.push({ kind: 'wave', x: WIDTH / 2, y: HEIGHT / 2, text: localWave === 6 ? (this.world === 0 ? 'KING CLAW APPROACHES' : this.world === 1 ? 'PROFESSOR PURR APPROACHES' : 'ADMIRAL CLAW APPROACHES') : `WAVE ${String(this.wave).padStart(2, '0')}` });
    if (this.wave === 2) this.drop('nuts', WIDTH / 2 - 120, HEIGHT / 2);
    if (this.wave === 3) this.drop('tank', WIDTH / 2, HEIGHT / 2 - 50);
    if (this.wave === 4) this.drop('coconut', WIDTH / 2 + 90, HEIGHT / 2);
  }
  spawnEnemy(kind?: EnemyKind) {
    const side = Math.floor(this.random() * 4);
    const x = side === 0 ? 49 : side === 1 ? WIDTH - 49 : 80 + this.random() * (WIDTH - 160);
    const y = side === 2 ? 65 : side === 3 ? HEIGHT - 65 : 80 + this.random() * (HEIGHT - 160);
    const roll = this.random();
    kind ??= this.wave >= 3 && roll < 0.16 ? 'bruiser' : this.wave >= 2 && roll < 0.41 ? 'pouncer' : 'chaser';
    const baseHp = kind === 'boss' ? 1250 + this.world * 500 : kind === 'bruiser' ? 155 : kind === 'pouncer' ? 52 : 45;
    const maxHp = Math.round(baseHp * (1 + (this.players.length - 1) * 0.16) * (1 + this.world * 0.15));
    this.enemies.push({ id: ++this.serial, kind, x, y, angle: 0, hp: maxHp, maxHp,
      radius: kind === 'boss' ? 46 : kind === 'bruiser' ? 25 : 18,
      speed: kind === 'boss' ? 62 : kind === 'bruiser' ? 56 : kind === 'pouncer' ? 98 : 78 + this.world * 11,
      age: 0, cooldown: 2 + this.random() * 2, windup: 0, leapTime: 0, dx: 0, dy: 0, flash: 0, stun: 0 });
  }
  drop(kind: PickupKind, x: number, y: number) { this.pickups.push({ id: ++this.serial, x, y, kind, life: 24, age: 0 }); }
  shoot(p: Player) {
    const kind = p.vehicleTime > 0 ? 'coconut' : p.weapon;
    const spec = WEAPONS[kind];
    const shots = kind === 'nuts' ? 6 : p.vehicleTime > 0 ? 2 : 1;
    for (let i = 0; i < shots; i++) {
      const angle = p.angle + (shots > 1 ? (i - (shots - 1) / 2) * (kind === 'nuts' ? 0.115 : 0.14) : (this.random() - 0.5) * 0.04);
      const x = p.x + Math.cos(angle) * 27, y = p.y + Math.sin(angle) * 27;
      this.projectiles.push({ id: ++this.serial, owner: p.id, x, y, px: x, py: y,
        vx: Math.cos(angle) * spec.speed, vy: Math.sin(angle) * spec.speed,
        life: spec.ttl, damage: spec.damage, kind, radius: spec.radius });
    }
    p.fireCd = p.vehicleTime > 0 ? 0.24 : spec.interval;
    this.events.push({ kind: 'shot', x: p.x, y: p.y, weapon: kind, owner: p.id });
  }
  throwBomb(p: Player) {
    if (!p.alive || p.bombs <= 0) return;
    p.bombs--;
    this.bombs.push({ id: ++this.serial, owner: p.id, x: p.x, y: p.y, startX: p.x, startY: p.y,
      targetX: clamp(p.x + Math.cos(p.angle) * 250, 55, WIDTH - 55),
      targetY: clamp(p.y + Math.sin(p.angle) * 250, 65, HEIGHT - 65), time: 0, duration: 0.65 });
  }
  explode(x: number, y: number, radius: number, damage: number, owner: number) {
    this.events.push({ kind: 'blast', x, y, value: radius });
    for (const e of this.enemies) {
      const distance = dist(e, { x, y });
      if (e.hp > 0 && distance < radius + e.radius) {
        const hit = damage * (1 - clamp(distance / radius, 0, 1) * 0.5);
        this.damageEnemy(e, hit, owner);
        const angle = Math.atan2(e.y - y, e.x - x);
        e.x += Math.cos(angle) * 22; e.y += Math.sin(angle) * 22; e.stun = 0.3;
      }
    }
  }
  damageEnemy(e: Enemy, amount: number, owner: number) {
    if (e.hp <= 0) return;
    e.hp -= amount; e.flash = 0.1;
    this.events.push({ kind: 'hit', x: e.x, y: e.y, value: Math.round(amount) });
    if (e.hp > 0) return;
    this.kills++; this.combo++; this.comboTime = 3;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const points = (e.kind === 'boss' ? 1500 : e.kind === 'bruiser' ? 80 : 25) * Math.min(5, 1 + Math.floor(this.combo / 10));
    this.score += points;
    const p = this.players.find(p => p.id === owner); if (p) p.kills++;
    this.events.push({ kind: 'kill', x: e.x, y: e.y, value: points });
    const roll = this.random();
    if (e.kind === 'boss') { this.drop('tank', e.x, e.y); this.drop('heal', e.x + 60, e.y); }
    else if (roll < 0.025) this.drop('tank', e.x, e.y);
    else if (roll < 0.07) this.drop('heal', e.x, e.y);
    else if (roll < 0.12) this.drop('bomb', e.x, e.y);
    else if (roll < 0.17) this.drop('nuts', e.x, e.y);
    else if (roll < 0.20) this.drop('coconut', e.x, e.y);
    else if (roll < 0.23) this.drop('shield', e.x, e.y);
  }
  damagePlayer(p: Player) {
    if (!p.alive || p.invulnerable > 0 || p.dashTime > 0 || p.vehicleTime > 0) return;
    if (p.shield > 0) { p.shield--; p.invulnerable = 1; return; }
    p.hp--; p.invulnerable = 1.45;
    this.events.push({ kind: 'hurt', x: p.x, y: p.y, owner: p.id });
    if (p.hp > 0) return;
    if (this.players.length === 1 && this.continues > 0) {
      this.continues--; p.hp = MAX_HEALTH; p.invulnerable = 3;
      this.explode(p.x, p.y, 200, 150, p.id);
      this.events.push({ kind: 'revive', x: p.x, y: p.y, text: 'SECOND CHANCE!' });
    } else { p.alive = false; p.downTime = 14; this.events.push({ kind: 'down', x: p.x, y: p.y, owner: p.id }); }
  }
  collect(p: Player, item: Pickup) {
    if (item.kind === 'nuts' || item.kind === 'coconut') { p.weapon = item.kind; p.weaponTime = 18; }
    if (item.kind === 'bomb') p.bombs = Math.min(6, p.bombs + 2);
    if (item.kind === 'heal') p.hp = Math.min(MAX_HEALTH, p.hp + 2);
    if (item.kind === 'tank') p.vehicleTime = 12;
    if (item.kind === 'shield') p.shield = Math.min(3, p.shield + 2);
    item.life = 0;
    const text = item.kind === 'nuts' ? 'NUTCRACKER!' : item.kind === 'coconut' ? 'COCONUT CANNON!' : item.kind === 'tank' ? 'TIMBER TANK!' : item.kind === 'heal' ? '+1 HEART' : item.kind === 'bomb' ? '+2 MELON BOMBS' : 'MONKEY SHIELD!';
    this.events.push({ kind: 'pickup', x: p.x, y: p.y, text, owner: p.id });
  }
  private contain(body: { x: number; y: number }, radius: number) {
    body.x = clamp(body.x, 53 + radius, WIDTH - 53 - radius);
    body.y = clamp(body.y, 68 + radius, HEIGHT - 62 - radius);
    for (const o of OBSTACLES) {
      const d = dist(body, o), min = o.r + radius;
      if (d < min) { const a = Math.atan2(body.y - o.y, body.x - o.x); body.x = o.x + Math.cos(a) * min; body.y = o.y + Math.sin(a) * min; }
    }
  }
  update(dt: number, inputs: Map<number, Input>) {
    if (this.mode !== 'playing' && this.mode !== 'break') return;
    dt = clamp(dt, 0, 1 / 30); this.time += dt;
    if (this.comboTime > 0) this.comboTime -= dt; else this.combo = 0;
    if (this.mode === 'break') { this.breakTime -= dt; if (this.breakTime <= 0) this.beginWave(); }
    for (const p of this.players) {
      if (!p.alive) {
        p.downTime = Math.max(0, p.downTime - dt);
        const rescuer = this.players.find(other => other.alive && dist(p, other) < 76 && inputs.get(other.id)?.revive);
        p.reviveProgress = rescuer && p.downTime > 0 ? p.reviveProgress + dt : Math.max(0, p.reviveProgress - dt);
        if (p.reviveProgress >= 1.6) { p.alive = true; p.hp = REVIVE_HEALTH; p.invulnerable = 3; p.reviveProgress = 0; this.events.push({ kind: 'revive', x: p.x, y: p.y, text: 'BACK IN BUSINESS!' }); }
        continue;
      }
      const input = inputs.get(p.id) ?? idleInput();
      p.invulnerable = Math.max(0, p.invulnerable - dt); p.dashCd = Math.max(0, p.dashCd - dt);
      p.fireCd -= dt; p.vehicleTime = Math.max(0, p.vehicleTime - dt);
      if (p.weaponTime > 0) { p.weaponTime -= dt; if (p.weaponTime <= 0) p.weapon = 'banana'; }
      if (Math.hypot(input.ax, input.ay) > 0.1) p.angle = Math.atan2(input.ay, input.ax);
      const moveLength = Math.hypot(input.mx, input.my);
      const mx = input.mx / Math.max(1, moveLength), my = input.my / Math.max(1, moveLength);
      if (input.dash && p.dashCd <= 0) {
        p.dashCd = 2.4; p.dashTime = 0.16;
        p.dashX = moveLength > 0.1 ? mx : Math.cos(p.angle); p.dashY = moveLength > 0.1 ? my : Math.sin(p.angle);
        this.events.push({ kind: 'dash', x: p.x, y: p.y, owner: p.id });
      }
      if (p.dashTime > 0) { p.x += p.dashX * 900 * dt; p.y += p.dashY * 900 * dt; p.dashTime -= dt; }
      else { p.x += mx * (p.vehicleTime > 0 ? 205 : 246) * dt; p.y += my * (p.vehicleTime > 0 ? 205 : 246) * dt; }
      this.contain(p, p.vehicleTime > 0 ? 27 : 17);
      if (input.fire && p.fireCd <= 0) this.shoot(p);
      if (input.bomb) this.throwBomb(p);
    }
    const live = this.players.filter(p => p.alive);
    if (!live.length) { this.mode = 'over'; return; }
    if (this.mode === 'playing') {
      this.spawnClock -= dt;
      if (this.toSpawn > 0 && this.spawnClock <= 0) { this.spawnEnemy(); this.toSpawn--; this.spawnClock = Math.max(0.16, 0.65 - this.wave * 0.024) / (1 + (this.players.length - 1) * 0.25); }
    }
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.age += dt; e.flash = Math.max(0, e.flash - dt); e.stun = Math.max(0, e.stun - dt);
      let target = live[0]; for (const p of live) if (dist(e, p) < dist(e, target)) target = p;
      const angle = Math.atan2(target.y - e.y, target.x - e.x); e.angle = angle; e.cooldown -= dt;
      if (e.windup > 0) { e.windup -= dt; if (e.windup <= 0) { e.leapTime = e.kind === 'boss' ? 0.65 : 0.4; } }
      else if (e.leapTime > 0) { e.x += e.dx * (e.kind === 'boss' ? 530 : 450) * dt; e.y += e.dy * (e.kind === 'boss' ? 530 : 450) * dt; e.leapTime -= dt; }
      else if (e.stun <= 0 && e.age > 0.5) {
        if ((e.kind === 'pouncer' || e.kind === 'boss') && e.cooldown <= 0 && dist(e, target) < 460) {
          e.windup = e.kind === 'boss' ? 1 : 0.75; e.dx = Math.cos(angle); e.dy = Math.sin(angle); e.cooldown = e.kind === 'boss' ? 4.6 : 4;
        } else {
          e.x += Math.cos(angle) * e.speed * dt; e.y += Math.sin(angle) * e.speed * dt;
          // Soft pack separation keeps the silhouette of individual jaguars visible.
          for (const other of this.enemies) {
            if (e.id <= other.id || other.hp <= 0) continue;
            const dx = e.x - other.x, dy = e.y - other.y, d = Math.hypot(dx, dy), min = e.radius + other.radius - 7;
            if (d < min && d > 0.01) { const push = (min - d) * 0.08; e.x += dx / d * push; e.y += dy / d * push; other.x -= dx / d * push; other.y -= dy / d * push; }
          }
        }
      }
      this.contain(e, e.radius);
      if (e.age > 0.7 && e.windup <= 0) for (const p of live) if (dist(e, p) < e.radius + (p.vehicleTime > 0 ? 27 : 15)) {
        if (p.vehicleTime > 0) this.damageEnemy(e, 120 * dt, p.id); else this.damagePlayer(p);
      }
    }
    for (const shot of this.projectiles) {
      if (shot.life <= 0) continue;
      shot.px = shot.x; shot.py = shot.y; shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
      if (shot.x < 42 || shot.x > WIDTH - 42 || shot.y < 42 || shot.y > HEIGHT - 42) shot.life = 0;
      for (const o of OBSTACLES) if (dist(shot, o) < o.r + shot.radius) shot.life = 0;
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.age < 0.35) continue;
        // Swept hit check avoids fast fruit passing through a jaguar between steps.
        const dx = shot.x - shot.px, dy = shot.y - shot.py;
        const t = clamp(((e.x - shot.px) * dx + (e.y - shot.py) * dy) / (dx * dx + dy * dy || 1), 0, 1);
        if (Math.hypot(e.x - shot.px - t * dx, e.y - shot.py - t * dy) < e.radius + shot.radius && shot.life > 0) {
          shot.life = 0;
          if (shot.kind === 'coconut') this.explode(shot.x, shot.y, 94, shot.damage, shot.owner);
          else { this.damageEnemy(e, shot.damage, shot.owner); e.x += shot.vx * 0.006; e.y += shot.vy * 0.006; }
          break;
        }
      }
    }
    for (const bomb of this.bombs) {
      bomb.time += dt; const t = clamp(bomb.time / bomb.duration, 0, 1);
      bomb.x = bomb.startX + (bomb.targetX - bomb.startX) * t; bomb.y = bomb.startY + (bomb.targetY - bomb.startY) * t;
      if (bomb.time >= bomb.duration) this.explode(bomb.targetX, bomb.targetY, 170, 230, bomb.owner);
    }
    this.bombs = this.bombs.filter(b => b.time < b.duration);
    for (const item of this.pickups) {
      if (item.life <= 0) continue;
      item.life -= dt; item.age += dt;
      for (const p of live) if (dist(item, p) < 39) { this.collect(p, item); break; }
    }
    this.projectiles = this.projectiles.filter(b => b.life > 0);
    this.enemies = this.enemies.filter(e => e.hp > 0);
    this.pickups = this.pickups.filter(p => p.life > 0);
    if (this.mode === 'playing' && this.toSpawn <= 0 && !this.enemies.length) {
      if (this.wave >= 18) this.mode = 'won';
      else {
        this.mode = 'break'; this.breakTime = this.wave % 6 === 0 ? 7 : 4;
        this.score += 150 * this.wave;
        for (const p of this.players) if (p.alive) p.hp = Math.min(MAX_HEALTH, p.hp + 1);
        this.events.push({ kind: 'wave', x: WIDTH / 2, y: HEIGHT / 2, text: this.wave % 6 === 0 ? 'PORTAL OPEN! NEXT STOP…' : 'WAVE CLEARED! +½ HEART' });
      }
    }
  }
}
