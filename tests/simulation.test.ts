import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation, idleInput, WIDTH, HEIGHT } from '../src/simulation.ts';

function fixture(players = 1) {
  const sim = new Simulation(100);
  for (let id = 0; id < players; id++) sim.addPlayer(id);
  sim.mode = 'playing'; sim.wave = 1; sim.toSpawn = 100; sim.spawnClock = 100;
  return sim;
}
function run(sim: Simulation, frames: number, input = new Map()) {
  for (let i = 0; i < frames; i++) { sim.update(1 / 60, input); sim.events = []; }
}
test('independent movement is normalised, bounded, and dash has a cooldown', () => {
  const sim = fixture(), p = sim.players[0], input = idleInput();
  p.x = 650; p.y = 380; input.mx = 1; input.my = 1;
  const map = new Map([[0, input]]); run(sim, 30, map);
  assert.ok(Math.abs(Math.hypot(p.x - 650, p.y - 380) - 123) < 0.1);
  input.dash = true; sim.update(1 / 60, map); input.dash = false;
  assert.ok(p.dashCd > 2); run(sim, 200, map);
  assert.ok(p.x < WIDTH - 53 && p.y < HEIGHT - 62);
});
test('fast fruit hits a jaguar and never damages a teammate', () => {
  const sim = fixture(2), p = sim.players[0], friend = sim.players[1];
  p.x = 650; p.y = 380; p.angle = 0; friend.x = 695; friend.y = 380;
  sim.spawnEnemy('chaser'); const enemy = sim.enemies[0]; enemy.x = 740; enemy.y = 380; enemy.age = 2; enemy.hp = 20; enemy.speed = 0;
  sim.shoot(p); run(sim, 12);
  assert.equal(friend.hp, 5); assert.equal(sim.kills, 1); assert.ok(sim.score > 0);
});
test('one bomb action spends exactly one charge and explodes after its arc', () => {
  const sim = fixture(), p = sim.players[0]; p.x = 600; p.y = 380; p.angle = 0;
  sim.spawnEnemy('bruiser'); const enemy = sim.enemies[0]; enemy.x = 850; enemy.y = 380; enemy.age = 2; enemy.speed = 0;
  const input = idleInput(); input.bomb = true;
  sim.update(1 / 60, new Map([[0, input]]));
  assert.equal(p.bombs, 2); assert.equal(sim.bombs.length, 1);
  input.bomb = false; run(sim, 45, new Map([[0, input]]));
  assert.equal(p.bombs, 2); assert.equal(sim.bombs.length, 0); assert.equal(sim.kills, 1);
});
test('temporary weapons and tank protection expire', () => {
  const sim = fixture(), p = sim.players[0];
  sim.drop('nuts', p.x, p.y); sim.update(1 / 60, new Map()); assert.equal(p.weapon, 'nuts');
  run(sim, 1082); assert.equal(p.weapon, 'banana');
  sim.drop('tank', p.x, p.y); sim.update(1 / 60, new Map()); assert.ok(p.vehicleTime > 11);
  p.invulnerable = 0; sim.damagePlayer(p); assert.equal(p.hp, 5);
  run(sim, 722); assert.equal(p.vehicleTime, 0); sim.damagePlayer(p); assert.equal(p.hp, 4);
});
test('a nearby teammate can revive a downed monkey, while a team wipe ends the run', () => {
  const sim = fixture(2), p = sim.players[0], friend = sim.players[1];
  p.invulnerable = 0; p.hp = 1; sim.damagePlayer(p); assert.equal(p.alive, false);
  friend.x = p.x + 35; friend.y = p.y;
  const input = idleInput(); input.revive = true; run(sim, 100, new Map([[1, input]]));
  assert.equal(p.alive, true); assert.equal(p.hp, 3);
  p.invulnerable = friend.invulnerable = 0; p.hp = friend.hp = 1;
  sim.damagePlayer(p); sim.damagePlayer(friend); sim.update(1 / 60, new Map()); assert.equal(sim.mode, 'over');
});
test('clearing a boss chapter opens the next world, and the last chapter wins', () => {
  const sim = fixture(); sim.wave = 6; sim.toSpawn = 0; sim.enemies = [];
  sim.update(1 / 60, new Map()); assert.equal(sim.mode, 'break');
  run(sim, 425); assert.equal(sim.wave, 7); assert.equal(sim.world, 1); assert.equal(sim.mode, 'playing');
  sim.wave = 18; sim.toSpawn = 0; sim.enemies = []; sim.update(1 / 60, new Map()); assert.equal(sim.mode, 'won');
});
test('four players, large crowds and many fruit shots maintain finite bounded state', () => {
  const sim = fixture(4); sim.toSpawn = 0;
  for (let i = 0; i < 100; i++) { sim.spawnEnemy(i % 5 ? 'chaser' : 'bruiser'); sim.enemies.at(-1)!.age = 2; }
  const map = new Map(sim.players.map(p => { p.invulnerable = 100; const input = idleInput(); input.fire = true; return [p.id, input]; }));
  run(sim, 600, map);
  for (const entity of [...sim.players, ...sim.enemies, ...sim.projectiles]) assert.ok(Number.isFinite(entity.x) && Number.isFinite(entity.y));
  assert.ok(sim.projectiles.length < 250); assert.equal(sim.players.length, 4);
});
