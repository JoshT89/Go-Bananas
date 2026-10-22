import type { Input } from './simulation';
import { idleInput } from './simulation';

export function stickVector(dx: number, dy: number, radius: number) {
  const distance = Math.hypot(dx, dy);
  if (radius <= 0 || distance < radius * 0.13) return { x: 0, y: 0 };
  const length = Math.min(1, distance / radius);
  return { x: dx / distance * length, y: dy / distance * length };
}

// Pointer identities are independent: aiming never steals the movement thumb.
export class TouchState {
  private active = false;
  move = { x: 0, y: 0 };
  aim = { x: 0, y: 0 };
  movePointer: number | null = null;
  aimPointer: number | null = null;
  aimHeld = false;
  revive = false;
  private bomb = false;
  private dash = false;
  setActive(value: boolean) { this.active = value; if (!value) this.reset(); }
  begin(kind: 'move' | 'aim', pointerId: number) {
    if (kind === 'move') { if (this.movePointer !== null) return false; this.movePointer = pointerId; }
    else { if (this.aimPointer !== null) return false; this.aimPointer = pointerId; this.aimHeld = true; }
    return true;
  }
  moveStick(kind: 'move' | 'aim', pointerId: number, dx: number, dy: number, radius: number) {
    if ((kind === 'move' ? this.movePointer : this.aimPointer) !== pointerId) return;
    this[kind] = stickVector(dx, dy, radius);
  }
  end(pointerId: number) {
    if (this.movePointer === pointerId) { this.movePointer = null; this.move = { x: 0, y: 0 }; }
    if (this.aimPointer === pointerId) { this.aimPointer = null; this.aimHeld = false; this.aim = { x: 0, y: 0 }; }
  }
  queue(action: 'bomb' | 'dash') { this[action] = true; }
  read(): Input {
    return { ...idleInput(), mx: this.move.x, my: this.move.y, ax: this.aim.x, ay: this.aim.y,
      fire: this.active, bomb: this.bomb, dash: this.dash, revive: this.revive };
  }
  consumeActions() { this.bomb = false; this.dash = false; }
  reset() { this.move = { x: 0, y: 0 }; this.aim = { x: 0, y: 0 }; this.movePointer = this.aimPointer = null; this.aimHeld = false; this.revive = false; this.consumeActions(); }
}
