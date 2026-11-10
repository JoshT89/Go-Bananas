import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation, idleInput } from '../src/simulation.ts';
import { DIFFICULTIES, UPGRADES } from '../src/game-rules.ts';
import type { Difficulty } from '../src/game-rules.ts';

function arena(difficulty: Difficulty = 'arcade') {
  const sim = new Simulation(77); sim.difficulty = difficulty; sim.addPlayer(0);
  sim.mode = 'playing'; sim.wave = 4; sim.toSpawn = 99; sim.spawnClock = 99;
  sim.players[0].x = 640; sim.players[0].y = 380; sim.players[0].invulnerable = 100;
  return sim;
}
function step(sim: Simulation, count: number) { for (let i = 0; i < count; i++) sim.update(1 / 60, new Map()); }

test('difficulty increases pack size, enemy health, speed and spawn pressure; a new run resets perks', () => {
  let previousCount = 0, previousHp = 0, previousSpeed = 0, previousDelay = Infinity;
  for (const difficulty of Object.keys(DIFFICULTIES) as Difficulty[]) {
    const sim = new Simulation(9); sim.start([0], difficulty);
    assert.ok(sim.toSpawn > previousCount); previousCount = sim.toSpawn;
    sim.spawnClock = 0; sim.update(1 / 60, new Map());
    const e = sim.enemies[0]; assert.ok(e.hp > previousHp); assert.ok(e.speed > previousSpeed); assert.ok(sim.spawnClock < previousDelay);
    previousHp = e.hp; previousSpeed = e.speed; previousDelay = sim.spawnClock;
    assert.equal(sim.players[0].shield, difficulty === 'chill' ? 1 : 0);
    sim.upgrades.power = 2; sim.rushTime = 6; sim.start([0], difficulty);
    assert.equal(sim.upgrades.power, 0); assert.equal(sim.rushTime, 0); assert.equal(sim.difficulty, difficulty);
  }
});

test('wave 3 offers unique perks, freezes the arena, applies one choice once, then resumes', () => {
  const sim = arena(); sim.wave = 3; sim.toSpawn = 0; sim.players[0].hp = 3;
  sim.update(1 / 60, new Map());
  assert.equal(sim.mode, 'break'); assert.equal(new Set(sim.upgradeChoices).size, 3);
  const time = sim.time, timer = sim.breakTime, hp = sim.players[0].hp;
  step(sim, 600); assert.equal(sim.time, time); assert.equal(sim.breakTime, timer); assert.equal(sim.players[0].hp, hp);
  const key = sim.upgradeChoices.find(k => k !== 'care')!;
  assert.equal(sim.chooseUpgrade(key), true); assert.equal(sim.upgrades[key], 1); assert.equal(sim.chooseUpgrade(key), false);
  step(sim, 245); assert.equal(sim.wave, 4); assert.equal(sim.mode, 'playing');
});

test('upgrade offers exclude capped perks; Monkey Care heals only living teammates', () => {
  const sim = arena(); sim.addPlayer(1); sim.players[0].hp = 3; const friend = sim.players[1]; friend.hp = 0; friend.alive = false;
  sim.mode = 'break'; for (const key of ['power', 'rapid', 'dash', 'blast', 'magnet'] as const) sim.upgrades[key] = UPGRADES[key].max;
  sim.offerUpgrades(); assert.deepEqual(sim.upgradeChoices, ['care']); assert.equal(sim.chooseUpgrade('care'), true);
  assert.equal(sim.players[0].hp, 5); assert.equal(sim.players[0].shield, 1); assert.equal(friend.hp, 0); assert.equal(friend.alive, false);
});

test('perks change actual shot damage, fire rate, dash cooldown, collection range and bomb radius', () => {
  const sim = arena(), p = sim.players[0]; p.angle = 0; sim.shoot(p); const damage = sim.projectiles[0].damage, cooldown = p.fireCd;
  sim.upgrades.power = 1; sim.upgrades.rapid = 1; sim.upgrades.dash = 1; sim.upgrades.magnet = 1;
  sim.shoot(p); assert.ok(sim.projectiles.at(-1)!.damage > damage); assert.ok(p.fireCd < cooldown);
  const input = idleInput(); input.dash = true; sim.update(1 / 60, new Map([[0, input]])); assert.ok(p.dashCd < 2.4);
  p.hp = 3; sim.drop('heal', p.x + 65, p.y); sim.update(1 / 60, new Map()); assert.equal(p.hp, 5);
  sim.upgrades.blast = 1; sim.throwBomb(p); step(sim, 40);
  assert.ok(sim.events.some(e => e.kind === 'blast' && e.value! > 170));
});

