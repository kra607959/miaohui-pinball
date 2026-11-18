import { createRng } from '../game/rng.js';
// 屋脊是剪纸的底层，前景人群在灯下留出一条空街。
export function paintTitle(canvas){
  canvas.width=960;canvas.height=620;
  const g=canvas.getContext('2d'),rng=createRng(0x61ac3);
  const sky=g.createRadialGradient(478,294,110,480,333,505);
  sky.addColorStop(0,'#a4523c');sky.addColorStop(.48,'#5d2836');sky.addColorStop(1,'#21141f');
  g.fillStyle=sky;g.fillRect(0,0,960,620);
  g.strokeStyle='#f4b57845';g.lineWidth=1;
  for(const r of [152,164,180]){g.beginPath();g.arc(480,302,r,0,2*Math.PI);g.stroke();}
  g.fillStyle='#eea26221';g.beginPath();g.arc(480,302,151,0,2*Math.PI);g.fill();
  for(let n=0;n<95;n++){g.fillStyle=n%7===0?'#f8bf7880':'#f2b47435'; const r=1+rng();g.fillRect(rng()*960,86+rng()*433,r,r);}
  function roof(x,y,w,bg){
    g.fillStyle=bg;g.beginPath();g.moveTo(x-19,y+23);g.quadraticCurveTo(x+w*.34,y+14,x+w*.49,y-34);
    g.quadraticCurveTo(x+w*.57,y+9,x+w+20,y+23);g.lineTo(x+w-3,y+35);g.lineTo(x+w-8,620);g.lineTo(x+7,620);g.lineTo(x+5,y+35);g.closePath();g.fill();
    g.strokeStyle='#e9ab634d';g.lineWidth=1.5;g.beginPath();g.moveTo(x,y+26);g.quadraticCurveTo(x+w*.55,y+13,x+w,y+26);g.stroke();
    for(let lx=x+19;lx<x+w-11;lx+=17){g.fillStyle='#e6a15585';g.fillRect(lx,y+52,3,15);}
  }
  for(let x=-28;x<965;){const w=64+rng()*75,y=398-54*Math.cos(x/166)+rng()*30;roof(x,y,w,'#4b2530');x+=w*.78;}
  for(const [x,y,w] of [[-15,390,179],[86,432,124],[744,431,134],[833,380,177]])roof(x,y,w,'#281923');
  for(let i=0;i<32;i++){
    const x=9+i*31+rng()*14,y=518+rng()*42,r=7+rng()*6;
    g.fillStyle=i%5?'#251522':'#39202b';g.beginPath();g.arc(x,y,r,0,2*Math.PI);g.fill();
    g.beginPath();g.moveTo(x-r/2,y+5);g.quadraticCurveTo(x-22,y+30,x-18,620);g.lineTo(x+19,620);g.quadraticCurveTo(x+24,y+25,x+r/2,y+5);g.fill();
    if(i%4===0){g.fillStyle='#be654a';g.fillRect(x-r,y+r*.75,r*2,3);}
  }
  g.fillStyle='#22141f';g.fillRect(0,602,960,18);
}
