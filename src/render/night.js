import { config } from '../config.js';
// 每团光从不透明遮罩中擦除，因此两束光交叠时不会变暗。
export function makeNightLayer(){
  const mask=document.createElement('canvas');
  mask.width=config.board.width;mask.height=config.board.height;
  const shade=mask.getContext('2d');
  function reveal(x,y,r){
    const light=shade.createRadialGradient(x,y,r*.52,x,y,r);
    light.addColorStop(0,'#000');light.addColorStop(.71,'#000d');light.addColorStop(1,'#0000');
    shade.fillStyle=light;shade.fillRect(x-r,y-r,r*2,r*2);
  }
  return (ctx,{world,flags})=>{
    shade.clearRect(0,0,mask.width,mask.height);
    shade.globalCompositeOperation='source-over';shade.fillStyle='#110e24e6';shade.fillRect(0,0,mask.width,mask.height);
    shade.globalCompositeOperation='destination-out';
    for(const b of world.balls)reveal(b.x,b.y,120);
    for(const e of world.table.elements)if(flags.nightLamps?.has(e.id))reveal(e.w?e.x+e.w/2:e.x,e.h?e.y+e.h/2:e.y,80);
    ctx.drawImage(mask,0,0);
  };
}
