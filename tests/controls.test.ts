import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TouchState, stickVector } from '../src/touch-state.ts';
import { controllerForPlayer, localSquad } from '../src/local-lobby.ts';
import { Simulation } from '../src/simulation.ts';
import { touchAim } from '../src/touch-aim.ts';

test('mobile needs deliberate aim to fire; releasing aim stops without stopping movement', () => {
  const touch = new TouchState(); touch.setActive(true);
  assert.equal(touch.read().fire, false);
  assert.equal(touch.begin('move', 10), true); assert.equal(touch.begin('aim', 20), true);
  touch.moveStick('move', 10, 50, 0, 40); touch.moveStick('aim', 20, 0, -50, 40);
  const input = touch.read(); assert.equal(input.mx, 1); assert.equal(input.my, 0); assert.equal(input.ay, -1); assert.equal(input.fire, true);
  touch.moveStick('move', 20, -40, 0, 40); assert.equal(touch.read().mx, 1);
  touch.end(20); assert.equal(touch.read().fire, false); assert.equal(touch.read().mx, 1); assert.equal(touch.read().ax, 0);
  touch.end(10); assert.equal(touch.read().mx, 0);
});
test('movement alone does not shoot; aiming fires in the chosen direction and release stops new shots', () => {
  const touch = new TouchState(), sim = new Simulation(40); touch.setActive(true); sim.addPlayer(0); sim.mode = 'playing'; sim.wave = 1; sim.toSpawn = 100; sim.spawnClock = 100;
  const p = sim.players[0]; p.x = 600; p.y = 380;
  touch.begin('move', 1); touch.moveStick('move', 1, 40, 0, 40);
  for (let i = 0; i < 30; i++) sim.update(1 / 60, new Map([[0, touch.read()]]));
  assert.ok(p.x > 710); assert.equal(sim.projectiles.length, 0);
  touch.begin('aim', 2); touch.moveStick('aim', 2, 0, -40, 40);
  sim.update(1 / 60, new Map([[0, { ...touch.read(), ...touchAim(p, touch.read(), sim.enemies, false) }]]));
  assert.ok(sim.projectiles.length > 0); assert.ok(sim.projectiles.every(shot => shot.vy < 0));
  touch.end(2); p.fireCd = 0;
  const shots = sim.events.filter(event => event.kind === 'shot').length;
  sim.update(1 / 60, new Map([[0, touch.read()]]));
  assert.equal(sim.events.filter(event => event.kind === 'shot').length, shots);
});
test('pause or focus loss clears aim and queued actions in both mobile modes', () => {
  for (const autoTarget of [false, true]) {
  const touch = new TouchState(); touch.autoTarget = autoTarget; touch.setActive(true); touch.begin('move', 1); touch.moveStick('move', 1, 50, 0, 40); touch.begin('aim', 2); touch.moveStick('aim', 2, 0, -40, 40); touch.queue('bomb'); touch.queue('dash'); touch.revive = true;
  assert.equal(touch.read().bomb, true); assert.equal(touch.read().bomb, true); // survives renders without a simulation step
  touch.consumeActions(); assert.equal(touch.read().bomb, false); assert.equal(touch.read().fire, true);
  touch.setActive(false); assert.equal(touch.read().mx, 0); assert.equal(touch.read().fire, false); assert.equal(touch.read().revive, false); assert.equal(touch.movePointer, null);
  touch.setActive(true); assert.equal(touch.read().fire, autoTarget); assert.equal(touch.read().bomb, false); assert.equal(touch.read().dash, false);
  }
});

test('holding the aim stick in its deadzone never fires; reset requires a fresh aim', () => {
  const touch = new TouchState(); touch.setActive(true); touch.begin('aim', 1);
  touch.moveStick('aim', 1, 1, 1, 40); assert.equal(touch.read().fire, false);
  touch.moveStick('aim', 1, 0, 30, 40); assert.equal(touch.read().fire, true);
  touch.moveStick('aim', 1, 0, 0, 40); assert.equal(touch.read().fire, false);
  touch.moveStick('aim', 1, 0, 30, 40); touch.reset(); assert.equal(touch.read().fire, false);
  touch.moveStick('aim', 1, 0, 30, 40); assert.equal(touch.read().fire, false);
});

test('optional Auto mode shoots without aim, chooses the nearest enemy, and allows manual override', () => {
  const touch = new TouchState(), sim = new Simulation(42); touch.autoTarget = true; touch.setActive(true);
  sim.addPlayer(0); sim.mode = 'playing'; sim.wave = 1; sim.toSpawn = 100; sim.spawnClock = 100;
  const p = sim.players[0]; p.x = 600; p.y = 380;
  const enemies = [{ x: 600, y: 200, hp: 50, age: 1 }, { x: 200, y: 380, hp: 50, age: 1 }];
  const aim = touchAim(p, touch.read(), enemies, true); assert.equal(aim.ax, 0); assert.ok(aim.ay < 0);
  sim.update(1 / 60, new Map([[0, { ...touch.read(), ...aim }]]));
  assert.ok(sim.projectiles.length > 0); assert.ok(sim.projectiles.every(shot => shot.vy < 0));
  touch.begin('aim', 1); touch.moveStick('aim', 1, 40, 0, 40);
  const manual = touchAim(p, touch.read(), enemies, true); assert.ok(manual.ax > 0.99); assert.equal(manual.ay, 0);
  touch.end(1); assert.equal(touch.read().fire, true);
  touch.setActive(false); assert.equal(touch.read().fire, false);
});

test('throwing a bomb preserves right-thumb aim and held fire', () => {
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

test('gentle assistance nudges near the chosen direction without snapping or targeting behind', () => {
  const touch = new TouchState(); touch.setActive(true); touch.begin('aim', 1); touch.moveStick('aim', 1, 40, 0, 40);
  const p = { x: 600, y: 380, angle: 0 };
  const aim = touchAim(p, touch.read(), [{ x: 590, y: 380, hp: 50, age: 1 }, { x: 800, y: 430, hp: 50, age: 1 }], false);
  const result = Math.atan2(aim.ay, aim.ax), target = Math.atan2(50, 200);
  assert.ok(result > 0 && result < target); assert.ok(result <= Math.PI / 30);
  assert.equal(touchAim(p, touch.read(), [{ x: 590, y: 380, hp: 50, age: 1 }], false).ay, 0);
});

test('assistance ignores distant, hidden, spawning and defeated enemies and wraps across the angle seam', () => {
  const touch = new TouchState(); touch.setActive(true); touch.begin('aim', 1); touch.moveStick('aim', 1, 40, 0, 40);
  const p = { x: 600, y: 380, angle: 0 };
  for (const enemy of [{ x: 1250, y: 400, hp: 50, age: 1 }, { x: 800, y: 400, hp: 0, age: 1 }, { x: 800, y: 400, hp: 50, age: 0.1 }]) {
    assert.equal(touchAim(p, touch.read(), [enemy], false).ay, 0);
  }
  assert.equal(touchAim({ x: 900, y: 278, angle: 0 }, touch.read(), [{ x: 1100, y: 290, hp: 50, age: 1 }], false).ay, 0);
  touch.moveStick('aim', 1, -40, 0.5, 40);
  const wrapped = touchAim(p, touch.read(), [{ x: 400, y: 375, hp: 50, age: 1 }], false);
  assert.ok(wrapped.ax < -0.99); assert.ok(wrapped.ay < 0.0125);
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
