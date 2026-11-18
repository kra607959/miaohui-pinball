import { config } from '../config.js';

export function createPlunger(settings = config.plunger) {
  let time = 0;
  let held = false;
  return {
    power: 0,
    cancel() { time = 0; held = false; this.power = 0; },
    update(pressed, dt, ball) {
      if (!ball) { this.cancel(); return false; }
      if (pressed) {
        time += dt;
        const cycle = (time / settings.fullIn) % 2;
        this.power = cycle <= 1 ? cycle : 2 - cycle;
      } else if (held) {
        ball.status = 'live';
        ball.vy = -(settings.baseSpeed + this.power * settings.extraSpeed);
        this.cancel();
        return true;
      }
      held = pressed;
      return false;
    },
  };
}
