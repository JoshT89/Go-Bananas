import { OBSTACLES } from './simulation';
import type { Enemy, Input } from './simulation';

type Origin = { x: number; y: number; angle: number };
type Target = Pick<Enemy, 'x' | 'y' | 'hp' | 'age'>;
const CONE = Math.PI / 10; // 18 degrees either side of the player's aim.
const RANGE = 640;

function visible(from: Origin, to: Target) {
  const dx = to.x - from.x, dy = to.y - from.y, lengthSq = dx * dx + dy * dy;
  return !OBSTACLES.some(o => {
    const t = Math.max(0, Math.min(1, ((o.x - from.x) * dx + (o.y - from.y) * dy) / (lengthSq || 1)));
    return Math.hypot(from.x + t * dx - o.x, from.y + t * dy - o.y) < o.r + 5;
  });
}

// Mobile help only nudges a direction the player has chosen. Auto mode is explicit.
export function touchAim(from: Origin, input: Input, enemies: readonly Target[], autoTarget: boolean) {
  const manual = Math.hypot(input.ax, input.ay) > 0.15;
  const angle = manual ? Math.atan2(input.ay, input.ax) : from.angle;
  let target: Target | undefined, best = Infinity, correction = 0;
  if (manual || autoTarget) for (const enemy of enemies) {
    if (enemy.hp <= 0 || enemy.age < 0.35) continue;
    const distance = Math.hypot(enemy.x - from.x, enemy.y - from.y);
    const targetAngle = Math.atan2(enemy.y - from.y, enemy.x - from.x);
    const delta = Math.atan2(Math.sin(targetAngle - angle), Math.cos(targetAngle - angle));
    if (manual && (distance > RANGE || Math.abs(delta) > CONE || !visible(from, enemy))) continue;
    const score = manual ? Math.abs(delta) + distance * 0.0001 : distance;
    if (score < best) { best = score; target = enemy; correction = delta; }
  }
  if (!manual && target) return { ax: target.x - from.x, ay: target.y - from.y };
  // At most six degrees of correction; the player still needs to track and lead.
  const result = angle + Math.max(-Math.PI / 30, Math.min(Math.PI / 30, correction * 0.35));
  return { ax: Math.cos(result), ay: Math.sin(result) };
}
