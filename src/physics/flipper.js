import { config } from '../config.js';
import { segment } from './shapes.js';
import { clamp, radians } from './vec.js';

export function createFlipper(side, settings = config.flipper) {
  const direction = side === 'left' ? 1 : -1;
  const x = side === 'left' ? settings.leftX : settings.rightX;
  const y = settings.y;
  const rest = radians(settings.restDegrees), raised = radians(settings.raisedDegrees);
  let angle = rest;
  const shape = segment(x, y, 0, 0, {
    side, direction, radius: settings.rootRadius, tipRadius: settings.tipRadius, mat: 'flipper',
    omega: 0, driving: false, pressed: false, settings,
  });
  function updateEnd() {
    shape.x2 = x + direction * settings.length * Math.cos(angle);
    shape.y2 = y + settings.length * Math.sin(angle);
  }
  updateEnd();
  shape.advance = (held, dt) => {
    const previous = angle;
    const target = held ? raised : rest;
    if (!held) shape.softStroke = false;
    const speed = held ? (shape.softStroke ? settings.passUpSpeed : settings.upSpeed) : settings.downSpeed;
    angle = clamp(angle + Math.sign(target - angle) * speed * dt, raised, rest);
    shape.omega = angle === target ? 0 : direction * (angle - previous) / dt;
    shape.driving = held && shape.omega !== 0;
    shape.pressed = held;
    updateEnd();
  };
  return shape;
}
