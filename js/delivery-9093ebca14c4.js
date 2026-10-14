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
  const names = new Set(['ming','qin','badminton','fish','defense','qa','notes','algorithms','physics','beat','dogwalk','soon']);
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
    // A single cinematic landscape, using the site's existing dithered palette and raster.
    gradient(x,W,H,['#20354e','#3b536c','#75818b','#b4a191','#d3b18b','#66727b','#283b4c'],221);
    glow(x,W*.72,H*.35,q(98),'#f0c18b',.33);
    disk(x,W*.72,H*.35,q(12),q(12),'#e8c7a0');
    for(let i=0;i<17;i++){
      const yy=H*(.12+r()*.26),a=r()*W;
      x.globalAlpha=.10;rect(x,a,yy,q(25+r()*76),q(1+r()*2),'#d1c2b5');
    }x.globalAlpha=1;
    mountains(x,H*.55,'#87909a',q(74),2);
    mountains(x,H*.58,'#5d7184',q(61),7);
    mountains(x,H*.62,'#3e566b',q(45),4);
    for(let i=0;i<32;i++){
      const a=i*W/31,w=q(6+r()*8),yy=H*.61,h=q(5+r()*8);
      rect(x,a,yy-h,w,h,'#49535b');roof(x,a+w/2,yy-h-q(3),w+q(3),q(3),'#293d50','#9a9181');
    }

    // Raised palace terraces. Warm rammed-earth faces separate the charcoal roof tiers.
    const c=W*.5,b=H*.65;
    rect(x,W*.07,H*.63,W*.86,H*.09,'#6a6257');
    rect(x,W*.07,H*.63,W*.86,q(3),'#b49e7e');
    for(let row=0;row<5;row++){
      const yy=H*.641+q(row*5);
      line(x,W*.07,yy,W*.93,yy,row%2?'#625e55':'#7a7060');
      for(let col=0;col<29;col++)rect(x,W*.07+col*W*.031+q(row%2*7),yy,1,q(4),'#545852');
    }
    rect(x,c-W*.31,b-q(22),W*.62,q(22),'#84715b');
    rect(x,c-W*.32,b-q(25),W*.64,q(4),'#b9a282');
    const hall=(cx,y,w,h)=>{
      rect(x,cx-w*.5,y-h,w,h,'#725c48');
      rect(x,cx-w*.47,y-h+q(4),w*.94,h-q(4),'#3c3733');
      roof(x,cx,y-h-q(21),w*1.13,q(21),'#172a3c','#b4a17b');
      for(let k=1;k<12;k++){
        const f=k/12;
        line(x,cx-w*.25+w*.5*f,y-h-q(18),cx-w*.54+w*1.08*f,y-h-q(1),'#293d4d');
      }
      line(x,cx-w*.42,y-h-q(11),cx+w*.42,y-h-q(11),'#3b4b56');
      rect(x,cx-w*.49,y-h+q(3),w*.98,q(3),'#b18d60');
      for(let k=0;k<11;k++){
        const a=cx-w*.46+k*w*.092;
        rect(x,a,y-h+q(7),q(3),h-q(7),'#aa7b53');
        rect(x,a+q(4),y-h+q(10),w*.06,q(13),'#c5a776');
        rect(x,a+q(4),y-h+q(13),w*.06,q(1),'#72533b');
      }
      rect(x,cx-q(9),y-q(24),q(18),q(24),'#17232a');
      line(x,cx,y-q(22),cx,y,'#927754');
    };
    hall(c,b-q(25),W*.54,q(42));
    rect(x,c-W*.12,b-q(90),W*.24,q(21),'#735d48');
    roof(x,c,b-q(112),W*.29,q(22),'#172b3f','#c2ad88');
    rect(x,c-W*.15,b-q(91),W*.30,q(3),'#bf9c70');
    for(let k=-3;k<=3;k++)rect(x,c+k*W*.032,b-q(86),q(3),q(15),'#bb9266');

    // Monumental gate towers remain visible beside the project window.
    for(const a of [.10,.90]){
      const cx=W*a,w=W*.085,y=H*.72;
      rect(x,cx-w*.62,y-q(31),w*1.24,q(31),'#5c5b53');
      rect(x,cx-w*.62,y-q(31),w*1.24,q(3),'#b5a085');
      rect(x,cx-w*.46,y-q(77),w*.92,q(46),'#6e5b4b');
      rect(x,cx-w*.35,y-q(69),w*.70,q(30),'#27343c');
      roof(x,cx,y-q(93),w*1.4,q(16),'#192c3e','#baa785');
      rect(x,cx-w*.42,y-q(78),w*.84,q(3),'#ac895e');
      for(let j=-1;j<=1;j++)rect(x,cx+j*w*.25,y-q(68),q(2),q(31),'#b28d65');
      roof(x,cx,y-q(39),w*1.6,q(8),'#233647','#a6967c');
    }

    // Long imperial approach, with steps and paving converging on the palace entrance.
    poly(x,[[0,H*.72],[W,H*.72],[W,H],[0,H]],'#263b4b');
    poly(x,[[c-W*.09,H*.68],[c+W*.09,H*.68],[c+W*.29,H],[c-W*.29,H]],'#7b7d76');
    for(let i=0;i<20;i++){
      const f=i/20,yy=H*(.69+.31*f*f),half=W*(.09+.20*f*f);
      line(x,c-half,yy,c+half,yy,i<10?'#aba99a':'#929c99');
    }
    for(const side of [-1,1]){
      line(x,c+side*W*.09,H*.68,c+side*W*.29,H,'#d0bda0');
      line(x,c+side*W*.10,H*.68,c+side*W*.31,H,'#455765');
      for(let i=0;i<9;i++){
        const f=i/8,a=c+side*W*(.105+.23*f),yy=H*(.70+.29*f),hh=q(4+9*f);
        rect(x,a,yy-hh,q(2+f*2),hh,'#95a19b');rect(x,a-q(1),yy-hh,q(4+f*2),q(2),'#c1b9a4');
      }
    }

    // Ordered ranks give the palace a scale; no floating props or oversized pictograms.
    for(let row=0;row<6;row++)for(const side of [-1,1])for(let col=0;col<10;col++){
      const depth=row/5,yy=H*(.77+depth*.21),a=c+side*W*(.17+depth*.16+col*.023),s=q(1+depth*1.2);
      rect(x,a,yy-q(8)-s,s*2,s*2,'#9da9a6');
      rect(x,a-s,yy-q(6),s*4,q(6),'#182735');
      rect(x,a,yy-q(4),s*2,1,'#68797e');
      line(x,a+side*q(4),yy,a+side*q(4),yy-q(17+depth*4),'#849391');
      rect(x,a+side*q(4),yy-q(19+depth*4),1,q(3),'#c0c4b3');
    }
    for(const side of [-1,1])for(let i=0;i<5;i++){
      const f=i/4,a=c+side*W*(.16+.26*f),yy=H*(.73+.25*f),pole=q(30+f*30);
      rect(x,a,yy-pole,q(2),pole,'#a8956e');
      const fw=q(10+f*12),fh=q(17+f*16),top=yy-pole+q(2);
      poly(x,[[a+q(2),top],[a+q(2)+fw,top+q(2)],[a+fw,top+fh],[a+q(2),top+fh-q(2)]],'#101d28');
      line(x,a+q(3),top,a+fw,top+q(2),'#b99562');
      x.fillStyle='#c6b18c';x.font='bold '+q(8+f*5)+'px SimSun,serif';x.textAlign='center';x.fillText('秦',a+fw*.55,top+fh*.66);
    }
    for(const a of [.20,.80]){
      rect(x,W*a,H*.70,q(4),q(14),'#8b7556');rect(x,W*a-q(3),H*.695,q(10),q(3),'#b5935c');
      rect(x,W*a,H*.681,q(3),q(5),'#f1c482');glow(x,W*a,H*.686,q(18),'#edb978',.42);
    }
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
  // A quiet computing studio: the landscape, furniture and screens share one raster.
  function fireflyGarden(x,r){
    gradient(x,W,H,['#132d42','#24515b','#548276','#afba91','#597f70','#183c45'],167);
    stars(x,r,95,.44);
    glow(x,W*.66,H*.25,q(85),'#c6e7c0',.38);disk(x,W*.66,H*.25,q(20),q(20),'#dce9c8');
    disk(x,W*.68,H*.235,q(19),q(19),'#3c6768');
    mountains(x,H*.60,'#638d88',q(60),3);mountains(x,H*.66,'#375f68',q(42),6);
    rect(x,0,H*.67,W,H*.33,'#1e454a');
    for(let i=0;i<85;i++){const a=r()*W,b=H*.68+r()*H*.32;rect(x,a,b,q(3+r()*10),1,i%3?'#386765':'#60867b');}
    // Silver-green terrace, a quiet communications terminal and geometric armor accents.
    poly(x,[[0,H*.82],[W*.18,H*.74],[W*.82,H*.74],[W,H*.82],[W,H],[0,H]],'#243e43');
    line(x,0,H*.82,W*.18,H*.74,'#b3c7ac');line(x,W*.82,H*.74,W,H*.82,'#b3c7ac');
    for(let i=0;i<12;i++)line(x,0,H*.86+q(i*4),W,H*.86+q(i*4),'#426055');
    for(const a of [.07,.93]){
      const cx=W*a,base=H*.80;
      poly(x,[[cx-q(17),base],[cx-q(13),base-q(57)],[cx,base-q(72)],[cx+q(13),base-q(57)],[cx+q(17),base]],'#90ac9e');
      poly(x,[[cx-q(8),base-q(12)],[cx-q(6),base-q(50)],[cx,base-q(58)],[cx+q(6),base-q(50)],[cx+q(8),base-q(12)]],'#36565b');
      rect(x,cx-q(3),base-q(53),q(6),q(24),'#b3dfc3');glow(x,cx,base-q(35),q(26),'#99e0bb',.35);
    }
    const compact=viewW/W<.60,cx=W*(compact?.55:.82),cy=H*(compact?.89:.73),ww=W*(compact?.10:.19),hh=H*.18;
    rect(x,cx-ww/2-q(3),cy-hh-q(3),ww+q(6),hh+q(6),'#b5c7b0');rect(x,cx-ww/2,cy-hh,ww,hh,'#183c42');
    rect(x,cx-ww*.42,cy-hh+q(5),ww*.84,1,'#699b87');rect(x,cx-q(3),cy,q(6),q(17),'#849f92');rect(x,cx-q(18),cy+q(17),q(36),q(3),'#b0c2a5');
    for(let i=0;i<28;i++){const a=i<14?r()*W*.20:W*(.8+r()*.2),base=H*(.83+r()*.17);line(x,a,base,a+q(3),base-q(8+r()*18),'#5b8b74');}
  }
  function physicsLab(x,r){
    gradient(x,W,H,['#1b344c','#4b6478','#9a9790','#c5ad8d','#354c5c'],179);
    glow(x,W*.69,H*.29,q(85),'#e7c093',.3);disk(x,W*.69,H*.29,q(11),q(11),'#e6c9a5');
    mountains(x,H*.59,'#7a8991',q(60),3);mountains(x,H*.67,'#435f70',q(43),6);
    rect(x,0,H*.70,W,H*.3,'#293f4e');
    for(let i=0;i<40;i++)line(x,i*W/39,H*.70,(i-20)*W/9+W*.5,H,'#405765');
    for(let i=0;i<10;i++)line(x,0,H*(.70+i*.03),W,H*(.70+i*.03),'#4d6470');
    const a=W*.19,b=H*.78;
    rect(x,a-q(35),b-q(82),q(3),q(82),'#b8a780');rect(x,a+q(35),b-q(82),q(3),q(82),'#b8a780');
    rect(x,a-q(35),b-q(84),q(73),q(3),'#dec39a');rect(x,a-q(43),b,q(89),q(5),'#a29379');
    const cx=W*.81,cy=H*.72;
    line(x,cx,cy,cx-q(30),cy+q(56),'#c3b39b');line(x,cx,cy,cx+q(28),cy+q(56),'#c3b39b');line(x,cx,cy,cx,cy+q(58),'#8d998f');
    poly(x,[[cx-q(24),cy-q(41)],[cx+q(30),cy-q(55)],[cx+q(33),cy-q(46)],[cx-q(21),cy-q(32)]],'#697f88');
    line(x,cx-q(23),cy-q(42),cx+q(29),cy-q(56),'#d5c7a5');
    line(x,cx,cy,cx+q(5),cy-q(41),'#b6b6a1');
    for(let i=0;i<35;i++)rect(x,r()*W,H*.72+r()*H*.28,q(2),1,'#556775');
  }
  function sortingSteps(){
    // Replay actual adjacent comparisons; each phase swaps at most one pair.
    const values=[7,3,8,2,6,4,1,5],steps=[{values:[...values],active:[]}];
    for(let end=values.length-1;end>0;end--)for(let i=0;i<end;i++){
      steps.push({values:[...values],active:[i,i+1]});
      if(values[i]>values[i+1]){[values[i],values[i+1]]=[values[i+1],values[i]];steps.push({values:[...values],active:[i,i+1]});}
    }
    steps.push({values:[...values],active:[]});
    return steps;
  }
  function fireflySignal(x,t,light,steps){
    const compact=viewW/W<.60,cx=W*(compact?.55:.82),cy=H*(compact?.89:.73),ww=W*(compact?.10:.19),hh=H*.18;
    const step=steps[Math.floor(t*.9)%steps.length];
    for(let i=0;i<8;i++){const a=cx-ww*.42+i*ww*.105,h=hh*.72*step.values[i]/8;rect(x,a,cy-q(4)-h,ww*.072,h,step.active.includes(i)?'#e4cc91':'#9cceb1');}
    // Low, local firefly glows; the terrain stays stable.
    for(let i=0;i<Math.floor(settings.density*.55);i++){
      const a=(i*W*.139+Math.sin(t*.4+i)*q(11))%W,b=H*(.32+(i%9)*.06)+Math.cos(t*.3+i)*q(4),alpha=light*(.23+.16*Math.sin(t*.7+i)**2);
      glow(x,a,b,q(4),'#b7e8b4',alpha);rect(x,a,b,1,1,'#d7ecc0');
    }
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
  function parkTree(x,a,b,size,r){
    disk(x,a,b+q(2),q(size*.64),q(size*.14),'#3b5949');
    rect(x,a-q(2),b-q(size*.8),q(5),q(size*.8),'#756849');
    line(x,a,b-q(size*.5),a-q(size*.18),b-q(size*.8),'#756849');
    disk(x,a,b-q(size),q(size*.48),q(size*.47),'#416958');
    disk(x,a-q(size*.24),b-q(size*.85),q(size*.38),q(size*.35),'#54795a');
    disk(x,a+q(size*.26),b-q(size*.9),q(size*.37),q(size*.32),'#63845e');
    disk(x,a-q(size*.04),b-q(size*1.13),q(size*.32),q(size*.3),'#739265');
    for(let i=0;i<28;i++)rect(x,a+q((r()-.5)*size*.65),b-q(size*(.84+r()*.4)),q(2),1,i%3?'#80986a':'#a4ac77');
  }
  function park(x,r){
    // Keep the park at the site's existing raster scale and dithered light.
    gradient(x,W,H,['#304e61','#719391','#c7b994','#eed1a0','#b4b390','#6e886f'],181);
    glow(x,W*.73,H*.30,q(86),'#f5d8a3',.36);disk(x,W*.73,H*.30,q(13),q(13),'#f6dfb0');
    mountains(x,H*.54,'#8aa39a',q(37),3);mountains(x,H*.57,'#648778',q(26),6);
    rect(x,0,H*.56,W,H*.44,'#668366');
    for(let i=0;i<460;i++)rect(x,r()*W,H*(.57+r()*.43),q(2+r()*5),1,['#77936a','#899b70','#57775e'][i%3]);
    for(let i=0;i<38;i++)disk(x,W*i/37,H*.55,q(8+r()*6),q(8+r()*5),i%2?'#4c7560':'#588166');
    // A winding path continues into the foreground beneath the walker.
    poly(x,[[W*.53,H*.56],[W*.60,H*.56],[W*.41,H*.69],[W*.42,H*.73],[W*.74,H*.84],[W*.76,H*.91],[W*.57,H],[W*.28,H],[W*.62,H*.88],[W*.29,H*.76],[W*.28,H*.68]],'#aa9d7a');
    poly(x,[[W*.55,H*.56],[W*.58,H*.56],[W*.36,H*.70],[W*.37,H*.74],[W*.70,H*.85],[W*.71,H*.90],[W*.48,H],[W*.35,H],[W*.66,H*.88],[W*.33,H*.75],[W*.32,H*.69]],'#c5b58c');
    for(let i=0;i<18;i++){
      const a=W*(.04+i*.055),b=H*.60;
      rect(x,a,b-q(8),q(2),q(10),'#9ca487');line(x,a,b-q(5),a+W*.055,b-q(5),'#aeb096');
    }
    for(const [a,b,size] of [[.06,.72,58],[.23,.63,40],[.92,.72,60],[.80,.62,42]])parkTree(x,W*a,H*b,size,r);
    const bench=(a,b)=>{
      disk(x,a,b+q(4),q(22),q(4),'#4d6b54');
      for(let i=0;i<3;i++)rect(x,a-q(19),b-q(16-i*4),q(38),q(3),i%2?'#b29468':'#c4a678');
      rect(x,a-q(20),b-q(3),q(40),q(4),'#b4966b');
      for(const side of [-1,1]){rect(x,a+side*q(15),b-q(14),q(2),q(22),'#435b54');rect(x,a+side*q(18),b-q(4),q(2),q(11),'#435b54');}
    };
    bench(W*.80,H*.79);bench(W*.34,H*.61);
    const fx=W*.17,fy=H*.80;
    disk(x,fx,fy+q(7),q(35),q(8),'#486c5b');disk(x,fx,fy,q(31),q(10),'#c1b493');disk(x,fx,fy-q(3),q(27),q(7),'#678c87');
    rect(x,fx-q(3),fy-q(24),q(6),q(23),'#a3aa95');disk(x,fx,fy-q(23),q(17),q(4),'#d2c3a0');disk(x,fx,fy-q(25),q(14),q(3),'#81a59c');
    rect(x,fx-q(2),fy-q(38),q(4),q(12),'#b8c2a8');
    for(const [a,b] of [[.10,.67],[.87,.70]]){
      const xx=W*a,yy=H*b;rect(x,xx,yy-q(45),q(2),q(47),'#3c5853');
      rect(x,xx-q(4),yy-q(47),q(10),q(2),'#405b52');rect(x,xx-q(3),yy-q(44),q(8),q(6),'#eed39a');rect(x,xx-q(4),yy-q(38),q(10),q(2),'#526452');
    }
    // Flowers and resting toys refer to landmarks in the playable park.
    for(const [a,b] of [[.08,.94],[.88,.91]]){
      disk(x,W*a,H*b,q(32),q(9),'#405f4f');
      for(let i=0;i<24;i++){const xx=W*a+q((r()-.5)*53),yy=H*b-q(r()*12);line(x,xx,yy+q(4),xx,yy,'#6c865d');rect(x,xx-q(1),yy,q(3),q(2),i%2?'#e2ba83':'#dba290');}
    }
    disk(x,W*.77,H*.88,q(7),q(2),'#d69768');rect(x,W*.77-q(3),H*.88,q(6),1,'#f0c39a');
    disk(x,W*.26,H*.84,q(3),q(3),'#d1c589');rect(x,W*.26,H*.84-q(2),q(2),q(2),'#e9dfb5');
  }
  function parkWalk(x,t){
    // Keep both companions inside the cropped park on a portrait phone.
    const center=viewW<W*.65?.48:.56,span=Math.min(.16,viewW/W*.18);
    const phase=t*.13,dir=Math.cos(phase)>=0?1:-1,step=Math.sin(t*3),a=W*(center+span*Math.sin(phase)),b=H*.90;
    x.save();x.translate(Math.round(a),Math.round(b));x.scale(dir,1);
    disk(x,0,q(2),q(8),q(2),'#8a8268');
    line(x,q(-2),q(-10),q(-3+step*2),0,'#344f57');line(x,q(3),q(-10),q(4-step*2),0,'#344f57');
    rect(x,q(-5),q(-26),q(11),q(17),'#b98868');rect(x,q(-4),q(-26),q(9),q(3),'#d6aa7e');
    disk(x,q(1),q(-33),q(5),q(6),'#e5c39c');rect(x,q(-5),q(-40),q(11),q(4),'#5b6251');rect(x,q(-6),q(-37),q(14),q(2),'#71775a');
    line(x,q(5),q(-23),q(9),q(-15+step),'#dab38b');
    const dx=q(33+Math.sin(t*.8)*2),dy=q(1+Math.sin(t*3)*.4);
    line(x,q(9),q(-15+step),dx-q(9),dy-q(10),'#e0cfac');
    disk(x,dx,dy+q(1),q(14),q(2),'#8a8268');
    for(const [leg,offset] of [[-7,1],[5,-1]])line(x,dx+q(leg),dy-q(5),dx+q(leg+step*offset*2),dy+q(1),'#b68a54');
    disk(x,dx,dy-q(9),q(12),q(7),'#d5a463');rect(x,dx-q(2),dy-q(6),q(12),q(4),'#f0dcb0');disk(x,dx+q(11),dy-q(16),q(7),q(7),'#d5a463');
    poly(x,[[dx+q(6),dy-q(20)],[dx+q(5),dy-q(27)],[dx+q(12),dy-q(22)]],'#c38f56');
    rect(x,dx+q(12),dy-q(16),q(9),q(5),'#efd6a7');rect(x,dx+q(20),dy-q(16),q(2),q(2),'#3f5146');rect(x,dx+q(14),dy-q(20),1,1,'#334d44');
    line(x,dx+q(5),dy-q(11),dx+q(10),dy-q(10),'#648b87');line(x,dx-q(11),dy-q(11),dx-q(16),dy-q(17+Math.sin(t*4)*2),'#d5a463');
    x.restore();
  }
  function build(id){
    if(cache.has(id))return cache.get(id);
    const [base,x]=surface(W,H),r=random([...id].reduce((a,c)=>a+c.charCodeAt(0),0));
    if(id==='ming')ming(x,r);else if(id==='qin')qin(x,r);else if(id==='badminton')court(x,r);else if(id==='fish'||id==='defense')reef(x,r,id==='defense');else if(id==='qa'||id==='notes')library(x,r,id==='notes');else if(id==='algorithms')fireflyGarden(x,r);else if(id==='physics')physicsLab(x,r);else if(id==='beat')rhythm(x,r);else if(id==='dogwalk')park(x,r);else workshop(x,r);
    const particles=Array.from({length:160},()=>({x:r()*W,y:r()*H,p:r()*6.3,v:.4+r(),size:r()}));
    const [moving,mx]=surface(W,H);const value={base,moving,mx,particles,id,steps:id==='algorithms'?sortingSteps():null};cache.set(id,value);return value;
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
      for(let i=0;i<6;i++){
        const xx=((i*W*.23+t*q(.55+i*.08))%(W+q(110)))-q(80),yy=H*(.18+i*.035);
        x.globalAlpha=.10;rect(x,xx,yy,q(46+i*7),q(2),'#d7c8b8');
      }x.globalAlpha=1;
      for(let i=0;i<Math.min(n,24);i++){
        const p=particles[i],yy=H*.67+((p.y-t*q(.4*p.v)+H)%(H*.31));
        x.globalAlpha=.10+.15*Math.sin(t*.6+p.p)**2;rect(x,p.x,yy,1,1,'#d5b98d');
      }x.globalAlpha=1;
      for(const a of [.20,.80])glow(x,W*a,H*.686,q(20),'#edb978',light*(.24+.06*Math.sin(t*1.4+a*9)));
    }else if(id==='dogwalk'){
      for(let i=0;i<4;i++){
        const a=((W*(i*.28)+t*q(.8))%(W+q(90)))-q(70),b=H*(.12+i*.04);
        x.globalAlpha=.12;rect(x,a,b,q(45+i*8),q(3),'#fff0cf');rect(x,a+q(12),b-q(2),q(26),q(2),'#fff0cf');
      }x.globalAlpha=1;
      const fx=W*.17,fy=H*.80;
      for(const side of [-1,1])for(let i=0;i<12;i++){
        const f=i/12,yy=fy-q(37)+q(f*35),xx=fx+side*q(Math.sin(f*Math.PI*.65)*24);
        rect(x,xx+Math.sin(t*2+i)*q(.6),yy,1,q(2),i%3?'#c5ded1':'#94bcb2');
      }
      for(const a of [.10,.87])glow(x,W*a,H*(a===.10?.67:.70)-q(42),q(23),'#edcd91',light*.24);
      for(let i=0;i<Math.min(n,40);i++){
        const p=particles[i],a=(p.x+Math.sin(t*.4+p.p)*q(10)+t*q(p.v*.3))%W,b=H*.48+(p.y+t*q(.7*p.v))%(H*.49);
        x.globalAlpha=.18+.2*Math.sin(t+p.p)**2;rect(x,a,b,q(1+p.size),1,i%4?'#e1d6a1':'#d69d78');
      }x.globalAlpha=1;parkWalk(x,t);
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
    }else if(id==='algorithms'||id==='physics'){
      if(id==='algorithms')fireflySignal(x,t,light,scene.steps);
      else{
        const a=W*.19,b=H*.78,angle=Math.sin(t*1.3)*.45;
        const px=a+Math.sin(angle)*q(48),py=b-q(82)+Math.cos(angle)*q(48);
        line(x,a,b-q(82),px,py,'#ddd0b1');disk(x,px,py,q(6),q(6),'#bfa477');
        const f=(t*.18)%1;
        for(let i=0;i<40;i++){const u=i/39;rect(x,W*(.32+.4*u),H*(.70-.32*4*u*(1-u)),1,1,'#749398');}
        disk(x,W*(.32+.4*f),H*(.70-.32*4*f*(1-f)),q(3),q(3),'#ebc89a');
      }
      for(let i=0;i<n*.4;i++){const p=particles[i];x.globalAlpha=.12+.14*Math.sin(t*.7+p.p)**2;rect(x,(p.x+t*q(.2*p.v))%W,H*.30+(p.y+t*q(.3))%(H*.65),1,1,'#d9c5a1');}x.globalAlpha=1;
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

;
/* js/algo-vis-engine.js */
/**
 * algo-engine.js — 算法动图 Algo-Vis 共享动画引擎
 * 供 VS Code 扩展 Webview、Obsidian 插件、网页版共同复用。
 * 职责：识别算法 → 生成演示步骤 → 渲染播放。
 * 导出：AlgoEngine（UMD 风格，兼容 importScripts / CommonJS / 全局变量）
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AlgoEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ===== 算法识别 ===== */
  var ALGOS = [
    { id: "bubble", zh: "冒泡排序", en: "bubble sort", test: /a\s*\[\s*j\s*\]\s*[<>]\s*a\s*\[\s*j\s*\+\s*1\s*\]|a\[j\]\s*>\s*a\[j\+1\]|bubble/i },
    { id: "select", zh: "选择排序", en: "selection sort", test: /min\s*=\s*i|select/i },
    { id: "insert", zh: "插入排序", en: "insertion sort", test: /key\s*=\s*a\s*\[\s*i\s*\]|insert/i },
    { id: "quick", zh: "快速排序", en: "quicksort", test: /quick\s*sort|partition|quick/i },
    { id: "merge", zh: "归并排序", en: "merge sort", test: /merge\s*sort|mergeSort|merge\s*\(/i },
    { id: "heap", zh: "堆排序", en: "heapsort", test: /heap\s*sort|heapify|heap/i },
    { id: "counting", zh: "计数排序", en: "counting sort", test: /counting\s*sort|count\s*sort|counting/i },
    { id: "shell", zh: "希尔排序", en: "shell sort", test: /shell\s*sort|shell/i },
    { id: "binary", zh: "二分查找", en: "binary search", test: /mid\s*=\s*\(\s*l\s*\+\s*r\s*\)|binary|half/i },
    { id: "window", zh: "滑动窗口", en: "sliding window", test: /a\s*\[\s*i\s*-\s*k\s*\]|window|slide/i },
    { id: "prime", zh: "试除法判素数", en: "prime trial", test: /i\s*\*\s*i\s*<=\s*n|prime|素数/i },
    { id: "factor", zh: "质因数分解", en: "prime factors", test: /x\s*%\s*i\s*==\s*0|factor|分解/i },
    { id: "gcd", zh: "辗转相除 GCD", en: "gcd", test: /gcd|%\s*b|取模/i },
    { id: "fib", zh: "斐波那契数列", en: "fibonacci", test: /fib|f\s*\[\s*i\s*\]\s*=\s*f\s*\[\s*i\s*-\s*1\s*\]\s*\+\s*f\s*\[\s*i\s*-\s*2\s*\]/i },
  ];

  function detectAlgorithm(code) {
    if (!code) return { id: "step", zh: "代码步进模式", en: "step mode" };
    var c = String(code);
    for (var i = 0; i < ALGOS.length; i++) {
      if (ALGOS[i].test.test(c)) return ALGOS[i];
    }
    return { id: "step", zh: "代码步进模式", en: "step mode" };
  }

  /* ===== 算法目的说明（播放器标题下展示，让用户知道在做什么/找什么） ===== */
  var GOALS = {
    bubble: "目标：把无序数组从小到大排序",
    select: "目标：每轮选出最小值放到已排序区末尾",
    insert: "目标：逐个取出元素，插入到已排序区正确位置",
    quick: "目标：选基准 pivot 分区，递归排序左右区间",
    merge: "目标：两两归并有序区间，最终完成排序",
    heap: "目标：利用大顶堆，逐个取出最大值完成排序",
    counting: "目标：统计每个值的出现次数，按值从小到大回填",
    shell: "目标：按间隔 gap 分组插入排序，逐步缩小间隔",
    binary: "目标：在有序数组中查找数字 7",
    window: "目标：求定长滑动窗口的最大（和）",
    prime: "目标：判断一个数是否为素数",
    factor: "目标：把一个数分解为质因数的乘积",
    gcd: "目标：用辗转相除法求两数的最大公约数",
    fib: "目标：生成斐波那契数列",
    step: "目标：逐行模拟代码执行过程",
  };

  /* ===== 默认演示输入 ===== */
  var DEFAULT_ARR = [6, 2, 9, 1, 5];

  /* ===== 步骤生成器 ===== */
  function genBubble(arr) {
    var a = arr.slice(), n = a.length, steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    push("目标：把数组从小到大排序。初始数组：" + a.join(" "));
    for (var i = 0; i < n - 1; i++) {
      for (var j = 0; j < n - 1 - i; j++) {
        push("比较 a[" + j + "]=" + a[j] + " 与 a[" + (j + 1) + "]=" + a[j + 1], { cmp: [j, j + 1] });
        if (a[j] > a[j + 1]) {
          var t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
          push("a[" + j + "] > a[" + (j + 1) + "]，交换位置", { swap: [j, j + 1] });
        }
      }
      var sorted = [];
      for (var k = n - 1 - i; k < n; k++) sorted.push(k);
      push("第 " + (i + 1) + " 轮结束，末尾 " + (i + 1) + " 个元素已就位", { sorted: sorted });
    }
    var all = [];
    for (var m = 0; m < n; m++) all.push(m);
    push("排序完成：" + a.join(" "), { sorted: all });
    return steps;
  }

  function genSelect(arr) {
    var a = arr.slice(), n = a.length, steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    push("目标：每轮选出最小值放到前面。初始数组：" + a.join(" "));
    for (var i = 0; i < n - 1; i++) {
      var min = i;
      push("第 " + (i + 1) + " 轮：假设 a[" + min + "]=" + a[min] + " 为当前最小值", { cmp: [min] });
      for (var j = i + 1; j < n; j++) {
        push("比较 a[" + j + "]=" + a[j] + " 与当前最小值 a[" + min + "]=" + a[min], { cmp: [min, j] });
        if (a[j] < a[min]) { min = j; push("发现更小值：a[" + min + "]=" + a[min], { cmp: [min] }); }
      }
      if (min !== i) {
        var t = a[i]; a[i] = a[min]; a[min] = t;
        push("交换 a[" + i + "] 与 a[" + min + "]，最小值就位", { swap: [i, min], sorted: [i] });
      } else {
        push("a[" + i + "] 已是最小值，无需交换", { sorted: [i] });
      }
    }
    var all = [];
    for (var k = 0; k < n; k++) all.push(k);
    push("排序完成：" + a.join(" "), { sorted: all });
    return steps;
  }

  function genInsert(arr) {
    var a = arr.slice(), n = a.length, steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    push("目标：逐个取出元素插入到已排序区。初始数组：" + a.join(" "));
    for (var i = 1; i < n; i++) {
      var key = a[i], j = i - 1;
      push("取出 key=a[" + i + "]=" + key + "，向左寻找插入位置", { cmp: [i] });
      while (j >= 0 && a[j] > key) {
        push("a[" + j + "]=" + a[j] + " > key=" + key + "，后移一位", { cmp: [j, j + 1] });
        a[j + 1] = a[j]; j--;
        push("a[" + (j + 1) + "] 已后移", { swap: [j + 1, j + 2].filter(function (x) { return x >= 0 && x < n; }) });
      }
      a[j + 1] = key;
      push("key=" + key + " 插入到 a[" + (j + 1) + "]", { sorted: [j + 1] });
    }
    var all = [];
    for (var k = 0; k < n; k++) all.push(k);
    push("排序完成：" + a.join(" "), { sorted: all });
    return steps;
  }

  function genQuick(arr) {
    var a = arr.slice(), steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    push("目标：选基准分区，递归排序。初始数组：" + a.join(" "));
    (function qs(l, r) {
      if (l >= r) return;
      var pivot = a[r], i = l - 1;
      push("选基准 pivot=a[" + r + "]=" + pivot + "，区间 [" + l + "," + r + "]", { cmp: [r], pointers: { l: l, r: r, pivot: r } });
      for (var j = l; j < r; j++) {
        push("比较 a[" + j + "]=" + a[j] + " 与 pivot=" + pivot, { cmp: [j, r], pointers: { l: l, r: r, pivot: r } });
        if (a[j] < pivot) {
          i++;
          if (i !== j) {
            var t = a[i]; a[i] = a[j]; a[j] = t;
            push("a[" + j + "] < pivot，交换到左区 a[" + i + "]", { swap: [i, j], pointers: { l: l, r: r, pivot: r } });
          }
        }
      }
      var t2 = a[i + 1]; a[i + 1] = a[r]; a[r] = t2;
      push("pivot 归位到 a[" + (i + 1) + "]，左小右大", { swap: [i + 1, r], sorted: [i + 1], pointers: { l: l, r: r } });
      qs(l, i);
      qs(i + 2, r);
    })(0, a.length - 1);
    var all = [];
    for (var k = 0; k < a.length; k++) all.push(k);
    push("排序完成：" + a.join(" "), { sorted: all });
    return steps;
  }

  function genMerge(arr) {
    var a = arr.slice(), n = a.length, steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    push("目标：两两归并有序区间完成排序。初始数组：" + a.join(" "));
    (function ms(l, r) {
      if (l >= r) return;
      var m = (l + r) >> 1;
      push("分割区间 [" + l + "," + r + "] → 左 [" + l + "," + m + "] 右 [" + (m + 1) + "," + r + "]", { cmp: [l, r], pointers: { l: l, r: r, mid: m } });
      ms(l, m); ms(m + 1, r);
      var left = a.slice(l, m + 1), right = a.slice(m + 1, r + 1), i = 0, j = 0, k = l;
      var tmp = a.slice();
      while (i < left.length && j < right.length) {
        push("比较左区 " + left[i] + " 与右区 " + right[j], { cmp: [l + i, m + 1 + j], pointers: { l: l, r: r, mid: m } });
        if (left[i] <= right[j]) { tmp[k] = left[i]; push("取较小值 " + left[i] + " 写入 a[" + k + "]", { swap: [k], pointers: { l: l, r: r, mid: m } }); i++; }
        else { tmp[k] = right[j]; push("取较小值 " + right[j] + " 写入 a[" + k + "]", { swap: [k], pointers: { l: l, r: r, mid: m } }); j++; }
        k++;
      }
      while (i < left.length) { tmp[k] = left[i]; push("剩余左区 " + left[i] + " 直接并入 a[" + k + "]", { swap: [k], pointers: { l: l, r: r, mid: m } }); i++; k++; }
      while (j < right.length) { tmp[k] = right[j]; push("剩余右区 " + right[j] + " 直接并入 a[" + k + "]", { swap: [k], pointers: { l: l, r: r, mid: m } }); j++; k++; }
      for (var x = l; x <= r; x++) a[x] = tmp[x];
      var sorted = [];
      for (var y = l; y <= r; y++) sorted.push(y);
      push("区间 [" + l + "," + r + "] 归并完成：[" + a.slice(l, r + 1).join(" ") + "]", { sorted: sorted, pointers: { l: l, r: r } });
    })(0, n - 1);
    var all = [];
    for (var k = 0; k < n; k++) all.push(k);
    push("排序完成：" + a.join(" "), { sorted: all });
    return steps;
  }

  function genHeap(arr) {
    var a = arr.slice(), n = a.length, steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    push("目标：建大顶堆逐出最大值。初始数组：" + a.join(" "));
    function heapify(i, size) {
      var l = 2 * i + 1, r = 2 * i + 2, largest = i;
      if (l < size) {
        push("比较 a[" + i + "]=" + a[i] + " 与左子 a[" + l + "]=" + a[l], { cmp: [i, l] });
        if (a[l] > a[largest]) largest = l;
      }
      if (r < size) {
        push("比较当前最大 a[" + largest + "]=" + a[largest] + " 与右子 a[" + r + "]=" + a[r], { cmp: [largest, r] });
        if (a[r] > a[largest]) largest = r;
      }
      if (largest !== i) {
        var t = a[i]; a[i] = a[largest]; a[largest] = t;
        push("a[" + i + "] 与 a[" + largest + "] 交换（下沉）", { swap: [i, largest] });
        heapify(largest, size);
      }
    }
    push("建大顶堆：从最后一个非叶节点开始向下调整", {});
    for (var i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(i, n);
    push("大顶堆构建完成，堆顶为最大值", { cmp: [0] });
    for (var end = n - 1; end > 0; end--) {
      var t = a[0]; a[0] = a[end]; a[end] = t;
      push("堆顶 a[0]=" + a[end] + " 与末尾 a[" + end + "] 交换，最大值就位", { swap: [0, end], sorted: [end] });
      heapify(0, end);
    }
    var all = [];
    for (var k = 0; k < n; k++) all.push(k);
    push("排序完成：" + a.join(" "), { sorted: all });
    return steps;
  }

  function genCounting(arr) {
    var a = arr.slice(), n = a.length, steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    var mx = 0, mn = 0;
    for (var i = 0; i < n; i++) { if (a[i] > mx) mx = a[i]; if (a[i] < mn) mn = a[i]; }
    push("目标：统计出现次数并按值回填。初始数组：" + a.join(" "), {});
    push("统计每个值的出现次数（值域 " + mn + "~" + mx + "）", {});
    var freq = {};
    for (var j = 0; j < n; j++) freq[a[j]] = (freq[a[j]] || 0) + 1;
    var keys = Object.keys(freq).map(Number).sort(function (x, y) { return x - y; });
    var filled = [], idx = 0;
    for (var k = 0; k < keys.length; k++) {
      var v = keys[k];
      push("值 " + v + " 出现 " + freq[v] + " 次，回填到数组", { cmp: [idx] });
      for (var c = 0; c < freq[v]; c++) {
        a[idx] = v; filled.push(idx); idx++;
      }
      push("值 " + v + " 回填完成", { sorted: filled.slice() });
    }
    push("排序完成：" + a.join(" "), { sorted: (function () { var s = []; for (var x = 0; x < n; x++) s.push(x); return s; })() });
    return steps;
  }

  function genShell(arr) {
    var a = arr.slice(), n = a.length, steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    push("目标：按间隔分组插入排序。初始数组：" + a.join(" "));
    for (var gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
      push("设置间隔 gap=" + gap + "，分组做插入排序", {});
      for (var i = gap; i < n; i++) {
        var key = a[i], j = i - gap;
        push("组内取出 a[" + i + "]=" + key + "（gap=" + gap + "）", { cmp: [i] });
        while (j >= 0 && a[j] > key) {
          push("a[" + j + "]=" + a[j] + " > key，后移", { cmp: [j, j + gap] });
          a[j + gap] = a[j]; j -= gap;
        }
        a[j + gap] = key;
        push("key 插入 a[" + (j + gap) + "]", { swap: [j + gap] });
      }
      push("gap=" + gap + " 轮结束", {});
    }
    var all = [];
    for (var k = 0; k < n; k++) all.push(k);
    push("排序完成：" + a.join(" "), { sorted: all });
    return steps;
  }

  function genBinary(arr, target) {
    var a = (arr && arr.length) ? arr.slice() : [1, 3, 5, 7, 9, 11];
    var steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    var t = target === undefined || target === null ? 7 : Number(target);
    push("目标：在有序数组 [ " + a.join(" ") + " ] 中查找数字 " + t, {});
    var l = 0, r = a.length - 1;
    push("查找区间 [l=0, r=" + r + "]，目标 target=" + t, { pointers: { l: l, r: r } });
    while (l <= r) {
      var mid = (l + r) >> 1;
      push("取 mid=(l+r)/2=" + mid + "，a[" + mid + "]=" + a[mid], { cmp: [mid], pointers: { l: l, r: r, mid: mid } });
      if (a[mid] === t) { push("命中！a[" + mid + "]=" + t + " == target", { sorted: [mid], pointers: { l: l, r: r, mid: mid } }); return steps; }
      if (a[mid] < t) { l = mid + 1; push("a[" + mid + "] < target，左边界 l 移到 " + l, { pointers: { l: l, r: r } }); }
      else { r = mid - 1; push("a[" + mid + "] > target，右边界 r 移到 " + r, { pointers: { l: l, r: r } }); }
    }
    push("区间耗尽，未找到 target=" + t, {});
    return steps;
  }

  function genWindow(arr, k) {
    var a = arr.slice(), n = a.length, steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    var w = k === undefined || k === null ? 3 : Number(k);
    push("目标：求长度 k=" + w + " 的滑动窗口最大和。数组：" + a.join(" "), {});
    if (n < w) { push("数组长度小于窗口，无法滑动", {}); return steps; }
    var winIdx = function (s2, e2) { var r2 = []; for (var x2 = s2; x2 <= e2; x2++) r2.push(x2); return r2; };
    var sum = 0, max = -Infinity, maxIdx = 0;
    for (var i = 0; i < w; i++) { sum += a[i]; }
    max = sum;
    push("初始窗口 [0," + (w - 1) + "] 和为 " + sum, { cmp: winIdx(0, w - 1), pointers: { l: 0, r: w - 1 } });
    for (var j = w; j < n; j++) {
      var out = a[j - w], inw = a[j];
      push("窗口右移：滑出 a[" + (j - w) + "]=" + out + "，滑入 a[" + j + "]=" + inw, { cmp: winIdx(j - w + 1, j), pointers: { l: j - w + 1, r: j } });
      sum = sum - out + inw;
      if (sum > max) { max = sum; maxIdx = j - w + 1; push("新最大值 " + sum + "（窗口起点 " + maxIdx + "）", { sorted: winIdx(j - w + 1, j), pointers: { l: j - w + 1, r: j } }); }
      else { push("窗口和 " + sum + "，未超过最大值 " + max, { cmp: winIdx(j - w + 1, j), pointers: { l: j - w + 1, r: j } }); }
    }
    push("滑动结束，最大窗口和=" + max + "（起点 " + maxIdx + "）", {});
    return steps;
  }

  function genPrime(arr, n) {
    var steps = [];
    var push2 = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: n === undefined ? [] : [n] }); };
    var v = n === undefined || n === null ? 29 : Number(n);
    push2("目标：判断 " + v + " 是否为素数", { cmp: [] });
    if (v < 2) { push2(v + " < 2，不是素数", { sorted: [] }); return steps; }
    push2("只需试除到 √" + v + " = " + Math.floor(Math.sqrt(v)), {});
    for (var i = 2; i * i <= v; i++) {
      push2("试除 i=" + i + "：i*i=" + (i * i) + " ≤ " + v, { cmp: [] });
      if (v % i === 0) { push2(v + " 能被 " + i + " 整除，不是素数", { sorted: [] }); return steps; }
      push2(v + " 不能被 " + i + " 整除，继续", {});
    }
    push2(v + " 是素数！", { sorted: [] });
    return steps;
  }

  function genFactor(arr, n) {
    var steps = [];
    var push2 = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: n === undefined ? [] : [n] }); };
    var v = n === undefined || n === null ? 84 : Number(n);
    push2("目标：将 " + v + " 分解为质因数乘积", {});
    var x = v, factors = [];
    push2("先除尽所有因子 2", {});
    while (x % 2 === 0) { factors.push(2); x /= 2; push2("取出质因数 2，剩余 x=" + x, { sorted: [] }); }
    for (var i = 3; i * i <= x; i += 2) {
      while (x % i === 0) { factors.push(i); x /= i; push2("取出质因数 " + i + "，剩余 x=" + x, { sorted: [] }); }
    }
    if (x > 1) { factors.push(x); push2("剩余 x=" + x + " 本身是质因数", { sorted: [] }); }
    push2(v + " = " + factors.join(" × "), { sorted: [] });
    return steps;
  }

  function genGcd(arr, ab) {
    var steps = [];
    var push2 = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: [] }); };
    var p = ab || [84, 36];
    var a = p[0], b = p[1];
    push2("目标：求 gcd(" + a + ", " + b + ") 最大公约数", {});
    while (b !== 0) {
      var r = a % b;
      push2(a + " % " + b + " = " + r, {});
      a = b; b = r;
      push2("更新：a=" + a + "，b=" + b, {});
    }
    push2("余数为 0，gcd = " + a, { sorted: [] });
    return steps;
  }

  function genFib(arr, n) {
    var steps = [];
    var push2 = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: [] }); };
    var v = n === undefined || n === null ? 10 : Number(n);
    push2("目标：生成前 " + v + " 项斐波那契数列", {});
    var f = [0, 1], idx = 0;
    push2("f[0]=0", { sorted: [] });
    push2("f[1]=1", { sorted: [] });
    for (var i = 2; i < v; i++) {
      f.push(f[i - 1] + f[i - 2]);
      push2("f[" + i + "] = f[" + (i - 1) + "] + f[" + (i - 2) + "] = " + f[i], { sorted: [] });
    }
    push2("数列：" + f.slice(0, v).join(" "), {});
    return steps;
  }

  /* 步进模式：简化版逐行模拟 */
  function genStep(code) {
    var lines = String(code).split("\n").filter(function (l) { return l.trim().length > 0; });
    var steps = [];
    for (var i = 0; i < lines.length; i++) {
      steps.push({ desc: "执行第 " + (i + 1) + " 行：" + lines[i].trim(), marks: { line: i }, arr: [] });
    }
    steps.push({ desc: "代码执行完毕（步进模式）", marks: {}, arr: [] });
    return steps;
  }

  /* ===== 统一入口 ===== */
  function buildSteps(algoId, opts) {
    var arr = (opts && opts.arr) || DEFAULT_ARR;
    var target = opts && opts.target;
    switch (algoId) {
      case "bubble": return genBubble(arr);
      case "select": return genSelect(arr);
      case "insert": return genInsert(arr);
      case "quick": return genQuick(arr);
      case "merge": return genMerge(arr);
      case "heap": return genHeap(arr);
      case "counting": return genCounting(arr);
      case "shell": return genShell(arr);
      case "binary": return genBinary((opts && opts.arr && opts.arr !== DEFAULT_ARR) ? opts.arr : null, opts && opts.target);
      case "window": return genWindow(arr, opts && opts.k);
      case "prime": return genPrime(null, opts && opts.n);
      case "factor": return genFactor(null, opts && opts.n);
      case "gcd": return genGcd(null, opts && opts.ab);
      case "fib": return genFib(null, opts && opts.n);
      default: return genStep(opts && opts.code);
    }
  }

  return {
    ALGOS: ALGOS,
    GOALS: GOALS,
    DEFAULT_ARR: DEFAULT_ARR,
    detectAlgorithm: detectAlgorithm,
    buildSteps: buildSteps,
  };
});

