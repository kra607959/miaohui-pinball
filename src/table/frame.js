import { config } from '../config.js';
import { arc, circle, segment } from '../physics/shapes.js';

export function createFrame() {
  const right = 556, left = 18, topJoin = 296, divider = config.board.playWidth;
  const colliders = [
    ...arc(287, topJoin, 269, Math.PI, 2 * Math.PI),
    segment(left, topJoin, left, 904), segment(right, topJoin, right, 980),
    segment(divider, 316, divider, 980), segment(divider, 193, divider, 316, { gate: [-1, 0] }),
    segment(divider, 980, right, 980),
    segment(62, 700, 100, 818), segment(100, 818, 159, 899),
    segment(458, 700, 420, 818), segment(420, 818, 361, 899),
    segment(18, 904, 203, 995), segment(divider, 904, 317, 995),
    segment(64, 754, 142, 836, { mat: 'sling', kind: 'sling', elementId: 'sling-left' }),
    segment(456, 754, 378, 836, { mat: 'sling', kind: 'sling', elementId: 'sling-right' }),
  ];
  return { colliders, drainY: config.board.height + config.physics.radius };
}

export function createLab() {
  const table = createFrame();
  table.colliders.push(
    circle(262, 360, 28, { mat: 'bumper', kind: 'bumper', elementId: 'lab-drum' }),
    circle(172, 245, 8, { mat: 'rubber' }), circle(348, 237, 8, { mat: 'rubber' }),
    circle(115, 510, 8, { mat: 'rubber' }), circle(411, 510, 8, { mat: 'rubber' }),
  );
  return table;
}
