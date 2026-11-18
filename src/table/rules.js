import { assembleTable } from './assemble.js';
import { part,trialModules } from './modules/trial.js';
import { segment,circle } from '../physics/shapes.js';

const {spec,gate,round}=part;
export const stalls = [
  {id:'drums',name:'锣鼓台',desc:'1 秒内连撞鼓，鼓的底分逐次翻倍，最高 160。',on:{score(c,e,s){if(e.kind==='bumper'){s.n=c.world.time-(s.at??-Infinity)<=1?Math.min(4,s.n+1):0;s.at=c.world.time;e.base*=2**s.n;}}}},
  {id:'lanterns',name:'灯笼街',desc:'每排灯笼全倒后升空，倍率 +2。',on:{tableStart(c){c.setFlag('setMultiplier',{drop:2});c.setFlag('raiseLanterns',true);}}},
  {id:'rings',name:'套圈摊',desc:'四道全亮额外 +200 分。',on:{setComplete(c,e){if(e.set==='lane')c.addPoints(200,e.elementId,e);}}},
  {id:'sugar',name:'糖人摊',desc:'每收一次珠，下一次完成组额外 +1 倍。',on:{saucerCatch(c){c.setFlag('setExtra',(c.flags.setExtra??0)+1);}}},
  {id:'wind',name:'风车摊',desc:'风车每半圈的底分 = 2 + 当前倍率。',on:{score(c,e){if(e.type==='score'&&e.kind==='spinner')e.base+=c.multiplier;}}},
  {id:'variety',name:'杂耍场',desc:'每 30 秒换一个金光元件，打中它得分 ×3。',on:{tableStart(c){c.setFlag('lucky',pickLucky(c));},tick(c,e,s){const next=Math.floor(c.world.time/30);if(next>(s.band??0)){s.band=next;c.setFlag('lucky',pickLucky(c));}},scoreFinal(c,e){if(e.elementId===c.flags.lucky)e.points*=3;}}},
];
function pickLucky(c){const list=c.table.elements.filter(e=>['drop','bumper','saucer','standup','spinner','lane'].includes(e.kind));return list[Math.floor(c.rng()*list.length)]?.id;}
export const gongModule=spec('theater_gongs','center',[round('bumper','gong-a',14,92,20),round('bumper','gong-b',116,92,20),round('bumper','drum',65,169,23)]);
export const theater = {id:'theater',name:'戏台',desc:'幕布来回移动；两面锣各打满三次，之后本台得分翻倍。',on:{hit(c,e,s){
  const which=e.elementId?.split(':')[1];
  if(!['gong-a','gong-b'].includes(which)||s.done)return;
  s[which]=Math.min(3,(s[which]??0)+1);c.setFlag('gongs',[s['gong-a']??0,s['gong-b']??0]);
  if(s['gong-a']===3&&s['gong-b']===3){s.done=true;c.setFlag('scoreScale',2);c.emit('bossPower',{label:'开戏 · 得分 ×2'});}
}}};
export const dragon={id:'dragon',name:'舞龙',desc:'八节游龙穿过上半台。打中龙头五次：倍率 +3，落珠后不清零。',on:{hit(c,e,s){
  if(e.elementId!=='dragon:0'||s.done)return;
  s.n=(s.n??0)+1;c.setFlag('dragonHits',s.n);
  if(s.n===5){s.done=true;c.addMult(3,'dragon');c.setFlag('lockMultiplier',true);c.emit('bossPower',{label:'龙珠 · 保留倍率'});}
}}};
export const night={id:'night',name:'花灯夜',desc:'珠子只照亮周围 120 单位；多点亮几盏灯，就能看清更多台面。',on:{hit(c,e){
  if(e.kind==='standup'||e.kind==='drop'||e.kind==='lane'){
    (c.flags.nightLamps??=new Set()).add(e.elementId);
  }
}}};
export const bosses=[theater,dragon,night];
export const ringsFour=spec('top_lanes4','top',Array.from({length:4},(_,i)=>gate('lane',`ring-${i}`,5+i*100,29,96,67,{group:'circles'})));
export const leftSugar=spec('left_sugar','left',[round('saucer','sugar',83,205,31,{angle:47})]);
export const sideWind=spec('left_wind','left',[gate('spinner','fan',55,102,62,59)]);
export function decorateBoss(table,rule){
  if(rule.id==='night'){table.night=true;return table;}
  if(rule.id==='dragon'){
    const rings=Array.from({length:8},(_,i)=>{
      const id='dragon:'+i,r=i?10:15;
      const collider=circle(0,0,r,{mat:'rubber',elementId:id,kind:'dragon',moving:true});
      const e={x:0,y:0,id,r,kind:'dragon',collider};table.colliders.push(collider);table.elements.push(e);return e;
    });
    table.motion=t=>{for(const [i,e] of rings.entries()){
      const phase=t*.82-i*.235;
      e.collider.x=e.x=264+142*Math.sin(phase);
      e.collider.y=e.y=173+45*Math.sin(2*phase+.55);
    }};
    table.motion(0);return table;
  }
  if(rule.id!=='theater')return table;
  const curtain=segment(225,525,295,525,{mat:'rubber',radius:8});curtain.moving=true;
  table.colliders.push(curtain);table.curtain=curtain;
  table.motion=time=>{const slide=Math.sin(time*1.65)*97;curtain.x1=225+slide;curtain.x2=295+slide;};
  return table;
}
export function customTable(rule,street=0){
  const modules=trialModules.slice();
  if(rule.id==='theater')modules[2]=gongModule;
  if(rule.id==='rings')modules[0]=ringsFour;
  if(rule.id==='sugar')modules[1]=leftSugar;
  if(rule.id==='wind')modules[1]=sideWind;
  return decorateBoss(assembleTable(modules,{name:rule.name,street,theme:rule.id}),rule);
}
