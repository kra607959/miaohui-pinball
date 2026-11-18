import { config } from '../config.js';
import { createGrid } from './broadphase.js';
import { createFlipper } from './flipper.js';
import { createPlunger } from './plunger.js';
import { contact } from './shapes.js';
import { dot, limitVelocity, radians } from './vec.js';

export function assertStep(maxSpeed, dt, radius) {
  if (!(maxSpeed * dt < config.physics.stepLimit * radius)) {
    throw new RangeError(`步长不安全：最高速度 × 步长必须小于 ${config.physics.stepLimit} × 珠子半径`);
  }
}

function collide(ball, hit, materials, events) {
  const { nx, ny, x, y, depth, t, shape } = hit;
  ball.x += nx * depth;
  ball.y += ny * depth;
  const omega = shape.omega ?? 0;
  const sx = -omega * (y - shape.y1) || 0, sy = omega * (x - shape.x1) || 0;
  const vx = ball.vx - sx, vy = ball.vy - sy;
  const roll = ball.vx * shape.direction;
  const vn = dot(vx, vy, nx, ny);
  if (vn >= 0) return;
  const mat = shape.settings ?? materials[shape.mat];
  const tangential = dot(vx, vy, -ny, nx) * (1 - (mat.friction ?? 0));
  let normal = -vn * mat.restitution;
  if (mat.boost) normal = Math.max(mat.minimum, normal + mat.boost * (ball.bumperBoost ?? 1));
  else if (mat.minimum && -vn > mat.triggerSpeed) normal = Math.max(mat.minimum, normal);
  ball.vx = sx + nx * normal - ny * tangential;
  ball.vy = sy + ny * normal + nx * tangential;

  // 击球面在上抬时有轻微导向，位置越靠尖端越有力、越偏向台外侧。
  if (shape.driving && ny < -0.35) {
    // 从停球位先松板，珠子滚向板尖时轻抬，可低平地传到对侧。
    if (t >= mat.passFrom && t <= mat.passTo && roll >= mat.passRoll && roll <= mat.passRun && vy > 0) {
      shape.softStroke = true;
      ball.vx = shape.direction * mat.passX;
      ball.vy = -mat.passY;
      events.push({ type: 'flip', ball, side: shape.side, t, speed: Math.hypot(ball.vx, ball.vy), pass: true });
      return;
    }
    const angle = shape.direction * radians(mat.aimTip + (mat.aimRoot - mat.aimTip) * t);
    const speed = mat.kickFloor + Math.hypot(ball.vx, ball.vy) * mat.kickResponse;
    ball.vx = Math.sin(angle) * speed;
    ball.vy = -Math.cos(angle) * speed;
    events.push({ type: 'flip', ball, side: shape.side, t, speed });
  }
  if (ball.collisionEvents) events.push({type:'collision',ball});
  if (shape.elementId) events.push({ type: 'hit', ball, kind: shape.kind, elementId: shape.elementId, speed: -vn, x, y });
}

function collideBalls(a, b, restitution) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const reach = a.radius + b.radius, distance = Math.hypot(dx, dy);
  if (distance >= reach) return;
  const nx = distance ? dx / distance : 1, ny = distance ? dy / distance : 0;
  const half = (reach - distance) / 2;
  a.x -= nx * half; a.y -= ny * half;
  b.x += nx * half; b.y += ny * half;
  const approach = dot(b.vx - a.vx, b.vy - a.vy, nx, ny);
  if (approach >= 0) return;
  const impulse = -(1 + restitution) * approach / 2;
  a.vx -= impulse * nx; a.vy -= impulse * ny;
  b.vx += impulse * nx; b.vy += impulse * ny;
}

export function createWorld(table, { settings = config, seed = 0 } = {}) {
  const p = settings.physics;
  assertStep(p.maxSpeed, settings.clock.fixedStep, p.radius);
  const findNearby = createGrid(table.colliders.filter(c=>!c.moving), p.cellSize);
  const moving=table.colliders.filter(c=>c.moving);
  const flippers = table.flippers === false ? [] : ['left', 'right'].map(side => createFlipper(side, settings.flipper));
  const actuators = [...flippers,...moving];
  const plunger = createPlunger(settings.plunger);
  const balls = [];
  let nextId = 0;
  let ticks = 0;
  const world = {
    balls, flippers, plunger, table, seed, settings,
    get ticks() { return ticks; },
    get time() { return ticks * settings.clock.fixedStep; },
    get ready() { return balls.some(ball => ball.status === 'plunger'); },
    spawnBall(x, y, vx = 0, vy = 0, options = {}) {
      const ball = { id: ++nextId, x, y, px: x, py: y, vx, vy, radius: p.radius, status: 'live', ...options };
      assertStep(p.maxSpeed, settings.clock.fixedStep, ball.radius);
      limitVelocity(ball, p.maxSpeed * (ball.speedScale ?? 1));
      balls.push(ball);
      return ball;
    },
    loadBall(options) {
      return world.spawnBall(settings.plunger.x, settings.plunger.y, 0, 0, { ...options, status: 'plunger' });
    },
    removeBall(ball) {
      const index = balls.indexOf(ball);
      if (index >= 0) balls.splice(index, 1);
    },
    step(input = {}) {
      const dt = settings.clock.fixedStep;
      const events = [];
      ticks++;
      for (const flipper of flippers) flipper.advance(Boolean(input[flipper.side]), dt);
      const waiting = balls.find(ball => ball.status === 'plunger');
      if (plunger.update(Boolean(input.launch), dt, waiting)) events.push({ type: 'launch', ball: waiting, speed: -waiting.vy });
      const damping = p.damping ** dt;
      const live = balls.filter(ball => ball.status === 'live');
      for (const ball of live) {
        ball.px = ball.x; ball.py = ball.y;
        ball.vx *= damping;
        ball.vy = (ball.vy + p.gravity * (ball.gravityScale ?? 1) * dt) * damping;
        limitVelocity(ball, p.maxSpeed * (ball.speedScale ?? 1));
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      }
      for (let iteration = 0; iteration < p.iterations; iteration++) {
        let pushed = false;
        for (const ball of live) {
          const hits = [];
          for (const shape of findNearby(ball.x, ball.y, ball.radius)) {
            if (shape.disabled) continue;
            const hit = contact(ball, shape);
            if (hit) hits.push(hit);
          }
          for (const shape of actuators) {
            const hit = contact(ball, shape);
            if (hit) hits.push(hit);
          }
          hits.sort((a, b) => b.depth - a.depth);
          for (const initial of hits) {
            const hit = contact(ball, initial.shape);
            if (hit) { collide(ball, hit, settings.materials, events); pushed = true; }
          }
        }
        for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) collideBalls(live[i], live[j], p.ballRestitution);
        if (!pushed && live.length < 2) break;
      }
      for (const ball of live) {
        limitVelocity(ball, p.maxSpeed * (ball.speedScale ?? 1));
        if (ball.y > (table.drainY ?? Infinity)) {
          world.removeBall(ball);
          events.push({ type: 'drain', ball, x: ball.x, y: ball.y });
        } else if (ball.x > settings.board.playWidth && ball.y >= settings.plunger.y && ball.vy > 0) {
          ball.status = 'plunger'; ball.x = ball.px = settings.plunger.x;
          ball.y = ball.py = settings.plunger.y; ball.vx = ball.vy = 0;
          events.push({ type: 'requeue', ball });
        }
      }
      return events;
    },
  };
  return world;
}
