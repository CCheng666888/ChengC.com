import { clamp, choose, distance, random } from './math.js';
import { drawDog, ellipse, rounded, line } from './Art.js';

export class MiniGames {
  constructor(game) { this.game=game;this.active=null; }
  start(type) {
    const g=this.game;if(this.active||g.state!=='playing')return;
    g.ui.closeModal();g.input.clear();
    this.active={type,time:0,phase:'ready'};
    if(type==='frisbee') {
      Object.assign(this.active,{angle:0,power:0,targetAngle:Math.round(random(-27,27)),targetPower:Math.round(random(48,80)),flight:0});
      g.ui.showFrisbee(this.active);
    }else if(type==='bone') {
      const candidates=[[130,-70],[-120,-90],[0,135],[-150,60],[120,90],[0,-155]];
      const spots=[];
      for(const [dx,dy] of candidates){const p={x:clamp(g.player.x+dx,80,1520),y:clamp(g.player.y+dy,80,920)};if(!g.world.blocked(p.x,p.y,24)&&!spots.some(s=>distance(s,p)<65))spots.push(p);if(spots.length===3)break;}
      if(spots.length<3){for(const p of [{x:755,y:730},{x:945,y:650},{x:630,y:695}])if(!spots.some(s=>distance(s,p)<65))spots.push(p);}
      Object.assign(this.active,{spots:spots.slice(0,3),target:Math.floor(random(0,3)),remaining:35,hint:'先靠近三个小土堆，看看它的反应。'});
      g.dog.think('跟着鼻子走！');g.ui.showBone();
    }else {
      Object.assign(this.active,{round:0,correct:0,remaining:4,commands:['坐下','过来','等待','握手'],wanted:choose(['坐下','过来','等待','握手']),locked:0});
      g.ui.showCommands(this.active);
    }
  }
  update(dt) {
    const a=this.active;if(!a)return;a.time+=dt;
    if(a.type==='frisbee') {
      a.power=(Math.sin(a.time*2.8-Math.PI/2)+1)*50;
      if(a.phase==='chase') {a.flight+=dt;if(a.flight>=2.2){this.complete(a.success,a.success?'漂亮！它在空中接住了飞盘。':'差一点！落点偏了，下次调整方向和力度。');return;}}
      this.drawFrisbee();this.game.ui.frisbeePower(a);
    }else if(a.type==='bone') {
      a.remaining-=dt;
      const d=distance(this.game.dog,a.spots[a.target]);
      a.hint=d<65?'就是这里！尾巴摇得飞快，试试挖一挖。':d<125?'气味越来越浓了，往这个方向靠近。':'它还在慢慢嗅闻。试试另一个土堆。';
      if(d<70){this.game.dog.state='excited';this.game.dog.think('汪！就在附近！',.2);}
      this.game.ui.boneHint(a);
      if(a.remaining<=0)this.complete(false,'这次没找到。它已经记住气味，下次再来！');
    }else {
      if(a.phase==='feedback') {
        a.locked-=dt;
        if(a.locked<=0){a.round++;if(a.round>=4){this.complete(a.correct>=3,`${a.correct} / 4 个指令成功。${a.correct>=3?'你们越来越默契了！':'耐心一点，下次会更好。'}`);return;}a.wanted=choose(a.commands);a.remaining=4;a.phase='ready';this.game.ui.commandRound(a);}
      }else {a.remaining-=dt;this.game.ui.commandTimer(a.remaining);if(a.remaining<=0)this.command(null);}
    }
  }
  throw() {
    const a=this.active;if(a?.type!=='frisbee'||a.phase!=='ready')return;
    a.phase='chase';a.thrownPower=a.power;a.thrownAngle=a.angle;
    const skill=clamp(1-Math.abs(a.angle-a.targetAngle)/65-Math.abs(a.power-a.targetPower)/95,0,1),s=this.game.dog.stats;
    a.success=Math.random()<clamp(skill*.78+s.energy/800+s.obedience/1100,.07,.98);
    this.game.audio.play('frisbee');this.game.ui.frisbeeThrown();
  }
  sniff() {
    const a=this.active;if(a?.type!=='bone')return;
    const target=a.spots[a.target];
    if(distance(this.game.player,target)<75&&distance(this.game.dog,target)<115){this.game.audio.play('bark');this.complete(true,'找到啦！你们是一对出色的寻宝搭档。');}
    else {a.remaining=Math.max(1,a.remaining-2);this.game.ui.toast('这里还没有，留意它的嗅闻提示。','⌕');this.game.audio.play('fail');}
  }
  command(value) {
    const a=this.active;if(a?.type!=='commands'||a.phase!=='ready')return;
    const matched=value===a.wanted,success=matched&&Math.random()<clamp(.65+this.game.dog.stats.obedience/300+this.game.dog.stats.trust/1500,0,.99);
    if(success){a.correct++;this.game.dog.state='sitting';this.game.dog.change({obedience:2,trust:1});}
    a.phase='feedback';a.locked=.85;this.game.audio.play(success?'success':'fail');
    this.game.ui.commandFeedback(success,matched?'它还在分心。再温柔地试一次。':value?'这不是刚刚的指令哦。':'慢了一点，再试一次。');
  }
  complete(success,message) {
    const type=this.active?.type;if(!type)return;
    this.active=null;const g=this.game,s=g.storage.data;g.ui.hideBone();g.ui.closeModal();
    if(success) {
      g.dog.change({happiness:10,trust:7,obedience:5,energy:-5,curiosity:2});g.session.games++;
      if(type==='frisbee')s.frisbeeCatches++;if(type==='bone')s.bonesFound++;if(type==='commands')s.commandsPassed++;
      g.dog.state='happy';g.dog.think('还想再玩！');g.rewardInteraction(65);
    } else {g.dog.change({energy:-3,trust:1});g.rewardInteraction(8);}
    g.audio.play(success?'success':'fail');g.ui.showMiniResult(success,message,type);
  }
  cancel() {if(!this.active)return;this.active=null;this.game.ui.hideBone();this.game.ui.closeModal();this.game.ui.toast('慢慢来，散步也很有趣。','↝');}
  drawBone(ctx) {
    const a=this.active;if(a?.type!=='bone')return;
    a.spots.forEach((p,i)=>{ellipse(ctx,p.x,p.y,24,13,'#ae997e');ellipse(ctx,p.x-4,p.y-3,20,9,'#c4ae8b');for(let j=0;j<3;j++)ellipse(ctx,p.x-10+j*9,p.y-5,2,2,'#9c896a');ctx.font='700 12px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff9e8';ctx.fillText(String(i+1),p.x,p.y+4);});
  }
  drawFrisbee() {
    const canvas=document.querySelector('#frisbee-field'),a=this.active;if(!canvas||!a)return;
    const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
    c.clearRect(0,0,w,h);rounded(c,0,0,w,h,22,'#d7dfb9');
    for(let i=0;i<30;i++)ellipse(c,(i*137)%w,(i*71)%h,15,4,'#bed09e45');
    const targetX=w*.8,targetY=h/2+Math.sin(a.targetAngle*Math.PI/180)*110;
    c.setLineDash([5,7]);line(c,[[80,h/2],[targetX,targetY]],'#92aa7c',2);c.setLineDash([]);
    ellipse(c,targetX,targetY,28,20,'#f7ecd9aa');c.strokeStyle='#90a476';c.lineWidth=2;c.stroke();
    c.fillStyle='#657b58';c.font='600 12px system-ui';c.textAlign='center';c.fillText('理想落点',targetX,targetY+39);
    const aimY=h/2+Math.sin(a.angle*Math.PI/180)*110;line(c,[[80,h/2],[w*.65,aimY]],'#d98c62',3);
    const progress=clamp(a.flight/2,0,1),landingX=80+(targetX-80)*clamp((a.thrownPower||a.targetPower)/a.targetPower,.35,1.3),landingY=h/2+Math.sin((a.thrownAngle||0)*Math.PI/180)*110;
    const discX=80+(landingX-80)*progress,discY=h/2+(landingY-h/2)*progress-Math.sin(progress*Math.PI)*52;
    const dogX=100+((a.success?landingX:targetX)-100)*Math.min(1,progress*1.14),dogY=h/2+30+((a.success?landingY:targetY)-h/2-30)*progress-(a.success?Math.sin(clamp((progress-.7)/.3,0,1)*Math.PI)*17:0);
    drawDog(c,{x:a.phase==='chase'?dogX:130,y:a.phase==='chase'?dogY:h/2+35,direction:1,phase:a.time*17,moving:a.phase==='chase',state:a.phase==='chase'?'running':'excited',spec:this.game.dog.spec},a.time,1.15);
    if(a.phase==='chase'&&!(a.success&&progress>.94)){ellipse(c,discX,discY,14,5,'#e98c60');ellipse(c,discX,discY-1,9,2.5,'#ffd8ac');}else if(a.phase==='ready')ellipse(c,80,h/2,14,5,'#e98c60');
  }
}
