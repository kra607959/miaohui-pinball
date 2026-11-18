import { config } from '../config.js';
import { createRng } from './rng.js';

export function createBot(seed, settings = config.bot) {
  const rng = createRng(seed);
  let chargeStart = null, power = 0, loadId, releaseAt = { left: 0, right: 0 };
  return ({world}) => {
    const input = { left: false, right: false, launch: false };
    const current = world.balls.find(ball => ball.status === 'plunger');
    if (current) {
      if (current.id !== loadId || chargeStart === null) {
        loadId = current.id;
        chargeStart = world.time + settings.waitAfter;
        power = settings.minPower + rng() * (settings.maxPower - settings.minPower);
      }
      input.launch = world.time >= chargeStart && world.time < chargeStart + world.settings.plunger.fullIn * power;
    } else { loadId = undefined; chargeStart = null; }
    for (const f of world.flippers) {
      if (world.time < releaseAt[f.side]) { input[f.side] = true; continue; }
      if (f.pressed) continue;
      for (const ball of world.balls) {
        if (ball.status !== 'live' || ball.vy < 45) continue;
        const depth = (ball.x - f.x1) * f.direction;
        if (depth < -16 || depth > f.settings.length + ball.radius || ball.y < f.y1 - 68) continue;
        const y = ball.y + ball.vy * settings.reachAhead;
        if (y >= f.y1 + depth * 0.26 - ball.radius * 2.2 && ball.y <= f.y1 + depth * 0.5 + 12) {
          releaseAt[f.side] = world.time + settings.holdTime;
          input[f.side] = true;
          break;
        }
      }
    }
    return input;
  };
}
