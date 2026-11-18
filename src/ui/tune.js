const key = 'miaohui-pinball-v1-tuning';
const sliders = [
  ['重力', 'physics.gravity', 750, 1550, 10],
  ['挡板抬起速度', 'flipper.upSpeed', 14, 38, 0.5],
  ['挡板落下速度', 'flipper.downSpeed', 6, 26, 0.5],
  ['挡板恢复系数', 'flipper.restitution', 0.2, 0.75, 0.01],
  ['挡板长度', 'flipper.length', 86, 110, 1],
  ['墙恢复系数', 'materials.wall.restitution', 0.3, 0.7, 0.01],
  ['鼓额外弹力', 'materials.bumper.boost', 350, 1000, 10],
  ['弹弓出速', 'materials.sling.minimum', 600, 1200, 10],
  ['摇台冲量', 'game.nudgePower', 80, 260, 5],
  ['发射基础出速', 'plunger.baseSpeed', 1100, 1500, 10],
  ['发射加成出速', 'plunger.extraSpeed', 850, 1450, 10],
];
const read = (object, path) => path.split('.').reduce((branch, name) => branch[name], object);
function write(object, path, value) {
  const names = path.split('.');
  const name = names.pop();
  const branch = names.length ? read(object, names.join('.')) : object;
  branch[name] = value;
}

export function mountTunePanel(stage, defaults, settings) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key)) ?? {}; } catch { /* 本地存储不可用时仍能调参 */ }
  const panel = document.createElement('details');
  panel.className = 'tune';
  panel.dataset.hud = '';
  panel.innerHTML = '<summary>手感调参</summary><div class="tune-sliders"></div><div class="tune-actions"><button type="button">导出 JSON</button><button type="button">恢复默认</button></div><textarea aria-label="调参 JSON" readonly hidden></textarea>';
  const area = panel.querySelector('.tune-sliders');
  const inputs = new Map();
  const values = () => Object.fromEntries(sliders.map(([, path]) => [path, read(settings, path)]));
  function persist() { try { localStorage.setItem(key, JSON.stringify(values())); } catch { /* 调参已实时应用 */ } }
  for (const [title, path, min, max, step] of sliders) {
    const savedValue = saved[path];
    if (Number.isFinite(savedValue) && savedValue >= min && savedValue <= max) write(settings, path, savedValue);
    const row = document.createElement('label');
    row.innerHTML = `<span>${title}</span><output></output><input type="range" min="${min}" max="${max}" step="${step}">`;
    const field = row.querySelector('input'), output = row.querySelector('output');
    field.value = output.value = read(settings, path);
    field.addEventListener('input', () => { write(settings, path, field.valueAsNumber); output.value = field.value; persist(); });
    inputs.set(path, { field, output });
    area.append(row);
  }
  const [exportButton, resetButton] = panel.querySelectorAll('button');
  const textarea = panel.querySelector('textarea');
  exportButton.onclick = () => {
    const data = { physics: {}, flipper: {}, materials: { wall: {}, bumper: {}, sling: {} }, game: {}, plunger: {} };
    for (const [path, value] of Object.entries(values())) write(data, path, value);
    textarea.hidden = false;
    textarea.value = JSON.stringify(data, null, 2);
    textarea.focus(); textarea.select();
  };
  resetButton.onclick = () => {
    for (const [path, { field, output }] of inputs) {
      const value = read(defaults, path);
      write(settings, path, value);
      field.value = output.value = value;
    }
    textarea.hidden = true;
    persist();
  };
  stage.append(panel);
}
