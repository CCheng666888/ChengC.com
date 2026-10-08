import { Storage } from './Storage.js';
import { World } from './World.js';
import { Player } from './Player.js';
import { Dog } from './Dog.js';
import { Input } from './Input.js';
import { AudioManager } from '../audio/AudioManager.js';
import { EventSystem } from './EventSystem.js';
import { AchievementSystem } from './AchievementSystem.js';
import { MiniGames } from './MiniGames.js';
import { SecretSystem } from './SecretSystem.js';
import { UI } from '../ui/UI.js';
import { DOGS } from '../data/dogs.js';
import { approach, clamp, distance } from './math.js';
import { drawDog, drawPlayer, drawLeash, ellipse } from './Art.js';
import { device } from './Device.js';

export class Game {
  constructor(canvas,backend) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.storage=new Storage(backend);this.world=new World();
    this.state='menu';this.suspended=false;this.backgroundPaused=document.hidden;this.time=0;this.cooldown=0;
    this.player=new Player();this.dog=this.createDog();this.session=this.newSession();this.camera={x:this.player.x,y:this.player.y};
    this.audio=new AudioManager(this.storage.data.settings);this.input=new Input(key=>this.action(key));this.ui=new UI(this);
    this.mini=new MiniGames(this);this.events=new EventSystem(this);this.achievements=new AchievementSystem(this);this.secret=new SecretSystem(this);
    this.autosave=0;this.footsteps=0;this.birds=8;
    window.addEventListener('resize',()=>this.resize());
    document.addEventListener('visibilitychange',()=>{this.backgroundPaused=document.hidden;if(document.hidden)this.saveWalk();});
    window.addEventListener('pagehide',()=>this.saveWalk());
    window.addEventListener('native-save-status',e=>{this.storage.available=e.detail;if(!e.detail&&!this.nativeWarning){this.nativeWarning=true;this.ui.toast('磁盘暂时无法保存，请保持窗口开启后重试。','!');}if(e.detail)this.nativeWarning=false;});
    window.addEventListener('pointerdown',()=>this.audio.unlock(),{once:true});window.addEventListener('keydown',()=>this.audio.unlock(),{once:true});
    this.resize();this.ui.menu();this.last=performance.now();this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);
  }
  createDog() {return new Dog(DOGS.find(d=>d.id===this.storage.data.selectedDog)||DOGS[0],this.storage.data.dogTrust);}
  newSession() {return {elapsed:0,distance:0,score:0,duration:this.storage.data.settings.duration,visits:new Set(),interactions:0,games:0};}
  start(resume=false) {
    this.ui.closeModal();this.mini.cancel();this.events=new EventSystem(this);this.player=new Player();this.dog=this.createDog();this.session=this.newSession();
    const saved=resume&&this.storage.data.currentWalk;
    if(saved){Object.assign(this.player,saved.player);Object.assign(this.dog,saved.dog);this.dog.stats={...saved.stats};Object.assign(this.session,saved);this.session.visits=new Set(saved.visits);}
    this.state='playing';this.cooldown=0;this.autosave=0;this.input.clear();this.camera={x:this.player.x,y:this.player.y};this.saveWalk();this.ui.hud();
    this.ui.toast(resume?'接着刚刚的路，慢慢走。':device.mobile?'用摇杆走走，靠近后点「和它互动」。':'去公园走走吧。靠近物品，按 E 互动。','☀');this.audio.play('success');
  }
  action(key) {
    if(this.suspended||this.state!=='playing')return;
    if(key==='escape'){if(this.mini.active){this.mini.cancel();return;}if(this.events.active)return;if(this.ui.hasModal)this.ui.closeModal();else this.ui.pause();return;}
    if(key===' '&&this.mini.active?.type==='frisbee'){this.mini.throw();return;}
    if((key==='e'||key===' ')&&this.mini.active?.type==='bone'){this.mini.sniff();return;}
    if(key==='e'&&!this.ui.hasModal&&!this.mini.active)this.interact();
  }
  interact() {
    if(this.state!=='playing'||this.suspended||this.ui.hasModal||this.mini.active)return;
    const p=this.world.nearest(this.player);
    if(p&&['frisbee','bone','dog'].includes(p.kind)){this.events.open(p.kind);return;}
    if(p?.kind==='ball'&&this.cooldown<=0){this.dog.change({happiness:8,energy:-2,trust:4});this.dog.state='excited';this.dog.think('我的球！');this.cooldown=5;this.rewardInteraction(18);this.ui.toast('小球滚过去，它开心地追了回来。','◉');return;}
    this.ui.interaction(p?.kind==='bench');
  }
  care(type) {
    if(this.cooldown>0){this.ui.toast(`再等 ${Math.ceil(this.cooldown)} 秒，让它慢慢享受。`,'♡');return;}
    const changes={pet:{happiness:7,trust:5},treat:{energy:12,obedience:4,trust:3,curiosity:2},rest:{energy:18,happiness:4,trust:3}};
    if(!changes[type])return;
    this.dog.change(changes[type]);this.dog.target=null;this.dog.state=type==='rest'?'sitting':'happy';this.dog.timer=type==='rest'?5:3;this.dog.think(type==='treat'?'好吃！':type==='rest'?'陪你坐一会儿。':'最喜欢你了！');
    this.cooldown=5;this.ui.closeModal();this.rewardInteraction(15);this.audio.play('bark');
  }
  rewardInteraction(points) {this.session.score+=points;this.session.interactions++;this.storage.data.interactions++;this.storage.data.dogTrust=this.dog.stats.trust;this.achievements.check();this.saveWalk();}
  saveWalk() {
    if(this.state!=='playing')return;
    this.storage.data.dogTrust=this.dog.stats.trust;
    this.storage.data.currentWalk={...this.session,visits:[...this.session.visits],player:{x:this.player.x,y:this.player.y},dog:{x:this.dog.x,y:this.dog.y},stats:{...this.dog.stats}};
    const saved=this.storage.save();
    if(!saved&&!this.saveFailureShown){this.saveFailureShown=true;this.ui.toast('暂时无法存档，关闭页面会丢失这次进度。','!');}
    if(saved)this.saveFailureShown=false;
  }
  finish() {
    if(this.state!=='playing'||this.suspended)return;
    this.mini.cancel();this.events.active=null;this.ui.closeModal();this.input.clear();this.state='results';
    const s=this.storage.data,stats=this.dog.stats,score=Math.round(clamp(this.session.score+Math.min(this.session.distance,700)*.22+(stats.happiness+stats.trust+stats.obedience)*1.15+this.session.visits.size*35,0,1000));
    const stars=score>=750?5:score>=560?4:score>=380?3:score>=210?2:1;
    const oldBest=s.bestScore;s.bestScore=Math.max(s.bestScore,score);s.totalWalks++;s.totalDistance+=this.session.distance;s.dogTrust=stats.trust;s.currentWalk=null;
    this.achievements.check();this.storage.save();
    this.ui.results({score,stars,newBest:score>oldBest,title:['新手遛狗员','合格铲屎官','合格铲屎官','优秀铲屎官','狗狗最好的朋友'][stars-1]});this.audio.play('achievement');
  }
  toMenu() {this.saveWalk();this.mini.cancel();this.events.active=null;this.ui.closeModal();this.input.clear();this.state='menu';this.ui.menu();}
  resize() {device.apply();this.width=innerWidth;this.height=innerHeight;this.dpr=device.pixelRatio;this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.lastPaint=0;}
  frame(now) {
    const dt=Math.min((now-this.last)/1000,.05);this.last=now;
    if(!this.backgroundPaused&&!this.suspended){this.time+=this.storage.data.settings.reducedMotion?dt*.15:dt;this.update(dt);if(now-(this.lastPaint||0)>=1000/device.fps-1){this.lastPaint=now;this.render();}}
    requestAnimationFrame(this.frame);
  }
  update(dt) {
    if(!dt)return;
    this.ui.update(dt);if(this.state!=='playing')return;
    this.cooldown=Math.max(0,this.cooldown-dt);
    if(this.events.active){this.events.update(dt);return;}
    this.mini.update(dt);if(this.ui.hasModal)return;
    const meters=this.player.update(dt,this.input,this.world);this.session.distance+=meters;this.dog.update(dt,this.player,this.world);
    if(!this.mini.active){this.session.elapsed+=dt;this.events.update(dt);}
    for(const p of this.world.landmarks)if(distance(this.player,p)<135&&!this.session.visits.has(p.landmark)){this.session.visits.add(p.landmark);this.ui.toast(`走到了${p.label} · ${this.session.visits.size} / 4`,'⚑');this.achievements.check();}
    this.camera.x=approach(this.camera.x,this.player.x,dt,4);this.camera.y=approach(this.camera.y,this.player.y,dt,4);
    this.autosave+=dt;if(this.autosave>5){this.autosave=0;this.saveWalk();}
    if(this.player.moving){this.footsteps+=dt;if(this.footsteps>.38){this.footsteps=0;this.audio.play('step');}}
    this.birds-=dt;if(this.birds<0){this.birds=12+Math.random()*14;this.audio.play('bird');}
    if(this.session.elapsed>=this.session.duration)this.finish();
  }
  render() {
    const c=this.ctx,w=this.width,h=this.height;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,w,h);c.fillStyle='#d8dfbc';c.fillRect(0,0,w,h);
    const menu=this.state==='menu',scale=menu?Math.max(.72,Math.min(w/1400,h/800)*1.12):clamp(Math.min(w/1020,h/700),.72,1.3);
    const mobile=w<760,focus=menu?{x:900,y:500}:this.camera;
    const sx=menu?(mobile?w*.5:w*.68):w*.5,sy=menu?(mobile?h*.75:h*.57):h*(mobile ? .5 : .55);
    c.save();c.translate(sx-focus.x*scale,sy-focus.y*scale);c.scale(scale,scale);this.world.drawGround(c);
    const previewPlayer={x:1000+Math.sin(this.time*.35)*55,y:650,direction:Math.cos(this.time*.35)>=0?1:-1,moving:true,phase:this.time*6};
    const player=menu?previewPlayer:this.player,dog=menu?{x:previewPlayer.x+Math.sin(this.time*.8)*65+65,y:670+Math.sin(this.time*.5)*10,direction:previewPlayer.direction,moving:true,phase:this.time*8,state:'happy',spec:this.dog.spec}:this.dog;
    this.mini.drawBone(c);this.world.drawMarkers(c,menu?new Set():this.session.visits);drawLeash(c,player,dog);
    const actors=this.world.props.filter(p=>p.kind!=='dog').map(p=>({y:p.y,draw:()=>this.world.drawProp(c,p,this.time)}));
    actors.push({y:player.y,draw:()=>drawPlayer(c,player,this.time)},{y:dog.y,draw:()=>drawDog(c,dog,this.time)});
    const other=this.world.props.find(p=>p.kind==='dog');actors.push({y:other.y,draw:()=>drawDog(c,{...other,spec:{color:'#c7b7a0',light:'#fbf1da'},phase:this.time*4,direction:-1,state:'sitting',moving:false},this.time)});
    actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
    for(let i=0;i<5;i++){const x=790+Math.sin(this.time*.15+i*4)*260,y=350+Math.cos(this.time*.12+i)*180;ellipse(c,x,y,2,2,'#fff7d177');}
    c.restore();
  }
}
