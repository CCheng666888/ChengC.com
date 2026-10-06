/* js/work-scenes.js */
/* Original Canvas scenes inspired by the sample's pixel scale, dithering and layers. */
(() => {
  'use strict';
  const canvas = document.getElementById('workScene');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', {alpha:false});
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer:coarse)');
  const lightweight = coarse.matches || matchMedia('(max-width:800px)').matches;
  const saveData = Boolean(navigator.connection?.saveData);
  const BAY = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  const names = new Set(['ming','qin','badminton','fish','defense','qa','notes','beat','soon']);
  const settings = {density:65,speed:35,mist:40,glow:60}, defaults = {...settings};
  const cache = new Map(), glows = new Map();
  let W=640,H=360,viewW=640,theme='soon',from=null,changed=0,time=0,last=0,frame=0;
  let paused=lightweight||reduced.matches||saveData,scrolling=false,mouse=0,aim=0,effects=[],sceneReady=false;
  const rgb = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
  function random(seed) {
    let n=seed;
    return () => {n|=0;n=n+0x6D2B79F5|0;let t=Math.imul(n^n>>>15,1|n);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
  }
  const q=v=>Math.round(v*H/360);
  function surface(w,h) {const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));const x=c.getContext('2d');x.imageSmoothingEnabled=false;return [c,x];}
  function rect(x,a,b,w,h,col){x.fillStyle=col;x.fillRect(Math.round(a),Math.round(b),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
  function poly(x,points,col){x.fillStyle=col;x.beginPath();points.forEach((p,i)=>i?x.lineTo(Math.round(p[0]),Math.round(p[1])):x.moveTo(Math.round(p[0]),Math.round(p[1])));x.closePath();x.fill();}
  function line(x,a,b,c,d,col){let X=Math.round(a),Y=Math.round(b),ex=Math.round(c),ey=Math.round(d),dx=Math.abs(ex-X),dy=-Math.abs(ey-Y),sx=X<ex?1:-1,sy=Y<ey?1:-1,e=dx+dy;x.fillStyle=col;for(let k=0;k<Math.max(W,H)*3;k++){x.fillRect(X,Y,1,1);if(X===ex&&Y===ey)break;let e2=e*2;if(e2>=dy){e+=dy;X+=sx;}if(e2<=dx){e+=dx;Y+=sy;}}}
  function disk(x,cx,cy,rx,ry,col){for(let y=-Math.ceil(ry);y<=ry;y++){const w=rx*Math.sqrt(Math.max(0,1-(y*y)/(ry*ry)));rect(x,cx-w,cy+y,w*2+1,1,col);}}
  function gradient(x,w,h,ramp,seed=1){
    const C=ramp.map(rgb),r=random(seed),img=x.createImageData(w,h),d=img.data;
    for(let y=0;y<h;y++)for(let z=0;z<w;z++){
      const f=y/Math.max(1,h-1)*(C.length-1),lo=Math.floor(f),frac=f-lo;
      const a=C[lo],b=C[Math.min(C.length-1,lo+1)],i=(y*w+z)*4,n=(r()-.5)*2,bayer=(BAY[(y&3)*4+(z&3)]+.5)/16-.5;
      for(let channel=0;channel<3;channel++)d[i+channel]=Math.round((a[channel]*(1-frac)+b[channel]*frac)/4+bayer)*4+n;
      d[i+3]=255;
    }x.putImageData(img,0,0);
  }
  function glow(x,cx,cy,r,hex,alpha){
    r=Math.max(2,Math.round(r));const key=r+hex;
    let c=glows.get(key);
    if(!c){const [g,gx]=surface(r*2+1,r*2+1),img=gx.createImageData(g.width,g.height),d=img.data,C=rgb(hex);
      for(let y=0;y<g.height;y++)for(let z=0;z<g.width;z++){const dist=Math.hypot(z-r,y-r)/r;if(dist>=1)continue;const a=Math.floor(Math.pow(1-dist,2)*12+(BAY[(y&3)*4+(z&3)]+.5)/16)/12,i=(y*g.width+z)*4;d[i]=C[0];d[i+1]=C[1];d[i+2]=C[2];d[i+3]=a*255;}gx.putImageData(img,0,0);glows.set(key,g);c=g;}
    x.globalAlpha=clamp(alpha,0,1);x.drawImage(c,Math.round(cx-r),Math.round(cy-r));x.globalAlpha=1;
  }
  function stars(x,r,n,top=.42){for(let i=0;i<n;i++){const a=r()*W,b=r()*H*top;rect(x,a,b,1,1,i%4?'#8bafc6':'#eee8ca');}}
  function mountains(x,baseline,color,height,seed){for(let z=0;z<W;z++){const f=z/W,y=baseline-height*(.36+.27*Math.sin(f*7+seed)+.18*Math.sin(f*17+seed*.3)+.10*Math.sin(f*39));rect(x,z,y,1,baseline-y,color);}}
  function roof(x,cx,cy,w,h,col,rim){for(let k=0;k<h;k++){const span=w*(.40+.60*k/h);rect(x,cx-span/2,cy+k,span,1,col);}line(x,cx-w/2-q(3),cy+h,cx+w/2+q(3),cy+h,rim);rect(x,cx-w/2-q(4),cy+h-q(2),q(4),q(2),col);rect(x,cx+w/2,cy+h-q(2),q(4),q(2),col);}
  function tower(x,cx,y,w,h,r){rect(x,cx-w/2,y-h,w,h,'#5c4245');rect(x,cx-w/2+q(3),y-h+q(5),w-q(6),h-q(5),'#90624f');roof(x,cx,y-h-q(9),w+q(15),q(9),'#253040','#bd8b69');for(let j=0;j<3;j++){const yy=y-h+q(9+j*10);rect(x,cx-q(3),yy,q(6),q(5),r>.5?'#e1bb80':'#614c48');}rect(x,cx-q(1),y-h-q(14),q(2),q(5),'#283041');}

  function ming(x,r){
    gradient(x,W,H,['#182f4c','#385371','#6a7790','#b89b93','#e9ba8f','#d5ab80','#8a777d','#304659'],31);
    const sunX=W*.75,sunY=H*.34;glow(x,sunX,sunY,q(95),'#f4bd81',.65);disk(x,sunX,sunY,q(14),q(14),'#f8dfb3');
    mountains(x,H*.57,'#6d7890',q(65),2);mountains(x,H*.60,'#46566d',q(42),5);
    rect(x,0,H*.61,W,H*.39,'#263e50');
    for(let i=0;i<190;i++){const yy=H*.62+r()*H*.38,xx=r()*W,len=q(2+r()*15);rect(x,xx,yy,len,1,r()>.55?'#405360':'#4d5c65');}
    for(let i=0;i<44;i++){const xx=i/43*W,yy=H*.59,h=q(6+r()*11),w=q(5+r()*7);rect(x,xx,yy-h,w,h,'#594b4f');roof(x,xx+w/2,yy-h-q(3),w+q(3),q(3),'#303444','#ae816b');if(r()>.35)rect(x,xx+q(2),yy-q(5),q(2),q(2),'#efbd81');}
    rect(x,0,H*.59,W,q(5),'#4b454a');rect(x,0,H*.59,W,1,'#b28b70');
    for(let i=0;i<6;i++){const a=W*(.04+i*.18);tower(x,a,H*.59,q(26),q(30),r());}
    const palace=W*.52,y=H*.565;
    rect(x,palace-q(78),y-q(44),q(156),q(44),'#6d4844');rect(x,palace-q(71),y-q(39),q(142),q(35),'#9b6150');roof(x,palace,y-q(69),q(180),q(25),'#2b3545','#d3a272');
    rect(x,palace-q(28),y-q(47),q(56),q(47),'#533c3e');roof(x,palace,y-q(86),q(94),q(26),'#30394a','#e4b37d');
    for(let i=-4;i<=4;i++){rect(x,palace+q(i*15),y-q(31),q(3),q(30),'#d69a70');rect(x,palace+q(i*15+4),y-q(25),q(7),q(9),'#efc386');}
    rect(x,palace-q(11),y-q(26),q(22),q(26),'#312e39');
    poly(x,[[0,H],[0,H*.91],[W*.19,H*.85],[W*.30,H]],'#182b39');poly(x,[[W,H],[W,H*.9],[W*.87,H*.84],[W*.76,H]],'#182b39');
    for(let i=0;i<18;i++){const xx=W*.02+i*q(4),yy=H-q(10)-Math.sin(i*.45)*q(11);line(x,xx,H,xx,yy,'#233b43');}
  }
  function qin(x,r){
    gradient(x,W,H,['#070b0d','#11181b','#202720','#4a3824','#171815','#090c0d'],221);
    const moonX=W*.76,moonY=H*.18;
    disk(x,moonX,moonY,q(15),q(15),'#b7a679');glow(x,moonX,moonY,q(58),'#b8924e',.28);
    mountains(x,H*.51,'#171e1c',q(47),5);mountains(x,H*.57,'#22251f',q(32),9);
    rect(x,0,H*.66,W,H*.34,'#0b100f');
    for(let i=0;i<110;i++)rect(x,r()*W,H*.67+r()*H*.31,q(1+r()*7),1,i%3?'#20231d':'#4a3823');

    // Qin palace silhouette and a central gate, rendered on the same coarse pixel grid.
    const palace=W*.50,base=H*.67;
    rect(x,palace-q(132),base-q(45),q(264),q(45),'#1c1d18');
    rect(x,palace-q(106),base-q(70),q(212),q(70),'#27231b');
    roof(x,palace,base-q(91),q(252),q(21),'#080d0f','#8d6734');
    rect(x,palace-q(35),base-q(69),q(70),q(69),'#131512');
    roof(x,palace,base-q(104),q(110),q(18),'#090d0e','#a47838');
    rect(x,palace-q(11),base-q(38),q(22),q(38),'#050808');
    for(let i=-5;i<=5;i++)rect(x,palace+q(i*18),base-q(57),q(3),q(47),i%2?'#71502b':'#46351f');
    for(let i=0;i<7;i++)glow(x,palace-q(82)+q(i*27),base-q(26),q(8),'#d2933d',.42);

    // Black Qin banners with angular bird-like gold marks.
    for(const a of [.12,.88]){
      rect(x,W*a,H*.29,q(3),H*.47,'#6c5430');
      poly(x,[[W*a+q(3),H*.31],[W*a+q(52)*(a<.5?1:-1),H*.34],[W*a+q(47)*(a<.5?1:-1),H*.49],[W*a+q(3),H*.45]],'#0a0e0e');
      const d=a<.5?1:-1;
      line(x,W*a+d*q(10),H*.37,W*a+d*q(34),H*.40,'#b98a3f');
      line(x,W*a+d*q(18),H*.43,W*a+d*q(34),H*.40,'#b98a3f');
      line(x,W*a+d*q(18),H*.36,W*a+d*q(18),H*.43,'#b98a3f');
    }

    // Strategy-card silhouettes, bamboo slips and round coins frame the foreground.
    for(let i=0;i<5;i++){
      const a=W*(.09+i*.205),yy=H*(.83+(i%2)*.035),ww=q(34),hh=q(48);
      rect(x,a,yy,ww,hh,'#111816');rect(x,a+q(2),yy+q(2),ww-q(4),hh-q(4),i===2?'#5f4725':'#283027');
      rect(x,a+q(7),yy+q(8),ww-q(14),q(2),'#b28a49');
      for(let j=0;j<4;j++)rect(x,a+q(8),yy+q(18+j*5),ww-q(16),1,'#7f6940');
    }
    for(let i=0;i<7;i++){const a=W*(.025+i*.022);rect(x,a,H*.77,q(8),q(58),'#73542d');rect(x,a+q(2),H*.78,q(2),q(50),'#a17a3f');}
    for(let i=0;i<4;i++){const a=W*(.82+i*.04);disk(x,a,H*.84,q(12),q(12),'#8c6a35');disk(x,a,H*.84,q(5),q(5),'#111512');rect(x,a-q(3),H*.84-q(5),q(6),q(10),'#111512');}
  }
  function court(x,r){
    gradient(x,W,H,['#0b192d','#142d43','#244650','#46615b','#1d3946','#152b3c'],42);stars(x,r,160,.44);
    disk(x,W*.76,H*.16,q(12),q(12),'#d5e2d4');glow(x,W*.76,H*.16,q(43),'#b3d8d4',.3);
    mountains(x,H*.58,'#192f3c',q(35),3);
    for(let i=0;i<16;i++){const a=W*i/16;rect(x,a,H*.53,q(36),q(14),'#243c44');for(let j=0;j<5;j++)rect(x,a+q(j*7),H*.55,q(4),q(2),'#455958');}
    rect(x,0,H*.62,W,H*.38,'#184548');
    for(let i=0;i<95;i++)rect(x,r()*W,H*.63+r()*H*.36,q(2+r()*6),1,'#285453');
    poly(x,[[W*.27,H*.63],[W*.73,H*.63],[W*.98,H],[W*.02,H]],'#28605a');
    const edges=[[[.27,.63],[.02,1]],[[.73,.63],[.98,1]],[[.32,.65],[.13,1]],[[.68,.65],[.87,1]],[[.5,.63],[.5,1]],[[.19,.77],[.81,.77]],[[.27,.63],[.73,.63]],[[.075,.92],[.925,.92]]];
    edges.forEach(e=>line(x,e[0][0]*W,e[0][1]*H,e[1][0]*W,e[1][1]*H,'#b4d2b5'));
    const yy=H*.73,top=yy-q(21);rect(x,W*.19,top,W*.62,1,'#d2ddd0');line(x,W*.19,yy,W*.19,top-q(4),'#d7caa8');line(x,W*.81,yy,W*.81,top-q(4),'#d7caa8');
    for(let i=0;i<55;i++)line(x,W*.19+i*W*.62/55,top,W*.19+i*W*.62/55,yy,'#779994');for(let k=0;k<5;k++)line(x,W*.19,top+q(k*4),W*.81,top+q(k*4),'#779994');
    for(const a of [.055,.945]){rect(x,W*a,H*.21,q(2),H*.48,'#1f3545');rect(x,W*a-q(11),H*.21,q(24),q(4),'#d3e0c9');for(let i=0;i<4;i++)rect(x,W*a-q(9)+q(i*6),H*.215,q(3),q(3),'#f1eacd');glow(x,W*a,H*.225,q(65),'#acd9cb',.45);}
  }
  function reef(x,r,defense){
    gradient(x,W,H,defense?['#072c46','#0c5265','#14758a','#205d76','#123c59','#102a43']:['#145170','#247c90','#42a4ac','#28879c','#216580','#163b57'],defense?76:71);
    for(let i=0;i<4;i++){x.globalAlpha=.06;poly(x,[[W*(.17+i*.19),0],[W*(.21+i*.19),0],[W*(.47+i*.19),H],[W*(.26+i*.19),H]],'#b1e8d8');}x.globalAlpha=1;
    mountains(x,H*.73,defense?'#175165':'#2e798b',q(48),4);
    rect(x,0,H*.82,W,H*.18,defense?'#244b58':'#759792');
    for(let i=0;i<140;i++)rect(x,r()*W,H*.82+r()*H*.18,q(1+r()*4),1,defense?'#456670':'#a1b1a0');
    if(!defense){
      const px=W*.19,y=H*.81;disk(x,px,y-q(26),q(20),q(32),'#cd984b');disk(x,px-q(3),y-q(28),q(14),q(28),'#d7ab52');
      for(let i=-3;i<=3;i++)for(let j=0;j<8;j++)line(x,px+q(i*8)-q(8),y-q(56)+q(j*7),px+q(i*8),y-q(50)+q(j*7),'#a27541');
      for(let i=-3;i<=3;i++)poly(x,[[px,y-q(56)],[px+q(i*8),y-q(80+Math.abs(i)*2)],[px+q(i*5+3),y-q(60)]],i&1?'#75a875':'#3e856b');
      disk(x,px,y-q(22),q(5),q(5),'#70bfd0');rect(x,px-q(5),y-q(12),q(10),q(12),'#35647a');
      const rock=W*.79;disk(x,rock,y-q(18),q(22),q(27),'#628798');rect(x,rock-q(7),y-q(39),q(14),q(26),'#7697a6');rect(x,rock-q(8),y-q(24),q(5),q(4),'#234c6a');rect(x,rock+q(3),y-q(24),q(5),q(4),'#234c6a');
    }else{
      const pts=[[0,.9],[.24,.9],[.24,.70],[.65,.70],[.65,.85],[1,.85]];
      for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];const steps=Math.max(Math.abs(a[0]-b[0])*W,Math.abs(a[1]-b[1])*H);for(let n=0;n<steps;n++){const f=n/steps;rect(x,(a[0]*(1-f)+b[0]*f)*W-q(7),(a[1]*(1-f)+b[1]*f)*H-q(7),q(14),q(14),'#577773');}}
      for(const [a,b] of [[.14,.76],[.36,.84],[.52,.60],[.79,.75]]){disk(x,a*W,b*H,q(14),q(5),'#203d54');rect(x,a*W-q(6),b*H-q(19),q(12),q(18),'#46717a');disk(x,a*W,b*H-q(19),q(9),q(5),'#91c5b4');rect(x,a*W-q(2),b*H-q(28),q(4),q(9),'#a8dbc3');}
    }
    for(let i=0;i<28;i++){const a=i<14?r()*W*.20:W*(.8+r()*.2),base=H*(.88+r()*.12),len=q(15+r()*40),color=['#b9778b','#638d92','#508f81','#a58d79'][i%4];line(x,a,base,a-q(2),base-len,color);line(x,a,base-len*.45,a+q(7),base-len*.65,color);line(x,a-q(2),base-len*.7,a-q(8),base-len*.86,color);}
  }
  function shelf(x,a,y,w,h,r){
    rect(x,a,y,w,h,'#182938');rect(x,a,y,q(3),h,'#574334');rect(x,a+w-q(3),y,q(3),h,'#574334');
    for(let row=0;row<4;row++){const yy=y+q(7)+row*h/4;for(let b=0;b<w-q(10);b+=q(4+r()*4)){const hh=q(13+r()*14),ww=q(3+r()*3);rect(x,a+q(5)+b,yy+q(28)-hh,ww,hh,['#91674f','#627c7b','#b49976','#706c88','#ad815a'][Math.floor(r()*5)]);rect(x,a+q(6)+b,yy+q(29)-hh,1,hh,'#c1ad8b');}rect(x,a,yy+q(28),w,q(4),'#76573c');rect(x,a,yy+q(28),w,1,'#b79059');}
  }
  function lamp(x,a,b){rect(x,a,b,q(2),q(42),'#9b7c51');rect(x,a-q(12),b+q(41),q(26),q(3),'#76624c');poly(x,[[a-q(15),b],[a+q(17),b],[a+q(9),b-q(12)],[a-q(7),b-q(12)]],'#ceb079');rect(x,a-q(15),b,q(32),q(2),'#efd7a2');glow(x,a,b+q(13),q(59),'#efbd78',.55);}
  function library(x,r,notes){
    gradient(x,W,H,notes?['#18263e','#263851','#45475e','#34394d','#233245']:['#152b3d','#2c4354','#575951','#75644f','#373b3c'],notes?113:101);
    const wx=W*.5,top=H*.10,bottom=H*.64,ww=W*.30;
    rect(x,wx-ww/2-q(5),top-q(5),ww+q(10),bottom-top+q(10),notes?'#736a80':'#b09771');
    rect(x,wx-ww/2,top,ww,bottom-top,notes?'#1f304e':'#214a63');
    disk(x,wx+ww*.18,top+q(24),q(10),q(10),'#d7ddd8');glow(x,wx+ww*.18,top+q(24),q(40),'#aabbdc',.32);
    for(let i=0;i<70;i++)rect(x,wx-ww/2+r()*ww,top+r()*(bottom-top)*.8,1,1,'#7eacc5');
    for(let i=0;i<10;i++){const yy=bottom-q(14)-i*q(3);rect(x,wx-ww/2,yy,ww,1,'#345c73');}
    rect(x,wx-q(2),top,q(4),bottom-top,notes?'#686c83':'#9a8464');rect(x,wx-ww/2,top+(bottom-top)*.43,ww,q(3),notes?'#686c83':'#9a8464');
    if(!notes){shelf(x,W*.02,H*.08,W*.26,H*.69,r);shelf(x,W*.72,H*.08,W*.26,H*.69,r);}else{
      shelf(x,W*.04,H*.32,W*.22,H*.38,r);rect(x,W*.79,H*.19,W*.16,H*.26,'#746e79');rect(x,W*.80,H*.20,W*.14,H*.24,'#bdbaa3');for(let i=0;i<6;i++)rect(x,W*.82,H*.23+q(i*9),W*.09,1,'#8c9894');
    }
    poly(x,[[0,H*.91],[W*.13,H*.76],[W*.85,H*.76],[W,H*.93],[W,H],[0,H]],notes?'#4d444d':'#6d513e');
    for(let i=0;i<18;i++)line(x,0,H*.91+q(i*2),W,H*.91+q(i*2),notes?'#5d5260':'#825e43');
    lamp(x,W*.21,H*.67);
    if(notes){
      const sx=W*.64,sy=H*.80,sw=q(102),sh=q(62);rect(x,sx-sw/2,sy-sh,sw,sh,'#1b293d');rect(x,sx-sw/2+q(4),sy-sh+q(4),sw-q(8),sh-q(8),'#586180');
      for(let i=0;i<5;i++)rect(x,sx-sw*.35,sy-sh+q(12+i*7),q(20+(i%3)*6),q(2),'#c3ced2');
      const px=sx+q(14),py=sy-sh/2;line(x,px,py,px+q(16),py-q(15),'#c8b5e5');line(x,px,py,px+q(20),py+q(12),'#9bcdca');disk(x,px,py,q(3),q(3),'#cfc5eb');disk(x,px+q(16),py-q(15),q(3),q(3),'#ceb3d8');disk(x,px+q(20),py+q(12),q(3),q(3),'#9bcbc4');
      poly(x,[[sx-sw/2-q(10),sy+q(7)],[sx+sw/2+q(10),sy+q(7)],[sx+sw/2,sy],[sx-sw/2,sy]],'#9ba5b0');
      for(let i=0;i<3;i++)rect(x,W*.39+q(i*3),H*.88+q(i*2),q(44),q(3),['#8f758a','#d4c3b3','#b9aeab'][i]);
    }else{
      const a=W*.55,b=H*.86;poly(x,[[a,b],[a-q(56),b-q(12)],[a-q(47),b-q(32)],[a,b-q(21)]],'#dac6a0');poly(x,[[a,b],[a+q(55),b-q(10)],[a+q(48),b-q(31)],[a,b-q(21)]],'#ead7b1');line(x,a,b,a,b-q(20),'#9c815d');
      for(let i=0;i<5;i++){line(x,a-q(43),b-q(25)+q(i*3),a-q(7),b-q(17)+q(i*3),'#a89d84');line(x,a+q(7),b-q(17)+q(i*3),a+q(42),b-q(24)+q(i*3),'#b2a58b');}
    }
    const plant=W*.89;rect(x,plant-q(10),H*.89,q(20),q(13),'#94705b');for(let i=-3;i<=3;i++){line(x,plant,H*.89,plant+q(i*6),H*.79-q(Math.abs(i)*2),'#426d66');disk(x,plant+q(i*6),H*.79-q(Math.abs(i)*2),q(4),q(7),'#668c72');}
  }
  // Four note lanes, speaker cabinets and a sequencer stage, all in the same pixel raster.
  function rhythm(x,r){
    gradient(x,W,H,['#101c32','#23324a','#34334d','#26374a','#152a3b'],149);stars(x,r,85,.45);
    rect(x,0,H*.13,W,q(2),'#384a5d');
    for(let i=0;i<10;i++){const a=W*(.05+i*.1);rect(x,a,H*.125,q(8),q(5),i%2?'#8a7da5':'#72a7a7');}
    for(let i=0;i<W;i+=q(3)){const yy=H*.23+Math.sin(i/W*36)*q(5)+Math.sin(i/W*17)*q(3);rect(x,i,yy,q(2),1,'#50697b');}
    const top=H*.64;
    rect(x,0,top,W,H-top,'#172d3e');line(x,0,top,W,top,'#496879');
    poly(x,[[W*.38,top],[W*.62,top],[W*.93,H],[W*.07,H]],'#21394a');
    for(let lane=0;lane<=4;lane++)line(x,W*(.38+lane*.06),top,W*(.07+lane*.215),H,lane%2?'#526276':'#406d75');
    for(let i=1;i<9;i++){const f=i/9,yy=top+(H-top)*f*f,span=W*(.12+.31*f*f);line(x,W*.5-span,yy,W*.5+span,yy,'#314e60');}
    line(x,W*.12,H*.91,W*.88,H*.91,'#9bcac4');line(x,W*.12,H*.915,W*.88,H*.915,'#466d79');
    for(const a of [.12,.88]){
      const sx=W*a-q(21),sy=H*.33,sw=q(42),sh=q(109);
      rect(x,sx,sy,sw,sh,'#152737');rect(x,sx+q(3),sy+q(3),sw-q(6),sh-q(6),'#2a4053');
      for(const [yy,rr] of [[sy+q(24),q(12)],[sy+q(69),q(16)]]){disk(x,W*a,yy,rr,rr,'#506578');disk(x,W*a,yy,rr-q(2),rr-q(2),'#182b3a');disk(x,W*a,yy,q(4),q(4),'#7ea5af');}
      rect(x,sx+q(5),sy+sh-q(8),sw-q(10),q(2),'#567b82');
    }
    for(let i=0;i<16;i++){const a=W*(.04+i*.06),yy=H*.77;rect(x,a,yy,q(4),q(2),i%2?'#756b91':'#4c8189');}
    for(let lane=0;lane<4;lane++){const a=W*(.25+lane/6);rect(x,a-q(10),H*.95,q(20),q(7),'#3d5d6b');rect(x,a-q(8),H*.95+q(2),q(16),q(2),lane%2?'#9784af':'#7fb9b5');}
    for(let i=0;i<65;i++)rect(x,r()*W,H*.68+r()*H*.32,q(2+r()*5),1,'#2b4557');
  }
  function workshop(x,r){gradient(x,W,H,['#142b45','#365169','#706a7a','#b29b96','#4b6170'],139);stars(x,r,110,.42);mountains(x,H*.74,'#263e56',q(42),2);rect(x,0,H*.78,W,H*.22,'#283b4f');for(let i=0;i<100;i++)rect(x,r()*W,H*.8+r()*H*.2,q(2+r()*9),1,'#4b5e6a');disk(x,W*.73,H*.25,q(12),q(12),'#e7d4b5');glow(x,W*.73,H*.25,q(52),'#d9c1c6',.35);}
  function build(id){
    if(cache.has(id))return cache.get(id);
    const [base,x]=surface(W,H),r=random([...id].reduce((a,c)=>a+c.charCodeAt(0),0));
    if(id==='ming')ming(x,r);else if(id==='qin')qin(x,r);else if(id==='badminton')court(x,r);else if(id==='fish'||id==='defense')reef(x,r,id==='defense');else if(id==='qa'||id==='notes')library(x,r,id==='notes');else if(id==='beat')rhythm(x,r);else workshop(x,r);
    const particles=Array.from({length:160},()=>({x:r()*W,y:r()*H,p:r()*6.3,v:.4+r(),size:r()}));
    const [moving,mx]=surface(W,H);const value={base,moving,mx,particles,id};cache.set(id,value);return value;
  }
  function fish(x,a,b,size,dir,col){disk(x,a,b,q(size),q(size*.45),col);poly(x,[[a-dir*q(size),b],[a-dir*q(size*1.7),b-q(size*.5)],[a-dir*q(size*1.7),b+q(size*.5)]],col);rect(x,a+dir*q(size*.55),b-q(1),1,1,'#accdc7');}
  function paintScene(scene){
    const {base,moving,mx:x,particles,id}=scene,t=time,light=settings.glow/100,n=Math.floor(20+settings.density*.9);
    x.globalAlpha=1;x.drawImage(base,0,0);
    if(id==='ming'){
      for(let i=0;i<6;i++){const yy=H*(.13+i*.057),xx=((i*W*.28+t*q(.7+i*.10))%(W+q(120)))-q(80);x.globalAlpha=.18;rect(x,xx,yy,q(46+i*6),q(2+i%2),'#e2c2af');rect(x,xx+q(14),yy-q(2),q(25),q(2),'#e2c2af');}x.globalAlpha=1;
      for(let i=0;i<100;i++){const p=particles[i],depth=.62+.37*(i/100),xx=(p.x+Math.sin(t*.65+p.p)*q(2))%W,yy=H*depth;const pulse=.25+.25*Math.sin(t*1.1+p.p);x.globalAlpha=pulse;rect(x,xx,yy,q(3+depth*8),1,'#dfa678');}x.globalAlpha=1;
      for(let i=0;i<8;i++)glow(x,W*(.05+i*.13),H*.585,q(7),'#edb46d',light*(.23+.08*Math.sin(t*1.7+i)));
    }else if(id==='qin'){
      for(let i=0;i<Math.min(n,46);i++){
        const p=particles[i],xx=(p.x+Math.sin(t*.28+p.p)*q(3))%W,yy=H-((p.y+t*q(.35+p.v*.25))%(H+q(15)));
        x.globalAlpha=.10+.24*Math.sin(t*.55+p.p)**2;rect(x,xx,yy,p.size>.55?q(2):1,p.size>.72?q(2):1,i%4?'#bd9149':'#69756a');
      }
      x.globalAlpha=1;
      for(let i=0;i<7;i++)glow(x,W*.5-q(82)+q(i*27),H*.67-q(26),q(9),'#d2933d',light*(.25+.13*Math.sin(t*1.15+i)**2));
    }else if(id==='badminton'){
      for(const a of [.055,.945])glow(x,W*a,H*.25,q(80),'#c1e2cf',light*(.23+.06*Math.sin(t*.7+a*10)));
      const f=(t*.15)%1,ax=W*(.28+.44*f),ay=H*(.68-.20*Math.sin(f*Math.PI));disk(x,ax,ay,q(2),q(2),'#e4e3c9');line(x,ax-q(6),ay-q(4),ax,ay,'#d3dbce');line(x,ax-q(5),ay-q(6),ax,ay,'#d3dbce');
      for(let i=0;i<18;i++){const p=particles[i];x.globalAlpha=.15+.2*Math.sin(t*.8+p.p)**2;rect(x,p.x,p.y*.55,1,1,'#e2e8d3');}x.globalAlpha=1;
    }else if(id==='fish'||id==='defense'){
      for(let i=0;i<n;i++){const p=particles[i],yy=H-((p.y+t*q(2.7+p.v*2))%(H+q(12))),xx=p.x+Math.sin(t*.8+p.p)*q(4),s=q(1+p.size*2);x.globalAlpha=.28+.2*p.size;line(x,xx-s,yy,xx-s,yy-s,'#bde2d2');line(x,xx-s,yy-s,xx+s,yy-s,'#bde2d2');rect(x,xx+s,yy,1,q(1+p.size),'#7bbfc4');}x.globalAlpha=1;
      for(let i=0;i<12;i++){const dir=i%2?1:-1,xx=((particles[i].x+dir*t*q(3+particles[i].v))%(W+q(30))+W+q(30))%(W+q(30))-q(15);fish(x,xx,H*(.28+i*.025)+Math.sin(t*.6+i)*q(2),2+i%3,dir,'#629da8');}
      for(let i=0;i<12;i++){const a=i<6?W*(i*.026):W*(.85+(i-6)*.026),yy=H-q(i%3*3);line(x,a,yy,a+Math.sin(t*.8+i)*q(4),yy-q(26+i%3*9),'#497d74');}
      if(id==='defense')for(const [a,b] of [[.14,.76],[.36,.84],[.52,.60],[.79,.75]])glow(x,a*W,b*H-q(23),q(17),'#a2e2c9',light*(.30+.25*Math.sin(t*2+a*17)**2));
    }else if(id==='beat'){
      const pulse=.5+.5*Math.cos(t*Math.PI*4),top=H*.64;
      // Small, steady local pulses keep the typography readable; no full-screen flashes.
      for(const a of [.12,.88])glow(x,W*a,H*.33+q(69),q(32),'#85c9cc',light*(.12+.15*pulse));
      for(let i=0;i<16;i++){
        const a=W*(.04+i*.06),level=.3+.7*Math.sin(t*2.3+i*.77)**2,blocks=2+Math.floor(level*12);
        for(let j=0;j<blocks;j++)rect(x,a,H*.77-q(3+j*3),q(4),q(2),j>10?'#baa0c4':i%2?'#817fa8':'#65a6ad');
      }
      for(let lane=0;lane<4;lane++)for(let j=0;j<3;j++){
        const f=(t*.24+j/3+lane*.17)%1,yy=top+(H-top)*f,span=W*(.12+.31*f),a=W*.5+(lane-1.5)*span/2,size=q(4+8*f);
        rect(x,a-size/2,yy,size,q(2+f),lane%2?'#b59dca':'#87d6cf');
        if(j===1&&lane===1)rect(x,a-q(1),yy-q(12),q(2),q(12),'#527e89');
      }
      for(let lane=0;lane<4;lane++){const a=W*(.25+lane/6),active=Math.floor(t*2)%4===lane;glow(x,a,H*.96,q(14),lane%2?'#bca7d2':'#8fdbd0',light*(active?.4:.12));}
      for(let i=0;i<n*.3;i++){const p=particles[i],yy=H*.16+((p.y-t*q(.9*p.v)+H)%(H*.67));x.globalAlpha=.12+.13*Math.sin(t+p.p)**2;rect(x,p.x,yy,1,1,'#b3c6d8');}x.globalAlpha=1;
    }else if(id==='qa'||id==='notes'){
      glow(x,W*.21,H*.72,q(64),id==='qa'?'#eec183':'#d7c5b6',light*(.33+.02*Math.sin(t*2)));
      for(let i=0;i<n*.7;i++){const p=particles[i],xx=(p.x+Math.sin(t*.20+p.p)*q(8))%W,yy=H*.18+((p.y+t*q(.9*p.v))%(H*.70));x.globalAlpha=.10+.25*Math.sin(t*.9+p.p)**2;rect(x,xx,yy,1,1,id==='qa'?'#e9d2a3':'#cec7e0');}x.globalAlpha=1;
      if(id==='notes'){
        const left=W*.35,right=W*.65,top=H*.10,bottom=H*.64;
        x.save();x.beginPath();x.rect(left,top,right-left,bottom-top);x.clip();x.globalAlpha=.23;
        for(let i=0;i<42;i++){const p=particles[i],xx=left+((p.x+t*q(.25))%(right-left)),yy=top+((p.y+t*q(16+12*p.v))%(bottom-top));line(x,xx,yy,xx-q(1),yy+q(5),'#b0bddd');}x.restore();
        glow(x,W*.64,H*.735,q(45),'#a7b9ed',light*(.20+.04*Math.sin(t)));
      }
    }else{
      for(let i=0;i<n;i++){const p=particles[i];x.globalAlpha=.18+.30*Math.sin(t*.9+p.p)**2;rect(x,(p.x+t*q(p.v))%W,p.y*.75,1,1,'#e3d2bd');}x.globalAlpha=1;
      glow(x,W*.73,H*.25,q(68),'#d9c5cf',light*.25);
    }
    // Ambient light is drawn inside this same raster scene, rather than over the page.
    x.globalAlpha=(100-settings.mist)/400;x.fillStyle='#071326';x.fillRect(0,0,W,H);x.globalAlpha=1;
    for(const e of effects){const age=t-e.t,f=1-age/1.7;if(f<=0)continue;const aquatic=id==='fish'||id==='defense'||(id==='ming'&&e.y>H*.61);for(let i=0;i<14;i++){const angle=i/14*Math.PI*2,rad=q(age*(aquatic?13:8)),xx=e.x+Math.cos(angle)*rad,yy=e.y+Math.sin(angle)*rad*(aquatic?.4:1);x.globalAlpha=f*.6;rect(x,xx,yy,1,1,aquatic?'#c4e3d7':'#e6cfac');}}x.globalAlpha=1;
    return moving;
  }
  function draw(now=performance.now()){
    if(!sceneReady)return;
    ctx.imageSmoothingEnabled=false;
    const crop=(W-viewW)/2+Math.round(mouse*q(3));
    if(from){ctx.globalAlpha=1;ctx.drawImage(paintScene(build(from)),crop,0,viewW,H,0,0,viewW,H);const f=clamp((now-changed)/700,0,1);ctx.globalAlpha=f*f*(3-2*f);ctx.drawImage(paintScene(build(theme)),crop,0,viewW,H,0,0,viewW,H);if(f===1)from=null;ctx.globalAlpha=1;}
    else ctx.drawImage(paintScene(build(theme)),crop,0,viewW,H,0,0,viewW,H);
  }
  function loop(now){frame=0;if(document.hidden||paused||scrolling)return;const dt=Math.min(.06,(now-last)/1000);if(now-last>1000/(lightweight?20:30)){time+=dt*(.12+settings.speed/100*1.9);last=now;mouse+=(aim-mouse)*.045;effects=effects.filter(e=>time-e.t<1.7);draw(now);}frame=requestAnimationFrame(loop);}
  function schedule(){if(sceneReady&&!frame&&!paused&&!scrolling&&!document.hidden){last=performance.now();frame=requestAnimationFrame(loop);}}
  function resize(){const px=Math.max(2,Math.round(innerHeight/360));viewW=Math.ceil(innerWidth/px);H=Math.ceil(innerHeight/px);W=Math.max(viewW+q(10),Math.ceil(H*16/9));canvas.width=viewW;canvas.height=H;cache.clear();glows.clear();effects=[];draw();}
  function setTheme(id){id=names.has(id)?id:'soon';if(id===theme)return;if(!sceneReady){theme=id;document.body.dataset.sceneTheme=id;return;}build(id);from=paused?null:theme;theme=id;changed=performance.now();document.body.dataset.sceneTheme=id;draw();schedule();}
  function pause(){paused=!paused;syncPause();if(paused){cancelAnimationFrame(frame);frame=0;from=null;draw();}else schedule();}
  function syncPause(){const b=document.getElementById('pauseToggle');b.textContent=paused?'继续动画':'暂停动画';b.setAttribute('aria-pressed',String(paused));document.getElementById('motionNote').textContent=reduced.matches?'已按你的减少动态偏好暂停场景；仍可切换作品和背景。':lightweight&&paused?'手机默认显示静态像素场景，滑动更流畅。点击“继续动画”可播放背景。':'每个作品有自己的像素场景；环境动画、微光和交互都在同一画面中绘制。';}
  window.WorkScenes={setTheme};
  theme=document.querySelector('.work-card')?.dataset.scene||document.body.dataset.sceneTheme||'soon';document.body.dataset.sceneTheme=theme;
  syncPause();
  // Paint navigation and cards before constructing the decorative raster scene.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{sceneReady=true;resize();schedule();}));
  let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,100);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();});
  reduced.addEventListener('change',()=>{paused=lightweight||reduced.matches||saveData;from=null;syncPause();draw();schedule();});
  let scrollTimer;
  if(lightweight)addEventListener('scroll',()=>{scrolling=true;cancelAnimationFrame(frame);frame=0;clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{scrolling=false;schedule();},200);},{passive:true});
  addEventListener('pointermove',e=>{aim=reduced.matches||coarse.matches?0:(e.clientX/innerWidth-.5)*2;},{passive:true});
  document.addEventListener('pointerdown',e=>{if(paused||e.target.closest('a,button,input,textarea,.work-card,.carousel-controls,.carousel-sides,.showcase-head,.site-header,.settings,footer,.tools'))return;const crop=(W-viewW)/2;effects.push({x:e.clientX/innerWidth*viewW+crop,y:e.clientY/innerHeight*H,t:time});});
  const $=id=>document.getElementById(id),scene=$('sceneToggle'),panel=$('settings');
  $('pauseToggle').addEventListener('click',pause);
  scene.addEventListener('click',()=>{const only=document.body.classList.toggle('scene-only');scene.textContent=only?'显示作品':'只看背景';scene.setAttribute('aria-pressed',String(only));if(only)scrollTo({top:0,behavior:'instant'});});
  function closePanel(){panel.hidden=true;$('settingsToggle').setAttribute('aria-expanded','false');}
  $('settingsToggle').addEventListener('click',()=>{panel.hidden=!panel.hidden;$('settingsToggle').setAttribute('aria-expanded',String(!panel.hidden));});
  $('settingsClose').addEventListener('click',()=>{closePanel();$('settingsToggle').focus();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){closePanel();$('settingsToggle').focus();}});
  document.addEventListener('click',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!$('settingsToggle').contains(e.target))closePanel();});
  document.querySelectorAll('a[data-animate]').forEach(a=>a.addEventListener('click',()=>{document.body.classList.remove('scene-only');scene.textContent='只看背景';scene.setAttribute('aria-pressed','false');}));
  for(const key of ['density','speed','mist','glow'])$(key).addEventListener('input',e=>{settings[key]=Number(e.target.value);$(key+'Value').value=settings[key]+'%';if(paused)draw();});
  $('nightToggle').addEventListener('click',()=>{const soft=document.body.classList.toggle('scene-soft');$('nightToggle').textContent=soft?'恢复亮度':'柔和背景';$('nightToggle').setAttribute('aria-pressed',String(soft));});
  $('reset').addEventListener('click',()=>{Object.assign(settings,defaults);for(const key of Object.keys(settings)){$(key).value=settings[key];$(key+'Value').value=settings[key]+'%';}document.body.classList.remove('scene-soft');$('nightToggle').textContent='柔和背景';$('nightToggle').setAttribute('aria-pressed','false');paused=lightweight||reduced.matches||saveData;syncPause();from=null;draw();schedule();});
})();

