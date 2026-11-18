import { bonuses,ruleById,streets } from '../game/run.js';
import { byId,catalog } from '../game/items/index.js';
import { limits } from '../game/shop.js';
import { paintTitle } from '../render/title.js';

const names={charm:'摆件',ball:'珠子',spell:'符',mod:'台改'};
const num=n=>n.toLocaleString('zh-CN');
export function mountJourney(root,{newRun,resume,hasSave,getRun,open,settings,title,record,reduceMotion}){
  let replacement=null;
  const add=(tag,text,parent=root,cls)=>{
    const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;parent.append(node);return node;
  };
  const button=(text,run,parent=root,cls,disabled=false)=>{const b=add('button',text,parent,cls);b.type='button';b.onclick=run;b.disabled=disabled;return b;};
  function head(kicker,name,desc){add('p',kicker,root,'scene-kicker');add('h1',name);if(desc)add('p',desc,root,'scene-desc');}
  function card(parent,title,desc,tag){const box=add('article','',parent,'scene-card');if(tag)add('small',tag,box);add('h2',title,box);add('p',desc,box);return box;}
  function choose(id,run,show){
    const item=byId[id],kind=item.kind,list=getRun().state.kit[kind];
    if(kind==='ball'||list.length>=limits[kind]){replacement={id,run};show();}
    else {run(id);show();}
  }
  function chooseSlot(){
    const {id,run}=replacement,item=byId[id],list=getRun().state.kit[item.kind];
    head('更换位置',`收下${item.name}`,item.desc);
    list.forEach((x,i)=>button(`替换 ${i+1} · ${byId[x].name}`,()=>{replacement=null;run(id,i);show();}));
    button('取消',()=>{replacement=null;show();});
  }
  function show(scene=getRun()?.state.scene??'title'){
    root.replaceChildren();root.dataset.scene=scene;root.hidden=false;root.scrollTop=0;
    if(scene==='title'){
      const decor=add('div','',root,'title-decoration');decor.setAttribute('aria-hidden','true');
      const c=add('canvas','',decor);paintTitle(c);
      for(let n=0;n<7;n++){
        const lamp=add('i','',decor,'title-lantern');lamp.style.setProperty('--i',n);lamp.style.setProperty('--hang',`${[14,4,10,1,10,4,14][n]}px`);
      }
      root.classList.toggle('still',reduceMotion());
      add('p','廟 會',root,'title-seal');
      head('一日三街 · 九台弹珠','庙会弹珠','从早市打到夜会。三颗珠子过一摊，拿铜钱换一手新打法。');
      const row=add('div','',root,'scene-actions');button('开逛',newRun,row,'primary');button('继续',resume,row,'',!hasSave());
      button('图鉴',()=>show('book'),row);button('设置',settings,row);return;
    }
    if(scene==='book'){
      head('逛摊手记','庙会图鉴',`最高分 ${num(record.highest)}  ·  通关 ${record.clears} 次  ·  已见 ${record.seen.length}/${catalog.length}`);
      for(const kind of Object.keys(names)){
        add('h2',names[kind]);const grid=add('div','',root,'scene-grid book-grid');
        for(const item of catalog.filter(i=>i.kind===kind)){
          if(record.seen.includes(item.id))card(grid,item.name,item.desc);
          else card(grid,'◈','尚未见到','剪影');
        }
      }
      button('回标题',title);return;
    }
    const j=getRun(),s=j.state,label=`${streets[Math.floor(s.index/3)]}  /  第 ${s.index+1} 台  /  ${s.coins} 铜`;
    if(replacement){chooseSlot();return;}
    if(scene==='pick'){
      head(label,'接下来逛哪摊？',`目标 ${num(j.target)} 分。选一张，另一张就错过了。`);
      const grid=add('div','',root,'scene-grid');
      s.cards.forEach(({id,bonus},i)=>{const rule=ruleById(id),box=card(grid,rule.name,rule.desc,bonuses.find(b=>b.id===bonus).label);
        button('就逛这摊',()=>{j.select(i);open();},box,'primary');});
      button('回标题',title);return;
    }
    if(scene==='ready'){open();return;}
    if(scene==='reward'){
      head(label,'压轴彩头','免费挑一个稀有摆件；摆件满了可以替换。');
      const grid=add('div','',root,'scene-grid');
      for(const id of s.rewards){const item=byId[id],box=card(grid,item.name,item.desc,'稀有摆件');button('收下',()=>choose(id,j.reward,show),box,'primary');}
      button('不拿彩头',()=>{j.reward();show();});return;
    }
    if(scene==='shop'){
      const bill=s.history.at(-1);head(label,'货郎担',`上一摊 ${num(bill.points)} 分 · 本摊共赚 ${bill.earned} 铜。`);
      const grid=add('div','',root,'scene-grid');
      for(const id of s.stock){const item=byId[id],tag=`${names[item.kind]} · ${item.price} 铜`,box=card(grid,item.name,item.desc,tag);
        button(`买下 · ${item.price} 铜`,()=>choose(id,j.buy,show),box,'',s.coins<item.price);}
      const row=add('div','',root,'scene-actions');
      button(`刷新 ${2+s.refresh} 铜`,()=>{j.reroll();show();},row,'',s.coins<2+s.refresh);
      button('逛下一摊 →',()=>{j.next();show();},row,'primary');
      if(s.kit.spell.some(id=>byId[id].on?.shopUse))for(const id of s.kit.spell.filter(x=>byId[x].on?.shopUse)){
        button(`用${byId[id].name}`,()=>{j.useShopSpell(id);show();},row,'',(s.index+1)%3===2);
      }
      add('h2','珠匣 · 按从左到右发射');
      const slots=add('div','',root,'scene-actions');
      s.kit.ball.forEach((id,i)=>{const slot=add('span',`${i+1} ${byId[id].name}`,slots,'stock-chip');if(i>0)button('← 前移',()=>{j.swap(i-1,i);show();},slot);});
      const inventory=Object.values(s.kit).flat().filter(id=>byId[id].price);
      if(inventory.length){add('h2','随身行囊 · 半价卖出');const own=add('div','',root,'scene-actions');for(const id of inventory)button(`${byId[id].name} · 卖 ${Math.floor(byId[id].price/2)} 铜`,()=>{j.sell(id);show();},own);}
      button('回标题',title);return;
    }
    if(scene==='failed'||scene==='victory'){
      head(scene==='victory'?'九摊全过':'庙会记分簿',scene==='victory'?'夜会尽兴！':'这趟收工',`总分 ${num(s.history.reduce((sum,h)=>sum+h.points,0))}  ·  ${s.coins} 铜`);
      const list=add('ol','',root,'score-history');
      for(const h of s.history)add('li',`${ruleById(h.id).name}  ·  ${num(h.points)} / ${num(h.target)}  ${h.won?'✓':'未达标'}`,list);
      add('p',`用过的摆件：${s.visited.map(id=>byId[id].name).join('、')||'无'}`);
      const row=add('div','',root,'scene-actions');button('再开一局',newRun,row,'primary');button('回标题',title,row);
    }
  }
  return {show};
}
