import { config } from '../config.js';
import { circle, segment } from '../physics/shapes.js';
import { createFrame } from './frame.js';
import { trialModules } from './modules/trial.js';

export const slots = { top: [60, 60, 400, 150], left: [30, 230, 160, 300], center: [195, 240, 130, 260],
  right: [330, 230, 160, 300], lower: [200, 560, 120, 120], orbit: [0, 0, 520, 1000] };
const elementMat = { bumper: 'bumper', drop: 'rubber', standup: 'rubber', post: 'rubber' };

export function assembleTable(modules = trialModules, options = {}) {
  const frame = createFrame();
  frame.colliders.push(segment(297, 31, 333, 76, { mat: 'rubber' }), segment(520, 783, 476, 823));
  const elements = [
    { kind: 'sling', id: 'sling-left', x: 103, y: 795 }, { kind: 'sling', id: 'sling-right', x: 417, y: 795 },
    { kind: 'inlane', id: 'inlane-left', x: 83, y: 808, w: 61, h: 51, approach: 1 },
    { kind: 'inlane', id: 'inlane-right', x: 376, y: 808, w: 61, h: 51, approach: 1 },
    { kind: 'outlane', id: 'outlane-left', x: 18, y: config.table.outlaneY, w: config.table.outlaneLeft - 18, h: 120, side: 'left', approach: 1 },
    { kind: 'outlane', id: 'outlane-right', x: config.table.outlaneRight, y: config.table.outlaneY, w: 520 - config.table.outlaneRight, h: 120, side: 'right', approach: 1 },
  ];
  const keepClear=[];
  for (const module of modules) {
    const [x, y, w] = slots[module.slot];
    const mx = (local, width = 0) => x + (module.mirrored ? w - local - width : local);
    for(const [a,b,c,d] of module.keepClear??[]){const from=mx(a),to=mx(c);keepClear.push({id:module.id,box:[Math.min(from,to),y+b,Math.max(from,to),y+d]});}
    for (const def of module.elements) {
      const e = { ...def, id: `${module.id}:${def.id}`, x: mx(def.x, def.w), y: y + def.y,
        ...(def.group ? { group: module.id + ':' + def.group } : {}),
        ...(def.exit ? { exit: { ...def.exit, x: mx(def.exit.x, def.exit.w), y: y + def.exit.y } } : {}),
        ...(module.mirrored && def.angle ? { angle: -def.angle } : {}),
      };
      elements.push(e);
      if (elementMat[e.kind]) {
        e.collider = circle(e.x, e.y, e.r, { kind: e.kind, mat: elementMat[e.kind], elementId: e.id, moduleId:module.id });
        frame.colliders.push(e.collider);
      }
    }
    for (const c of module.colliders) {
      frame.colliders.push(c.kind === 'circle' ? circle(mx(c.x), y + c.y, c.r, { mat: c.mat,moduleId:module.id })
        : segment(mx(c.x1), y + c.y1, mx(c.x2), y + c.y2, { mat: c.mat, radius: c.r ?? 0,moduleId:module.id }));
    }
  }
  return { ...frame, ...options, elements, modules, keepClear };
}
