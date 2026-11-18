import { config } from '../config.js';
import { createWorld } from '../physics/world.js';
import { radians } from '../physics/vec.js';
import { createElements } from '../table/elements.js';
import { createHooks } from './events.js';
import { createRng } from './rng.js';
import { createScore } from './score.js';
import { byId } from './items/index.js';
import { limitVelocity } from '../physics/vec.js';

const quiet = new Set(['score', 'scoreFinal', 'ballPoints', 'comboChanged', 'tick', 'collision']);

export function createSession(table, options = {}) {
  const { seed = 0, target = config.game.targets[0], items = [], balls: stock = Array(config.game.ballCount).fill('gang'),
    settings = config, onEvent = () => {}, bank = 0, spells = [], modifiers = [] } = options;
  const prepared = {table,settings};
  if(table.appliedMods){
    if(table.generatedFlipperScale!==1)prepared.settings={...settings,flipper:{...settings.flipper,length:settings.flipper.length*table.generatedFlipperScale}};
  }else for (const mod of modifiers) mod.on?.applyTable?.(prepared);
  const rules = prepared.settings.game;
  const world = createWorld(table, { settings:prepared.settings, seed });
  const rng = createRng(seed);
  const reserve = stock.slice();
  const flags = {};
  const pocket = [...spells];
  const state = { phase: 'play', coins: 0, bank, target, itemEffect:null, tilt: 0, tilted: false, multi: false, shots: 0, catches: 0, ballsUsed: 0,
    saveUntil: 0, launchAt: null, lastDrain: null };
  const events = [];
  let activeBallType = 'gang';
  let draining = null;
  let lastInput = {};
  let sound = null;
  const ctx = {
    state, world, table, flags, rng, emit, get multiplier() { return score.state.multiplier; }, addPoints: (n, src, ev) => !state.tilted && score.add(n, src, ev),
    addMult: (n, src) => !state.tilted && score.mult(n, src),
    addCoins(n, src) { if (!state.tilted) { state.coins += n; emit('coins', { n, src }); } },
    saveBall(src) { if (draining && !draining.save) draining.save = src; },
    returnBall(src) { if (draining && !draining.save) { draining.save=src; draining.returned=true; } },
    spawnBall({x,y,vx,vy,...properties},src) { world.spawnBall(x,y,vx,vy,properties); if (src) ctx.effect(src,'分珠 +1'); },
    effect(src, label) { emit('itemEffect',{src,label}); },
    setFlag(key,value,src,label) { flags[key]=value; if(src)ctx.effect(src,label); },
    extendSave(seconds,src) { state.saveUntil=Math.max(state.saveUntil,world.time+seconds); if(src)ctx.effect(src,'保珠延长'); },
    extraBall(id='gang',src) { reserve.push(id); if(src)ctx.effect(src,'珠匣 +1'); },
    allLanterns(src) { elements.allLanterns(world.balls.find(b=>b.status==='live')); if(src)ctx.effect(src,'灯笼全倒'); },
    breakBall(ball) { if (ball.status === 'live') ball.broken = true; },
  };
  const hooks = createHooks([...items,...modifiers,...new Set(stock.map(id=>byId[id]).filter(Boolean))], ctx);
  const score = createScore(emit, flags);
  const elements = createElements(table, world, emit, flags);

  function emit(type, detail = {}) {
    if (type === 'outlaneDrain') { onDrain(detail); return detail; }
    const event = { ...detail, type, time: world.time };
    if (!quiet.has(type)) {
      events.push(event);
      if (events.length > 20) events.shift();
    }
    if (['points','coins','multiplier','itemEffect'].includes(type) && byId[event.src]) {
      const label = event.label ?? (type==='points' ? `+${event.points} 分` : type==='coins' ? `+${event.n} 铜` : `+${event.n} 倍`);
      state.itemEffect = {src:event.src,label,time:world.time};
    }
    if (!state.tilted || type==='tableClear') hooks(type, event);
    onEvent(event);
    sound?.(event);
    if (state.tilted || quiet.has(type)) return event;
    if (type === 'hit') score.hit(config.points[event.kind], event.elementId, event, world.time, state.multi);
    if (type === 'spinnerHalfTurn') score.hit(config.points.spinner, event.elementId, { ...event, kind:'spinner' }, world.time, state.multi);
    if (type === 'orbit') score.hit(config.points.orbit * (event.count === 2 ? 2 : 1), event.elementId, event, world.time, state.multi);
    if (type === 'setComplete') {
      score.mult((flags.setMultiplier?.[event.set] ?? 1) + (flags.setExtra ?? 0), event.elementId);
      flags.setExtra = 0;
      if (event.set === 'drop') score.add(rules.lanternSetPoints, event.elementId, event);
    }
    if (type === 'skillShot') { score.add(rules.skillPoints, event.elementId, event); score.mult(1, event.elementId); }
    if (type === 'saucerCatch' && state.phase==='play' && !state.multi && ++state.catches === rules.multiCatch) beginMulti(event);
    if (state.phase === 'play' && score.state.points >= target) {
      state.phase = 'bonus';
      emit('targetReached');
    }
    return event;
  }

  function beginMulti({ ball, x, y }) {
    state.multi = true;
    state.catches = 0;
    for (let i = 1; i < rules.multiCount + (flags.extraMulti ?? 0); i++) {
      const side = i % 2 ? -1 : 1;
      world.spawnBall(x + side * (ball.radius * 3 + 10), y - ball.radius * 3 - i * 10, side * 640, -960,
        { ballType: 'gang', safeUntil: world.time + 0.1 });
    }
    emit('multiballStart');
  }

  function nextBall(saved = false) {
    if (!saved) {
      activeBallType = reserve.shift();
      state.ballsUsed++;
      state.launchAt = null;
      state.saveUntil = 0;
    }
    const ball = world.loadBall({ ...byId[activeBallType]?.profile, ballType: activeBallType, replay: saved });
    emit(saved ? 'ballSaved' : 'ballStart', { ball, index: state.ballsUsed });
    return ball;
  }

  function onDrain(event) {
    if (event.ball.ended) return;
    event.ball.ended = true;
    const outlane = event.outlane ?? false;
    const side = outlane ? event.side : 'center';
    draining = { ...event, outlane, side, save: null };
    emit('drain', draining);
    if (flags.safeCharm && world.balls.length===0 && !state.tilted && state.phase==='play' && !draining.save) {
      flags.safeCharm=false;draining.save='pingan';
    }
    const { save:replacement, returned } = draining;
    draining = null;
    if (replacement) ctx.effect(replacement,'救回珠子');
    if (returned) {
      world.spawnBall(side === 'left' ? 96 : 424, 815, side === 'left' ? 280 : -280, -1250,
        { ...byId[activeBallType]?.profile, ballType: activeBallType, safeUntil: world.time + 0.25 });
    }
    if (state.multi && world.balls.length <= 1) { state.multi = false; emit('multiballEnd'); }
    if (world.balls.length) return;
    state.lastDrain = side;
    if (!state.tilted && state.phase !== 'bonus' && (replacement || world.time < state.saveUntil)) {
      nextBall(true);
      return;
    }
    emit('turnEnd', { ...event, side, duration: world.time - (state.launchAt ?? world.time) });
    score.reset();
    state.tilt = 0;
    state.tilted = false;
    if (state.phase === 'bonus') {
      state.phase = 'clear';
      emit('tableClear', { unplayed: reserve.length });
    } else if (reserve.length) nextBall();
    else { state.phase = 'failed'; emit('tableFailed'); }
  }

  function nudge(ball, power = rules.nudgePower) {
    const angle = radians((rng() * 2 - 1) * rules.nudgeAngle);
    ball.vx += Math.sin(angle) * power;
    ball.vy -= Math.cos(angle) * power;
  }

  function step(input = {}) {
    if (state.phase === 'clear' || state.phase === 'failed') return;
    const dt = settings.clock.fixedStep;
    state.tilt = Math.max(0, state.tilt - rules.tiltDecay * dt);
    if (input.nudge && !lastInput.nudge && !state.tilted && world.balls.some(b => b.status === 'live')) {
      if (!flags.freeNudge) state.tilt += rules.tiltAdd;
      for (const ball of world.balls) if (ball.status === 'live') nudge(ball);
      emit('nudge');
      if (state.tilt >= rules.tiltLimit) { state.tilted = true; emit('tilt'); }
    }
    if (!state.tilted) {
      if (input.left && !lastInput.left) elements.shiftLane(-1);
      if (input.right && !lastInput.right) elements.shiftLane(1);
    }
    lastInput = { ...input };
    table.motion?.(world.time);
    for (const event of world.step(state.tilted ? { launch: input.launch } : input)) {
      if (event.type === 'hit') elements.physicalHit(event);
      else if (event.type === 'collision' && event.ball.ballType !== 'gang') emit('collision', event);
      else if (event.type === 'launch') {
        state.shots++;
        if (state.launchAt === null) { state.launchAt = world.time; state.saveUntil = world.time + rules.ballSave + (flags.saveExtra ?? 0); }
        event.ball.skillOpen = !event.ball.replay;
        event.ball.launchedAt = world.time;
        emit('launch', event);
      } else if (event.type === 'flip') {
        emit('flip', { ...event, both: world.flippers.every(f => f.pressed) });
        limitVelocity(event.ball,world.settings.physics.maxSpeed*(event.ball.speedScale??1));
      } else if (event.type === 'drain') onDrain(event);
    }
    elements.step();
    for (const ball of world.balls.slice()) {
      if (ball.status !== 'live') continue;
      if (ball.broken) { world.removeBall(ball); onDrain({ ball, x: ball.x, y: ball.y }); continue; }
      emit('tick', { ball });
      const parked = world.flippers.some(f => f.pressed && Math.abs(ball.x - f.x1) < ball.radius * 2 && Math.abs(ball.y - f.y1) < ball.radius * 3);
      if (parked || Math.hypot(ball.vx, ball.vy) >= rules.stuckSpeed) {
        ball.stoppedAt = undefined;
        continue;
      }
      ball.stoppedAt ??= world.time;
      if (world.time - ball.stoppedAt < rules.stuckAfter) continue;
      ball.stoppedAt = world.time;
      ball.unstuck = (ball.unstuck ?? 0) + 1;
      emit('unstuck', { x: ball.x, y: ball.y, attempts: ball.unstuck, ball });
      if (ball.unstuck < rules.stuckAttempts) nudge(ball, rules.nudgePower / 2);
      else {
        ball.status = 'plunger'; ball.x = ball.px = settings.plunger.x; ball.y = ball.py = settings.plunger.y;
        ball.vx = ball.vy = 0; ball.unstuck = 0;
      }
    }
  }

  const api = { world, state, score: score.state, elements, flags, events, emit, ctx, step, onSound(fn) { sound = fn; },
    pocket, gear:[...new Set([...items,...modifiers,...stock.map(id=>byId[id])].filter(i=>i && i.price))],
    useSpell(id) {
      const i=pocket.indexOf(id), use=byId[id]?.on?.use;
      if(i<0 || !use || state.phase!=='play' && state.phase!=='bonus' || state.tilted) return false;
      pocket.splice(i,1); use(ctx); return true;
    },
    get remaining() { return reserve.length; },
    drain(ball) { world.removeBall(ball); onDrain({ ball, x: ball.x, y: ball.y }); },
  };
  emit('tableStart');
  nextBall();
  return api;
}
