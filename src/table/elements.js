import { config } from '../config.js';
import { createRng } from '../game/rng.js';
import { radians } from '../physics/vec.js';

const within = (ball, box) => ball.x >= box.x && ball.x <= box.x + box.w && ball.y >= box.y && ball.y <= box.y + box.h;

export function createElements(table, world, emit, flags) {
  const { elements } = table;
  const byId = new Map(elements.map(e => [e.id, e]));
  const groups = new Map();
  const lanes = elements.filter(e => e.kind === 'lane');
  const sensors = elements.filter(e => !e.collider && !['sling', 'post'].includes(e.kind));
  const state = new Map(elements.map(e => [e.id, { lit: false, inside: new Set(), resetAt: 0, hotAt: -Infinity, rotation: 0 }]));
  const orbitEntries = new Map();
  const releaseRandom=createRng(world.seed^0x246a5d2);
  let selectedLane = 0;
  for (const e of elements) if (e.group) {
    if (!groups.has(e.group)) groups.set(e.group, []);
    groups.get(e.group).push(e);
  }

  function complete(e, ball) {
    const group = groups.get(e.group);
    if (!group?.every(el => state.get(el.id).lit && !state.get(el.id).resetAt)) return;
    for (const el of group) {
      const s = state.get(el.id);
      if (e.kind === 'lane') s.lit = false;
      else s.resetAt = flags.keepLanterns || flags.raiseLanterns ? Infinity : world.time + config.table.dropReset;
    }
    emit('setComplete', { set: e.kind, elementId: e.id, ball });
  }

  function knock(e, ball) {
    const s = state.get(e.id);
    if (!s.lit) {
      s.lit = true;
      if (!flags.keepLanterns) e.collider.disabled = true;
      emit('hit', { kind: e.kind, elementId: e.id, speed: 0, ball, x: e.x, y: e.y });
    } else if (flags.keepLanterns) emit('lanternAgain', { elementId: e.id, ball, x: e.x, y: e.y });
  }

  function physicalHit(event) {
    const e = byId.get(event.elementId);
    if (!e) return;
    state.get(e.id).hotAt = world.time;
    if (e.kind === 'drop') {
      knock(e, event.ball);
      if (event.ball.neighborDrop) {
        const group = groups.get(e.group), i = group.indexOf(e);
        const neighbor = [group[i + 1], group[i - 1]].find(item => item && !state.get(item.id).lit);
        if (neighbor) knock(neighbor, event.ball);
      }
      complete(e, event.ball);
    } else emit('hit', event);
  }

  function hit(e, ball, extra = {}) {
    state.get(e.id).hotAt = world.time;
    emit('hit', { kind: e.kind, elementId: e.id, ball, x: ball.x, y: ball.y, speed: Math.hypot(ball.vx, ball.vy), ...extra });
  }

  function step() {
    for (const e of elements) {
      const s = state.get(e.id);
      if (s.resetAt && s.resetAt <= world.time) {
        s.resetAt = 0; s.lit = false; e.collider.disabled = false;
      }
      if (s.caught && world.time >= s.releaseAt) {
        const b = s.caught;
        // 记录每个糖人洞，能打破单洞循环，也能打破两个洞之间的来回循环。
        const visits=b.saucerVisits??=new Map();
        const back=world.time-(visits.get(e.id)??-Infinity)<config.table.saucerRepeatSeconds;
        const delta=back?(releaseRandom()<.5?-1:1)*config.table.saucerRepeatAngle*(.65+releaseRandom()*.35):0;
        const angle=radians(e.angle+delta);visits.set(e.id,world.time);
        b.status = 'live'; b.vx = Math.sin(angle) * config.table.saucerSpeed; b.vy = -Math.cos(angle) * config.table.saucerSpeed;
        b.x = b.px = e.x + Math.sin(angle) * (e.r + b.radius + 2);
        b.y = b.py = e.y - Math.cos(angle) * (e.r + b.radius + 2);
        s.caught = null;
      }
      if (s.halfTurns) {
        s.rotation += s.halfTurns * world.settings.clock.fixedStep;
        s.halfTurns *= config.table.spinnerDecay ** world.settings.clock.fixedStep;
        while (s.rotation >= 1) { s.rotation--; emit('spinnerHalfTurn', { elementId: e.id, ball: s.spinBall, x: e.x, y: e.y }); }
        if (s.halfTurns < 0.16) s.halfTurns = 0;
      }
    }
    for (const ball of world.balls.slice()) {
      if (ball.status !== 'live') continue;
      for (const e of sensors) {
        const s = state.get(e.id);
        if (e.kind === 'saucer') {
          const distance = Math.hypot(ball.x - e.x, ball.y - e.y);
          if (flags.saucerMagnet && distance < flags.saucerMagnet && distance > e.r) {
            ball.vx += (e.x - ball.x) / distance * flags.saucerPull * world.settings.clock.fixedStep;
            ball.vy += (e.y - ball.y) / distance * flags.saucerPull * world.settings.clock.fixedStep;
          }
          if (!s.caught && distance < e.r - ball.radius / 2) {
            hit(e, ball); s.caught = ball; s.releaseAt = world.time + config.table.saucerHold;
            ball.status = 'captured'; ball.x = ball.px = e.x; ball.y = ball.py = e.y; ball.vx = ball.vy = 0;
            emit('saucerCatch', { elementId: e.id, ball, x: e.x, y: e.y });
            break;
          }
          continue;
        }
        if (e.kind === 'orbit') {
          const key = `${e.id}:${ball.id}`;
          const end = within(ball, e) ? 1 : within(ball, e.exit) ? 2 : 0;
          if (end && orbitEntries.get(key)?.end !== end) {
            const previous = orbitEntries.get(key);
            if (previous && world.time - previous.at < config.table.orbitWindow) {
              ball.orbits = world.time - (ball.lastOrbit ?? -Infinity) <= config.table.orbitWindow ? (ball.orbits ?? 0) + 1 : 1;
              ball.lastOrbit = world.time;
              emit('orbit', { elementId: e.id, ball, count: ball.orbits, x: ball.x, y: ball.y });
            }
            orbitEntries.set(key, { end, at: world.time });
          }
          continue;
        }
        if (!within(ball, e)) { s.inside.delete(ball.id); continue; }
        if (s.inside.has(ball.id)) continue;
        s.inside.add(ball.id);
        if (e.approach && ball.vy * e.approach <= 0) continue;
        if (e.kind === 'outlane') {
          if (ball.safeUntil && world.time < ball.safeUntil) continue;
          world.removeBall(ball);
          emit('outlaneDrain', { ball, outlane: true, side: e.side, x: ball.x, y: ball.y });
          break;
        }
        hit(e, ball);
        if (e.kind === 'lane') {
          s.lit = true;
          if (lanes[selectedLane] === e && ball.skillOpen) emit('skillShot', { ball, elementId: e.id, x: e.x + e.w / 2, y: e.y });
          ball.skillOpen = false;
          complete(e, ball);
        } else if (e.kind === 'spinner') {
          s.halfTurns = Math.max(s.halfTurns ?? 0, Math.hypot(ball.vx, ball.vy) / config.table.spinnerImpulse);
          s.halfTurns = Math.max(s.halfTurns, 2); s.spinBall = ball;
        }
      }
    }
  }

  return {
    state, step, physicalHit,
    get lane() { return lanes[selectedLane]?.id; },
    shiftLane(direction) { if (lanes.length) selectedLane = (selectedLane + direction + lanes.length) % lanes.length; },
    allLanterns(ball) {
      for (const group of groups.values()) if (group[0].kind === 'drop') {
        for (const e of group) knock(e, ball);
        complete(group[0], ball);
      }
    },
  };
}
