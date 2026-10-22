// Health is stored in half-heart units, so damage stays integer-valued.
export const HEART_COUNT = 3;
export const MAX_HEALTH = HEART_COUNT * 2;
export const REVIVE_HEALTH = 4;
export function heartFills(health: number): number[] {
  const hp = Math.max(0, Math.min(MAX_HEALTH, health));
  return Array.from({ length: HEART_COUNT }, (_, index) => Math.max(0, Math.min(1, (hp - index * 2) / 2)));
}