;
/* js/algo-vis.js */
/* ============ Hero 实时演示：冒泡排序迷你播放器（互换动画 · 放慢速度） ============ */
(function(){
	var steps = AlgoEngine.buildSteps('bubble', {});
	var cellsEl=document.getElementById('demo-cells'),
		descEl=document.getElementById('demo-desc'),
		stepEl=document.getElementById('demo-step'),
		playBtn=document.getElementById('demo-play'),
		resetBtn=document.getElementById('demo-reset'),
		speedSel=document.getElementById('demo-speed');
	var idx=0,timer=null,speeds={'0.5x':2400,'1x':1400,'2x':700,'4x':350},cur=1400;
	var cellEls=[],arrLen=0;

	function ensureCells(n){
		if(n===arrLen)return;
		cellsEl.innerHTML='';cellEls=[];arrLen=n;
		for(var i=0;i<n;i++){
			var c=document.createElement('div');
			c.className='dcell';
			var val=document.createElement('span');val.textContent='';
			var small=document.createElement('small');small.textContent='['+i+']';
			c.appendChild(val);c.appendChild(small);
			cellsEl.appendChild(c);cellEls.push(c);
		}
	}
	function flipSwap(i,j){
        if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
        var a=cellEls[i],b=cellEls[j];if(!a||!b)return;
        var ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect(),dx=rb.left-ra.left,dy=rb.top-ra.top;
        var duration=Math.min(480,cur*.65);
        a.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'translate(0,0)'}],{duration:duration,easing:'ease-out'});
        b.animate([{transform:'translate('+(-dx)+'px,'+(-dy)+'px)'},{transform:'translate(0,0)'}],{duration:duration,easing:'ease-out'});
    }
	function render(){
        var previousBubble=cellsEl.querySelector('.demo-cmp-bubble');if(previousBubble)previousBubble.remove();
		var st=steps[idx],mk=st.marks||{};
		ensureCells(st.arr.length);
		st.arr.forEach(function(v,i){
			var c=cellEls[i];
			c.querySelector('span').textContent=v;
			c.className='dcell';
			if(mk.sorted&&mk.sorted.indexOf(i)>=0)c.className+=' d-sorted';
			if(mk.cmp&&mk.cmp.indexOf(i)>=0)c.className+=' d-cmp';
			if(mk.swap&&mk.swap.indexOf(i)>=0)c.className+=' d-swap';
			if(mk.cmp&&mk.cmp.length===2&&(i===mk.cmp[0]||i===mk.cmp[1]))c.className+=' d-move';
		});
		if(mk.swap&&mk.swap.length===2){
			var i0=mk.swap[0],j0=mk.swap[1];
			if(i0!==j0)flipSwap(i0,j0);
		}
		var oldP=document.querySelectorAll('.d-pointer');for(var pi=0;pi<oldP.length;pi++)oldP[pi].remove();
		var bubLeft=-1;
		if(mk.cmp&&mk.cmp.length===2){
			var oldB=document.querySelector('.demo-cmp-bubble');if(oldB)oldB.remove();
			bubLeft=Math.min(mk.cmp[0],mk.cmp[1]);
		}
		if(mk.pointers){
			var order={};
			for(var pk in mk.pointers){
				var idxv=mk.pointers[pk];
				if(order[idxv]===undefined)order[idxv]=0;
				var slot=order[idxv]++;
				var pd=document.createElement('div');
				pd.className='d-pointer d-pointer-'+pk;
				pd.textContent='▼ '+pk+'='+idxv;
				pd.style.left='-8px';
				pd.style.top=(-40-slot*22)+'px';
				cellEls[idxv].appendChild(pd);
			}
		}
		if(bubLeft>=0){
			var left=bubLeft,right=Math.max(mk.cmp[0],mk.cmp[1]);
			var bub=document.createElement('div');
			bub.className='demo-cmp-bubble';
			bub.textContent=st.arr[left]+' vs '+st.arr[right];
			bub.style.top='34px';
			bub.style.left=(left*60+8)+'px';
			bub.style.width=Math.max(70,(right-left)*60)+'px';
			cellsEl.appendChild(bub);
		}
		descEl.textContent=st.desc;
		stepEl.textContent='步骤 '+(idx+1)+' / '+steps.length+(idx>=steps.length-1?' · 已完成':'');
	}
	function stop(){if(timer){clearInterval(timer);timer=null;}cellEls.forEach(function(c){c.getAnimations().forEach(function(a){a.cancel();});});playBtn.textContent='播放';}
	function play(){stop();if(idx>=steps.length-1)idx=0;playBtn.textContent='暂停';timer=setInterval(function(){
		if(idx>=steps.length-1){stop();render();return;}
		idx++;render();
	},cur);}
	playBtn.addEventListener('click',function(){timer?stop():play();});
	resetBtn.addEventListener('click',function(){stop();idx=0;render();});
	speedSel.addEventListener('change',function(){cur=speeds[speedSel.value]||1400;if(timer)play();});
	document.getElementById('demo-next').addEventListener('click',function(){stop();idx=Math.min(idx+1,steps.length-1);render();});
	document.addEventListener('visibilitychange',function(){if(document.hidden)stop();});
	new IntersectionObserver(function(entries){if(!entries[0].isIntersecting)stop();}).observe(cellsEl);
	render();if(!matchMedia('(max-width:800px), (pointer:coarse), (prefers-reduced-motion: reduce)').matches && !navigator.connection?.saveData)play();
})();

