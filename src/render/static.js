import { config } from '../config.js';
import { createRng } from '../game/rng.js';
import { palette, streets } from './palette.js';

function line(ctx, shape) {
  ctx.beginPath();
  if (shape.type === 'circle') ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
  else { ctx.moveTo(shape.x1, shape.y1); ctx.lineTo(shape.x2, shape.y2); }
  ctx.stroke();
}

function playPath(open = false) {
  const path = new Path2D();
  path.moveTo(18, 296);
  path.arc(287, 296, 269, Math.PI, Math.PI * 2);
  path.lineTo(556, 980);
  path.lineTo(520, 980); path.lineTo(520, 904);
  path.lineTo(317, 995);
  if (open) path.moveTo(203, 995); else path.lineTo(203, 995);
  path.lineTo(18, 904); path.lineTo(18, 296);
  if (!open) path.closePath();
  return path;
}

function grain(ctx, rng, street) {
  const grad = ctx.createRadialGradient(249, 320, 49, 265, 505, 525);
  grad.addColorStop(0, street.core); grad.addColorStop(0.75, street.field); grad.addColorStop(1, '#221716');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, config.board.width, config.board.height);
  for (let x = -12; x < 565; x += 3) {
    const r = rng();
    const sway = 2.4 + rng() * 8;
    ctx.strokeStyle = r < 0.58 ? `rgba(235,135,91,${0.02+r*0.045})` : `rgba(10,7,11,${0.035+r*0.045})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x - sway, 310, x + sway, 650, x - sway, 1000); ctx.stroke();
  }
  for (let i = 0; i < 1800; i++) {
    const x = rng() * 560, y = rng() * 1000, w = 0.4 + rng() * 2;
    ctx.fillStyle = i % 2 ? '#ffcf9313' : '#10081025';
    ctx.fillRect(x, y, w, 0.7);
  }
}

function paperTown(ctx, rng) {
  // 剪影由屋脊、招幡和密疏不一的人群组成，低对比不干扰珠子路径。
  ctx.fillStyle = '#170f18'; ctx.globalAlpha = 0.47;
  for (let x = -18; x < 555; x += 63 + rng() * 28) {
    const y = 728 - 66 * (0.5 + 0.5 * Math.cos(x / 69)) + rng() * 36;
    const w = 44 + rng() * 24;
    ctx.beginPath(); ctx.moveTo(x, y + 13); ctx.quadraticCurveTo(x + w * 0.4, y + 8, x + w * 0.5, y - 20);
    ctx.quadraticCurveTo(x + w * 0.65, y + 7, x + w, y + 12); ctx.lineTo(x + w - 7, y + 23);
    ctx.lineTo(x + w - 13, y + 23); ctx.lineTo(x + w - 13, 920); ctx.lineTo(x + 12, 920);
    ctx.lineTo(x + 12, y + 23); ctx.lineTo(x + 7, y + 23); ctx.closePath(); ctx.fill();
    ctx.fillRect(x + w * 0.8, y - 32, 2, 65);
    ctx.beginPath(); ctx.moveTo(x+w*0.8,y-33); ctx.lineTo(x+w*0.8+16,y-29); ctx.lineTo(x+w*0.8,y-18); ctx.fill();
  }
  ctx.globalAlpha = 0.62;
  for (let x = 8; x < 530; x += 13 + rng() * 8) {
    const y = 752 + rng() * 37, head = 3 + rng() * 2;
    ctx.beginPath(); ctx.arc(x, y, head, 0, 2*Math.PI); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, y + 5); ctx.quadraticCurveTo(x - 9, y + 14, x - 7, y + 27);
    ctx.lineTo(x + 8, y + 27); ctx.quadraticCurveTo(x + 8, y+10, x+4,y+5);ctx.closePath();ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function border(ctx, street) {
  ctx.lineWidth = 11; ctx.strokeStyle = '#110d12'; ctx.stroke(playPath(true));
  ctx.lineWidth = 4; ctx.strokeStyle = street.trim; ctx.stroke(playPath(true));
  ctx.strokeStyle = '#ffcf7d59'; ctx.lineWidth = 1.2;
  for (const side of [1, -1]) {
    ctx.save(); ctx.translate(side === 1 ? 24 : 550, 0); ctx.scale(side,1);
    for (let y = 331; y <= 870; y += 23) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(9,y); ctx.lineTo(9,y+13);
      ctx.lineTo(3,y+13); ctx.lineTo(3,y+6); ctx.lineTo(6,y+6); ctx.stroke();
    }
    ctx.restore();
  }
}

const tints={drums:['#713126','#442321'],lanterns:['#673149','#3d2334'],rings:['#634527','#3e3023'],
  sugar:['#663b28','#422619'],wind:['#3e5251','#24323b'],variety:['#55314f','#322535']};
const themes={drums:['鼓','锣'],'lanterns':['灯','彩'],rings:['圈','投'],sugar:['糖','画'],wind:['风','转'],variety:['戏','彩'],theater:['幕','锣'],dragon:['龙','舞'],night:['灯','夜']};
function emblems(ctx,theme){
  if(!themes[theme])return;
  ctx.save();ctx.globalAlpha=.25;ctx.fillStyle='#e98f65';ctx.strokeStyle='#e98f65';ctx.textAlign='center';ctx.font='bold 39px KaiTi,serif';
  for(const [i,x] of [98,420].entries()){
    const y=581+(i%2)*76;
    ctx.beginPath();
    if(theme==='rings'||theme==='drums')ctx.arc(x,y,37,0,Math.PI*2);
    else if(theme==='wind'){for(let j=0;j<8;j++){const a=j*Math.PI/4,rr=j%2?20:46;ctx.lineTo(x+rr*Math.cos(a),y+rr*Math.sin(a));}ctx.closePath();}
    else ctx.roundRect(x-32,y-43,64,84,theme==='lanterns'||theme==='night'?27:7);
    ctx.lineWidth=3;ctx.stroke();ctx.fillText(themes[theme][i],x,y+14);
  }
  ctx.restore();
}
export function makeStaticLayer(world, edge = 1.5) {
  const { width, height } = config.board;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * edge); canvas.height = Math.round(height * edge);
  const ctx = canvas.getContext('2d'); ctx.scale(edge, edge);
  const base = streets[world.table.street ?? 0] ?? streets[0];
  const tint=tints[world.table.theme];
  const street=tint&&world.table.street!==2?{...base,core:tint[0],field:tint[1]}:base;
  const rng = createRng(world.seed ^ 0xc33e13);
  ctx.fillStyle = '#180f15'; ctx.fillRect(0,0,width,height);
  ctx.save(); ctx.clip(playPath()); grain(ctx,rng,street); paperTown(ctx,rng);emblems(ctx,world.table.theme);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#edb26920'; ctx.font = 'bold 74px KaiTi, STKaiti, serif'; ctx.fillText(street.name, 265, 245);
  ctx.fillStyle = '#f1d8ae6b'; ctx.font = '15px system-ui'; ctx.fillText(world.table.name ?? street.label, 265, 271);
  ctx.strokeStyle = '#ffcd6a48'; ctx.lineWidth = 1;
  for (const x of [104, 426]) {
    for (let n = 0; n < 3; n++) {
      ctx.beginPath(); ctx.moveTo(x-28+n*8,279+n*5);ctx.quadraticCurveTo(x,266+n*5,x+28-n*8,279+n*5);ctx.stroke();
    }
  }
  for (const e of world.table.elements ?? []) {
    if (e.kind === 'bumper' || e.kind === 'saucer') {
      ctx.beginPath(); ctx.ellipse(e.x,e.y+7,e.r+8,e.r+11,0,0,Math.PI*2);
      ctx.fillStyle = '#160c0f8c';ctx.fill();ctx.strokeStyle='#e8b64c36';ctx.stroke();
    }
  }
  ctx.restore(); border(ctx,street);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const shape of world.table.colliders) {
    if (shape.elementId || shape.moving) continue;
    ctx.lineWidth = shape.gate ? 2.5 : 5.5;
    ctx.strokeStyle = shape.gate ? '#71b6a4a0' : shape.mat === 'rubber' ? '#d8a762' : '#ae7845';
    if (shape.gate) ctx.setLineDash([5,8]);
    line(ctx,shape); ctx.setLineDash([]);
    if (!shape.gate) { ctx.lineWidth = 1.3; ctx.strokeStyle = '#f9d088aa'; line(ctx,shape); }
  }
  ctx.fillStyle=palette.paper; ctx.globalAlpha=.48; ctx.font='bold 13px system-ui'; ctx.textAlign='center';
  ctx.fillText('落 珠',260,980);ctx.globalAlpha=1;
  return canvas;
}
