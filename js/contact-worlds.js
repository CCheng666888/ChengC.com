import * as T from './vendor/three.module.min.js';
import {characters} from './character-data.js';
import {createTextureCharacter,animateTextureCharacter} from './character-extensions.js?v=extended-sd-20261003';
import {buildRoom} from './world-room.js';

const reduced=matchMedia('(prefers-reduced-motion: reduce)'),rooms=[];
let timeline=0,last=0;
async function setup(element,world){
 const scene=new T.Scene(),camera=new T.OrthographicCamera(),host=element.querySelector('.scene-characters');
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x000000,0);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 renderer.domElement.className='world-canvas';renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 scene.add(new T.HemisphereLight(world==='qin'?0xffedcb:0xe5edff,world==='qin'?0x54432b:0x333c57,2.1));
 const sun=new T.DirectionalLight(world==='qin'?0xffdfad:0xffffff,3.1);sun.position.set(-3,8,6);sun.castShadow=true;
 sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-12,right:12,top:7,bottom:-7,near:.1,far:25});sun.shadow.bias=-.001;sun.shadow.normalBias=.025;scene.add(sun);
 const rim=new T.DirectionalLight(world==='qin'?0xbd9473:0x9bb5f1,1.3);rim.position.set(2,4,-4);scene.add(rim);buildRoom(scene,world);
 const agents=await Promise.all(characters.filter(c=>c.world===world).map(async(c,index)=>{
  const rig=await createTextureCharacter(c.id);rig.root.scale.setScalar(.84);scene.add(rig.root);
  const label=document.createElement('div');label.className='model-label';label.textContent=c.name;label.setAttribute('aria-hidden','true');host.append(label);
  const bubble=document.createElement('span');bubble.className='model-action';bubble.textContent=c.line;label.append(bubble);
  const effect=document.createElement('span');effect.className='cutout-effect';effect.dataset.activity=c.action;effect.style.color=c.accent;effect.textContent={cake:'▰',trick:'✧',stream:'♡',butterfly:'ʚɞ',nap:'z Z',sing:'♫',conduct:'♩',coin:'◉',edict:'▤',scroll:'▥',patrol:'⚑',map:'◇'}[c.action];effect.setAttribute('aria-hidden','true');host.append(effect);
  return {rig,index,label,bubble,effect,state:'idle',next:1.6+index*.65,home:new T.Vector3(),from:new T.Vector3(),target:new T.Vector3(),started:0};
 }));
 const room={element,scene,camera,renderer,agents,mobile:false,visible:true};rooms.push(room);
 new IntersectionObserver(entries=>{room.visible=entries[0].isIntersecting;},{rootMargin:'100px'}).observe(element);
 function resize(){
  const w=element.clientWidth,h=element.clientHeight;room.mobile=w<650;
  renderer.setSize(w,h);const aspect=w/h,viewWidth=room.mobile?(world==='qin'?7.8:8.8):world==='qin'?14:21;
  const viewHeight=viewWidth/aspect;camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;
  camera.near=.1;camera.far=60;camera.position.set(0,room.mobile?14:8,18);camera.lookAt(0,room.mobile?1:1.25,0);camera.updateProjectionMatrix();
  const columns=room.mobile?4:agents.length;
  agents.forEach(a=>{const col=room.mobile?a.index%4:a.index,row=room.mobile?Math.floor(a.index/4):0,spacing=room.mobile?2:world==='qin'?3:2.5;
   a.home.set((col-(columns-1)/2)*spacing,0,room.mobile?(agents.length>4?(row-.5)*5.4:0):Math.sin(a.index*2.4)*.25);
   a.rig.root.position.copy(a.home);a.rig.root.rotation.y=(a.index%2?-.15:.15);a.state='idle';a.target.copy(a.home);a.label.dataset.state='idle';a.next=timeline+1.2+a.index*.3;
  });
  element.dataset.renderMode='original-texture-articulated-puppets';element.dataset.modelCount=String(agents.length);render(room,timeline);
 }
 new ResizeObserver(resize).observe(element);resize();
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();element.dataset.renderMode='unavailable';showFailure(element);});
 renderer.domElement.addEventListener('webglcontextrestored',()=>location.reload());
}
function showFailure(element){if(element.querySelector('.world-render-error'))return;const p=document.createElement('p');p.className='world-render-error';p.textContent='三维场景未能加载，请开启浏览器硬件加速后刷新。';element.append(p);}
for(const [id,world] of [['astralScene','astral'],['qinScene','qin']]){const el=document.getElementById(id);setup(el,world).catch(error=>{console.error('Cutout room initialization failed',error);showFailure(el);});}
function render(room,time){
 room.agents.forEach(a=>{
  if(!reduced.matches&&time>=a.next){
   if(a.state==='idle'){a.state='walk';a.started=time;a.from.copy(a.rig.root.position);a.target.copy(a.home);a.target.x+=Math.sin(time*2.1+a.index)*.33;a.target.z+=Math.cos(time+a.index)*.22;a.next=time+2.8;}
   else if(a.state==='walk'){a.state='action';a.next=time+4.5;}else {a.state='idle';a.next=time+3+a.index*.17;}
   a.label.dataset.state=a.state;
  }
  if(a.state==='walk'){const u=Math.min(1,(time-a.started)/2.8);a.rig.root.position.lerpVectors(a.from,a.target,u);const angle=a.target.x>a.from.x?.18:-.18;a.rig.root.rotation.y=T.MathUtils.lerp(a.rig.root.rotation.y,angle,.04);}
  else a.rig.root.rotation.y=T.MathUtils.lerp(a.rig.root.rotation.y,Math.sin(time*.4+a.index)*.05,.025);
  animateTextureCharacter(a.rig,reduced.matches?0:time+a.index,a.state==='walk'&&!reduced.matches,a.state==='action'&&!reduced.matches);
  const point=a.rig.root.position.clone().add(new T.Vector3(0,-.04,.36)).project(room.camera);
  a.label.style.left=((point.x+1)/2*room.element.clientWidth)+'px';a.label.style.top=((-point.y+1)/2*room.element.clientHeight)+'px';
  const top=a.rig.root.position.clone().add(new T.Vector3(0,a.rig.height*a.rig.root.scale.y+.1,0)).project(room.camera);
  a.bubble.style.bottom=((top.y-point.y)/2*room.element.clientHeight+20)+'px';
  a.bubble.hidden=a.state!=='action'||room.agents.some(other=>other.index<a.index&&other.state==='action');
  const effectPoint=a.rig.root.position.clone().add(new T.Vector3(a.rig.width*a.rig.root.scale.x*.46+.1,a.rig.height*a.rig.root.scale.y*.65,.12)).project(room.camera);
  a.effect.style.left=((effectPoint.x+1)/2*room.element.clientWidth)+'px';a.effect.style.top=((-effectPoint.y+1)/2*room.element.clientHeight)+'px';a.effect.hidden=a.state!=='action';
 });
 room.renderer.render(room.scene,room.camera);
}
// Clock-driven only: no pointer, drag, keyboard, raycaster or orbit controls.
function frame(now){requestAnimationFrame(frame);if(now-last<33)return;const dt=last?Math.min((now-last)/1000,.1):0;last=now;if(document.hidden)return;timeline+=dt;rooms.forEach(room=>{if(room.visible)render(room,timeline);});}
requestAnimationFrame(frame);
