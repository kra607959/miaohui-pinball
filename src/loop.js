import { config } from './config.js';

export function createFixedLoop(update, { fixedStep, maxFrameSeconds } = config.clock) {
  let previous = null;
  let carry = 0;
  let paused = false;

  function step(count = 1) {
    if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('步数必须是非负整数');
    for (let i = 0; i < count; i++) update(fixedStep);
    return count;
  }

  return {
    step,
    advance(timestamp) {
      const elapsed = previous === null ? 0 : Math.max(0, timestamp - previous);
      previous = timestamp;
      const fps = elapsed > 0 ? 1000 / elapsed : 0;
      if (paused) return { fps, steps: 0, alpha: 0 };
      carry += Math.min(elapsed / 1000, maxFrameSeconds) / fixedStep;
      // 累加器用步数表示，消除整步边界附近的浮点舍入误差。
      const steps = Math.floor(carry + 1e-9);
      carry = Math.max(0, carry - steps);
      step(steps);
      return { fps, steps, alpha: carry };
    },
    setPaused(value) {
      if (paused === value) return;
      paused = value;
      previous = null;
      carry = 0;
    },
  };
}
