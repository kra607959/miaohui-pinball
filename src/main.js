import { mountTunePanel } from './ui/tune.js';
import { createSession } from './game/session.js';
import { createBot } from './game/bot.js';
import { assembleTable } from './table/assemble.js';
import { createRenderer } from './render/game.js';
import { createFx } from './render/fx.js';
import { createAudio } from './audio.js';
import { getSettings, mountSettings, readLocal, writeLocal } from './ui/settings.js';
import { createWorld } from './physics/world.js';
import { createLab } from './table/frame.js';
import { config } from './config.js';
import { createInput } from './input.js';
import { createFixedLoop } from './loop.js';
import { drawWireframe } from './render/wireframe.js';
import { createRun,decodeRun,blankRecord,ruleById } from './game/run.js';
import { byId } from './game/items/index.js';
import { marketTable } from './table/generate.js';
import { mountJourney } from './ui/journey.js';

const params = new URLSearchParams(location.search);
const seedParam = params.get('seed');
const seed = seedParam !== null && /^\d+$/.test(seedParam) && Number(seedParam) <= 0xffffffff
  ? Number(seedParam)
  : crypto.getRandomValues(new Uint32Array(1))[0];
const stage = document.querySelector('#stage');
const tune = params.get('tune') === '1';
const settings = tune ? structuredClone(config) : config;
if (tune) mountTunePanel(stage, config, settings);
const measured = document.querySelector('#latency');
const pressAt = new Map();
let lastDelay;
const canvas = document.querySelector('#board');
const ctx = canvas.getContext('2d');
const pauseButton = document.querySelector('#pause');
const pausedNote = document.querySelector('#paused');
const debug = document.querySelector('#debug');
const recent = document.querySelector('#recent');
const result = document.querySelector('#table-result');
const lab = params.get('lab') === '1';
stage.classList.toggle('play-stage', !lab);
const userSettings = getSettings();
const audio = createAudio(userSettings, params.get('mute') === '1');
const hud = document.querySelector('#score-canvas');
hud.hidden = lab;
const render = createRenderer(ctx, hud, userSettings);
mountSettings(document.querySelector('#settings-button'),document.querySelector('#settings-panel'),userSettings,audio.volumes);
function unlockAudio() {
  void audio.unlock();
  window.removeEventListener('pointerdown', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
}
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);
document.querySelector('#mode').textContent = lab ? '物理实验台' : '试摊 · 三珠挑战';
const fps = document.querySelector('#fps');
const steps = document.querySelector('#steps');
const ticksLabel = document.querySelector('#ticks');
const indicators = new Map([...document.querySelectorAll('[data-input]')].map(node => [node.dataset.input, node]));
const labels = { left: '左', right: '右', launch: '发射', nudge: '摇台' };

