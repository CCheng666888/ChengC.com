import { ROUTES, routeById } from '../data/routes.js';
import { distance, clamp } from './math.js';
import { ellipse, rounded } from './Art.js';

export class RouteSystem {
  constructor(game){this.game=game;this.active=false;this.progress=0;this.message='';}
  get spec(){return routeById(this.game.session.routeId);}
  get step(){return this.spec.stops[this.game.session.routeStep||0];}
  get gameDone(){return !this.spec.game||(this.game.session.routeGames?.[this.spec.game]||0)>0;}
  get ready(){return !this.step&&this.gameDone;}
  get complete(){return this.spec.id==='maple'||(this.ready&&this.game.session.routeReturned===true&&(this.spec.id!=='dusk'||this.game.dog.stats.energy>=25));}
  get target(){return this.step||this.spec.home;}
  cancelHold(){this.active=false;this.progress=0;}
  interact(){
    if(this.spec.id==='maple')return false;const g=this.game;
    if(this.step&&distance(g.player,this.step)<88){
      if(!this.active){this.active=true;this.progress=0;g.dog.target=null;g.dog.timer=3;g.ui.toast(this.step.kind==='scent'?'找到气味了，等小狗靠近确认。':'留在这里，等小狗靠近，一起完成。','↟');}
      return true;
    }
    if(distance(g.player,this.spec.home)<95){
      if(!this.ready){g.ui.toast(this.step?'还有沿途目标没完成，按「路线」查看提示。':this.spec.gameLabel+'，再回来吧。','⚑');return true;}
      if(distance(g.player,g.dog)>110){g.dog.target=null;g.dog.timer=3;g.ui.toast('等小狗走到身边，再一起回家。','♡');return true;}
      if(this.spec.id==='dusk'&&g.dog.stats.energy<25){g.ui.toast('它有点累了，先陪它休息，精力恢复到 25 再回家。','♡');return false;}
      g.session.routeReturned=true;g.finish();return true;
    }
    return false;
  }
  update(dt){
    const g=this.game,p=this.step;if(this.spec.id==='maple'||g.mini.active||g.events.active||g.ui.hasModal)return;
    if(p?.kind==='scent'&&distance(g.player,p)<225&&!this.active){g.dog.target={x:p.x,y:p.y};g.dog.timer=Math.max(g.dog.timer,1);g.dog.state='curious';g.dog.think(distance(g.dog,p)<80?'丝带的气味，就在这里！':'闻到了，跟我来。',.3);}
    if(!this.active||!p)return;
    if(distance(g.player,p)>100){this.cancelHold();g.ui.toast('走远了，回到目标旁再试一次。','↝');return;}
    g.dog.target=null;g.dog.timer=2;
    const close=distance(g.player,g.dog)<100&&distance(g.dog,p)<140;
    this.message=close?'很好，安静陪它待一会儿。':'等它走到身边；不要拉紧牵引绳。';
    if(close){g.dog.state='sitting';this.progress+=dt;}
    if(this.progress>=p.seconds){
      g.session.routeStep++;this.cancelHold();g.dog.change({trust:4,obedience:3,happiness:3});g.dog.state='happy';g.rewardInteraction(35);g.ui.updateHUD?.();g.audio.play('success');g.ui.toast('完成 · '+p.name,'✓');
    }
  }
  onMini(type){const g=this.game;g.session.routeGames[type]=(g.session.routeGames[type]||0)+1;}
  summary(){
    const g=this.game,s=this.spec;
    return [...s.stops.map((p,i)=>({text:p.name,done:(g.session.routeStep||0)>i})),...(s.game?[{text:s.gameLabel,done:this.gameDone}]:[]),...(s.id!=='maple'?[{text:s.id==='dusk'?'精力至少 25，与小狗一起回到园门':'与小狗一起回到入口',done:g.session.routeReturned===true}]:[{text:'完成这一次散步',done:g.state==='results'}])];
  }
  result(score){
    const g=this.game,s=g.storage.data,id=this.spec.id,passed=this.complete;
    s.routes.attempts[id]=(s.routes.attempts[id]||0)+1;
    if(passed){if(!s.routes.cleared.includes(id))s.routes.cleared.push(id);s.routes.best[id]=Math.max(s.routes.best[id]||0,score);}
    const index=ROUTES.findIndex(r=>r.id===id),next=passed?ROUTES[index+1]:null;
    return {id,passed,next,summary:this.summary(),name:this.spec.name};
  }
  draw(c){
    const s=this.spec,g=this.game;if(s.id==='maple')return;const p=this.target;
    if(this.step?.kind!=='scent'||distance(g.player,p)<180){
      if(this.step?.kind==='scent'){c.save();c.translate(p.x,p.y-5);c.rotate(-.2);ellipse(c,0,9,15,5,'#a58d6933');c.fillStyle='#cf927f';c.beginPath();c.moveTo(0,0);c.lineTo(-17,-8);c.lineTo(-14,8);c.lineTo(0,0);c.lineTo(16,-8);c.lineTo(13,8);c.closePath();c.fill();rounded(c,-4,-4,8,9,2,'#eed7b7');c.restore();}
      const pulse=2+Math.sin(g.time*3)*2;
      c.save();c.setLineDash([6,7]);c.strokeStyle=s.id==='dusk'?'#ffdaa1':'#d1915c';c.lineWidth=3;c.beginPath();c.ellipse(p.x,p.y+5,37+pulse,21+pulse,0,0,Math.PI*2);c.stroke();c.restore();
      rounded(c,p.x-75,p.y-65,150,25,10,'#fff5e5ee');c.fillStyle='#695d49';c.textAlign='center';c.font='600 11px system-ui';c.fillText(this.step?this.step.name:this.ready?'回家 · E / 互动':'先完成小游戏',p.x,p.y-48);
    }
    if(this.active){rounded(c,p.x-40,p.y-28,80,7,3,'#d6d0b7');rounded(c,p.x-40,p.y-28,80*clamp(this.progress/this.step.seconds,0,1),7,3,'#7e9a6a');}
    if(s.id==='dusk')s.stops.forEach((p,i)=>{if(i<(g.session.routeStep||0)){const x=p.x-38,y=p.y-94,glow=c.createRadialGradient(x,y,5,x,y,110);glow.addColorStop(0,'#ffdc9670');glow.addColorStop(1,'#ffdc9600');c.fillStyle=glow;c.fillRect(x-110,y-110,220,220);}});
  }
  drawMap(c){if(this.spec.id==='maple')return;const p=this.target;ellipse(c,p.x/10,p.y/10,this.step?.kind==='scent'?9:5,this.step?.kind==='scent'?7:5,'#e3b56baa');ellipse(c,p.x/10,p.y/10,2,2,'#fff3cb');}
}
