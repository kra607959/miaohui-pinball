import { config } from '../config.js';
import { bounds } from '../physics/shapes.js';
const gap=config.physics.radius*2*1.4;
const pointSegment=([px,py],[[ax,ay],[bx,by]])=>{
  const dx=bx-ax,dy=by-ay,d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/d)):0;
  return Math.hypot(px-ax-t*dx,py-ay-t*dy);
};
const axis=s=>s.type==='circle'?[[s.x,s.y],[s.x,s.y]]:[[s.x1,s.y1],[s.x2,s.y2]];
const cross=([ax,ay],[bx,by],[cx,cy])=>(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
const overlap=(a,b,p=0)=>a[0]-p<=b[2]&&b[0]-p<=a[2]&&a[1]-p<=b[3]&&b[1]-p<=a[3];
function distance(a,b){
  const l=axis(a),r=axis(b);
  if(a.type==='segment'&&b.type==='segment'&&overlap(bounds(a),bounds(b))&&cross(...l,r[0])*cross(...l,r[1])<=0&&cross(...r,l[0])*cross(...r,l[1])<=0)return -a.radius-b.radius;
  return Math.min(...l.map(v=>pointSegment(v,r)),...r.map(v=>pointSegment(v,l)))-a.radius-b.radius;
}
function intersectsBox(s,rect){
  if(!overlap(bounds(s),rect))return false;
  const [x0,y0,x1,y1]=rect;
  if(axis(s).some(([x,y])=>x>=x0&&x<=x1&&y>=y0&&y<=y1))return true;
  const edges=[[[x0,y0],[x1,y0]],[[x1,y0],[x1,y1]],[[x1,y1],[x0,y1]],[[x0,y1],[x0,y0]]];
  return edges.some(([[x1,y1],[x2,y2]])=>distance(s,{type:'segment',x1,y1,x2,y2,radius:0})<=0);
}
export function validate(table){
  const ids=table.modules?.map(m=>m.slot)??[];
  if(ids.length!==6||new Set(ids).size!==6)return '槽位不完整或重复';
  const c=table.colliders.map(s=>[s,bounds(s)]);
  for(let i=0;i<c.length;i++){
    const [a,box]=c[i];
    if(a.moving)continue;
    for(const rect of table.keepClear??[])if(intersectsBox(a,rect.box))return `走廊 ${rect.id} 被 ${a.elementId??a.moduleId??'底架'} 挡住`;
    for(let j=0;j<i;j++){
      const [b,other]=c[j];
      if((a.moduleId??'frame')===(b.moduleId??'frame')||b.moving||!overlap(box,other,gap))continue;
      if(distance(a,b)<gap)return `净距不足：${a.elementId??a.moduleId??'底架'} / ${b.elementId??b.moduleId??'底架'}`;
    }
  }
  return null;
}

export function allowsShape(table,shape){
  const box=bounds(shape);
  return !(table.keepClear??[]).some(rect=>intersectsBox(shape,rect.box))&&table.colliders.every(c=>!overlap(box,bounds(c),gap)||distance(shape,c)>=gap);
}
