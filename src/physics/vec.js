export const radians = degrees => degrees * Math.PI / 180;
export const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
export const dot = (ax, ay, bx, by) => ax * bx + ay * by;

export function limitVelocity(body, limit) {
  const squared = body.vx * body.vx + body.vy * body.vy;
  if (squared <= limit * limit) return;
  const scale = limit / Math.sqrt(squared);
  body.vx *= scale;
  body.vy *= scale;
}