;

/* ============ 算法卡片点击 → 弹窗动画演示（互换动画 + 目标栏） ============ */
(function(){
	var engine = AlgoEngine;
	var modal = document.getElementById('av-modal');
	var titleEl = document.getElementById('av-title');
	var goalEl = document.getElementById('av-goal');
	var cellsEl = document.getElementById('av-cells');
	var descEl = document.getElementById('av-desc');
	var stepEl = document.getElementById('av-step');
	var playBtn = document.getElementById('av-play');
	var resetBtn = document.getElementById('av-reset');
	var speedSel = document.getElementById('av-speed');
	var closeBtn = document.getElementById('av-close');
	var editBtn = document.getElementById('av-edit');
	var editPanel = document.getElementById('av-edit-panel');
	var editForm = document.getElementById('aep-form');
	var editCode = document.getElementById('aep-code');
	var editErr = document.getElementById('aep-err');
	var idx = 0, timer = null, cur = 1400;
	var speeds = {'0.5x':2400,'1x':1400,'2x':700,'4x':350};
	var steps = [], cellEls = [], arrLen = 0;
	var curAlgo = 'bubble', curOpts = {}, returnFocus=null;

	function ensureCells(n){
		if (n === arrLen) return;
		cellsEl.innerHTML = ''; cellEls = []; arrLen = n;
		for (var i = 0; i < n; i++){
			var c = document.createElement('div');
			c.className = 'av-cell';
			var val = document.createElement('span'); val.textContent = '';
			var small = document.createElement('small'); small.textContent = '[' + i + ']';
			c.appendChild(val); c.appendChild(small);
			cellsEl.appendChild(c); cellEls.push(c);
		}
	}
	function flipSwap(i,j){
        if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
        var a=cellEls[i],b=cellEls[j];if(!a||!b)return;
        var ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect(),dx=rb.left-ra.left,dy=rb.top-ra.top;
        var duration=Math.min(480,cur*.65);
        a.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'translate(0,0)'}],{duration:duration,easing:'ease-out'});
        b.animate([{transform:'translate('+(-dx)+'px,'+(-dy)+'px)'},{transform:'translate(0,0)'}],{duration:duration,easing:'ease-out'});
    }
	function render(){
        document.getElementById('av-progress').max=steps.length-1;document.getElementById('av-progress').value=idx;document.getElementById('av-previous').disabled=idx===0;document.getElementById('av-next').disabled=idx===steps.length-1;
		var st = steps[idx], mk = st.marks || {};
		if (st.arr && st.arr.length) {
			ensureCells(st.arr.length);
			st.arr.forEach(function(v, i){
				var c = cellEls[i];
				c.querySelector('span').textContent = v;
				c.className = 'av-cell';
				if (mk.sorted && mk.sorted.indexOf(i) >= 0) c.className += ' av-sorted';
				if (mk.cmp && mk.cmp.indexOf(i) >= 0) c.className += ' av-cmp';
				if (mk.swap && mk.swap.indexOf(i) >= 0) c.className += ' av-swap';
			});
			if (mk.swap && mk.swap.length === 2) {
				var i0 = mk.swap[0], j0 = mk.swap[1];
				if (i0 !== j0) flipSwap(i0, j0);
			}
			var oldP = document.querySelectorAll('.av-pointer'); for (var pi = 0; pi < oldP.length; pi++) oldP[pi].remove();
			var oldB = document.querySelector('.av-bubble'); if (oldB) oldB.remove();
			var bubLeft = -1;
			if (mk.cmp && mk.cmp.length === 2 && typeof st.arr[mk.cmp[0]] === 'number') {
				bubLeft = Math.min(mk.cmp[0], mk.cmp[1]);
			}
			if (mk.pointers) {
				var order = {};
				for (var pk in mk.pointers) {
					var idxv = mk.pointers[pk];
					if (order[idxv] === undefined) order[idxv] = 0;
					var slot = order[idxv]++;
					var pd = document.createElement('div');
					pd.className = 'av-pointer av-pointer-' + pk;
					pd.textContent = '▼ ' + pk + '=' + idxv;
					pd.style.left = '-8px';
					pd.style.top = (-40 - slot * 22) + 'px';
					cellEls[idxv].appendChild(pd);
				}
			}
			if (bubLeft >= 0) {
				var left = bubLeft, right = Math.max(mk.cmp[0], mk.cmp[1]);
				var bub = document.createElement('div');
				bub.className = 'av-bubble';
				bub.textContent = st.arr[left] + ' vs ' + st.arr[right];
				bub.style.top = '2px';
				bub.style.left = '8px';
				cellsEl.appendChild(bub);
			}
		} else {
			cellsEl.innerHTML = ''; cellEls = []; arrLen = 0;
			var e = document.createElement('div');
			e.className = 'av-empty';
			e.textContent = st.desc;
			cellsEl.appendChild(e);
		}
		descEl.textContent = st.desc;
		stepEl.textContent = '步骤 ' + (idx + 1) + ' / ' + steps.length + (idx >= steps.length - 1 ? ' · 已完成' : '');
	}
	function stop(){ if (timer) { clearInterval(timer); timer = null; } cellEls.forEach(function(c){c.getAnimations().forEach(function(a){a.cancel();});});playBtn.textContent = '播放'; }
	function play(){ stop(); if (idx >= steps.length - 1) idx = 0; playBtn.textContent = '暂停'; timer = setInterval(function(){
		if (idx >= steps.length - 1) { stop(); render(); return; }
		idx++; render();
	}, cur); }
	function open(algoId, zh){
        returnFocus=document.activeElement;
		titleEl.textContent = '算法动图 · ' + zh;
		goalEl.textContent = engine.GOALS[algoId] || '';
		curAlgo = algoId; curOpts = {};
		editPanel.classList.remove('open');
		editErr.textContent = '';
		steps = engine.buildSteps(algoId, curOpts);
		idx = 0; cellEls = []; arrLen = 0;
		modal.classList.add('open');
		document.body.style.overflow = 'hidden';
		render();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)play();
        closeBtn.focus();
	}
	function close(){ stop(); modal.classList.remove('open'); document.body.style.overflow = '';returnFocus?.focus(); }
	playBtn.addEventListener('click', function(){ timer ? stop() : play(); });
	resetBtn.addEventListener('click', function(){ stop(); idx = 0; render(); });
	speedSel.addEventListener('change', function(){ cur = speeds[speedSel.value] || 1400;if(timer)play(); });
    document.getElementById('av-next').addEventListener('click',function(){stop();idx=Math.min(idx+1,steps.length-1);render();});
    document.getElementById('av-previous').addEventListener('click',function(){stop();idx=Math.max(idx-1,0);render();});
    document.getElementById('av-progress').addEventListener('input',function(e){stop();idx=Number(e.target.value);render();});
    document.addEventListener('visibilitychange',function(){if(document.hidden)stop();});
    document.addEventListener('keydown',function(e){if(e.key!=='Tab'||!modal.classList.contains('open'))return;var focusable=[...modal.querySelectorAll('button,input,select,[tabindex]')].filter(function(el){return !el.disabled&&el.getClientRects().length;});var first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
	closeBtn.addEventListener('click', close);
	modal.addEventListener('click', function(e){ if (e.target === modal) close(); });

	/* ===== 修改数据：仅允许修改数字，不接收文件/脚本（防注入） ===== */
	var DATA_CODES = {
		bubble: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 6,2,9,1,5'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'}], code: `// 冒泡排序：每次比较相邻两数，把大的往后“冒”
var n = [[size]];                        // 【可改】数组大小（数组值留空时随机生成）
var a = [ [[arr]] ];                     // 【可改】数组值：逗号分隔，只允许数字
for (var i = 0; i < n - 1; i++) {        // 外层循环：共进行 n-1 轮
  for (var j = 0; j < n - 1 - i; j++) {  // 内层循环：比较相邻元素
    if (a[j] > a[j + 1]) {               // 逆序则交换
      var t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
    }
  }
}` },
		select: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 6,2,9,1,5'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'}], code: `// 选择排序：每轮选出未排序区的最小值放到最前
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值
for (var i = 0; i < n - 1; i++) {        // 外层：已排序区末尾位置
  var min = i;                           // 假设当前为最小值
  for (var j = i + 1; j < n; j++) {      // 内层：找真正最小值
    if (a[j] < a[min]) min = j;
  }
  var t = a[i]; a[i] = a[min]; a[min] = t;  // 交换到已排序区
}` },
		insert: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 6,2,9,1,5'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'}], code: `// 插入排序：像整理扑克牌，把每个元素插入已排序区
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值
for (var i = 1; i < n; i++) {            // 外层：从第 2 个元素开始
  var key = a[i], j = i - 1;             // 取出待插入元素
  while (j >= 0 && a[j] > key) {         // 在已排序区中找插入位置
    a[j + 1] = a[j]; j--;                // 元素后移
  }
  a[j + 1] = key;                        // 插入到正确位置
}` },
		quick: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 6,2,9,1,5'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'}], code: `// 快速排序：选基准 pivot，分区后递归排序
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值
function sort(l, r) {                    // 递归：排序区间 [l, r]
  if (l >= r) return;
  var pivot = a[r], i = l;               // 取末尾为基准 pivot
  for (var j = l; j < r; j++) {          // 分区：小于 pivot 放左边
    if (a[j] < pivot) { swap(i, j); i++; }
  }
  swap(i, r);                            // pivot 归位
  sort(l, i - 1); sort(i + 1, r);        // 递归排序左右区间
}` },
		merge: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 6,2,9,1,5'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'}], code: `// 归并排序：分而治之，两两合并有序区间
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值
function sort(l, r) {                    // 递归：排序区间 [l, r]
  if (l >= r) return;
  var m = (l + r) >> 1;                  // 中间位置
  sort(l, m); sort(m + 1, r);            // 分别排序两半
  merge(l, m, r);                        // 合并两个有序区间
}` },
		heap: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 6,2,9,1,5'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'}], code: `// 堆排序：建大顶堆，反复取出最大值
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值
for (var i = (n >> 1) - 1; i >= 0; i--) heapify(i, n);  // 从最后一个非叶节点开始建堆
for (var i = n - 1; i > 0; i--) {        // 逐个取出堆顶最大值
  swap(0, i); heapify(0, i);             // 堆顶换到末尾，重新调整
}` },
		counting: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 3,1,2,1,3'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'}], code: `// 计数排序：统计每个值的出现次数，按值回填
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值（建议非负整数）
var max = Math.max.apply(null, a);       // 找最大值
var cnt = new Array(max + 1).fill(0);    // 计数数组
for (var i = 0; i < n; i++) cnt[a[i]]++; // 统计出现次数
var k = 0;
for (var v = 0; v <= max; v++)           // 按值从小到大回填
  while (cnt[v]--) a[k++] = v;` },
		shell: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 6,2,9,1,5'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'}], code: `// 希尔排序：按间隔分组插入排序，间隔逐步缩小
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值
for (var gap = n >> 1; gap > 0; gap >>= 1) {  // 间隔每次折半
  for (var i = gap; i < n; i++) {        // 对每组做插入排序
    var key = a[i], j = i - gap;
    while (j >= 0 && a[j] > key) { a[j + gap] = a[j]; j -= gap; }
    a[j + gap] = key;
  }
}` },
		binary: { params: [{key:'arr',label:'数组值（逗号分隔，需有序）',ph:'如 1,3,5,7,9,11'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'},{key:'target',label:'要找的数 target',ph:'整数'}], code: `// 二分查找：在有序数组中查找目标值 target
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值（需升序有序）
var target = [[target]];                 // 【可改】要找的数
var l = 0, r = n - 1;                    // 左右边界
while (l <= r) {                         // 区间不为空就继续
  var mid = (l + r) >> 1;                // 取中间位置
  if (a[mid] === target) return mid;     // 命中
  if (a[mid] < target) l = mid + 1;      // 去右半区找
  else r = mid - 1;                      // 去左半区找
}
return -1;                               // 未找到` },
		window: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 2,1,5,1,3,2'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'},{key:'k',label:'窗口大小 k',ph:'1~数组长度'}], code: `// 滑动窗口：求定长 k 窗口的最大（和）
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值
var k = [[k]];                           // 【可改】窗口大小
var sum = 0;
for (var i = 0; i < k; i++) sum += a[i]; // 初始窗口求和
var best = sum;                          // 记录最大值
for (var i = k; i < n; i++) {            // 窗口向右滑动
  sum += a[i] - a[i - k];                // 加入新元素、去掉旧元素
  best = Math.max(best, sum);            // 更新最大值
}` },
		prime: { params: [{key:'n',label:'要判断的数 n',ph:'2~999 的整数'}], code: `// 试除法判素数：判断 n 是否为素数
var n = [[n]];                           // 【可改】要判断的数
if (n < 2) return false;                 // 0、1 不是素数
for (var i = 2; i * i <= n; i++)         // 只需试除到 sqrt(n)
  if (n % i === 0) return false;         // 有因子则非素数
return true;                             // 无因子则为素数` },
		factor: { params: [{key:'n',label:'要分解的数 n',ph:'2~999 的整数'}], code: `// 质因数分解：把 n 分解为质因数的乘积
var n = [[n]];                           // 【可改】要分解的数
var factors = [];
for (var i = 2; i * i <= n; i++)         // 从小到大试除
  while (n % i === 0) { factors.push(i); n /= i; }
if (n > 1) factors.push(n);              // 剩余的大质因子
return factors;` },
		gcd: { params: [{key:'ab',label:'两个数 a, b（逗号分隔）',ph:'如 24,18'}], code: `// 辗转相除法：求 a 和 b 的最大公约数
var a = [[a]];                           // 【可改】第一个数
var b = [[b]];                           // 【可改】第二个数
while (b !== 0) {                        // 余数为 0 时终止
  var t = a % b; a = b; b = t;           // 辗转相除
}
return a;                                // 最后的 a 即最大公约数` },
		fib: { params: [{key:'n',label:'项数 n',ph:'2~79 的整数'}], code: `// 斐波那契数列：生成前 n 项
var n = [[n]];                           // 【可改】项数
var f = [0, 1];
for (var i = 2; i < n; i++)              // 每项等于前两项之和
  f[i] = f[i - 1] + f[i - 2];
return f;` },
	};

	function escHtml(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

	function openEdit(id){
		var spec = DATA_CODES[id];
		if (!spec) { editErr.textContent = '该算法暂不支持自定义数据'; return; }
		editErr.textContent = '';
		var curArr = (steps[0] && steps[0].arr) || [];
		var defT = curArr.indexOf(7) >= 0 ? 7 : (curArr[Math.floor(curArr.length / 2)] || 7);
		var defaults = { arr: curArr.join(','), size: curArr.length, target: defT, k: 3, n: 12, ab: '24,18' };
		var abp = String(defaults.ab).split(',');
		defaults.a = abp[0].trim(); defaults.b = abp[1].trim();
		var html = '';
		spec.params.forEach(function(p){
			html += '<label for="aep_in_' + p.key + '">' + p.label + '</label><input id="aep_in_' + p.key + '" type="text" value="' + escHtml(defaults[p.key]) + '" placeholder="' + escHtml(p.ph || '') + '">';
		});
		editForm.innerHTML = html;
		renderCode(id, defaults);
		editPanel.classList.add('open');
	}

	function renderCode(id, vals){
		var code = DATA_CODES[id].code;
		for (var k in vals) {
			code = code.split('[[' + k + ']]').join('<b class="dv">' + escHtml(vals[k]) + '</b>');
		}
		editCode.innerHTML = '<pre>' + code + '</pre>';
	}

	function applyEdit(){
		var id = curAlgo, spec = DATA_CODES[id];
		var errs = [];
		function gi(k){ var el = document.getElementById('aep_in_' + k); return el ? el.value.trim() : ''; }
		function intVal(v, name, lo, hi){
			if (!/^-?\d+$/.test(v)) { errs.push(name + ' 需为整数'); return null; }
			var x = parseInt(v, 10);
			if (x < lo || x > hi) { errs.push(name + ' 需在 ' + lo + '~' + hi + ' 之间'); return null; }
			return x;
		}
		var opts = {};
		var rawArr = gi('arr'), arr = null;
		if (rawArr) {
			var parts = rawArr.split(',');
			if (parts.length < 2 || parts.length > 15) errs.push('数组长度需在 2~15 之间');
			arr = [];
			for (var i = 0; i < parts.length; i++) {
				var pv = parts[i].trim();
				if (!/^-?\d+$/.test(pv)) { errs.push('数组只能包含整数，如 6,2,9,1,5'); break; }
				var vv = parseInt(pv, 10);
				if (vv < -99 || vv > 999) { errs.push('数组值需在 -99~999 之间'); break; }
				arr.push(vv);
			}
		} else if(spec.params.some(function(p){return p.key==='size';})) {
			var sz = intVal(gi('size'), '数组大小', 2, 15);
			if (sz !== null) {
				arr = [];
				if (id === 'binary') {
					var bv = Math.floor(Math.random() * 5) + 1;
					for (var j = 0; j < sz; j++) { arr.push(bv); bv += Math.floor(Math.random() * 3) + 1; }
				} else {
					for (var j = 0; j < sz; j++) arr.push(Math.floor(Math.random() * 20) + 1);
				}
			}
		}
		if (arr) opts.arr = arr;
		if(errs.length){editErr.textContent=errs.join('；');return;}
        var keys = spec.params.map(function(p){ return p.key; });
		if (keys.indexOf('target') >= 0) {
			var tRaw = gi('target');
			var t = intVal(tRaw, '要找的数 target', -999, 999);
			if (t !== null) {
				if (tRaw === '7' && arr.indexOf(7) < 0) {
					var midV = arr[Math.floor(arr.length / 2)] || 0;
					opts.target = midV;
					var ti = document.getElementById('aep_in_target');
					if (ti) ti.value = String(midV);
					editErr.textContent = '提示：目标 7 不在新数组中，已自动改为数组中的 ' + midV;
				} else {
					opts.target = t;
					if (arr.indexOf(t) < 0) editErr.textContent = '提示：目标 ' + t + ' 不在数组中，将演示“查找失败”的过程';
				}
			}
		}
		if (keys.indexOf('k') >= 0) {
			var k = intVal(gi('k'), '窗口大小 k', 1, (arr || []).length || 1);
			if (k !== null) opts.k = k;
		}
		if (keys.indexOf('n') >= 0) {
			var n = intVal(gi('n'), 'n', 2, id==='fib'?79:999);
			if (n !== null) opts.n = n;
		}
		if (keys.indexOf('ab') >= 0) {
			var ab = gi('ab').split(',');
			if (ab.length !== 2 || !/^-?\d+$/.test(ab[0].trim()) || !/^-?\d+$/.test(ab[1].trim())) errs.push('需输入两个整数，如 24,18');
			else {var aa=Number(ab[0]),bb=Number(ab[1]);if(!Number.isSafeInteger(aa)||!Number.isSafeInteger(bb)||Math.abs(aa)>999999999||Math.abs(bb)>999999999)errs.push('两个整数的绝对值不得超过 999999999');else opts.ab=[Math.abs(aa),Math.abs(bb)];}
		}
		if (errs.length) { editErr.textContent = errs.join('；'); return; }
		curOpts = opts;
		steps = engine.buildSteps(id, curOpts);
		idx = 0; cellEls = []; arrLen = 0;
		var g = engine.GOALS[id] || '';
		if (id === 'binary' && opts.target !== undefined) g = '目标：在有序数组中查找数字 ' + opts.target;
		if (id === 'window' && opts.k !== undefined) g = '目标：求定长 k=' + opts.k + ' 窗口的最大（和）';
		goalEl.textContent = g;
		editPanel.classList.remove('open');
		editErr.textContent = '';
		render();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)play();
        closeBtn.focus();
	}

	editBtn.addEventListener('click', function(){ openEdit(curAlgo); });
	document.getElementById('aep-ok').addEventListener('click', applyEdit);
	document.getElementById('aep-cancel').addEventListener('click', function(){ editPanel.classList.remove('open'); editErr.textContent = ''; });
	document.getElementById('aep-close').addEventListener('click', function(){ editPanel.classList.remove('open'); editErr.textContent = ''; });
	document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && modal.classList.contains('open')) close(); });

	var zhMap = {};
	engine.ALGOS.forEach(function(a){ zhMap[a.id] = a.zh; });
	document.querySelectorAll('.algo-card').forEach(function(card){
		card.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click();}});
        card.addEventListener('click', function(){
            card.focus();
			var id = card.getAttribute('data-algo');
			open(id, zhMap[id] || card.querySelector('h4').textContent);
		});
	});
})();

