const charm = (id,name,rarity,price,desc,on,init) => ({id,name,kind:'charm',rarity,price,desc,on,init});
const counter = () => ({ n:0 });
const once = (st, fn) => { if (!st.used) { st.used=true; fn(); } };
export const charms = [
  charm('tongluo','铜锣','common',5,'每撞鼓 10 次，本珠倍率 +1',{hit(c,e,s){if(e.kind==='bumper'&&++s.n%10===0)c.addMult(1,'tongluo');}},counter),
  charm('jinchan','金蟾','common',5,'糖人洞收珠 +1 铜',{saucerCatch(c){c.addCoins(1,'jinchan');}}),
  charm('menshen','门神','common',4,'保珠时间 +6 秒',{tableStart(c){c.setFlag('saveExtra',6,'menshen','保珠 +6 秒');}}),
  charm('hongsheng','红绳','common',5,'每台第一次掉进外道时，把珠子弹回台面',{drain(c,e,s){if(e.outlane)once(s,()=>c.returnBall('hongsheng'));}}),
  charm('bianpao','鞭炮串','common',5,'爆竹墙底分 5 → 40',{score(c,e){if(e.kind==='sling'){e.base+=35*(e.ball?.baseScale??1);c.effect('bianpao','爆竹 +35 底分');}}}),
  charm('denglonggu','灯笼骨','common',4,'灯笼底分 +25',{score(c,e){if(e.kind==='drop'){e.base+=25;c.effect('denglonggu','灯笼 +25 底分');}}}),
  charm('zhaopai','老字号招牌','common',5,'每台第一颗珠子从 ×2 起',{ballStart(c,e){if(e.index===1)c.addMult(1,'zhaopai');}}),
  charm('luogudian','锣鼓点','uncommon',6,'连击窗口变成 3 秒',{tableStart(c){c.setFlag('comboSeconds',3,'luogudian','连击窗口 3 秒');}}),
  charm('suanpan','算盘','uncommon',6,'每连击 10 次，倍率 +1',{comboChanged(c,e){if(e.n%10===0)c.addMult(1,'suanpan');}}),
  charm('daofu','倒福','uncommon',7,'落珠后倍率减半，最低 ×1',{tableStart(c){c.setFlag('keepMultiplier',true);},turnEnd(c){c.effect('daofu','保留一半倍率');}}),
  charm('zoumadeng','走马灯','uncommon',7,'灯笼一排后常亮；再打亮灯 +50 分',{tableStart(c){c.setFlag('keepLanterns',true);},lanternAgain(c,e){c.addPoints(50,'zoumadeng',e);}}),
  charm('tanghua','糖画转盘','uncommon',6,'风车每转 20 圈抽奖',{spinnerHalfTurn(c,e,s){if(++s.n%40===0)[()=>c.addPoints(300,'tanghua',e),()=>c.addCoins(1,'tanghua'),()=>c.addMult(1,'tanghua'),()=>c.extendSave(5,'tanghua')][Math.floor(c.rng()*4)]();}},counter),
  charm('dingfeng','定风珠','uncommon',6,'摇台不增加倾斜',{tableStart(c){c.setFlag('freeNudge',true);},nudge(c){c.effect('dingfeng','免倾斜');}}),
  charm('cishi','磁石','uncommon',6,'糖人洞会吸引附近的珠子',{tableStart(c){c.setFlag('saucerMagnet',80);c.setFlag('saucerPull',630);},saucerCatch(c){c.effect('cishi','糖人洞吸引');}}),
  charm('shitou','狮子头','rare',8,'双挡板同时抬起击球：出速 ×1.25，+30 分',{flip(c,e){if(e.both){e.ball.vx*=1.25;e.ball.vy*=1.25;c.addPoints(30,'shitou',{ball:e.ball,x:e.ball.x,y:e.ball.y});}}}),
  charm('zhuangyuan','状元帽','rare',9,'完成组增加 1 点倍率',{setComplete(c){c.addMult(1,'zhuangyuan');}}),
  charm('jubaopen','聚宝盆','rare',9,'过关时每存 5 铜多得 1 铜，最多 5 铜',{tableClear(c){c.addCoins(Math.min(5,Math.floor((c.state.bank+c.state.coins)/5)),'jubaopen');}}),
  charm('jingping','净瓶','rare',9,'保珠结束后，本台第一次正式落珠免费补发',{drain(c,e,s){if(!e.save&&c.world.time>=c.state.saveUntil&&!c.state.multi&&c.state.phase==='play')once(s,()=>c.saveBall('jingping'));}}),
  charm('shuangyu','双鱼','rare',8,'多球时多一颗珠',{tableStart(c){c.setFlag('extraMulti',1);},multiballStart(c){c.effect('shuangyu','多球 +1 珠');}}),
  charm('huajiao','花轿','rare',10,'过关时剩至少 2 颗珠，下台目标 −20%',{tableClear(c,e){if(e.unplayed>=2)c.setFlag('nextDiscount',.2,'huajiao','下台目标 −20%');}}),
];
