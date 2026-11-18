import { config } from '../config.js';
import { clamp, dot } from './vec.js';

export function segment(x1, y1, x2, y2, options = {}) {
  return { type: 'segment', x1, y1, x2, y2, radius: 0, mat: 'wall', ...options };
}
export function circle(x, y, radius, options = {}) {
  return { type: 'circle', x, y, radius, mat: 'wall', ...options };
}

export function arc(x, y, radius, start, end, options) {
  const count = Math.max(1, Math.ceil(Math.abs(end - start) * radius / config.physics.arcSegment));
  const result = [];
  let ax = x + radius * Math.cos(start), ay = y + radius * Math.sin(start);
  for (let i = 1; i <= count; i++) {
    const angle = start + (end - start) * i / count;
    const bx = x + radius * Math.cos(angle), by = y + radius * Math.sin(angle);
    result.push(segment(ax, ay, bx, by, options));
    [ax, ay] = [bx, by];
  }
  return result;
}

export function bounds(shape) {
  const r = shape.radius;
  return shape.type === 'circle' ? [shape.x - r, shape.y - r, shape.x + r, shape.y + r]
    : [Math.min(shape.x1, shape.x2) - r, Math.min(shape.y1, shape.y2) - r,
      Math.max(shape.x1, shape.x2) + r, Math.max(shape.y1, shape.y2) + r];
}

export function contact(ball, shape) {
  let x, y, radius, t = 0;
  if (shape.type === 'circle') {
    ({ x, y, radius } = shape);
  } else {
    const dx = shape.x2 - shape.x1, dy = shape.y2 - shape.y1;
    const length = Math.hypot(dx, dy);
    let projection = dot(ball.x - shape.x1, ball.y - shape.y1, dx, dy) / length;
    // 变半径胶囊：投影向半径较大的一侧修正，接触的是共同切面。
    if (shape.tipRadius !== undefined) {
      const slope = (shape.tipRadius - shape.radius) / length;
      const lateral = Math.abs(dot(ball.x - shape.x1, ball.y - shape.y1, -dy, dx) / length);
      projection += slope * lateral / Math.sqrt(1 - slope * slope);
    }
    t = clamp(projection / length, 0, 1);
    x = shape.x1 + dx * t;
    y = shape.y1 + dy * t;
    radius = shape.radius + ((shape.tipRadius ?? shape.radius) - shape.radius) * t;
  }
  const dx = ball.x - x, dy = ball.y - y;
  if (shape.gate) {
    const [gx, gy] = shape.gate;
    if (dot(ball.px - x, ball.py - y, gx, gy) < 0 || dot(ball.vx, ball.vy, gx, gy) >= 0) return null;
  }
  const reach = ball.radius + radius;
  const squared = dx * dx + dy * dy;
  if (squared >= reach * reach) return null;
  const distance = Math.sqrt(squared);
  const speed = Math.hypot(ball.vx, ball.vy) || 1;
  const nx = distance ? dx / distance : (ball.vx ? -ball.vx / speed : 0);
  const ny = distance ? dy / distance : (ball.vy ? -ball.vy / speed : -1);
  return { shape, t, nx, ny, depth: reach - distance, x: x + nx * radius, y: y + ny * radius };
}
