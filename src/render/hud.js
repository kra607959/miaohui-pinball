import { palette, streets } from './palette.js';

export function drawScore(canvas, session) {
  const rect=canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpi=Math.min(window.devicePixelRatio||1,2), wp=Math.round(rect.width*dpi), hp=Math.round(rect.height*dpi);
  if(canvas.width!==wp||canvas.height!==hp){canvas.width=wp;canvas.height=hp;}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpi,0,0,dpi,0,0);
  const w=rect.width,h=rect.height;
  const compact=h<100,{score,state,remaining}=session;
  ctx.clearRect(0,0,w,h);
  ctx.beginPath();ctx.roundRect(1,1,w-2,h-2,compact?9:12);
  ctx.fillStyle='#321b23';ctx.fill();ctx.strokeStyle='#9c644c';ctx.lineWidth=1;ctx.stroke();
  ctx.textAlign='left';ctx.fillStyle='#e3b17a';ctx.font=`${compact?10:13}px system-ui`;
  const street=streets[session.world.table.street??0]?.name??'庙会';
  ctx.fillText(`${street}  /  ${session.world.table.name??'试摊'}`,12,compact?15:22,w-22);
  ctx.fillStyle=palette.paper;ctx.font=`bold ${compact?20:34}px system-ui`;
  ctx.fillText(score.points.toLocaleString('zh-CN'),12,compact?37:64,compact?w*.56:w-26);
  ctx.textAlign=compact?'right':'left';ctx.font=`${compact?11:13}px system-ui`;ctx.fillStyle='#d8bca0';
  ctx.fillText(`目标 ${state.target.toLocaleString('zh-CN')}`,compact?w-12:12,compact?35:89,compact?w*.45:w-24);
  ctx.fillStyle='#6b4141';ctx.fillRect(12,compact?43:102,w-24,compact?3:5);
  ctx.fillStyle=palette.gold;ctx.fillRect(12,compact?43:102,(w-24)*Math.min(1,score.points/state.target),compact?3:5);
  ctx.textAlign='left';ctx.fillStyle='#f1ca8e';ctx.font=`bold ${compact?10:14}px system-ui`;
  const extras=state.multi?'多球 ×2':score.combo>1?`连击 ${score.combo}`:'';
  ctx.fillText(`×${score.multiplier}    余珠 ${remaining}    ${extras}`,12,compact?60:130,w-24);
  if(!compact){ctx.font='12px system-ui';ctx.fillStyle='#d7b6a1';ctx.fillText(`铜钱  ${state.coins}`,12,153,w-24);}
}

export function drawNotice(ctx, session) {
  const {state,world}=session;
  const label = state.tilted ? '倾斜锁定 · 本珠失去奖励' : state.tilt>=world.settings.game.tiltWarning ? '摇台警告' :
    state.phase==='bonus' ? '加场 · 本珠打完收摊' : world.ready && !session.viewHideLaunch ? '按住蓄力 · 松手发珠' : '';
  if(!label)return;
  ctx.textAlign='center';ctx.font='bold 17px system-ui';
  ctx.fillStyle='#1f101bdc';ctx.beginPath();ctx.roundRect(123,681,274,44,9);ctx.fill();
  ctx.strokeStyle='#db9b626d';ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle=palette.paper;ctx.fillText(label,260,708);
}