let paused = false;
let world, session, bot, fx, labView, journey;
const demoRule=ruleById(params.get('stall')??params.get('boss'));
const trial=lab||tune||params.has('trial')||params.has('bot')||Boolean(demoRule);
const record={...blankRecord(),...readLocal().record};
const inventory=document.querySelector('#inventory');
const banner=document.querySelector('#banner');
const pausePanel=document.querySelector('#pause-panel');
const guide=document.querySelector('#guide'),learned={...readLocal().guide};
let autoPaused=false;
function refreshGuide(){
  guide.hidden=trial||!world||paused||!banner.hidden||!document.querySelector('#scene').hidden||journey?.state.index!==0;
  for(const hint of guide.children)hint.hidden=Boolean(learned[hint.dataset.guide])||(hint.dataset.guide==='right'&&world?.ready)||(hint.dataset.guide==='launch'&&!world?.ready);
  if(session)session.viewHideLaunch=!guide.hidden&&!guide.lastElementChild.hidden;
}
function teach(action){
  if(guide.hidden||learned[action]||!['left','right','launch'].includes(action))return;
  learned[action]=true;writeLocal({guide:learned});refreshGuide();
}
let bannerTimer;
const ui=mountJourney(document.querySelector('#scene'),{
  newRun:()=>loadRun(null),resume:()=>{const snapshot=getSave();if(snapshot)loadRun(snapshot);},hasSave:()=>Boolean(getSave()),
  getRun:()=>journey,open:openTable,settings:()=>document.querySelector('#settings-button').click(),title:showTitle,record,reduceMotion:()=>userSettings.reduceMotion,
});
function getSave(){return decodeRun(readLocal().snapshot??'null');}
function loadRun(snapshot){
  journey=createRun({seed:seedParam===null?crypto.getRandomValues(new Uint32Array(1))[0]:seed,snapshot,record,settings,
    save:snapshot=>writeLocal({snapshot}),remember:record=>writeLocal({record})});
  ui.show();
}
function showTitle(){
  journey?.abandonTable();banner.hidden=true;clearTimeout(bannerTimer);
  setPaused(false);pausePanel.hidden=true;input.clear();inventory.hidden=true;audio.pause(true);ui.show('title');refreshGuide();
}
function openTable(){
  const next=journey.open();if(!next)return;
  startTable(next);
  const rule=ruleById(journey.state.selected.id);
  banner.querySelector('h2').textContent=rule.name;
  banner.querySelector('p').textContent=`目标 ${session.state.target.toLocaleString('zh-CN')} 分 · ${rule.desc}`;
  banner.hidden=false; input.clear();audio.pause(true);refreshGuide();
  clearTimeout(bannerTimer);bannerTimer=setTimeout(dismissBanner,2000);
}
function dismissBanner(){clearTimeout(bannerTimer);banner.hidden=true;input.clear();audio.pause(paused);refreshGuide();}
banner.onclick=dismissBanner;
function renderInventory(){
  inventory.replaceChildren();inventory.hidden=!session||!session.gear.length&&!session.pocket.length;
  if(!session)return;
  for(const item of [...session.pocket.map(id=>byId[id]),...session.gear]){
    const label=document.createElement(item.kind==='spell'?'button':'span');
    label.classList.add('play-chip');label.textContent=item.name;label.title=item.desc;label.dataset.item=item.id;
    if(item.kind==='spell'){
      label.disabled=!item.on.use;label.onclick=()=>{if(!paused&&banner.hidden&&session.useSpell(item.id))renderInventory();};
    }
    inventory.append(label);
  }
}
function effect(event){
  const active=session.state.itemEffect;
  if(!active||active.time!==event.time||active.src!==event.src)return;
  const chip=inventory.querySelector(`[data-item="${active.src}"]`);
  if(chip){chip.classList.add('pulse');clearTimeout(chip.pulseTimer);chip.pulseTimer=setTimeout(()=>chip.classList.remove('pulse'),300);}
}
const input = createInput({ area: stage, keyboard: window, canLaunch: () => Boolean(world?.ready)&&banner.hidden&&document.querySelector('#scene').hidden, onPause: () => setPaused(!paused),
  onPress(side) { if(!paused&&banner.hidden&&side!=='launch')teach(side);if (!paused && world?.flippers.some(f => f.side === side && !f.pressed)) pressAt.set(side, performance.now()); },
});
const clock = createFixedLoop(() => {
  if(!world||!banner.hidden||!document.querySelector('#scene').hidden)return;
  const controls = bot ? bot(session) : input.snapshot();
  const previous = world.flippers.map(f => f.y2);
  if (session) {
    session.step(controls);
    if(journey?.state.scene==='play'&&journey.settle(session)){
      audio.pause(true);inventory.hidden=true;ui.show();refreshGuide();return;
    }
    if (trial && ['clear', 'failed'].includes(session.state.phase) && result.hidden) {
      result.querySelector('h2').textContent = session.state.phase === 'clear' ? '顺利收摊' : '三颗珠打完了';
      result.querySelector('p').textContent = `${session.score.points.toLocaleString('zh-CN')} 分 · 目标 ${session.state.target.toLocaleString('zh-CN')} 分`;
      result.hidden = false;
    }
  } else {
    for (const event of world.step(controls)) if (event.type === 'drain' && !world.balls.length) world.loadBall();
  }
  for (const [i, flipper] of world.flippers.entries()) {
    if (!controls[flipper.side]) pressAt.delete(flipper.side);
    else if (pressAt.has(flipper.side) && flipper.y2 !== previous[i]) {
      lastDelay = Math.max(0, performance.now() - pressAt.get(flipper.side));
      pressAt.delete(flipper.side);
    }
  }
});
function startTable(next) {
  document.querySelector('#scene').hidden=true;
  session=next??(lab?null:createSession(demoRule?marketTable(demoRule,params.has('boss')?2:0,seed,[]):assembleTable(),{seed,settings,items:demoRule?[demoRule]:[]}));
  world = session?.world ?? createWorld(createLab(), { seed, settings });
  if (lab) {
    world.loadBall();
    const drum = world.table.colliders.find(c => c.elementId === 'lab-drum');
    world.table.elements = [{ id: drum.elementId, kind:'bumper', collider:drum, x:drum.x, y:drum.y, r:drum.radius }];
    labView = { world, state:{}, flags:{}, elements:{ state:new Map([[drum.elementId, { hotAt:-Infinity }]]) } };
  }
  fx = createFx(seed, userSettings);
  session?.onSound(event => { fx.onEvent(event); audio.onEvent(event); effect(event); if(event.type==='launch')teach('launch'); if(['launch','ballStart','ballSaved'].includes(event.type))refreshGuide(); });
  audio.setStreet(world.table.street??0);
  renderInventory();
  audio.pause(false);
  bot = !lab && (params.get('bot') === '1'||params.get('autoplay')==='1') ? createBot(seed) : null;
  input.clear();
  pressAt.clear();
  result.hidden = true;
  setPaused(false);refreshGuide();
}
result.querySelector('button').addEventListener('click',()=>startTable());
document.querySelector('#unpause').onclick=()=>setPaused(false);
document.querySelector('#pause-settings').onclick=()=>document.querySelector('#settings-button').click();
document.querySelector('#restart').onclick=()=>startTable(journey.restart());
document.querySelector('#back-title').onclick=showTitle;
if(trial)startTable();else showTitle();

