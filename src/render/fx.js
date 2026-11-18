import { createRng } from '../game/rng.js';

export function createFx(seed, options) {
  const rng=createRng(seed ^ 0xafc7b9), sparks=[], tags=[];
  let stamp=null, shakeUntil=0, flashUntil=0;
  function spray(ev, count, style) {
    const max=options.reduceMotion?150:300;
    const x=ev.x??260,y=ev.y??492;
    for(let j=0;j<count&&sparks.length<max;j++){
      const angle=rng()*Math.PI*2,speed=35+rng()*200;
      sparks.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-80,t:ev.time,life:.28+rng()*.55,size:1.5+rng()*3.5,style});
    }
  }
  function tag(ev,text,color='#f5c970') {
    if(tags.length===12)tags.shift();
    tags.push({x:Math.max(45,Math.min(478,ev.x??260)),y:ev.y??505,t:ev.time,text,color});
  }
  return {
    onEvent(ev) {
      if(ev.type==='itemEffect')tag(ev,ev.label,'#ffeb8d');
      if(ev.type==='bossPower')stamp={label:ev.label,t:ev.time};
      if(ev.type==='points'){tag(ev,`+${ev.points}`); spray(ev, ev.points>=100?12:5,ev.points>=100?'gold':'paper');}
      if(ev.type==='coins'){tag(ev,`+${ev.n} 铜`);spray(ev,9,'gold');}
      if(ev.type==='multiplier'&&stamp?.t!==ev.time)stamp={label:`倍率 ${ev.n>=0?'+':''}${ev.n}`,t:ev.time};
      if(ev.type==='skillShot')stamp={label:'开门红',t:ev.time};
      if(ev.type==='targetReached'){
        stamp={label:'收 摊',t:ev.time};shakeUntil=ev.time+.28;
        for(const x of [120,200,320,425])spray({...ev,x,y:512},27,'red');
      }
      if(ev.type==='drain')flashUntil=ev.time+.3;
      if(ev.type==='multiballStart')stamp={label:'三珠同打',t:ev.time};
    },
    offset(time) {
      return options.reduceMotion || time>=shakeUntil ? [0,0] : [Math.sin(time*193)*5,Math.cos(time*157)*3];
    },
    draw(ctx,time) {
      if(time<flashUntil){ctx.strokeStyle=`rgba(18,4,15,${(flashUntil-time)*1.4})`;ctx.lineWidth=28;ctx.strokeRect(0,0,560,1000);}
      for(let i=sparks.length-1;i>=0;i--){
        const p=sparks[i],age=time-p.t;
        if(age>=p.life){sparks.splice(i,1);continue;}
        ctx.globalAlpha=(1-age/p.life)*(p.y>664?.58:.95);
        ctx.fillStyle=p.style==='gold'?'#ffd374':p.style==='red'?'#ef6658':'#f0bb85';
        const x=p.x+p.vx*age,y=p.y+p.vy*age+230*age*age;
        ctx.save();ctx.translate(x,y);ctx.rotate(age*5);
        if(p.style==='gold'){ctx.beginPath();ctx.arc(0,0,p.size,0,2*Math.PI);ctx.fill();}else ctx.fillRect(-p.size,-p.size/2,p.size*2,p.size);
        ctx.restore();
      }
      ctx.textAlign='center';ctx.font='bold 23px system-ui';ctx.lineWidth=3;ctx.strokeStyle='#351127';
      for(let i=tags.length-1;i>=0;i--){const p=tags[i],age=time-p.t;if(age>=.95){tags.splice(i,1);continue;}
        ctx.globalAlpha=(1-age/.95)*(p.y>665?.58:1);ctx.fillStyle=p.color;const y=p.y-14-age*42;
        ctx.strokeText(p.text,p.x,y);ctx.fillText(p.text,p.x,y);
      }
      ctx.globalAlpha=1;
      if(stamp&&time-stamp.t<1.3){
        const age=time-stamp.t, scale=options.reduceMotion?1:1+Math.max(0,.2-age)*1.2;
        ctx.save();ctx.translate(260,495);ctx.rotate(-.075);ctx.scale(scale,scale);ctx.globalAlpha=Math.min(1,(1.3-age)/.39);
        ctx.fillStyle='#882736';ctx.strokeStyle='#f8c575';ctx.lineWidth=3;
        ctx.beginPath();ctx.roundRect(-105,-34,210,68,8);ctx.fill();ctx.stroke();ctx.strokeRect(-96,-25,192,50);
        ctx.fillStyle='#f7db9e';ctx.font='bold 34px KaiTi,serif';ctx.fillText(stamp.label,0,11,191);ctx.restore();
      }
    },
  };
}
