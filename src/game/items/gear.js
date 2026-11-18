import { allowsShape } from '../../table/validate.js';
import { circle } from '../../physics/shapes.js';

const item = (kind,id,name,price,desc,extra={}) => ({kind,id,name,price,desc,...extra});
const ball = (id,name,price,desc,profile={},on={}) => item('ball',id,name,price,desc,{profile,on:Object.fromEntries(Object.entries(on).map(([k,fn])=>[k,(c,e)=>{if(e.ball?.ballType===id)fn(c,e); }]))});
const spell = (id,name,desc,on) => item('spell',id,name,3,desc,{on});
const mod = (id,name,desc,on) => item('mod',id,name,7,desc,{on});
export const balls = [
  ball('gang','钢珠',0,'平衡，无特殊效果'),
  ball('tie','铁珠',5,'鼓的额外弹力 ×0.6，底分 ×1.5',{bumperBoost:.6,baseScale:1.5}),
  ball('liuli','琉璃珠',5,'底分 ×2，撞击 60 次后碎裂',{baseScale:2,collisionEvents:true},{collision(c,e){if((e.ball.collisions=(e.ball.collisions??0)+1)===60){c.breakBall(e.ball);c.effect('liuli','碎珠');}}}),
  ball('mu','木珠',5,'重力 ×0.8，最高速度 ×0.85',{gravityScale:.8,speedScale:.85}),
  ball('huo','火珠',6,'撞倒一盏灯笼时连带击倒相邻一盏',{neighborDrop:true}),
  ball('zimu','子母珠',6,'发射 3 秒后分成两颗，不触发多球加成',{}, {tick(c,e){const b=e.ball;if(!b.split&&c.world.time-b.launchedAt>=3){b.split=true;c.spawnBall({x:b.x,y:b.y-2*b.radius-2,vx:-b.vx,vy:b.vy},'zimu');}}}),
  ball('jin','金珠',6,'本珠每得 1000 分，多赚 1 铜',{}, {ballPoints(c,e){const band=Math.floor(e.ball.points/1000),n=band-(e.ball.paid??0);if(n>0){e.ball.paid=band;c.addCoins(n,'jin');}}}),
];
export const spells = [
  spell('pingan','平安符','下一次落珠自动补发',{use(c){c.setFlag('safeCharm',true,'pingan','下一次落珠补发');}}),
  spell('zhaocai','招财符','当前珠子倍率 +2',{use(c){c.addMult(2,'zhaocai');}}),
  spell('lei','雷符','击倒所有灯笼，计作完成组',{use(c){c.allLanterns('lei');}}),
  spell('jiazhu','加珠符','本台珠匣末尾加一颗钢珠',{use(c){c.extraBall('gang','jiazhu');}}),
  spell('gaitan','改摊符','只能在货郎担用：重抽下一台的摊位卡',{shopUse(c){c.redraw();}}),
];
function addBumper(table,x,y,r){
  const id='mod:extra-drum',collider=circle(x,y,r,{mat:'bumper',kind:'bumper',elementId:id});
  collider.moduleId='mod:jiagu';table.colliders.push(collider);table.elements.push({id,kind:'bumper',x,y,r,collider});
}
export const mods = [
  mod('zhongzhu','中柱','挡住一部分中路漏珠',{applyTable({table}){const x=260,y=979,r=7,id='mod:post';const collider=circle(x,y,r,{mat:'rubber'});table.colliders.push(collider);table.elements.push({id,kind:'post',x,y,r,collider});}}),
  mod('changban','长挡板','挡板长度 +12%',{applyTable(c){c.settings={...c.settings,flipper:{...c.settings.flipper,length:c.settings.flipper.length*1.12}};}}),
  mod('shouwai','收外道','缩窄两侧漏珠入口',{applyTable({table}){for(const e of table.elements.filter(e=>e.kind==='outlane')){if(e.side==='right')e.x+=12;e.w-=12;}}}),
  mod('jiagu','多一面鼓','在中槽或下槽加一面鼓',{applyTable({table}){const candidates=[[260,477],[168,550],[352,550],[168,635],[352,635],[260,699]];const pos=candidates.find(([x,y])=>allowsShape(table,circle(x,y,20)));if(pos)addBumper(table,...pos,20);}}),
  mod('huimaqiang','回马枪','左外道每台自动弹回一次',{drain(c,e,s){if(e.outlane&&e.side==='left'&&!e.save&&!s.used){s.used=true;c.returnBall('huimaqiang');}}}),
];
