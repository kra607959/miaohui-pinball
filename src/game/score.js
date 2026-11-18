import { config } from '../config.js';

export function createScore(emit, flags) {
  const score = { points: 0, multiplier: 1, combo: 0, lastHit: -Infinity };
  return {
    state: score,
    add(n, src, event = {}) {
      const points = Math.max(0, Math.floor(n * (flags.scoreScale ?? 1)));
      score.points += points;
      if (points) {
        emit('points',{...event,points,src});
        const ball=event.ball;
        if(ball){ball.points=(ball.points??0)+points;emit('ballPoints',{ball,points,src});}
      }
      return points;
    },
    mult(n, src) {
      score.multiplier = Math.max(1, score.multiplier + n);
      emit('multiplier', { n, src });
    },
    hit(base, src, event, time, multi) {
      if (!base) return;
      score.combo = time - score.lastHit <= (flags.comboSeconds ?? config.game.comboSeconds) ? score.combo + 1 : 1;
      score.lastHit = time;
      const original = { ...event, src, base: base * (event.ball?.baseScale ?? 1) };
      const value = emit('score', original);
      const final = emit('scoreFinal', { ...value, points: value.base * score.multiplier * (multi ? flags.multiScore ?? config.game.multiScore : 1) });
      this.add(final.points, final.src, final);
      emit('comboChanged', { n: score.combo, ball:event.ball });
    },
    reset() {
      score.multiplier = flags.lockMultiplier ? score.multiplier : flags.keepMultiplier ? Math.max(1, Math.floor(score.multiplier / 2)) : 1;
      score.combo = 0; score.lastHit = -Infinity;
    },
  };
}

