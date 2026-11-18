import { config } from '../config.js';
import { createRng } from './rng.js';
import { createSession } from './session.js';
import { byId,charms } from './items/index.js';
import { bosses,stalls } from '../table/rules.js';
import { marketTable } from '../table/generate.js';
import { acquire,makeShop,pick,sell } from './shop.js';

export const streets=['早市','午集','夜会'];
export const ruleById=id=>[...stalls,...bosses].find(rule=>rule.id===id);
export const bonuses = [
  {id:'coins',label:'过关 +2 铜'}, {id:'spell',label:'过关赠一张符（满格折 2 铜）'}, {id:'stock',label:'下家货郎多一个货位'},
];
const isBoss=i=>i%3===2;
const rngAt=(seed,i,salt=0)=>createRng((seed^Math.imul(i+1,0x9e3779b1)^Math.imul(salt+1,0x1957))>>>0);
export const blankRecord=()=>({highest:0,clears:0,seen:['gang']});
export function decodeRun(text){
  try{
    const s=JSON.parse(text);
    if(s?.version!==1||!['pick','ready','shop','reward'].includes(s.scene)||!Number.isInteger(s.index)||s.index<0||s.index>=9||!s.kit?.ball||s.kit.ball.length!==3||!Array.isArray(s.cards)||!Array.isArray(s.history))return null;
    for(const kind of ['ball','charm','spell','mod'])if(!Array.isArray(s.kit[kind])||s.kit[kind].some(id=>byId[id]?.kind!==kind))return null;
    return s;
  }catch{return null;}
}
export function createRun({seed=0,snapshot=null,record=blankRecord(),settings=config,tableFactory=marketTable,save=()=>{},remember=()=>{}}={}){
  const bossBag=[...bosses],order=[],rng=rngAt(seed,0,145);
  while(bossBag.length)order.push(bossBag.splice(Math.floor(rng()*bossBag.length),1)[0].id);
  const s=snapshot??{version:1,scene:'pick',seed,index:0,coins:4,kit:{charm:[],ball:Array(3).fill('gang'),spell:[],mod:[]},
    history:[],cards:[],refresh:0,discount:0,draw:0,order,visited:[],selected:null,stock:[],rewards:[]};
  let tableStart=null;
  function checkpoint(){save(JSON.stringify(s));}
  function discover(ids){
    const seen=new Set(record.seen??[]);for(const id of ids)if(byId[id])seen.add(id);
    if(seen.size!==(record.seen??[]).length){record.seen=[...seen];remember(record);}
  }
  function cards(index){
    const rng=rngAt(s.seed,index,s.draw),a=pick(stalls,rng), b=pick(stalls.filter(r=>r!==a),rng);
    return [a,b].map(r=>({id:r.id,bonus:pick(bonuses,rng).id}));
  }
  if(!snapshot){s.cards=cards(0);checkpoint();}
  function stock(extra){s.stock=makeShop(s,extra);discover(s.stock);}
  function finish(){
    record.highest=Math.max(record.highest??0,s.history.reduce((n,h)=>n+h.points,0));
    if(s.scene==='victory')record.clears=(record.clears??0)+1;
    remember(record);save(null);
  }
  const api={state:s,record,
    get target(){return Math.round(settings.game.targets[s.index]*(1-s.discount));},
    select(i){if(s.scene!=='pick'||!s.cards[i])return false;s.selected=s.cards[i];s.scene='ready';checkpoint();return true;},
    open(){
      if(s.scene!=='ready')return null;
      tableStart=structuredClone(s);
      const rule=ruleById(s.selected.id), tableSeed=rngAt(s.seed,s.index,239)()*2**32>>>0;
      const modifiers=s.kit.mod.map(id=>byId[id]);
      const table=tableFactory(rule,Math.floor(s.index/3),tableSeed,modifiers);
      s.scene='play';discover(Object.values(s.kit).flat());
      return createSession(table,{seed:tableSeed,target:api.target,settings,items:[rule,...s.kit.charm.map(id=>byId[id])],modifiers,
        balls:s.kit.ball,spells:s.kit.spell,bank:s.coins});
    },
    restart(){if(s.scene!=='play'||!tableStart)return null;Object.assign(s,structuredClone(tableStart));return api.open();},
    abandonTable(){if(s.scene==='play'&&tableStart)Object.assign(s,structuredClone(tableStart));},
    settle(session){
      if(s.scene!=='play'||!['failed','clear'].includes(session.state.phase))return false;
      const won=session.state.phase==='clear',boss=isBoss(s.index);
      const {points}=session.score,target=session.state.target;
      const history={id:s.selected.id,points,target,earned:session.state.coins,won};
      s.kit.spell=session.pocket.slice();
      for(const id of s.kit.charm)if(!s.visited.includes(id))s.visited.push(id);
      if(won){
        const bonus=s.selected.bonus,extra=bonus==='stock'?1:0;
        history.earned+=(boss?5:3)+session.remaining+Math.min(3,Math.floor(Math.max(0,points/target-1)*2))+(bonus==='coins'?2:0);
        if(bonus==='spell'){
          const candidates=Object.values(byId).filter(i=>i.kind==='spell'&&!s.kit.spell.includes(i.id));
          if(s.kit.spell.length<2){const id=pick(candidates,rngAt(s.seed,s.index,73)).id;s.kit.spell.push(id);discover([id]);}
          else history.earned+=2;
        }
        s.nextDiscount=session.flags.nextDiscount??0;
        s.refresh=0;s.extraStock=extra;
        s.cards=s.index<8&&!isBoss(s.index+1)?cards(s.index+1):[];
        if(s.index<8)stock(extra);
        if(boss&&s.index<8){
          const rng=rngAt(s.seed,s.index,14),pool=charms.filter(i=>i.rarity==='rare'&&!s.kit.charm.includes(i.id));
          s.rewards=[];while(s.rewards.length<3&&pool.length)s.rewards.push(pool.splice(Math.floor(rng()*pool.length),1)[0].id);
          discover(s.rewards);s.scene='reward';
        } else s.scene=s.index===8?'victory':'shop';
      } else s.scene='failed';
      s.coins+=history.earned;s.history.push(history);
      if(['victory','failed'].includes(s.scene))finish();else checkpoint();
      return true;
    },
    reward(id,replace){if(s.scene!=='reward')return false;if(id&&(!s.rewards.includes(id)||!acquire(s.kit,id,replace)))return false;s.scene='shop';checkpoint();return true;},
    buy(id,replace){if(s.scene!=='shop'||!s.stock.includes(id)||s.coins<byId[id].price||!acquire(s.kit,id,replace))return false;
      s.coins-=byId[id].price;s.stock=s.stock.filter(x=>x!==id);checkpoint();return true;},
    sell(id){if(s.scene!=='shop')return false;const n=sell(s.kit,id);if(!n)return false;s.coins+=n;checkpoint();return true;},
    swap(a,b){const list=s.kit.ball;if(s.scene!=='shop'||!list[a]||!list[b])return false;[list[a],list[b]]=[list[b],list[a]];checkpoint();return true;},
    reroll(){const cost=2+s.refresh;if(s.scene!=='shop'||s.coins<cost)return false;s.coins-=cost;s.refresh++;stock(s.extraStock);checkpoint();return true;},
    useShopSpell(id){const use=byId[id]?.on?.shopUse,at=s.kit.spell.indexOf(id);if(!use||at<0||s.scene!=='shop'||isBoss(s.index+1))return false;
      use({redraw(){s.draw++;s.cards=cards(s.index+1);}});s.kit.spell.splice(at,1);checkpoint();return true;},
    next(){
      if(s.scene!=='shop')return false;
      s.index++;s.discount=s.nextDiscount;s.selected=null;
      if(isBoss(s.index)){s.selected={id:s.order[Math.floor(s.index/3)%s.order.length]};s.scene='ready';}else s.scene='pick';
      checkpoint();return true;
    },
  };
  return api;
}
