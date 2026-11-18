import { config } from '../config.js';

function strokeShape(ctx, shape) {
  ctx.beginPath();
  if (shape.type === 'circle') {
    ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
  } else {
    ctx.moveTo(shape.x1, shape.y1);
    ctx.lineTo(shape.x2, shape.y2);
  }
  ctx.stroke();
}

export function drawWireframe(ctx, world, alpha, debug) {
  const { board } = config;
  ctx.clearRect(0, 0, board.width, board.height);
  ctx.fillStyle = '#1e2731';
  ctx.fillRect(0, 0, board.width, board.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  for (const shape of world.table.colliders) {
    if (shape.disabled) continue;
    ctx.strokeStyle = shape.mat === 'bumper' || shape.mat === 'sling' ? '#ecb774' : shape.gate ? '#6aa998' : '#8e9fb2';
    if (shape.gate) ctx.setLineDash([6, 7]);
    strokeShape(ctx, shape);
    if (shape.gate) ctx.setLineDash([]);
  }
  for (const f of world.flippers) {
    ctx.strokeStyle = ctx.fillStyle = f.pressed ? '#7cecd9' : '#afbdcc';
    ctx.lineWidth = 2 * f.tipRadius;
    strokeShape(ctx, f);
    ctx.beginPath();
    ctx.arc(f.x1, f.y1, f.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  if (world.ready) {
    const plunger = world.settings.plunger;
    ctx.fillStyle = '#536679';
    ctx.fillRect(plunger.x - 10, 978 - 140, 20, 140);
    ctx.fillStyle = '#62b6a8';
    ctx.fillRect(plunger.x - 10, 978 - 140 * world.plunger.power, 20, 140 * world.plunger.power);
  }
  for (const ball of world.balls) {
    if (ball.status === 'captured') continue;
    const x = ball.px + (ball.x - ball.px) * alpha;
    const y = ball.py + (ball.y - ball.py) * alpha;
    ctx.fillStyle = '#f1f9ff';
    ctx.beginPath();
    ctx.arc(x, y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    if (debug && ball.status === 'live') {
      ctx.strokeStyle = '#7cecd9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + ball.vx / 35, y + ball.vy / 35);
      ctx.stroke();
    }
  }
}
