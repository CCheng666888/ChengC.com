import { clamp, distance } from './math.js';
import { ellipse, rounded, line } from './Art.js';

export class World {
  constructor() {
    this.width=1600;this.height=1000;
    this.props = [
      ...[[180,190],[360,130],[540,180],[1090,140],[1320,190],[1450,370],[210,510],[170,740],[330,890],[1220,830],[1440,730],[1410,910]].map(([x,y],i)=>({kind:'tree',x,y,radius:19,seed:i})),
      {kind:'fountain',x:815,y:430,radius:66,label:'喷泉广场',landmark:'fountain'},
      {kind:'bench',x:600,y:580,radius:34,label:'阳光长椅'}, {kind:'bench',x:1090,y:460,radius:34,label:'树荫长椅'},
      {kind:'lamp',x:680,y:690,radius:8}, {kind:'lamp',x:990,y:255,radius:8}, {kind:'lamp',x:390,y:365,radius:8},
      {kind:'bin',x:1150,y:455,radius:14}, {kind:'bin',x:550,y:600,radius:14},
      {kind:'flowers',x:405,y:610,radius:43,label:'嗅闻花园',landmark:'garden'},
      {kind:'flowers',x:1100,y:715,radius:43}, {kind:'flowers',x:935,y:140,radius:38},
      {kind:'frisbee',x:1020,y:605,radius:0,label:'飞盘草坪',landmark:'lawn'},
      {kind:'ball',x:650,y:760,radius:0,label:'一颗小球'},
      {kind:'bone',x:420,y:330,radius:0,label:'寻宝树丛',landmark:'grove'},
      {kind:'sign',x:810,y:880,radius:10,label:'MAPLE PARK'},
      {kind:'dog',x:1250,y:560,radius:0,label:'一位新朋友'}
    ];
    this.landmarks = this.props.filter(p=>p.landmark);
    this.ground=this.makeGround();
  }
  blocked(x,y,r=13) { return this.props.some(p=>p.radius && Math.hypot(x-p.x,y-p.y)<r+p.radius); }
  move(actor,dx,dy,r=13) {
    const x=clamp(actor.x+dx,35,this.width-35),y=clamp(actor.y+dy,35,this.height-35);
    if(!this.blocked(x,actor.y,r))actor.x=x;
    if(!this.blocked(actor.x,y,r))actor.y=y;
  }
  nearest(actor) { return this.props.filter(p=>p.label && distance(actor,p)<110).sort((a,b)=>distance(actor,a)-distance(actor,b))[0]; }
  makeGround() {
    const canvas=document.createElement('canvas');canvas.width=this.width;canvas.height=this.height;const c=canvas.getContext('2d');
    c.fillStyle='#c8d5a5';c.fillRect(0,0,this.width,this.height);
    rounded(c,20,20,1560,960,75,'#d5deba','#b9c89c');
    let seed=44;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
    for(let i=0;i<1000;i++) {const x=rand()*1600,y=rand()*1000;ellipse(c,x,y,rand()*18+3,rand()*6+2, i%3===0?'#c7d4ab55':'#f1f0cc35');}
    c.lineWidth=93;c.strokeStyle='#bfbf9690';c.lineCap='round';c.beginPath();c.moveTo(800,1000);c.lineTo(800,660);c.bezierCurveTo(580,700,490,520,550,375);c.bezierCurveTo(630,200,1070,200,1090,430);c.bezierCurveTo(1140,680,870,705,800,660);c.stroke();
    c.lineWidth=80;c.strokeStyle='#ece0bc';c.stroke();
    line(c,[[560,465],[340,375],[80,375]],'#ece0bc',66);line(c,[[1080,495],[1320,555],[1530,555]],'#ece0bc',66);
    line(c,[[550,585],[385,650],[230,740]],'#e9ddb8',48);
    for(let i=0;i<320;i++){const x=rand()*1600,y=rand()*1000;line(c,[[x,y],[x-2,y-4],[x,y],[x+3,y-5]],'#97b17b55',1);}
    for(let i=0;i<20;i++)rounded(c,774,950-i*12,52,3,1,'#dacda6');
    return canvas;
  }
  drawGround(ctx) {ctx.drawImage(this.ground,0,0);}
  drawProp(ctx,p,t) {
    const {x,y,kind}=p;ctx.save();ctx.translate(x,y);
    if(kind==='tree') {
      ellipse(ctx,12,8,52,17,'#6c874133');line(ctx,[[0,0],[0,-50]],'#9a8360',15);line(ctx,[[0,-22],[-17,-47]],'#9a8360',8);
      const sway=Math.sin(t*.8+p.seed)*2;ctx.translate(sway,0);
      ellipse(ctx,-23,-66,36,35,'#86a46c');ellipse(ctx,23,-67,37,36,'#92ad74');ellipse(ctx,0,-94,42,38,'#a1ba7e');ellipse(ctx,-13,-103,27,20,'#b2c98c');
      ellipse(ctx,28,-52,22,17,'#86a46c');line(ctx,[[-20,-108],[-8,-113],[1,-110]],'#bace9433',3);
    } else if(kind==='fountain') {
      ellipse(ctx,7,12,77,46,'#81997728');ellipse(ctx,0,-3,72,47,'#b7b9a0');ellipse(ctx,0,-12,67,43,'#e3dfc4');ellipse(ctx,0,-13,58,35,'#88b9b0');
      for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(0,-15,21+i*11+Math.sin(t*2)*2,10+i*6,0,0,Math.PI*2);ctx.strokeStyle='#c4e1d0';ctx.lineWidth=1.4;ctx.stroke();}
      rounded(ctx,-9,-55,18,41,5,'#c4c8ae');ellipse(ctx,0,-55,22,10,'#ebe8ce');ellipse(ctx,0,-57,17,6,'#94c3b7');
      for(let i=-2;i<=2;i++) {ctx.beginPath();ctx.moveTo(0,-65);ctx.quadraticCurveTo(i*15,-98,i*23,-25);ctx.strokeStyle='#d9eee0b5';ctx.lineWidth=3;ctx.stroke();}
      ellipse(ctx,0,-70,4,9,'#dcf1e4');
    } else if(kind==='bench') {
      ellipse(ctx,2,6,46,12,'#71834322');line(ctx,[[-30,-10],[-30,5]],'#5f7563',5);line(ctx,[[30,-10],[30,5]],'#5f7563',5);
      rounded(ctx,-43,-31,86,22,4,'#ae8660');for(let i=0;i<3;i++)rounded(ctx,-41,-29+i*7,82,4,2,'#d3ac75');rounded(ctx,-45,-10,90,10,3,'#c89969');
      line(ctx,[[-43,-14],[-43,-25]],'#5f7563',4);line(ctx,[[43,-14],[43,-25]],'#5f7563',4);
    } else if(kind==='lamp') {
      ellipse(ctx,4,4,17,6,'#53674720');line(ctx,[[0,0],[0,-75]],'#738375',5);rounded(ctx,-6,-3,12,7,3,'#738375');rounded(ctx,-13,-91,26,21,5,'#6e806e');rounded(ctx,-9,-88,18,15,3,'#f1d990');line(ctx,[[-14,-92],[0,-103],[14,-92]],'#6e806e',4);
    } else if(kind==='bin') {ellipse(ctx,2,4,16,6,'#53674720');rounded(ctx,-13,-29,26,32,5,'#789183');rounded(ctx,-16,-32,32,7,3,'#587567');line(ctx,[[-4,-23],[-4,-3]],'#98b09a',2);line(ctx,[[4,-23],[4,-3]],'#98b09a',2);}
    else if(kind==='flowers') {
      ellipse(ctx,0,0,53,28,'#c3b99c');ellipse(ctx,0,-5,49,24,'#7e9c64');
      for(let i=0;i<15;i++){const fx=Math.sin(i*7.2)*39,fy=Math.cos(i*3.7)*15-9;line(ctx,[[fx,fy+9],[fx,fy]],'#6d8d59',2);for(let j=0;j<5;j++)ellipse(ctx,fx+Math.cos(j*1.25)*3,fy+Math.sin(j*1.25)*3,3,3,['#edbd8c','#f0d998','#e5a197'][i%3]);ellipse(ctx,fx,fy,2,2,'#bc8d51');}
    } else if(kind==='frisbee') {ellipse(ctx,0,3,19,7,'#83975c25');ellipse(ctx,0,-1,17,6,'#e88960');ellipse(ctx,0,-2,11,3,'#f6b88a');}
    else if(kind==='ball'){ellipse(ctx,0,2,11,5,'#83975c25');ellipse(ctx,0,-6,10,10,'#ddba67');line(ctx,[[-7,-12],[3,-7],[6,0]],'#f6e5a7',2);}
    else if(kind==='bone'){ctx.rotate(-.3);line(ctx,[[-9,-3],[9,-3]],'#f8efcc',7);for(const a of [-10,10]){ellipse(ctx,a,-7,5,5,'#fcf3dc');ellipse(ctx,a,1,5,5,'#fcf3dc');}}
    else if(kind==='sign'){line(ctx,[[0,0],[0,-50]],'#9c8360',8);rounded(ctx,-61,-65,122,35,5,'#f6eccd','#bda981');ctx.fillStyle='#6d7a59';ctx.font='700 11px system-ui';ctx.textAlign='center';ctx.fillText('MAPLE PARK',0,-43);}
    ctx.restore();
  }
  drawMarkers(ctx,visits) {
    this.landmarks.forEach(p=>{
      const done=visits.has(p.landmark),y=p.y+65;
      rounded(ctx,p.x-49,y,98,23,10,done?'#f5efdba0':'#fff5dfdc');ctx.font='600 11px system-ui';ctx.fillStyle=done?'#7a8e63':'#776e50';ctx.textAlign='center';ctx.fillText(`${done?'✓ ':''}${p.label}`,p.x,y+15);
    });
  }
}
