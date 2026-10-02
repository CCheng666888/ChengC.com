"""Make a dependency-free Cangshan/Erhai scene from the user's Canvas example.

Only explicit drawing utilities are adapted. The sample bundler, React runtime,
external resources, demo blog copy and event wrappers are not executed or copied.
"""
from pathlib import Path
import re
import base64

root = Path(__file__).resolve().parent
source = (root / 'reference/sunset.js').read_text(encoding='utf-8')
matches = list(re.finditer(r'^  (\w+)\([^\n]*', source, re.M))
methods = {}
for i, match in enumerate(matches):
    end = matches[i + 1].start() if i + 1 < len(matches) else source.rfind('\n}')
    methods[match.group(1)] = source[match.start():end].rstrip()

helpers = '\n\n'.join(methods[name] for name in [
    'mk', 'hx', 'rng', 'painter', 'bay', 'ga', 'glow', 'blit',
    'drawGlow', 'buildVig', 'drawBird', 'drawBirds', 'bankH', 'drawReeds'
])
# Keep the sample's common grain, light direction, depth and drawing scale.
helpers = helpers.replace('Math.floor(a * 10 + this.bay(xx, yy)) / 10',
                          'Math.floor(a * 16 + this.bay(xx, yy)) / 16')
helpers = helpers.replace('d[i] = 22; d[i + 1] = 6; d[i + 2] = 26;',
                          'd[i] = 7; d[i + 1] = 22; d[i + 2] = 30;')
helpers = helpers.replace('Math.min(0.5, (e - 0.1) * 1.8)', 'Math.min(0.3, (e - 0.12) * 1.0)')
helpers = helpers.replace('Math.floor(a * 16 + this.bay(xx, yy)) / 16', 'a')
helpers = helpers.replace('rim: [255, 150, 92], lt: [190, 96, 120], md: [150, 72, 108], dk: [104, 52, 92]',
                          'rim: [242, 215, 169], lt: [187, 193, 183], md: [137, 161, 167], dk: [102, 138, 154]')
helpers = helpers.replace('rim: [255, 214, 130], lt: [248, 164, 112], md: [226, 120, 100], dk: [176, 84, 100]',
                          'rim: [255, 232, 185], lt: [226, 214, 189], md: [184, 188, 181], dk: [151, 172, 175]')
helpers = helpers.replace("ctx.fillStyle = 'rgba(46,22,56,0.92)'", "ctx.fillStyle = 'rgba(28,52,61,0.8)'")
helpers = helpers.replace("'#1a0c20'", "'#142f32'").replace("'#b8583e'", "'#647e62'")
helpers = helpers.replace("'#7a3a34'", "'#566147'").replace("'#ffa060'", "'#c6b981'")
helpers = helpers.replace('Math.sin(t * 1.1 + r.ph) * 3 * r.h + this.mx * 1.5',
                          '(Math.sin(t * 1.1 + r.ph) * 2 + this.gustWind * 5) * r.h + this.mx * 1.5')
helpers = re.sub(r'    for \(const e of this.egrets\).*?\n', '', helpers)