test('hunter warns before firing, locks its direction, and its shots are blocked by crates', () => {
  const sim = arena(); sim.spawnEnemy('hunter'); const e = sim.enemies[0];
  e.x = 920; e.y = 380; e.age = 2; e.cooldown = 0; e.speed = 0;
  sim.update(1 / 60, new Map()); assert.ok(e.windup > 0); assert.equal(sim.enemyShots.length, 0);
  sim.players[0].y = 500; step(sim, 60); assert.equal(sim.enemyShots.length, 3);
  assert.ok(sim.enemyShots.every(s => s.vx < 0 && Math.abs(s.vy) < 40));
  sim.enemyShots = [{ id: 999, x: 990, y: 260, vx: 0, vy: 235, life: 3 }];
  sim.update(1 / 60, new Map()); assert.equal(sim.enemyShots.length, 0);
});

test('enemy shots damage once and obey dash protection; defeated waves clear hostile shots', () => {
  const sim = arena(), p = sim.players[0]; p.invulnerable = 0;
  const shot = () => ({ id: 88, x: p.x - 20, y: p.y, vx: 235, vy: 0, life: 3 });
  sim.enemyShots.push(shot()); sim.update(1 / 60, new Map()); assert.equal(p.hp, 5); assert.equal(sim.enemyShots.length, 0);
  p.invulnerable = 0; p.dashTime = 0.1; sim.enemyShots.push(shot()); sim.update(1 / 60, new Map()); assert.equal(p.hp, 5);
  sim.toSpawn = 0; sim.enemyShots.push({ id: 89, x: 500, y: 200, vx: 0, vy: 50, life: 3 }); sim.update(1 / 60, new Map());
  assert.equal(sim.mode, 'break'); assert.equal(sim.enemyShots.length, 0);
});

test('stalkers flank instead of walking straight; bosses add a radial attack in fury phase', () => {
  const sim = arena(); sim.spawnEnemy('stalker'); let e = sim.enemies[0]; e.x = 920; e.y = 380; e.age = 2;
  sim.update(1 / 60, new Map()); assert.ok(e.x < 920); assert.notEqual(e.y, 380);
  sim.enemies = []; sim.spawnEnemy('boss'); e = sim.enemies[0]; e.x = 700; e.y = 380; e.age = 2; e.hp = e.maxHp * 0.4; e.windup = 0.001;
  sim.update(1 / 60, new Map()); assert.equal(sim.enemyShots.length, 8); assert.ok(e.leapTime > 0);
});

test('twelve kills without damage trigger a temporary rush; damage resets charge and scores reflect difficulty', () => {
  const sim = arena(), p = sim.players[0];
  for (let i = 0; i < 12; i++) { sim.spawnEnemy('chaser'); sim.damageEnemy(sim.enemies.at(-1)!, 999, 0); }
  assert.equal(sim.rushTime, 6); sim.shoot(p); assert.ok(p.fireCd < 0.1);
  step(sim, 361); assert.equal(sim.rushTime, 0); sim.rushCharge = 5; p.invulnerable = 0; sim.damagePlayer(p); assert.equal(sim.rushCharge, 0);
  const score = (difficulty: Difficulty) => { const s = arena(difficulty); s.spawnEnemy('chaser'); s.damageEnemy(s.enemies[0], 999, 0); return s.score; };
  assert.ok(score('bananas') > score('arcade')); assert.ok(score('chill') < score('arcade'));
});

test('four players and a hundred mixed threats keep projectiles finite and bounded', () => {
  const sim = arena('bananas'); for (let id = 1; id < 4; id++) { sim.addPlayer(id); sim.players.at(-1)!.invulnerable = 100; }
  for (let i = 0; i < 100; i++) { sim.spawnEnemy(i % 3 === 0 ? 'hunter' : i % 3 === 1 ? 'stalker' : 'pouncer'); sim.enemies.at(-1)!.age = 2; }
  step(sim, 600);
  for (const body of [...sim.players, ...sim.enemies, ...sim.enemyShots]) assert.ok(Number.isFinite(body.x) && Number.isFinite(body.y));
  assert.ok(sim.enemyShots.length < 350); assert.equal(sim.players.length, 4);
});
