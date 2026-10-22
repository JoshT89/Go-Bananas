import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TouchState, stickVector } from '../src/touch-state.ts';
import { controllerForPlayer, localSquad } from '../src/local-lobby.ts';
import { Simulation } from '../src/simulation.ts';

test('mobile fire is automatic while the thumbs move and aim independently', () => {
  const touch = new TouchState(); touch.setActive(true);
  assert.equal(touch.read().fire, true);
  assert.equal(touch.begin('move', 10), true); assert.equal(touch.begin('aim', 20), true);
  touch.moveStick('move', 10, 50, 0, 40); touch.moveStick('aim', 20, 0, -50, 40);
  const input = touch.read(); assert.equal(input.mx, 1); assert.equal(input.my, 0); assert.equal(input.ay, -1); assert.equal(input.fire, true);
  touch.moveStick('move', 20, -40, 0, 40); assert.equal(touch.read().mx, 1);
  touch.end(20); assert.equal(touch.read().fire, true); assert.equal(touch.read().mx, 1); assert.equal(touch.read().ax, 0);
  touch.end(10); assert.equal(touch.read().mx, 0);
});
test('movement and automatic fire reach the simulation without touching aim', () => {
  const touch = new TouchState(), sim = new Simulation(40); touch.setActive(true); sim.addPlayer(0); sim.mode = 'playing'; sim.wave = 1; sim.toSpawn = 100; sim.spawnClock = 100;
  const p = sim.players[0]; p.x = 600; p.y = 380;
  touch.begin('move', 1); touch.moveStick('move', 1, 40, 0, 40);
  for (let i = 0; i < 30; i++) sim.update(1 / 60, new Map([[0, touch.read()]]));
  assert.ok(p.x > 710); assert.ok(sim.projectiles.length > 0); assert.ok(sim.projectiles.every(shot => shot.vy < 0));
});
test('pause or focus loss stops automatic fire and clears held input and queued actions', () => {
  const touch = new TouchState(); touch.setActive(true); touch.begin('move', 1); touch.moveStick('move', 1, 50, 0, 40); touch.begin('aim', 2); touch.queue('bomb'); touch.queue('dash'); touch.revive = true;
  assert.equal(touch.read().bomb, true); assert.equal(touch.read().bomb, true); // survives renders without a simulation step
  touch.consumeActions(); assert.equal(touch.read().bomb, false); assert.equal(touch.read().fire, true);
  touch.setActive(false); assert.equal(touch.read().mx, 0); assert.equal(touch.read().fire, false); assert.equal(touch.read().revive, false); assert.equal(touch.movePointer, null);
  touch.setActive(true); assert.equal(touch.read().fire, true); assert.equal(touch.read().bomb, false); assert.equal(touch.read().dash, false);
});

test('throwing a bomb preserves right-thumb aim and automatic fire', () => {
  const touch = new TouchState(), sim = new Simulation(41); touch.setActive(true); sim.addPlayer(0); sim.mode = 'playing'; sim.wave = 1; sim.toSpawn = 100; sim.spawnClock = 100;
  const p = sim.players[0]; p.x = 600; p.y = 380;
  touch.begin('move', 1); touch.moveStick('move', 1, 40, 0, 40);
  touch.begin('aim', 2); touch.moveStick('aim', 2, 0, -40, 40);
  // The movement thumb can tap an extra while the aiming thumb stays put.
  touch.end(1); touch.queue('bomb');
  sim.update(1 / 60, new Map([[0, touch.read()]])); touch.consumeActions();
  assert.equal(p.bombs, 2); assert.equal(sim.bombs.length, 1); assert.equal(sim.bombs[0].targetX, p.x); assert.ok(sim.bombs[0].targetY < p.y);
  assert.equal(touch.aimPointer, 2); assert.equal(touch.read().ay, -1); assert.equal(touch.read().fire, true);
  assert.equal(touch.read().bomb, false); assert.ok(sim.projectiles.some(shot => shot.vy < 0));
});
test('stick deadzone and clamping prevent drift and extra diagonal speed', () => {
  assert.deepEqual(stickVector(1, 2, 40), { x: 0, y: 0 });
  const diagonal = stickVector(100, 100, 40); assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 0.001);
});
test('solo works without controllers; four-player local co-op explains missing devices', () => {
  assert.equal(localSquad(1, 0, 'mixed').canStart, true);
  const four = localSquad(4, 0, 'mixed'); assert.equal(four.canStart, false); assert.equal(four.missingControllers, 3); assert.deepEqual(four.ids, [0, 1, 2, 3]);
  assert.equal(localSquad(4, 3, 'mixed').canStart, true);
  assert.equal(localSquad(4, 3, 'controllers').missingControllers, 1);
  assert.equal(localSquad(4, 4, 'controllers').canStart, true);
});
test('controller slots stay distinct from the keyboard or touch player', () => {
  assert.equal(controllerForPlayer(0, 'mixed', [2, 4, 5]), undefined);
  assert.equal(controllerForPlayer(1, 'mixed', [2, 4, 5]), 2);
  assert.equal(controllerForPlayer(3, 'mixed', [2, 4, 5]), 5);
  assert.equal(controllerForPlayer(0, 'controllers', [2, 4, 5]), 2);
});