custom = r'''
  constructor(canvas,photo) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.photo=photo;
    this.BAY = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
    this.t = 0; this.mx = 0; this.my = 0; this.mt = 0; this.myt = 0;
    this.ripples = []; this.gusts = []; this.gustWind = 0; this.nextRipple = 2;
    this.props = { speed: 1, swell: 1, mist: 1, light: 1 };
    this.pointer = { held: false, water: false, x: 0, y: 0, last: -1 };
    this.build();
  }
  noise(x, seed=1) {
    const i=Math.floor(x), f=x-i, s=f*f*(3-2*f);
    const n=k=>{ const v=Math.sin(k*127.1+seed*311.7)*43758.5453; return v-Math.floor(v); };
    return n(i)*(1-s)+n(i+1)*s;
  }
  noise2(x,y,seed=1) {
    const i=Math.floor(x),j=Math.floor(y),a=x-i,b=y-j,fx=a*a*(3-2*a),fy=b*b*(3-2*b);
    const n=(u,v)=>{const s=Math.sin(u*127.1+v*269.5+seed*31.7)*43758.5453;return s-Math.floor(s);};
    return (n(i,j)*(1-fx)+n(i+1,j)*fx)*(1-fy)+(n(i,j+1)*(1-fx)+n(i+1,j+1)*fx)*fy;
  }
  gradImg(ctx,W,H,ramp,curve=1) {
    const img=ctx.createImageData(W,H),d=img.data,C=ramp.map(h=>this.hx(h)),n=C.length-1,r=this.rng(84);
    for(let y=0;y<H;y++){
      const f=Math.pow(y/Math.max(1,H-1),curve)*n,b=Math.floor(f),a=f-b;
      for(let x=0;x<W;x++){
        const i=(y*W+x)*4,grain=(r()-.5)*2.8;
        for(let k=0;k<3;k++)d[i+k]=C[Math.min(n,b)][k]*(1-a)+C[Math.min(n,b+1)][k]*a+grain;
        d[i+3]=255;
      }
    }ctx.putImageData(img,0,0);
  }
  buildClouds() {
    const {PW}=this,q=this.q,CW=this.CW=Math.max(PW+q(100),q(720));
    this.cClouds=[0,1].map(L=>{
      const H=q(L?72:108),[c,x]=this.mk(CW,H),r=this.rng(101+L*17),dens=new Float32Array(CW*H);
      for(let i=0;i<7;i++){
        const cx=r()*CW,cy=H*(.32+r()*.38),w=q(38+r()*65),h=q(7+r()*12);
        for(let k=0;k<6;k++){
          const bx=cx+(r()-.5)*w,by=cy+(r()-.5)*h,bw=w*(.25+r()*.3),bh=h*(.45+r()*.65);
          for(let yy=Math.max(0,Math.floor(by-bh*2));yy<Math.min(H,by+bh*2);yy++)
            for(let xx=Math.floor(bx-bw*2);xx<bx+bw*2;xx++){
              const e=((xx-bx)/bw)**2+((yy-by)/bh)**2;if(e>4)continue;
              dens[yy*CW+((xx%CW)+CW)%CW]+=Math.exp(-e*2)*.65;
            }
        }
      }
      const img=x.createImageData(CW,H),d=img.data;
      for(let yy=0;yy<H;yy++)for(let xx=0;xx<CW;xx++){
        const j=yy*CW+xx,v=dens[j];if(v<.012)continue;
        const up=dens[Math.max(0,yy-3)*CW+xx],down=dens[Math.min(H-1,yy+3)*CW+xx];
        const s=Math.max(0,Math.min(1,.48+(down-up)*2.5-v*.09));
        const dark=[127,157,170],lit=[247,229,194],i=j*4;
        for(let k=0;k<3;k++)d[i+k]=dark[k]*(1-s)+lit[k]*s+(r()-.5)*2;
        d[i+3]=(1-Math.exp(-v*2.2))*230;
      }x.putImageData(img,0,0);return c;
    });
  }
  build() {
    const W=innerWidth,H=innerHeight,mob=W<700;
    // Like sample: all scenery and interaction share the same fine pixel grid.
    const px=Math.max(1,H/620),PW=Math.ceil(W/px),PH=Math.ceil(H/px),u=PH/360,M=20;
    Object.assign(this,{W,H,mob,px,PW,PH,u,M,FW:PW+M*2,glowC:{}});
    this.q=v=>Math.round(v*u); this.canvas.width=PW; this.canvas.height=PH;
    this.ctx.imageSmoothingEnabled=false;
    const g=this.g={yH:Math.round(PH*.575)};
    g.sx=Math.round(PW*.78);g.sy=Math.round(PH*.24);g.sr=Math.max(5,this.q(11));
    [this.scene,this.sceneCtx]=this.mk(PW,PH);
    [this.lake,this.lakeCtx]=this.mk(PW,PH-g.yH);
    this.buildSky();this.buildClouds();this.buildTexturedTerrain();this.buildMist();
    this.buildWater();this.buildDecor();this.buildVig();this.ripples=[];this.gusts=[];
    this.draw();
  }
  buildSky() {
    const {FW,g,M}=this,[c,x]=this.mk(FW,g.yH);this.cSky=c;
    this.gradImg(x,FW,g.yH,['#426f92','#709ab0','#a7bdbc','#d5d6bd','#efd7aa'],1.1);
    const sx=g.sx+M,sy=g.sy,q=this.q;
    x.globalCompositeOperation='lighter';
    this.blit(x,this.glow(q(90),'#efb670'),sx,sy,.22);
    this.blit(x,this.glow(q(35),'#ffe7b1'),sx,sy,.28);
    x.globalCompositeOperation='source-over';
    const r=g.sr;
    for(let yy=-r;yy<=r;yy++)for(let xx=-r;xx<=r;xx++){
      const d=Math.hypot(xx,yy)/r;if(d>1)continue;
      x.fillStyle=d>.85?'#f2db9a':'#fff0bf';x.fillRect(sx+xx,sy+yy,1,1);
    }
  }
  buildMtn() {
    const {FW,PW,PH,M,g}=this,q=this.q;
    [this.cMtn,this.mtnCtx]=this.mk(FW,g.yH);
    const x=this.mtnCtx;
    // Four connected slopes: distant snowy spine, hazy valleys, wooded foothills.
    const palettes=[[[106,143,154],[145,168,171]],[[65,107,123],[132,160,157]],
                    [[42,87,90],[103,137,114]],[[28,67,68],[86,117,84]]];
    const tops=[];
    for(let L=0;L<4;L++){
      const ridge=new Float32Array(FW);
      for(let xx=0;xx<FW;xx++){
        const f=(xx-M)/PW;
        const broad=(this.ga(f,.16,.20)*.7+this.ga(f,.48,.19)+this.ga(f,.79,.22)*.63)/1.75;
        const n=(this.noise(f*20,7+L)*.56+this.noise(f*46,17+L)*.27+this.noise(f*112,31+L)*.17);
        const h=L===0?55+62*broad+20*n:L===1?40+60*broad+17*n:L===2?18+52*broad+16*n:8+30*broad+12*n;
        ridge[xx]=g.yH-q(h);
      }
      tops.push(ridge);
      const img=x.createImageData(FW,g.yH),d=img.data, [dark,lit]=palettes[L];
      for(let xx=0;xx<FW;xx++){
        const top=Math.max(1,Math.round(ridge[xx])),dh=g.yH-top;
        for(let yy=top;yy<g.yH;yy++){
          const v=(yy-top)/dh;
          const fold=this.noise2(xx*.014+Math.sin(v*8+xx*.008)*.65,yy*.010,21+L);
          const detail=this.noise2(xx*.045,yy*.025,63+L);
          const ridgeSlope=(ridge[Math.min(FW-1,xx+3)]-ridge[Math.max(0,xx-3)])/6;
          let shade=Math.min(1,Math.max(0,.40-ridgeSlope*.11+(fold-.5)*.75+(detail-.5)*.22+v*.07));
          const grain=this.bay(xx,yy),rock=this.noise2(xx*.16,yy*.08,52+L);
          shade=Math.floor(shade*14+grain)/14;
          let color=dark.map((c,k)=>c+(lit[k]-c)*shade);
          // Snow follows the high ridges and shaded gullies rather than a flat cap.
          if(L<2&&top<PH*.29&&v<.055+(fold-.5)*.07&&rock>.25){
            const snow=shade>.43?[221,224,201]:[153,181,181];
            color=color.map((c,k)=>c*.15+snow[k]*.85);
          }else if(L>1&&v>.14){
            const forest=(grain>.57?-5:3)+(rock-.5)*9;
            color=color.map(c=>c+forest);
          }
          const i=(yy*FW+xx)*4;
          d[i]=color[0];d[i+1]=color[1];d[i+2]=color[2];d[i+3]=255;
        }
      }
      const [layer,lx]=this.mk(FW,g.yH);lx.putImageData(img,0,0);x.drawImage(layer,0,0);
    }
    this.ridges=tops;
  }
  buildTexturedTerrain() {
    const {photo,FW,PW,PH,g,M}=this;
    const [c,x]=this.mk(FW,g.yH);
    const sourceWidth=Math.min(photo.naturalWidth,photo.naturalHeight*.55*FW/g.yH);
    const sourceX=(photo.naturalWidth-sourceWidth)*.56;
    this.camera={sourceWidth,sourceX};
    x.drawImage(photo,sourceX,0,sourceWidth,photo.naturalHeight*.55,0,0,FW,g.yH);
    const img=x.getImageData(0,0,FW,g.yH),d=img.data,r=this.rng(22);
    // Use the existing natural terrain as a texture seed, with restrained fine grain.
    const ridge=[[0,.298],[.04,.282],[.06,.275],[.1,.295],[.13,.306],[.16,.286],[.2,.30],[.234,.270],[.27,.290],[.29,.280],[.343,.260],[.365,.274],[.389,.257],[.421,.269],[.440,.252],[.466,.270],[.483,.264],[.493,.271],[.509,.298],[.530,.287],[.543,.309],[.550,.304],[.564,.310],[.59,.312],[.61,.30],[.62,.298],[.63,.289],[.65,.293],[.663,.282],[.675,.292],[.687,.309],[.713,.326],[.744,.34],[.776,.35],[.811,.34],[.840,.334],[.85,.35],[.865,.341],[.9,.35],[.93,.351],[.944,.352],[.965,.347],[.98,.35],[1,.353]];
    const edges=new Float32Array(FW);
    for(let xx=0;xx<FW;xx++){
      const f=(sourceX+xx/FW*sourceWidth)/photo.naturalWidth;
      let k=0;while(k<ridge.length-2&&ridge[k+1][0]<f)k++;
      const a=ridge[k],b=ridge[k+1],h=(a[1]+(b[1]-a[1])*(f-a[0])/(b[0]-a[0]))/.55*g.yH;
      let edge=h;
      for(let yy=Math.max(1,Math.floor(h-10));yy<Math.min(g.yH,h+11);yy++){
        const i=(yy*FW+xx)*4;
        if(d[i+2]<d[i+1]*1.19&&(d[i]+d[i+1]+d[i+2])/3<220){edge=yy;break;}
      }
      edges[xx]=edge;
    }
    for(let xx=0;xx<FW;xx++){
      const neighbors=[];for(let k=-2;k<=2;k++)neighbors.push(edges[Math.min(FW-1,Math.max(0,xx+k))]);
      neighbors.sort((a,b)=>a-b);const edge=neighbors[2];
      for(let yy=0;yy<g.yH;yy++){
        const i=(yy*FW+xx)*4,grey=d[i]*.3+d[i+1]*.5+d[i+2]*.2,grain=(r()-.5)*4;
        for(let channel=0;channel<3;channel++){
          const v=(d[i+channel]*.84+grey*.16)*.94+7+grain;
          d[i+channel]=Math.floor(v/5)*5;
        }
        d[i+3]=yy<edge?0:Math.min(255,(yy-edge+1)*95);
      }
    }
    x.putImageData(img,0,0);this.cMtn=c;
    [this.cShore]=this.mk(FW,g.yH);this.lamps=[];
  }
  buildShore() {
    const {FW,M,PW,g}=this,q=this.q,r=this.rng(49),[c,x]=this.mk(FW,g.yH);this.cShore=c;
    const R=this.painter(x);
    for(let xx=0;xx<FW;xx++){
      const h=q(3+this.noise(xx*.08,71)*2);R(xx,g.yH-h,1,h,'#324e43');
      if((xx&1)===0)R(xx,g.yH-1,1,1,'#b1b29c');
    }
    // Low white-wall, grey-roof village silhouettes along the Erhai shore.
    for(let xx=M-4;xx<FW;){
      const f=(xx-M)/PW;
      const village=this.ga(f,.12,.045)+this.ga(f,.37,.07)+this.ga(f,.66,.035)+this.ga(f,.89,.06);
      const gap=r()>.65*village,w=q(3+r()*6),h=q(2+r()*5),y=g.yH-q(4+r()*2)-h;
      if(!gap){
        R(xx,y,w,h,'#c5c3ac');R(xx+w-1,y,1,h,'#819c91');R(xx,y,1,h,'#8f9d8d');
        R(xx+q(1.5),y+q(1.5),1,q(2),'#345456');
        if(w>q(6))R(xx+w-q(3),y+q(1.5),1,q(2),'#345456');
        const rh=q(2.5);
        for(let k=0;k<rh;k++)R(xx-rh+k,y-rh+k,w+2*(rh-k),1,k===0?'#7d948e':'#3b5860');
        if(r()>.45){R(xx,y-rh-q(1),1,q(1),'#3b5860');R(xx+w-1,y-rh-q(1),1,q(1),'#3b5860');}
      }else{
        const rr=q(3+r()*2),cy=g.yH-q(4)-rr;
        for(let dy=-rr;dy<=rr;dy++)for(let dx=-rr;dx<=rr;dx++)if(dx*dx+dy*dy<rr*rr)
          R(xx+dx,cy+dy,1,1,dx+dy<0?'#547955':'#2d5647');
      }
      xx+=w+q(2+r()*5);
    }
    // A few warm windows, with the same positions used by the reflected scene.
    this.lamps=Array.from({length:18},()=>({x:r()*PW,y:g.yH-q(5+r()*3),ph:r()*6}));
  }
  buildMist() {
    const {FW,PH}=this,[c,x]=this.mk(FW,Math.round(PH*.20));this.cMist=c;
    const img=x.createImageData(c.width,c.height),d=img.data,r=this.rng(102);
    const puffs=Array.from({length:22},()=>({x:r()*FW,y:c.height*(.25+r()*.5),rx:20+r()*45,ry:3+r()*6}));
    for(let yy=0;yy<c.height;yy++)for(let xx=0;xx<FW;xx++){
      let density=0;
      for(const p of puffs){const a=((xx-p.x)/p.rx)**2+((yy-p.y)/p.ry)**2;if(a<3)density+=Math.exp(-a*2)*.38;}
      const alpha=Math.min(.55,density)*(.8+this.noise(xx*.07+yy*.1,7)*.2);
      const i=(yy*FW+xx)*4;d[i]=206;d[i+1]=218;d[i+2]=202;
      d[i+3]=alpha*255;
    }
    x.putImageData(img,0,0);
  }
  buildWater() {
    const {PW,PH,g}=this,[c,x]=this.mk(PW,PH-g.yH);this.cWater=c;
    this.gradImg(x,PW,PH-g.yH,['#6f9ca2','#4b7e91','#32647d','#244e69','#173c55'],.7);
    const base=x.getImageData(0,0,c.width,c.height),[tc,tx]=this.mk(c.width,c.height),{sourceX,sourceWidth}=this.camera;
    tx.drawImage(this.photo,sourceX, this.photo.naturalHeight*.55,sourceWidth,this.photo.naturalHeight*.45,0,0,tc.width,tc.height);
    const original=tx.getImageData(0,0,tc.width,tc.height).data,prefix=new Float32Array(c.width+1);
    for(let yy=0;yy<c.height;yy++){
      prefix[0]=0;
      for(let xx=0;xx<c.width;xx++){const i=(yy*c.width+xx)*4;prefix[xx+1]=prefix[xx]+original[i]*.25+original[i+1]*.55+original[i+2]*.2;}
      for(let xx=0;xx<c.width;xx++){
        const lo=Math.max(0,xx-20),hi=Math.min(c.width,xx+21),mean=(prefix[hi]-prefix[lo])/(hi-lo),i=(yy*c.width+xx)*4;
        const lum=original[i]*.25+original[i+1]*.55+original[i+2]*.2;
        const mod=Math.max(.70,Math.min(1.3,1+(lum-mean)/100));
        for(let k=0;k<3;k++)base.data[i+k]*=mod;
      }
    }x.putImageData(base,0,0);
  }
  buildDecor() {
    const {PW,PH,g,mob}=this,r=this.rng(5),q=this.q;
    this.flocks=[{x:.25,y:.23,v:.010,n:6,K:.7,ph:1},{x:.77,y:.34,v:.007,n:4,K:.6,ph:4}];
    this.egrets=[];
    this.glit=Array.from({length:mob?85:150},()=>({dx:(r()+r()+r()-1.5)/1.5,p:Math.pow(r(),1.2),ph:r()*6,sp:1+r()*2,l:1+Math.floor(r()*3)}));
    this.wl=Array.from({length:75},()=>({x:r()*PW,p:r(),l:q(2+r()*9),sp:.8+r()*2,phase:r()*6}));
    this.reeds=Array.from({length:mob?10:24},(_,i)=>({u:r(),h:.3+r()*.65,ph:r()*6,left:i%3!==2}));
    this.stars=Array.from({length:60},()=>({x:r()*PW,y:r()*PH*.25,ph:r()*6}));
  }
  step(dt) {
    this.t+=dt*this.props.speed;
    this.mx+=(this.mt-this.mx)*Math.min(1,dt*3);
    this.my+=(this.myt-this.my)*Math.min(1,dt*3);
    this.gusts=this.gusts.filter(g=>this.t-g.t0<g.life);
    this.ripples=this.ripples.filter(g=>this.t-g.t0<g.life);
    this.gustWind=this.gusts.reduce((n,g)=>n+Math.sin(Math.min(1,(this.t-g.t0)/g.life)*Math.PI)*g.power,0);
    if(this.t>this.nextRipple){
      const y=this.g.yH+(this.PH-this.g.yH)*(.30+Math.random()*.45);
      this.addWater(Math.random()*this.PW,y,.22);this.nextRipple=this.t+3+Math.random()*3;
    }
    if(this.pointer.held&&this.pointer.water&&this.t-this.pointer.last>.13){
      this.addWater(this.pointer.x,this.pointer.y,.6);this.pointer.last=this.t;
    }
    this.draw();
  }
  addWater(x,y,power=1) {
    if(y<=this.g.yH+1||y>this.PH)return;
    this.ripples.push({x,y,t0:this.t,life:3.2,power,depth:(y-this.g.yH)/(this.PH-this.g.yH)});
    if(this.ripples.length>12)this.ripples.shift();
  }
  addGust(x,y,power=1) {
    if(y>=this.g.yH)return;
    this.gusts.push({x,y,t0:this.t,life:4.2,power});if(this.gusts.length>6)this.gusts.shift();
  }
  drawMist(xOffset) {
    const c=this.cMist,ctx=this.ctx,q=this.q,y0=Math.round(this.PH*.35),t=this.t;
    ctx.globalAlpha=Math.min(1,this.props.mist*.85);
    for(let j=0;j<c.height;j++){
      const yy=y0+j;
      let shift=Math.sin(t*.25+j*.047)*q(3)+Math.sin(t*.13)*q(3);
      const active=this.gusts.filter(g=>Math.abs(yy-g.y)<q(75));
      if(!active.length){ctx.drawImage(c,0,j,c.width,1,Math.round(xOffset+shift),yy,c.width,1);continue;}
      for(let xx=0;xx<this.PW;xx+=6){
        let push=0;
        for(const g of active){const a=(t-g.t0)/g.life,fall=Math.exp(-(((yy-g.y)/q(45))**2)-(((xx-g.x)/q(85))**2));
          push+=Math.sin(a*Math.PI)*q(22)*g.power*fall;
        }
        const sx=Math.max(0,Math.min(c.width-6,Math.round(xx-xOffset-shift-push)));
        ctx.drawImage(c,sx,j,6,1,xx,yy,6,1);
      }
    }
    ctx.globalAlpha=1;
  }
  makeLake(sxs) {
    const ctx=this.lakeCtx,old=this.ctx,{PW,PH,g,t,u}=this,q=this.q,wH=PH-g.yH;
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    for(let j=0;j<wH;j++){
      const p=j/wH,wob=Math.round((Math.sin(j*.47+t*1.7)*(.2+p*1.8)+Math.sin(j*.11-t*.7)*.6)*this.props.swell);
      ctx.drawImage(this.cWater,0,j,PW,1,wob,j,PW,1);
      if(wob>0)ctx.drawImage(this.cWater,PW-wob,j,wob,1,0,j,wob,1);
      else if(wob<0)ctx.drawImage(this.cWater,0,j,-wob,1,PW+wob,j,-wob,1);
    }
    // Rebuild reflections from this frame's mountains, clouds and shore, as in sample.
    for(let j=0;j<wH;j++){
      const sy=g.yH-1-Math.floor(j*1.22);if(sy<0)break;
      const p=j/wH,wob=Math.round((Math.sin(j*.54+t*1.8)*(.35+p*1.8)+Math.sin(j*1.3-t*2.4)*.5)*this.props.swell);
      ctx.globalAlpha=(.52-.37*p)*(((j+Math.floor(t*3))%8===0)?.6:1);
      ctx.drawImage(this.scene,0,sy,PW,1,wob,j,PW,1);
    }
    ctx.globalAlpha=1;ctx.fillStyle='rgba(16,49,63,.12)';ctx.fillRect(0,0,PW,wH);
    ctx.fillStyle='rgba(182,211,208,.2)';
    for(const l of this.wl){const p=l.p*l.p,y=2+Math.floor(wH*p),a=.45+.35*Math.sin(t*1.8+l.phase);
      ctx.globalAlpha=a;ctx.fillRect(Math.round(((l.x+t*l.sp*u)%(PW+20))-10),y,Math.max(1,Math.round(l.l*(.25+p))),1);
    }
    ctx.globalAlpha=1;ctx.globalCompositeOperation='lighter';this.ctx=ctx;
    this.drawGlow(sxs,q(3),q(70),'#dfa269',.09*this.props.light);
    for(const gl of this.glit){
      const a=Math.sin(t*gl.sp*1.3+gl.ph);if(a<.45)continue;
      const p=gl.p,y=2+Math.floor(wH*p),hw=q(6)+p*q(39);
      const x=Math.round(sxs+gl.dx*hw+Math.sin(t*.7+gl.ph)*1.5);
      ctx.globalAlpha=Math.min(.8,(a-.4)*(.9-.5*p))*this.props.light;
      ctx.fillStyle=a>.85?'#eee6b6':'#cfb58b';
      ctx.fillRect(x,y,Math.max(1,Math.round(gl.l*u*(1+p*2))),1);
    }
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;this.ctx=old;
  }
  drawLake() {
    const {ctx,g,PW,PH,t}=this,wH=PH-g.yH,q=this.q;
    ctx.drawImage(this.lake,0,g.yH);
    // Refract the water AND its lighting/reflections together. No separate ripple outline.
    for(let j=1;j<wH-1;j++){
      const y=g.yH+j;
      const active=this.ripples.filter(r=>{
        const age=t-r.t0,rad=age*q(25)*(0.7+r.depth*.7),ry=.18+r.depth*.28;
        return Math.abs(y-r.y)<(rad+q(7))*ry;
      });
      if(!active.length)continue;
      const lo=Math.max(0,Math.floor(Math.min(...active.map(r=>r.x-(t-r.t0)*q(25)*(0.7+r.depth*.7)-q(8)))));
      const hi=Math.min(PW,Math.ceil(Math.max(...active.map(r=>r.x+(t-r.t0)*q(25)*(0.7+r.depth*.7)+q(8)))));
      for(let x=lo;x<hi;x+=3){
        let sx=0,sy=0,light=0;
        for(const r of active){
          const age=t-r.t0,rad=age*q(25)*(0.7+r.depth*.7),ry=.18+r.depth*.28;
          const dx=x-r.x,dy=(y-r.y)/ry,d=Math.hypot(dx,dy),wave=(d-rad)/q(5);
          const a=Math.exp(-wave*wave)*Math.sin(wave*2.5)*r.power*(1-age/r.life);
          sx+=dx/Math.max(1,d)*a*q(2.4);sy+=dy/Math.max(1,d)*a*q(1.8);light+=a*.07;
        }
        const sampleX=Math.max(0,Math.min(PW-3,x+Math.round(sx)));
        const sampleY=Math.max(0,Math.min(wH-1,j+Math.round(sy)));
        ctx.drawImage(this.lake,sampleX,sampleY,Math.min(3,PW-x),1,x,y,Math.min(3,PW-x),1);
        if(Math.abs(light)>.018){ctx.fillStyle=light>0?'#d4ded0':'#153747';ctx.globalAlpha=Math.min(.15,Math.abs(light));ctx.fillRect(x,y,Math.min(3,PW-x),1);ctx.globalAlpha=1;}
      }
    }
  }
  draw() {
    const {ctx,g,PW,PH,M,t}=this,q=this.q,ox=Math.round(this.mx*3),oM=Math.round(this.mx*2),oF=Math.round(this.mx);
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    ctx.drawImage(this.cSky,oF-M,0);
    this.cClouds.forEach((c,i)=>{
      const off=(t*(i?1.8:.9)*this.u+i*137)%this.CW;
      const y=q(i?38:0),push=this.gustWind*q(4)*(i?1:.4);
      ctx.globalAlpha=i?.65:.70;
      for(let k=-1;k<=1;k++)ctx.drawImage(c,Math.round(k*this.CW-off+oF+push),y);
    });ctx.globalAlpha=1;
    ctx.drawImage(this.cMtn,oM-M,Math.round(this.my));
    this.drawMist(oM-M);
    ctx.drawImage(this.cShore,ox-M,0);
    this.sceneCtx.clearRect(0,0,PW,PH);this.sceneCtx.drawImage(this.canvas,0,0);
    this.makeLake(g.sx+oF);this.drawLake();
    this.drawBirds(oF);
    this.drawReeds(ox*1.4);
    ctx.drawImage(this.cVig,0,0);
    if(document.body.classList.contains('night')){
      ctx.fillStyle='rgba(7,20,40,.48)';ctx.fillRect(0,0,PW,PH);
      ctx.fillStyle='#d0dddf';for(const s of this.stars){ctx.globalAlpha=.30+.25*Math.sin(t*.8+s.ph);ctx.fillRect(s.x,s.y,1,1);}ctx.globalAlpha=1;
    }
  }
'''

