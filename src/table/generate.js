import { config } from '../config.js';
import { createRng } from '../game/rng.js';
import { byId } from '../game/items/index.js';
import { assembleTable,slots } from './assemble.js';
import { layoutModules,fallbackModules } from './modules/catalog.js';
import { ringsFour,leftSugar, sideWind,decorateBoss,gongModule } from './rules.js';
import { validate } from './validate.js';

function choose(pool,rng,stall){
  const weights=pool.map(m=>m.weight[stall]??m.weight.default),sum=weights.reduce((n,w)=>n+w,0);
  let x=rng()*sum;return pool.find((_,i)=>(x-=weights[i])<0);
}
const mirrorTo=(m,slot)=>({...m,slot,id:m.id+'-mirror',mirrored:true});
function compose(modules,options,mods){
  const table=assembleTable(modules,options);
  for(const e of table.elements){
    if(e.kind==='inlane'){e.x-=8;e.w+=16;e.y-=13;e.h+=17;}
    if(e.id==='left_sugar-mirror:sugar')e.r+=7;
  }
  for(const e of table.elements.filter(e=>e.kind==='outlane')){
    e.y=config.table.marketOutlaneY;
    e.w=config.table.marketOutlaneWidth;
    if(e.side==='right'){e.w+=16;e.x=config.board.playWidth-e.w;}
  }
  const ctx={table,settings:config};
  for(const item of mods)item.on?.applyTable?.(ctx);
  table.appliedMods=true;table.generatedFlipperScale=ctx.settings.flipper.length/config.flipper.length;
  return table;
}
export function generate(seed,stallType,mods=[],street=0){
  const rng=createRng(seed),rule=typeof stallType==='string'?{id:stallType,name:stallType}:stallType;
  mods=mods.map(x=>typeof x==='string'?byId[x]:x).filter(Boolean);
  const options={street,name:rule.name,theme:rule.id};
  for(let attempts=1;attempts<=20;attempts++){
    const modules=Object.keys(slots).map(slot=>{
      const forced=slot==='top'&&rule.id==='rings'?ringsFour.id:slot==='left'&&rule.id==='sugar'?leftSugar.id:
        slot==='right'&&rule.id==='sugar'?'right_saucer':slot==='left'&&rule.id==='wind'?sideWind.id:null;
      if(forced)return layoutModules.find(m=>m.id===forced);
      const other=slot==='left'?'right':slot==='right'?'left':null;
      const pool=layoutModules.filter(m=>m.slot===slot||m.slot===other&&m.mirror).map(m=>m.slot===slot?m:mirrorTo(m,slot));
      if(slot==='orbit'&&rule.id==='wind')return choose(pool.filter(m=>m.elements.length),rng,rule.id);
      return choose(pool,rng,rule.id);
    });
    const table=compose(modules,options,mods);
    if(!validate(table))return Object.assign(table,{attempts});
  }
  const table=compose(fallbackModules,options,mods);
  return Object.assign(table,{attempts:20,fallback:true});
}
export function marketTable(rule,street,seed,mods){
  if(rule.id==='theater'||rule.id==='dragon'||rule.id==='night'){
    const modules=rule.id==='theater'?fallbackModules.map(m=>m.slot==='center'?gongModule:m):fallbackModules;
    const safe=compose(modules,{street,name:rule.name,theme:rule.id},mods);
    return decorateBoss(safe,rule);
  }
  return generate(seed,rule,mods,street);
}