function setPaused(value) {
  if (paused === value || !document.querySelector('#scene').hidden) return;
  paused = value;
  clock.setPaused(value);
  input.clear();
  pressAt.clear();
  if (paused) world?.plunger.cancel();
  audio.pause(paused||!banner.hidden);
  pauseButton.textContent = value ? '继续' : '暂停';
  pauseButton.setAttribute('aria-pressed', String(value));
  pausedNote.hidden = !value||!trial;
  pausePanel.hidden = !value||trial;
  if(!value)autoPaused=false;
  refreshGuide();
}

pauseButton.addEventListener('click', () => setPaused(!paused));
function suspend(){if(!paused&&world&&document.querySelector('#scene').hidden){autoPaused=true;setPaused(true);}}
function restore(){if(autoPaused&&!document.hidden&&document.hasFocus())setPaused(false);}
window.addEventListener('blur',suspend);
window.addEventListener('focus',restore);
document.addEventListener('visibilitychange',()=>document.hidden?suspend():restore());
if(document.hidden)suspend();
document.querySelector('#settings-button').addEventListener('click',()=>{
  if(!document.querySelector('#settings-panel').hidden&&world&&document.querySelector('#scene').hidden)setPaused(true);
});
debug.hidden = params.get('debug') !== '1';
window.addEventListener('keydown', event => {
  if (event.code !== 'F2') return;
  event.preventDefault();
  if (!event.repeat) debug.hidden = !debug.hidden;
});

const { board } = config;
stage.style.setProperty('--board-ratio', board.width / board.height);
const pixelRatio = () => Math.min(window.devicePixelRatio || 1, board.maxDpr);
let dpr;
function resize() {
  dpr = pixelRatio();
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(canvas.width / board.width, 0, 0, canvas.height / board.height, 0, 0);
}
new ResizeObserver(resize).observe(canvas);
resize();

function frame(timestamp) {
  if (dpr !== pixelRatio()) resize();
  const metrics = clock.advance(timestamp);
  const alpha = paused ? 1 : metrics.alpha;
  if (!world || !document.querySelector('#scene').hidden) { requestAnimationFrame(frame); return; }
  if (session) render(session, alpha, fx);
  else if (debug.hidden) render(labView, alpha, fx);
  else drawWireframe(ctx, world, alpha, true);
  if (!debug.hidden) {
    fps.textContent = `${metrics.fps ? Math.round(metrics.fps) : '—'} FPS`;
    steps.textContent = `${metrics.steps} 步/帧`;
    measured.textContent = lastDelay === undefined ? '抬板 — ms' : `抬板 ${lastDelay.toFixed(1)} ms`;
    ticksLabel.textContent = `#${world.ticks}`;
    recent.textContent = (session?.events ?? []).slice().reverse().map(event =>
      `${event.time.toFixed(2)} ${event.type}${event.elementId ? ' · ' + event.elementId : ''}`).join('\n');
    const live = input.snapshot();
    for (const [key, node] of indicators) {
      node.textContent = `${labels[key]} ${Number(live[key])}`;
      node.classList.toggle('active', live[key]);
    }
  }
  requestAnimationFrame(frame);
}

window.__pin = { step: clock.step, setInput: input.setInput, config: settings, seed,
  get world() { return world; }, get run() { return session; }, get journey() { return journey; }, get events() { return session?.events ?? []; },
  spawnBall: (...args) => world.spawnBall(...args) };
requestAnimationFrame(frame);

if('serviceWorker' in navigator && !trial)navigator.serviceWorker.register('./sw.js',{type:'module'}).catch(()=>{});
