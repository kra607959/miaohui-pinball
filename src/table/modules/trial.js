const spec = (id, slot, elements, colliders = [], extra = {}) => ({ id, slot, weight: { default: 1 }, elements, colliders, keepClear: [], ...extra });
const gate = (kind, id, x, y, w, h, more) => ({ kind, id, x, y, w, h, ...more });
const round = (kind, id, x, y, r, more) => ({ kind, id, x, y, r, ...more });

export const topLanes = spec('top_lanes3', 'top', [gate('lane', 'circle-a', 5, 23, 127, 72, { group: 'circles' }),
  gate('lane', 'circle-b', 137, 23, 127, 72, { group: 'circles' }), gate('lane', 'circle-c', 269, 23, 127, 72, { group: 'circles' })]);
export const leftLanterns = spec('left_lanterns3', 'left', [round('drop', 'lantern-a', 51, 57, 13, { group: 'lanterns' }),
  round('drop', 'lantern-b', 90, 57, 13, { group: 'lanterns' }), round('drop', 'lantern-c', 129, 57, 13, { group: 'lanterns' })]);
export const centerDrums = spec('center_drums3', 'center', [round('bumper', 'drum-a', 23, 107, 22),
  round('bumper', 'drum-b', 107, 107, 22), round('bumper', 'drum-c', 65, 170, 24)]);
export const rightSaucer = spec('right_saucer', 'right', [round('saucer', 'sugar', 85, 196, 33, { angle: -45 })]);
export const lowerLanterns = spec('lower_standups', 'lower', [round('standup', 'light-a', 28, 28, 12), round('standup', 'light-b', 92, 28, 12)]);
export const leftOrbit = spec('orbit_left', 'orbit', [gate('spinner', 'fan', 30, 645, 49, 32),
  gate('orbit', 'orbit-left', 22, 240, 64, 69, { exit: { x: 22, y: 570, w: 60, h: 78 } })]);
export const trialModules = [topLanes, leftLanterns, centerDrums, rightSaucer, lowerLanterns, leftOrbit];
export const part = { spec, gate, round };
