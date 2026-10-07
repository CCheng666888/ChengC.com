export function ellipse(ctx, x, y, rx, ry, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fill(); }
export function rounded(ctx, x, y, w, h, r, fill, stroke) { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fill(); if (stroke) { ctx.strokeStyle=stroke; ctx.lineWidth=2; ctx.stroke(); } }
export function line(ctx, points, color, width = 3) { ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.strokeStyle=color; ctx.lineWidth=width; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.stroke(); }
export function drawDog(ctx, dog, t = 0, scale = 1) {
  ctx.save(); ctx.translate(dog.x,dog.y); ctx.scale(scale,scale);
  const sitting = dog.state === 'sitting' || dog.state === 'tired';
  const bounce = dog.moving ? Math.sin(dog.phase) * 2 : Math.sin(t * 2) * .65;
  ellipse(ctx,0,8,28,8,'#53674722'); ctx.scale(dog.direction || 1,1); ctx.translate(0,bounce);
  const c = dog.spec?.color || '#d59a50', light = dog.spec?.light || '#fff0cf';
  const stride = dog.moving ? Math.sin(dog.phase)*6 : 0;
  line(ctx,[[-17,-12],[-29,-19],[-29+Math.sin(t*9)*3,-28]],c,8);
  for (const [x,s] of [[-14,1],[-5,-1],[7,-1],[18,1]]) line(ctx,[[x,-1],[x + (sitting ? -5 : stride*s),10]],c,6);
  ellipse(ctx,0,-7,sitting?17:24,sitting?20:15,c);
  ellipse(ctx,12,-5,11,12,light);
  ellipse(ctx,21,-23,17,16,c);
  ctx.fillStyle=c; ctx.beginPath(); ctx.moveTo(10,-33);ctx.lineTo(9,-49);ctx.lineTo(23,-37);ctx.moveTo(26,-37);ctx.lineTo(35,-46);ctx.lineTo(37,-28);ctx.fill();
  ctx.fillStyle='#ae704b';ctx.beginPath();ctx.moveTo(12,-36);ctx.lineTo(12,-43);ctx.lineTo(18,-37);ctx.moveTo(29,-37);ctx.lineTo(34,-41);ctx.lineTo(34,-33);ctx.fill();
  ellipse(ctx,29,-17,12,9,light); ellipse(ctx,38,-20,3,2.7,'#394638');
  ellipse(ctx,26,-28,2,2.4,'#394638'); ellipse(ctx,26.6,-28.7,.6,.7,'white');
  line(ctx,[[29,-13],[33,-12],[35,-14]],'#845c47',1.5);
  if (dog.state === 'happy' || dog.state === 'excited' || dog.state === 'running') rounded(ctx,31,-12,5,7,3,'#e78777');
  line(ctx,[[9,-19],[14,-14],[17,-13]],'#648786',4); ellipse(ctx,17,-12,2.5,3,'#e9ba59');
  ctx.restore();
  if (dog.thoughtTime > 0 && dog.thought) {
    ctx.font='600 12px system-ui'; const width=ctx.measureText(dog.thought).width+24;
    rounded(ctx,dog.x-width/2,dog.y-83,width,28,12,'#fff9ec','#ded7bd');
    ctx.fillStyle='#53614a';ctx.textAlign='center';ctx.fillText(dog.thought,dog.x,dog.y-65);
  }
}
export function drawPlayer(ctx, player, t = 0) {
  ctx.save();ctx.translate(player.x,player.y);ellipse(ctx,0,7,19,7,'#53674725');ctx.scale(player.direction||1,1);
  const step=player.moving?Math.sin(player.phase)*7:0,bob=player.moving?Math.abs(Math.sin(player.phase))*2:0;
  ctx.translate(0,-bob);
  line(ctx,[[-6,-15],[-7+step,5]],'#52676a',8);line(ctx,[[6,-15],[7-step,5]],'#617b7c',8);
  rounded(ctx,-13+step,3,13,5,2,'#3d4d48');rounded(ctx,3-step,3,13,5,2,'#3d4d48');
  rounded(ctx,-13,-43,26,29,9,'#6f9081');rounded(ctx,-14,-40,11,20,4,'#587b70');
  line(ctx,[[-10,-36],[-16,-23],[7,-21]],'#739a87',7);ellipse(ctx,10,-21,4,4,'#e8b990');
  ellipse(ctx,0,-56,12,14,'#e8b990');ellipse(ctx,8,-53,5,6,'#e8b990');
  rounded(ctx,-13,-69,26,11,5,'#df855b');ellipse(ctx,6,-60,17,3,'#e69265');
  ellipse(ctx,8,-55,1.3,1.5,'#574c3d');rounded(ctx,-16,-38,10,23,3,'#e7bd70');
  ctx.restore();
}
export function drawLeash(ctx, player, dog) {
  ctx.beginPath();ctx.moveTo(player.x+player.direction*10,player.y-22);
  ctx.quadraticCurveTo((player.x+dog.x)/2,(player.y+dog.y)/2+10,dog.x+dog.direction*10,dog.y-18);
  ctx.strokeStyle='#9e7850';ctx.lineWidth=2;ctx.stroke();
}