controller = r'''
  const $=id=>document.getElementById(id), canvas=$('water');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const scene=new CangshanScene(canvas,photo);canvas.classList.add('ready');
  canvas.dataset.sceneVersion='6';
  let paused=reduced.matches,raf=0,last=0,visible=true;
  const defaults={density:65,speed:35,mist:40,glow:60};
  function schedule(){if(!raf&&!paused&&visible&&!document.hidden)raf=requestAnimationFrame(frame);}
  function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
  function frame(now){
    raf=0;if(paused||!visible||document.hidden){last=0;return;}
    if(!last)last=now;
    if(now-last>=1000/(scene.mob?24:30)){scene.step(Math.min(.08,(now-last)/1000));last=now;}
    schedule();
  }
  function release(){scene.pointer.held=false;}
  function syncPause(){
    $('pauseToggle').textContent=paused?'继续动画':'暂停动画';$('pauseToggle').setAttribute('aria-pressed',String(paused));
    $('sceneHint').textContent=paused?'动画已暂停':'点水拨动倒影 · 点山吹动云雾';
    if(paused){release();stop();scene.draw();}else schedule();
  }
  function eligible(e){return !paused&&visible&&e.clientY<innerHeight&&scrollY<innerHeight*.5&&!e.target.closest('a,button,input,.settings');}
  function pos(e){return{x:e.clientX/innerWidth*scene.PW,y:e.clientY/innerHeight*scene.PH};}
  addEventListener('pointerdown',e=>{
    if(!eligible(e))return;const p=pos(e),s=scene.pointer;
    Object.assign(s,{held:true,water:p.y>scene.g.yH,x:p.x,y:p.y,last:scene.t});
    if(s.water)scene.addWater(p.x,p.y,1.1);else scene.addGust(p.x,p.y,1);
  },{passive:true});
  addEventListener('pointermove',e=>{
    if(!eligible(e))return;const p=pos(e),s=scene.pointer;
    scene.mt=(p.x/scene.PW-.5)*2;scene.myt=(p.y/scene.PH-.5)*.7;
    if(s.held&&scene.t-s.last>.09){
      if(s.water)scene.addWater(p.x,p.y,.7);else if(scene.t-s.last>.4)scene.addGust(p.x,p.y,.4);
      s.x=p.x;s.y=p.y;if(s.water||scene.t-s.last>.4)s.last=scene.t;
    }
  },{passive:true});
  addEventListener('pointerup',release);addEventListener('pointercancel',release);addEventListener('blur',release);
  document.documentElement.addEventListener('pointerleave',()=>{release();scene.mt=scene.myt=0;});
  $('pauseToggle').addEventListener('click',()=>{paused=!paused;syncPause();});
  function panel(open){$('settings').hidden=!open;$('settingsToggle').setAttribute('aria-expanded',String(open));(open?$('settingsClose'):$('settingsToggle')).focus();}
  $('settingsToggle').addEventListener('click',()=>panel($('settings').hidden));$('settingsClose').addEventListener('click',()=>panel(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('settings').hidden)panel(false);});
  document.addEventListener('click',e=>{if(!$('settings').hidden&&!$('settings').contains(e.target)&&!$('settingsToggle').contains(e.target)){$('settings').hidden=true;$('settingsToggle').setAttribute('aria-expanded','false');}});
  function settings(){scene.props.swell=Number($('density').value)/65;scene.props.speed=.4+Number($('speed').value)/60;scene.props.mist=Number($('mist').value)/40;scene.props.light=Number($('glow').value)/60;}
  for(const key of Object.keys(defaults))$(key).addEventListener('input',e=>{$(key+'Value').value=e.target.value+'%';settings();if(paused)scene.draw();});
  function toggleScene(only){document.body.classList.toggle('scene-only',only);$('sceneToggle').textContent=only?'显示首页':'只看风景';$('sceneToggle').setAttribute('aria-pressed',String(only));if(only)scrollTo({top:0,behavior:'instant'});}
  $('sceneToggle').addEventListener('click',()=>toggleScene(!document.body.classList.contains('scene-only')));
  document.querySelectorAll('a[href="#writing"]').forEach(a=>a.addEventListener('click',()=>toggleScene(false)));
  $('nightToggle').addEventListener('click',()=>{const night=document.body.classList.toggle('night');$('nightToggle').textContent=night?'切换晨光':'切换夜色';$('nightToggle').setAttribute('aria-pressed',String(night));scene.draw();});
  $('reset').addEventListener('click',()=>{for(const[key,v]of Object.entries(defaults)){$(key).value=v;$(key+'Value').value=v+'%';}settings();scene.ripples=[];scene.gusts=[];scene.gustWind=0;scene.mt=scene.myt=scene.mx=scene.my=0;release();document.body.classList.remove('night');$('nightToggle').textContent='切换夜色';$('nightToggle').setAttribute('aria-pressed','false');paused=reduced.matches;syncPause();scene.draw();});
  let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>scene.build(),120);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){release();stop();}else schedule();});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){release();stop();}else schedule();}).observe(document.querySelector('.hero'));
  reduced.addEventListener('change',()=>{paused=reduced.matches;syncPause();});
  settings();syncPause();
'''
custom = re.sub(r'\n  buildMtn\(\) \{.*?(?=\n  buildTexturedTerrain)', '', custom, flags=re.S)
custom = re.sub(r'\n  buildShore\(\) \{.*?(?=\n  buildMist)', '', custom, flags=re.S)
seed = base64.b64encode((root / 'assets/cangshan-erhai-realistic.webp').read_bytes()).decode('ascii')
script = "(() => {\n'use strict';\nclass CangshanScene {\n" + helpers + custom + '\n}\nfunction boot(photo) {\n' + controller + "\n}\nconst photo=new Image();photo.onload=()=>boot(photo);photo.src='data:image/webp;base64," + seed + "';\n})();\n"
(root / 'scene-v6.js').write_text(script, encoding='utf-8')

