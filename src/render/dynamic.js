import { palette } from './palette.js';

const TAU = Math.PI * 2;
function disc(ctx, x, y, r, fill, stroke, width = 2) {
  ctx.beginPath(); ctx.arc(x,y,r,0,TAU);
  if (fill) {ctx.fillStyle=fill;ctx.fill();}
  if (stroke) {ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
}
function grad(ctx, x, y, r, colors) {
  const g=ctx.createRadialGradient(x-r*.33,y-r*.42,r*.13,x,y,r);
  for(let i=0;i<colors.length;i++)g.addColorStop(i/(colors.length-1),colors[i]);
  return g;
}
function lamp(ctx, x, y, size, lit, hot) {
  const r = size;
  ctx.save(); ctx.translate(x,y); ctx.scale(1,1.12);
  if (lit) disc(ctx,0,0,r*1.45,grad(ctx,0,0,r*1.45,['#ffce6550','#f15c271a','#ff652800']));
  disc(ctx,0,2,r+1,'#2a1018');
  disc(ctx,0,0,r, lit ? grad(ctx,0,0,r,[hot?'#fff3bd':'#ffc977','#d4442b','#761f27']) : '#67353a', lit ? '#f7b562' : '#9d654d', 1.7);
  ctx.lineWidth=1.15;ctx.strokeStyle=lit?'#ffce8f85':'#b48a6660';
  for(const off of [-.43,0,.43]) {ctx.beginPath();ctx.ellipse(0,0,r*Math.max(.15,Math.abs(off)),r*.94,0,Math.PI/2,Math.PI*1.5+(off>0?Math.PI:0));ctx.stroke();}
  ctx.fillStyle=lit?palette.gold:'#916044';
  ctx.fillRect(-r*.43,-r-2,r*.86,3);ctx.fillRect(-r*.43,r-1,r*.86,3);ctx.fillRect(-1,r+2,2,r*.55);ctx.restore();
}

export function drawElements(ctx, session) {
  const { world, elements } = session;
  for (const e of world.table.elements) {
    const s = elements.state.get(e.id), x=e.x, y=e.y, r=e.r;
    const age=world.time-s.hotAt, hot=age<.24;
    if(session.flags.lucky===e.id){
      const cx=e.w?x+e.w*.5:x,cy=e.h?y+e.h*.5:y,rr=(r??25)+9;
      disc(ctx,cx,cy,rr,null,`rgba(255,221,119,${.55+.28*Math.sin(world.time*8)})`,3);
    }
    switch(e.kind) {
      case 'bumper':
        disc(ctx,x,y+3,r+3,'#681b23','#2a141c',3);
        disc(ctx,x,y,r,grad(ctx,x,y,r,[hot?'#ffb05a':'#e85c3f','#b72b2d','#6f1827']),palette.gold,2.5);
        disc(ctx,x,y,r*.60,null,'#ffd48e57',1.5);
        for(let n=0;n<10;n++){const a=n*TAU/10;disc(ctx,x+Math.cos(a)*r*.80,y+Math.sin(a)*r*.80,2.1,hot?'#fff2ad':'#eeb653');}
        ctx.fillStyle='#ffe0a4af';ctx.font=`bold ${r*.57}px KaiTi,serif`;ctx.textAlign='center';const gong=e.id.endsWith(':gong-a')?0:e.id.endsWith(':gong-b')?1:-1;
        ctx.fillText(gong<0?'鼓':`锣${session.flags.gongs?.[gong]??0}`,x,y+r*.21);
        if(hot)disc(ctx,x,y,r+age*70,null,`rgba(255,203,115,${.70*(1-age/.24)})`,2);
        break;
      case 'drop': case 'standup':
        lamp(ctx,x,y,r,e.kind==='standup'||!s.lit||session.flags.keepLanterns||session.flags.raiseLanterns,hot);
        break;
      case 'lane': {
        const lx=x+e.w/2, ly=y+e.h*.38, isOn=s.lit||elements.lane===e.id;
        ctx.beginPath();ctx.ellipse(lx,ly,22,13,0,0,TAU);
        ctx.lineWidth=5.5;ctx.strokeStyle=isOn?'#ffe19b':'#a87853';ctx.stroke();
        ctx.lineWidth=1.7;ctx.strokeStyle=isOn?'#fff0b7':'#d7ad746d';ctx.stroke();
        if(isOn){ctx.strokeStyle='#e9a84d55';ctx.lineWidth=12;ctx.stroke();}
        ctx.fillStyle=isOn?'#fff1cb':'#c6a784';ctx.textAlign='center';ctx.font='14px KaiTi,serif';ctx.fillText(elements.lane===e.id?'红':'圈',lx,ly+4);
        break;
      }
      case 'saucer':
        disc(ctx,x,y,r,grad(ctx,x,y,r,['#1c151e','#533137','#ac5d4c']),'#e5ab60',2.5);
        disc(ctx,x,y,r-7,null,'#f3cd8e6b',1.8);
        ctx.strokeStyle=hot?'#fff4b3':'#eec77f9b';ctx.lineWidth=1.8;
        ctx.beginPath();
        for(let i=0;i<=64;i++){const a=i*TAU/64, rad=(r-11)*(.72+.25*Math.cos(a*5));const q=x+Math.cos(a)*rad,p=y+Math.sin(a)*rad;i?ctx.lineTo(q,p):ctx.moveTo(q,p);}ctx.stroke();
        if(s.caught)disc(ctx,x,y,8,'#f9e4bb');
        break;
      case 'spinner': {
        const cx=x+e.w/2, cy=y+e.h/2;
        ctx.save();ctx.translate(cx,cy);ctx.rotate(s.rotation*Math.PI);
        for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.fillStyle=i%2===0?'#ca5747':'#e3a844';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(20,-17);ctx.lineTo(16,5);ctx.quadraticCurveTo(8,3,0,0);ctx.fill();}
        disc(ctx,0,0,3,'#fff0bc');ctx.restore();break;
      }
      case 'sling': {
        const shape=world.table.colliders.find(item=>item.elementId===e.id);
        for(let j=0;j<7;j++) {
          const t=(j+.6)/7, qx=shape.x1+(shape.x2-shape.x1)*t, qy=shape.y1+(shape.y2-shape.y1)*t;
          ctx.save();ctx.translate(qx,qy);ctx.rotate((j%2?1:-1)*.18);
          ctx.fillStyle=hot?'#ff9962':'#b72f36';ctx.fillRect(-5,-9,10,19);
          ctx.fillStyle='#f2bd60';ctx.fillRect(-5,-8,10,2);ctx.fillRect(-5,6,10,2);ctx.restore();
        }
        break;
      }
      case 'orbit':
        ctx.strokeStyle='#64b7a15f';ctx.lineWidth=2;ctx.setLineDash([4,7]);ctx.strokeRect(x+8,y+3,e.w-15,e.h-7);ctx.setLineDash([]);
        break;
      case 'outlane':
        ctx.fillStyle='#e3a17a81';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText('外道',x+e.w*.5,y-2);
        break;
      case 'post': disc(ctx,x,y,r,'#a37c52','#f3d49c',2);break;
      case 'dragon':
        disc(ctx,x,y,r+5,'#a63723',palette.gold,3);disc(ctx,x,y,r-7,'#46242e',palette.gold,2);
        if(e.id==='dragon:0'){
          disc(ctx,x-6,y-5,2,'#fff4a1');disc(ctx,x+6,y-5,2,'#fff4a1');disc(ctx,x,y+7,6,'#e95235',palette.gold,1.5);
          ctx.font='bold 14px system-ui';ctx.fillStyle=palette.paper;ctx.textAlign='center';ctx.fillText(`${session.flags.dragonHits??0}/5`,x,y-25);
        }break;
    }
  }
}

