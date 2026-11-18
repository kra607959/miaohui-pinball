import { makeStaticLayer } from './static.js';
import { drawBalls, drawElements, drawEquipment } from './dynamic.js';
import { drawNotice, drawScore } from './hud.js';
import { makeNightLayer } from './night.js';
import { config } from '../config.js';

export function createRenderer(ctx, hud, options) {
  let current, ground, large, dark;
  return (session, alpha, fx) => {
    const world=session.world;
    const scale=Math.min(2,Math.max(1,Math.ceil(ctx.canvas.width/config.board.width*2)/2));
    if(world!==current||scale!==large){current=world;large=scale;ground=makeStaticLayer(world,scale);}
    ctx.save();
    const [dx,dy]=fx.offset(world.time);ctx.translate(dx,dy);
    ctx.drawImage(ground,0,0,config.board.width,config.board.height);
    drawElements(ctx,session);drawEquipment(ctx,world);
    if(world.table.night){dark??=makeNightLayer();dark(ctx,session);}
    drawNotice(ctx,session);fx.draw(ctx,world.time);
    drawBalls(ctx,world,alpha,options.reduceMotion);
    ctx.restore();
    if (!hud.hidden) drawScore(hud,session);
  };
}
