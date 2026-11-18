import { config } from './config.js';

const keys = new Map([
  ['ArrowLeft', 'left'], ['KeyZ', 'left'], ['ShiftLeft', 'left'],
  ['ArrowRight', 'right'], ['Slash', 'right'], ['ShiftRight', 'right'],
  ['Space', 'launch'], ['ArrowDown', 'launch'], ['ArrowUp', 'nudge'],
]);
const actions = ['left', 'right', 'launch', 'nudge'];
const empty = () => ({ left: false, right: false, launch: false, nudge: false });

export function createInput({ area, keyboard, canLaunch = () => false, onPause, onPress = () => {} }) {
  const held = new Set();
  const pointers = new Map();
  let injected = empty();
  let swipePair = null;
  let swipeUsed = false;

  function snapshot() {
    const state = { ...injected };
    for (const code of held) state[keys.get(code)] = true;
    for (const pointer of pointers.values()) state[pointer.action] = true;
    if (swipePair?.every(id => pointers.has(id))) state.nudge = true;
    return state;
  }

  keyboard.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code === 'Escape' || event.code === 'KeyP') {
      event.preventDefault();
      if (!event.repeat) onPause();
      return;
    }
    if (!keys.has(event.code) || event.target?.closest?.('input, textarea, select')) return;
    if (event.code === 'Space' && event.target?.closest?.('button')) return;
    event.preventDefault();
    if (!held.has(event.code)) onPress(keys.get(event.code));
    held.add(event.code);
  });
  keyboard.addEventListener('keyup', event => {
    if (held.delete(event.code)) event.preventDefault();
  });

  area.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('[data-hud]')) return;
    const { left, width } = area.getBoundingClientRect();
    const right = event.clientX >= left + width / 2;
    const touch = event.pointerType === 'touch';
    const action = right ? (touch && canLaunch() ? 'launch' : 'right') : 'left';
    onPress(action);
    pointers.set(event.pointerId, {
      action,
      touch, startX: event.clientX, startY: event.clientY, up: false,
    });
    area.setPointerCapture(event.pointerId);
  });
  area.addEventListener('pointermove', event => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer?.touch || swipeUsed) return;
    const dy = pointer.startY - event.clientY;
    pointer.up = dy >= config.touch.swipePixels && dy > Math.abs(event.clientX - pointer.startX);
    const touches = [...pointers].filter(([, item]) => item.touch);
    if (touches.length === 2 && touches.every(([, item]) => item.up)) {
      swipePair = touches.map(([id]) => id);
      swipeUsed = true;
    }
  });

  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    area.addEventListener(type, event => {
      const pointer = pointers.get(event.pointerId);
      if (!pointer) return;
      pointers.delete(event.pointerId);
      if (swipePair?.includes(event.pointerId)) swipePair = null;
      if (pointer.touch && ![...pointers.values()].some(item => item.touch)) swipeUsed = false;
    });
  }

  return {
    snapshot,
    setInput(state) {
      injected = Object.fromEntries(actions.map(key => [key, Boolean(state[key])]));
      return snapshot();
    },
    clear() {
      held.clear();
      pointers.clear();
      injected = empty();
      swipePair = null;
      swipeUsed = false;
    },
  };
}
