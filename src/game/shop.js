import { config } from '../config.js';
import { balls,byId,charms,mods,spells } from './items/index.js';
import { createRng } from './rng.js';
const weights=[[70,25,5],[55,33,12],[45,35,20]];
export const pick = (list,rng) => list[Math.floor(rng()*list.length)];
export function makeShop(state,extra=0) {
  const rng=createRng((state.seed^Math.imul(state.index+1,0x83a7)^Math.imul(state.refresh+1,0x3181))>>>0);
  const stock=[], owned=Object.values(state.kit).flat();
  const available=list=>list.filter(i=>!owned.includes(i.id)&&!stock.includes(i.id));
  function take(list){const item=pick(available(list),rng); if(item)stock.push(item.id);}
  function charm(){
    const all=available(charms), rarity=['common','uncommon','rare'], w=weights[Math.floor(state.index/3)];
    const total=all.reduce((n,i)=>n+w[rarity.indexOf(i.rarity)]/all.filter(j=>j.rarity===i.rarity).length,0);
    let x=rng()*total;
    for(const i of all){x-=w[rarity.indexOf(i.rarity)]/all.filter(j=>j.rarity===i.rarity).length;if(x<0){stock.push(i.id);break;}}
  }
  charm();charm();take([...balls.filter(i=>i.price),...spells]);
  if(state.index>=3)take(mods);
  if(extra)charm();
  return stock;
}
export const limits = {charm:5,ball:config.game.ballCount,spell:2,mod:mods.length};
export function acquire(kit,id,replace=-1){
  const item=byId[id],list=kit[item?.kind];
  if(!list||list.includes(id))return false;
  if(item.kind==='ball'||list.length>=limits[item.kind]){
    if(!Number.isInteger(replace)||replace<0||replace>=list.length)return false;
    list[replace]=id;
  } else list.push(id);
  return true;
}
export function sell(kit,id){
  const item=byId[id],list=kit[item?.kind],index=list?.indexOf(id)??-1;
  if(index<0||!item.price)return 0;
  if(item.kind==='ball') list[index]='gang'; else list.splice(index,1);
  return Math.max(1,Math.floor(item.price/2));
}