page = root / 'cangshan-erhai.html'
html = page.read_text(encoding='utf-8')
# Keep the previous approved-to-preview direction for comparison.
old = root / 'cangshan-erhai-v5.html'
if not old.exists():
    old.write_text(html, encoding='utf-8')
html = re.sub(r'<script>.*?</script>',lambda _: '<script>\n'+script+'</script>',html,flags=re.S)
html = re.sub(r'^    \.landscape-art \{.*?\n','',html,flags=re.M)
html = re.sub(r'^    \.atmosphere.*?\n','',html,flags=re.M)
html = re.sub(r'^    @keyframes mist.*?\n','',html,flags=re.M)
html = re.sub(r'^    body\.paused \.atmosphere.*?\n','',html,flags=re.M)
html = html.replace('<div class="landscape-art" id="landscapeArt"></div><canvas id="water"></canvas>', '<canvas id="water" aria-label="苍山洱海动态像素风景"></canvas>')
html = html.replace('<canvas id="particles"></canvas>','')
html = html.replace('filter: brightness(var(--scene-brightness)) saturate(var(--scene-saturation));', 'image-rendering: auto;')
html = html.replace('image-rendering: pixelated;', 'image-rendering: auto;')
html = html.replace('写实苍山洱海、动态湖水、飞鸟云雾与点击涟漪', '细颗粒像素苍山洱海、实时倒影、山间风雾与水面互动')
html = html.replace('点水拨动湖面 · 按住山间轻轻拖动', '点水拨动倒影 · 点山吹动云雾')
html = html.replace('点水或拖动：拨动湖水与倒影。按住山间轻轻拖动：原画面跟着移动，松开后回弹。点击山体不会触发鸟群。',
                    '点水或拖动：波动带着倒影扩散。点山：山风吹动云雾和岸边草木；山体保持稳定，鸟群自然飞行。')
page.write_text(html,encoding='utf-8')
print('Sample-inspired V6:',len(script),'script characters;',page.stat().st_size,'HTML bytes')