export function drawEquipment(ctx, world) {
  ctx.lineCap='round';ctx.lineJoin='round';
  if(world.table.curtain){
    const {x1,x2,y1}=world.table.curtain;
    ctx.fillStyle='#851b33';ctx.beginPath();ctx.roundRect(x1-8,y1-9,x2-x1+16,18,6);ctx.fill();
    for(let x=x1;x<x2;x+=9){ctx.fillStyle='#d6554f';ctx.fillRect(x,y1-7,3,14);}
    ctx.strokeStyle='#f7b96a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x1-5,y1-8);ctx.lineTo(x2+5,y1-8);ctx.stroke();
  }
  for (const f of world.flippers) {
    const shape=(width,color) => {ctx.beginPath();ctx.moveTo(f.x1,f.y1);ctx.lineTo(f.x2,f.y2);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();};
    shape(22,'#23151d');shape(16,f.pressed?'#e6ac61':'#c4834d');shape(10,f.pressed?'#c84b31':'#863228');
    disc(ctx,f.x1,f.y1,12,'#a35b39',palette.gold,2);disc(ctx,f.x1,f.y1,4,'#50312e');disc(ctx,f.x2,f.y2,7,'#f4ca7e','#7a492b',1.2);
  }
  const { x }=world.settings.plunger;
  ctx.fillStyle='#100a1299';ctx.fillRect(x-9,839,18,125);
  ctx.fillStyle=world.ready?'#5e9992':'#44605d';ctx.fillRect(x-7,844,14,112);
  if (world.plunger.power) {ctx.fillStyle='#f7c56d';ctx.fillRect(x-7,956-112*world.plunger.power,14,112*world.plunger.power);}
}

const bead = { mu: ['#faf1c4','#d7a872','#68462b'], tie: ['#eeefdd','#879594','#303c46'], liuli: ['#fffaff','#a8d9f7','#50649c'],
  huo: ['#fff4c0','#ed915a','#912526'], zimu: ['#ecffd9','#8dc18a','#354a4f'], jin: ['#fffed0','#efc956','#a76426'] };
export function drawBalls(ctx, world, alpha, reduceMotion) {
  for(const b of world.balls) {
    const x=b.px+(b.x-b.px)*alpha, y=b.py+(b.y-b.py)*alpha, r=b.radius;
    if(!reduceMotion&&Math.hypot(b.vx,b.vy)>1500)for(let i=4;i>0;i--){ctx.globalAlpha=.11*(5-i);disc(ctx,x-b.vx*.0035*i,y-b.vy*.0035*i,r*(1-i*.08),'#fff3bd');}ctx.globalAlpha=1;
    disc(ctx,x,y+1.5,r+1.7,'#170d14','#f6d89220',2.5);
    disc(ctx,x,y,r,grad(ctx,x,y,r,bead[b.ballType]??['#ffffff','#d1e3e6','#687680','#5a3844']),'#f7e8d2',1.5);
    disc(ctx,x-r*.32,y-r*.42,r*.18,'#ffffff');
  }
}
