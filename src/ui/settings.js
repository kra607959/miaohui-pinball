const settingsKey = 'miaohui-pinball-v1';
export const defaultSettings = { volume: .72, effects: .76, music: .40, vibration: true, reduceMotion: false };

export function readLocal() {
  try { return JSON.parse(localStorage.getItem(settingsKey)) ?? {}; } catch { return {}; }
}
export function writeLocal(patch) {
  try { localStorage.setItem(settingsKey, JSON.stringify({ ...readLocal(), ...patch })); } catch { /* 浏览器禁用存储 */ }
}
export function getSettings() { return { ...defaultSettings, ...readLocal().settings }; }

export function mountSettings(button, panel, settings, changed) {
  panel.querySelector('button').onclick = () => { panel.hidden = true; button.focus(); };
  button.onclick = () => { panel.hidden = !panel.hidden; if(!panel.hidden)panel.querySelector('button').focus(); };
  for (const field of panel.querySelectorAll('input')) {
    const key = field.name;
    if(field.type==='checkbox')field.checked=settings[key];
    else field.value=settings[key];
    field.oninput = () => {
      settings[key]=field.type==='checkbox'?field.checked:field.valueAsNumber;
      writeLocal({settings});changed();
    };
  }
}
