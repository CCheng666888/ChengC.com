import * as T from './vendor/three.module.min.js';

// Character reference images are design references only. Every visible body,
// hair lock, garment and prop below is a solid mesh, with no image planes.
export const characters = [
 {id:'firefly',name:'流萤',world:'astral',hair:'#d4d6c9',cloth:'#f0f0df',dark:'#334a4d',accent:'#82d3b8',eyes:'#9978b6',style:'long',action:'cake',line:'尝一口橡木蛋糕'},
 {id:'sparkle',name:'花火',world:'astral',hair:'#392326',cloth:'#a32738',dark:'#241d27',accent:'#edbd77',eyes:'#c34454',style:'pony',action:'trick',line:'变个戏法，开场啦'},
 {id:'sparxie',name:'火花',world:'astral',hair:'#fff0ef',cloth:'#c7334e',dark:'#24242d',accent:'#f29cbc',eyes:'#d65f83',style:'twins',action:'stream',line:'对着镜头比个心'},
 {id:'castorice',name:'遐蝶',world:'astral',hair:'#d3b5e2',cloth:'#65518e',dark:'#2c273e',accent:'#d99aed',eyes:'#a360b7',style:'long',action:'butterfly',line:'等一只蝴蝶停下来'},
 {id:'jingyuan',name:'景元',world:'astral',hair:'#e5e3d9',cloth:'#e6dfc6',dark:'#35353c',accent:'#c8965c',eyes:'#b88b4a',style:'mane',action:'nap',line:'闭目养神片刻'},
 {id:'robin',name:'知更鸟',world:'astral',hair:'#a6bae8',cloth:'#e9e6ef',dark:'#7566a2',accent:'#e1ca85',eyes:'#8295cf',style:'long',action:'sing',line:'轻轻哼一段旋律'},
 {id:'sunday',name:'星期日',world:'astral',hair:'#8eabc0',cloth:'#dedfe2',dark:'#394768',accent:'#d2b874',eyes:'#cca557',style:'short',action:'conduct',line:'为旋律打个拍子'},
 {id:'aventurine',name:'砂金',world:'astral',hair:'#e3bd7c',cloth:'#287d73',dark:'#34383e',accent:'#e3bb77',eyes:'#986aca',style:'short',action:'coin',line:'抛起一枚幸运筹码'},
 {id:'yingzheng',name:'嬴政',world:'qin',hair:'#252329',cloth:'#27272b',dark:'#571f27',accent:'#d6ae62',eyes:'#755747',style:'bound',action:'edict',line:'阅过一卷奏章'},
 {id:'lisi',name:'李斯',world:'qin',hair:'#35302d',cloth:'#39342e',dark:'#642b28',accent:'#bba065',eyes:'#514133',style:'bound',action:'scroll',line:'伏案整理简牍'},
 {id:'mengtian',name:'蒙恬',world:'qin',hair:'#d9d5c2',cloth:'#3a3e3e',dark:'#7f3034',accent:'#a9a993',eyes:'#604942',style:'helmet',action:'patrol',line:'巡视长廊与城防'},
 {id:'wangjian',name:'王翦',world:'qin',hair:'#483933',cloth:'#454941',dark:'#863529',accent:'#a48c62',eyes:'#514139',style:'bound',action:'map',line:'细看行军地形'}
];
const materials=new Map(),geometries=new Map();
function mat(color,metal=0){const key=color+':'+metal;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:metal?.46:.78,metalness:metal}));return materials.get(key);}
function mesh(parent,geo,color,pos,size,metal=0){const m=new T.Mesh(geo,mat(color,metal));if(pos)m.position.set(...pos);if(size)m.scale.set(...size);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cached(key,make){if(!geometries.has(key))geometries.set(key,make());return geometries.get(key);}
function ell(p,c,pos,size){return mesh(p,cached('sphere',()=>new T.SphereGeometry(1,20,14)),c,pos,size);}
function box(p,c,pos,size,metal=0){return mesh(p,cached('box',()=>new T.BoxGeometry(1,1,1)),c,pos,size,metal);}
function cone(p,c,pos,top,bottom,height,metal=0){return mesh(p,new T.CylinderGeometry(top,bottom,height,16),c,pos,null,metal);}
function ring(p,c,pos,radius,tube=.022){return mesh(p,new T.TorusGeometry(radius,tube,6,36),c,pos,null,.55);}
function group(p,name,pos){const g=new T.Group();g.name=name;if(pos)g.position.set(...pos);p.add(g);return g;}
function tube(p,c,points,radius=.015){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),16,radius,6,false),c);}
// Tapered hair locks have closed cross sections in side and back views.
function lock(parent,color,points,radius){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),frames=curve.computeFrenetFrames(12,false),positions=[],indices=[];
 for(let i=0;i<=12;i++){const center=curve.getPoint(i/12),r=radius*Math.max(.045,Math.sin((.13+i/12*.86)*Math.PI));
  for(let j=0;j<8;j++){const v=center.clone().addScaledVector(frames.normals[i],Math.cos(j/8*Math.PI*2)*r).addScaledVector(frames.binormals[i],Math.sin(j/8*Math.PI*2)*r);positions.push(v.x,v.y,v.z);if(i<12){const a=i*8+j,b=i*8+(j+1)%8;indices.push(a,b,a+8,b,b+8,a+8);}}}
 for(let j=1;j<7;j++){indices.push(0,j+1,j);indices.push(96,96+j,96+j+1);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(parent,geo,color);
}
function jewel(p,c,pos,size=.065){return mesh(p,new T.OctahedronGeometry(size),c,pos,null,.4);}
function bow(p,c,pos,s=.13){const g=group(p,'ribbon',pos);for(const side of [-1,1]){const m=ell(g,c,[side*s*.65,0,0],[s*.7,s*.43,s*.25]);m.rotation.z=side*.3;}ell(g,c,[0,0,.025],[s*.22,s*.25,s*.3]);return g;}
function flower(p,c,pos,s=.075){const g=group(p,'flower',pos);for(let i=0;i<5;i++){const a=i/5*Math.PI*2,m=ell(g,c,[Math.sin(a)*s*.6,Math.cos(a)*s*.6,0],[s*.38,s*.64,s*.25]);m.rotation.z=-a;}ell(g,'#efdaab',[0,0,.025],[s*.3,s*.3,s*.25]);return g;}
function wing(p,c,pos,side=1){const g=group(p,'feather-wing',pos);for(let i=0;i<4;i++){const m=ell(g,c,[side*(.035+i*.035),-.02-i*.035,-i*.006],[.07,.13-i*.012,.027]);m.rotation.z=side*(.45+i*.13);}return g;}
function tablet(p,c,pos,width=.27){const g=group(p,'bamboo-memorial',pos);for(let i=0;i<7;i++)box(g,c,[(i-3)*width/7,0,0],[width/8,.25,.035]);for(const y of [-.075,.075])box(g,'#624b39',[0,y,.025],[width,.012,.018]);return g;}
function hair(head,c){
 mesh(head,new T.SphereGeometry(1,24,14,0,Math.PI*2,0,Math.PI*(c.id==='yingzheng'?.43:.51)),c.hair,[0,.025,-.015],[.505,.48,.445]);ell(head,c.hair,[0,.02,-.18],[.48,.46,.30]);
 if(c.style==='helmet'||c.style==='bound')return;
 for(let i=0;i<6;i++){const x=-.35+i*.14;lock(head,c.hair,[[x*.85,.32,.22],[x,.16,.40],[x+.035,-.02+(i%2)*.07,.409]],.11);}
 const long=['long','mane','twins','pony'].includes(c.style);
 for(const side of [-1,1]){lock(head,c.hair,[[side*.38,.22,0],[side*.47,-.18,.04],[side*.40,long?-.63:-.34,.01]],.15);if(long&&c.style!=='twins')for(let i=0;i<3;i++)lock(head,c.hair,[[side*(.22+i*.09),.08,-.30],[side*(.27+i*.09),-.36,-.32],[side*(.34+i*.06),-.75+(i%2)*.08,-.25]],.12);}
 if(c.style==='twins')for(const side of [-1,1]){bow(head,c.dark,[side*.48,.15,0],.095);for(let j=0;j<3;j++)lock(head,j===1?c.accent:c.hair,[[side*.47,.17,-.06],[side*(.65+j*.015),-.13,-.08],[side*(.62-j*.06),-.66,-.02]],.11);}
 if(c.style==='pony'){bow(head,c.cloth,[.43,.24,-.22]);for(let i=0;i<4;i++)lock(head,c.hair,[[.43,.25,-.20],[.62,-.02,-.25],[.57+i*.06,-.61+i*.06,-.30]],.12);}
 if(c.style==='mane')for(let i=0;i<6;i++)lock(head,c.hair,[[-.28+i*.11,.40,-.13],[-.25+i*.13,.49,-.16],[-.40+i*.15,.14,-.28]],.1);
}
function face(head,c){
 const skin=c.world==='qin'?'#efccb0':'#ffe3d1',emperor=c.id==='yingzheng';ell(head,skin,[0,0,0],[.465,.445,.40]);
 for(const s of [-1,1]){ell(head,skin,[s*.455,-.06,0],[.065,.10,.07]);const eye=group(head,'eye'+s,[s*.175,-.07,.361]);eye.rotation.y=s*.19;
  ell(eye,'#fff9f4',[0,0,0],[.103,emperor?.079:.124,.018]);ell(eye,c.eyes,[0,-.002,.015],[.062,emperor?.061:.089,.019]);ell(eye,'#292535',[0,.013,.028],[.034,emperor?.046:.067,.009]);ell(eye,'#ffffff',[-.021,.04,.04],[.021,emperor?.017:.026,.008]);
  tube(head,c.hair,[[s*.08,.095,.388],[s*.17,.116,.38],[s*.27,.098,.33]],emperor?.019:.012);if(!emperor)ell(head,'#e9a99e',[s*.29,-.19,.304],[.068,.025,.008]);}
 ell(head,skin,[0,-.13,.394],[.034,.044,.03]);tube(head,'#985e55',[[-.06,-.239,.336],[0,-.255,.344],[.06,-.239,.336]],.008);
}
export function createCharacter(id){
 const c=characters.find(c=>c.id===id);if(!c)throw new Error('Unknown character '+id);
 const root=new T.Group();root.name=id;root.userData={character:c.name,source:'reference-based reconstruction',kind:'volumetric-3d',rig:'head, arms, legs'};
 const rig={root,config:c,limbs:[],effects:[]},body=group(root,'body',[0,0,0]);rig.body=body;
 const skin=c.world==='qin'?'#efccb0':'#ffe3d1',male=['jingyuan','sunday','aventurine'].includes(id),qin=c.world==='qin';
 for(const s of [-1,1]){const leg=group(body,'leg'+s,[s*.13,.41,0]);cone(leg,male||qin?c.dark:skin,[0,-.13,0],.069,.072,.27);ell(leg,c.dark,[0,-.325,.04],[.095,.085,.155]);if(!male&&!qin)cone(leg,c.dark,[0,-.24,0],.07,.08,.12);rig.limbs.push(leg);}
 ell(body,c.cloth,[0,.78,0],[.26,.30,.16]);
 if(qin){const robe=cone(body,c.cloth,[0,.47,0],.235,.335,.65);robe.scale.z=.65;for(const s of [-1,1]){const m=box(body,c.dark,[s*.10,.89,.154],[.08,.37,.025]);m.rotation.z=s*.42;}box(body,c.accent,[0,.69,.16],[.47,.042,.022],.3);for(let i=-2;i<=2;i++)box(body,c.dark,[i*.055,.44,.217],[.018,.40,.02]);}
 else if(!male){const skirt=cone(body,c.cloth,[0,.46,0],.18,.32,.32);skirt.scale.z=.75;const trim=cone(body,c.accent,[0,.298,0],.32,.33,.03);trim.scale.z=.75;for(let i=0;i<10;i++){const a=i/10*Math.PI*2,m=box(body,c.dark,[Math.sin(a)*.254,.44,Math.cos(a)*.19],[.023,.24,.018]);m.rotation.y=a;}bow(body,c.accent,[0,.87,.177],.072);}
 else {for(const s of [-1,1]){const m=box(body,c.dark,[s*.08,.84,.17],[.078,.34,.035]);m.rotation.z=s*.32;}box(body,c.accent,[0,.61,.15],[.43,.04,.028],.3);for(const s of [-1,1]){const m=box(body,c.cloth,[s*.20,.44,-.07],[.10,.38,.08]);m.rotation.z=-s*.16;}}
 for(const s of [-1,1]){const arm=group(body,'arm'+s,[s*.255,.95,0]);arm.rotation.z=s*.12;const sleeve=cone(arm,qin?c.dark:c.cloth,[0,-.13,0],.09,qin?.145:.075,.28);sleeve.scale.z=.85;ell(arm,skin,[0,-.295,.01],[.071,.075,.075]);rig.limbs.push(arm);if(s===-1)rig.leftArm=arm;else rig.rightArm=arm;}
 const head=group(body,'head',[0,1.43,0]);rig.head=head;face(head,c);hair(head,c);
 if(id==='firefly'){tube(head,c.dark,[[-.47,.08,.05],[-.33,.35,.32],[0,.41,.35],[.33,.35,.32],[.47,.08,.05]],.045);bow(head,c.accent,[.47,.20,.07],.11);jewel(body,c.accent,[0,.78,.20]);for(const s of [-1,1]){const p=box(body,c.dark,[s*.13,.84,.145],[.065,.3,.036]);p.rotation.z=s*.15;}}
 if(id==='sparkle'){flower(head,'#e66361',[.37,.23,.27],.11);flower(head,'#f6d2b3',[.44,.08,.20],.075);const mask=group(head,'fox-mask',[-.44,.19,.10]);mask.rotation.z=.35;ell(mask,'#f2e9da',[0,0,0],[.11,.145,.05]);for(const s of [-1,1]){const m=cone(mask,'#f3eadd',[s*.06,.13,0],0,.045,.12);m.rotation.z=-s*.25;ell(mask,c.cloth,[s*.043,-.005,.048],[.028,.018,.008]);}box(body,c.dark,[0,.66,.18],[.43,.09,.05]);bow(body,c.accent,[.17,.66,.22],.09);}
 if(id==='sparxie'){for(const s of [-1,1]){const m=box(head,c.dark,[s*.12,.46,-.06],[.065,.25,.04]);m.rotation.z=-s*.36;}jewel(body,'#f6d1e1',[0,.86,.19]);box(body,c.dark,[0,.65,.17],[.43,.065,.03]);for(let i=0;i<3;i++)ell(body,'#ddd1ca',[-.16+i*.16,.66,.195],[.014,.014,.014]);}
 if(id==='castorice'){for(let i=0;i<5;i++)flower(head,i%2?c.accent:'#e6d8ee',[-.33+i*.16,.40-Math.abs(i-2)*.026,.24],.075);for(const s of [-1,1]){const m=ell(body,c.dark,[s*.32,.62,-.09],[.105,.35,.12]);m.rotation.z=s*.23;}jewel(body,c.accent,[0,.88,.21],.05);}
 if(id==='robin'||id==='sunday'){const halo=ring(head,c.accent,[0,.62,-.08],.30,.023);halo.rotation.x=.55;for(const s of [-1,1])wing(head,id==='robin'?'#e4dbef':'#b7c6d8',[s*.43,-.06,.035],s);if(id==='robin'){bow(head,c.dark,[-.40,-.34,-.08]);jewel(body,c.accent,[0,.87,.20]);}else for(const s of [-1,1])jewel(head,c.accent,[s*.24,.57,-.06],.052);}
 if(id==='jingyuan'){const m=ell(body,c.accent,[.26,.92,.025],[.17,.13,.18]);m.rotation.z=-.15;const cape=cone(body,c.dark,[0,.65,-.15],.24,.38,.60);cape.scale.z=.35;bow(head,c.dark,[.27,.24,-.35],.11);for(let i=0;i<3;i++)box(body,c.dark,[-.13+i*.13,.81,.155],[.035,.25,.04]);}
 if(id==='aventurine'){for(const s of [-1,1]){const lens=ell(head,'#564c68',[s*.19,.17,.373],[.115,.075,.027]);lens.rotation.z=s*.16;ring(head,c.accent,[s*.19,.17,.387],.083,.009).scale.y=.65;}tube(head,c.accent,[[-.07,.17,.402],[0,.19,.416],[.07,.17,.402]],.008);const coat=cone(body,c.cloth,[0,.50,-.15],.23,.34,.45);coat.scale.z=.35;jewel(body,c.accent,[0,.89,.194]);for(const s of [-1,1])ell(body,'#e2d4b6',[s*.24,.91,.02],[.11,.1,.11]);}
 if(qin){
  if(id==='yingzheng'||id==='lisi'){cone(head,c.hair,[0,.43,-.08],.22,.30,.20);const crown=box(head,c.cloth,[0,.57,-.005],[id==='yingzheng'?.73:.66,.075,.43]);crown.rotation.z=id==='lisi'?-.07:0;box(head,c.accent,[0,.58,.22],[.74,.035,.022],.55);
   if(id==='yingzheng')for(const z of [-.20,.23])for(let i=-3;i<=3;i++){tube(head,c.accent,[[i*.087,.565,z],[i*.087,.35,z]],.004);for(let j=0;j<4;j++)ell(head,c.accent,[i*.087,.50-j*.05,z],[.013,.016,.013]);}
   else {for(const s of [-1,1]){box(head,c.dark,[s*.39,.045,.015],[.063,.64,.045]);box(head,c.accent,[s*.43,.36,.015],[.12,.035,.047]);}lock(head,c.hair,[[0,-.245,.335],[.015,-.35,.32],[.015,-.44,.23]],.045);for(const s of [-1,1])tube(head,c.hair,[[0,-.19,.37],[s*.065,-.205,.355],[s*.09,-.19,.34]],.011);}
  } else {
   if(id==='mengtian'){mesh(head,new T.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI*.48),c.cloth,[0,.07,-.01],[.52,.50,.44]);box(head,c.accent,[0,.11,.424],[.82,.065,.055],.45);for(const s of [-1,1]){const guard=box(head,c.cloth,[s*.44,-.03,.075],[.13,.31,.18]);guard.rotation.z=s*.15;}for(let i=0;i<5;i++)lock(head,c.hair,[[0,.56-i*.035,-.09],[0,.71-i*.045,-.23],[0,.41-i*.055,-.43]],.09);}
   else {cone(head,c.hair,[0,.44,-.04],.065,.17,.19);bow(head,c.dark,[0,.47,-.04],.07);lock(head,c.hair,[[0,-.27,.33],[.01,-.36,.28],[0,-.44,.18]],.08);}
   for(let y=0;y<3;y++)for(let x=0;x<5;x++)box(body,c.cloth,[(x-2)*.074,.61+y*.10,.178],[.069,.083,.039],.3);for(const s of [-1,1])ell(body,c.cloth,[s*.27,.95,0],[.15,.10,.15]);const cape=cone(body,c.dark,[0,.58,-.20],.22,.36,.53);cape.scale.z=.35;
  }
  if(id==='yingzheng'){
   body.scale.y=1.18;head.scale.set(.84,.72,.90);head.position.y=1.42;
   cone(body,skin,[0,1.10,.045],.10,.11,.26).name='neck';
   cone(body,c.cloth,[0,1.075,0],.105,.12,.07);
   for(const s of [-1,1]){jewel(body,c.accent,[s*.16,.84,.16],.046);tube(body,c.accent,[[s*.20,.58,.19],[s*.25,.49,.205],[s*.20,.39,.217],[s*.26,.29,.22]],.011);}
   const hem=cone(body,c.accent,[0,.163,0],.33,.336,.025,.4);hem.scale.z=.65;
   for(const arm of [rig.leftArm,rig.rightArm])cone(arm,c.accent,[0,-.25,0],.137,.143,.025,.4).scale.z=.85;
   const sword=group(body,'sheathed-sword',[-.30,.51,-.02]);sword.rotation.z=-.20;box(sword,c.dark,[0,-.11,0],[.055,.55,.06]);box(sword,c.accent,[0,.19,0],[.14,.035,.07],.6);cone(sword,c.accent,[0,.27,0],.026,.026,.14,.5);
  }
 }
 rig.prop=makeProp(rig,c);return rig;
}
function makeProp(rig,c){
 const g=group(rig.rightArm,'action-prop',[0,-.29,.10]);g.visible=false;const effect=group(rig.root,'effect',[0,1.08,.35]);effect.visible=false;rig.effect=effect;
 switch(c.action){
 case 'cake':cone(g,'#d6be8f',[0,.055,.05],.10,.10,.10);cone(g,'#f5e4c8',[0,.117,.05],.101,.101,.026);ell(g,'#a83448',[0,.15,.05],[.022,.026,.023]);break;
 case 'coin':ring(g,c.accent,[0,.05,.02],.08,.024);cone(g,c.accent,[0,.05,.02],.074,.074,.025,.7).rotation.x=Math.PI/2;break;
 case 'trick':box(g,'#eee2cf',[0,.07,.015],[.17,.24,.03]).rotation.z=.15;jewel(g,c.cloth,[0,.07,.037],.043);break;
 case 'stream':box(g,c.dark,[0,.06,.02],[.115,.20,.036]);box(g,'#d699b7',[0,.07,.043],[.089,.14,.01]);for(const s of [-1,1])ell(effect,c.accent,[s*.04,.09,0],[.07,.07,.038]);cone(effect,c.accent,[0,.025,0],.10,0,.15).scale.z=.4;break;
 case 'sing':cone(g,'#414653',[0,.04,.01],.025,.025,.16,.3);ell(g,'#cab7a0',[0,.15,.01],[.045,.06,.045]);break;
 case 'conduct':cone(g,'#e8e1d3',[0,.17,.01],.006,.012,.38);break;
 case 'butterfly':for(const s of [-1,1]){const w=ell(effect,c.accent,[s*.075,0,0],[.095,.11,.02]);w.rotation.z=-s*.5;rig.effects.push(w);ell(effect,c.dark,[s*.05,-.11,0],[.06,.064,.02]);}ell(effect,c.dark,[0,-.045,0],[.013,.10,.017]);break;
 case 'edict':case 'scroll':tablet(g,c.accent,[0,.04,.03]);break;
 case 'map':box(g,'#bfa575',[0,.035,.03],[.33,.23,.028]).rotation.x=-.3;tube(g,c.dark,[[-.12,.03,.053],[0,.09,.053],[.11,.0,.053]],.009);break;
 case 'patrol':cone(g,'#634a34',[0,.20,0],.015,.015,.78);cone(g,c.accent,[0,.64,0],0,.035,.13,.5);g.visible=true;break;
 }
 return g;
}
export function animateCharacter(rig,time,walking,acting){
 const c=rig.config,phase=time*7;rig.limbs.forEach((l,i)=>l.rotation.x=walking?Math.sin(phase+(i%2)*Math.PI)*.27:0);
 rig.body.rotation.z=walking?Math.sin(phase)*.025:Math.sin(time*1.7)*.012;rig.body.position.y=walking?Math.abs(Math.sin(phase))*.025:0;
 rig.head.rotation.x=acting&&c.action==='nap'?.18:Math.sin(time*.9)*.028;rig.head.rotation.y=acting?Math.sin(time)*.10:Math.sin(time*.7)*.035;
 rig.leftArm.rotation.z=-.12;rig.rightArm.rotation.z=.12;rig.prop.visible=c.action==='patrol'||acting;rig.effect.visible=false;
 if(acting){rig.rightArm.rotation.x=-.9;rig.rightArm.rotation.z=-.25;
  if(['cake','edict','scroll','map'].includes(c.action)){rig.leftArm.rotation.x=-.9;rig.leftArm.rotation.z=.28;rig.rightArm.rotation.z=-.28;}
  if(c.action==='coin'){rig.rightArm.rotation.x=-.8+Math.sin(time*3)*.25;rig.prop.position.y=-.20+Math.abs(Math.sin(time*2))*.48;rig.prop.rotation.y=time*6;}
  if(c.action==='conduct'){rig.rightArm.rotation.x=-.9+Math.sin(time*3)*.25;rig.leftArm.rotation.x=-.5+Math.sin(time*3+.8)*.2;}
  if(c.action==='sing'){rig.rightArm.rotation.x=-1.35;rig.head.rotation.z=Math.sin(time*2)*.045;}
  if(c.action==='stream'||c.action==='butterfly'){rig.effect.visible=true;rig.effect.position.set(.3+Math.sin(time*1.5)*.11,1.15+Math.cos(time*1.8)*.10,.5);rig.effects.forEach((w,i)=>w.rotation.y=Math.sin(time*12)*(i%2?1:-1)*.7);}
  if(c.action==='trick'){rig.prop.rotation.z=Math.sin(time*3)*.3;rig.leftArm.rotation.x=-.45;}
  if(c.action==='nap'){rig.rightArm.rotation.x=0;rig.prop.visible=false;rig.head.rotation.z=.12;}
 }else {rig.head.rotation.z=0;rig.prop.position.y=-.29;rig.prop.rotation.set(0,0,0);}
}
export function buildRoom(scene,world){
 const qin=world==='qin',trim=qin?'#c2a46c':'#adbbd0',stage=new T.Group();stage.name=world+'-architecture';scene.add(stage);
 box(stage,qin?'#625440':'#35455c',[0,-.13,0],[24,.26,8]);for(let i=-12;i<=12;i++)box(stage,qin?'#807058':'#526279',[i,0,0],[.018,.01,8]);for(let i=-3;i<=3;i++)box(stage,qin?'#807058':'#526279',[0,0,i],[24,.01,.018]);
 if(qin){box(stage,'#342724',[0,3.8,-3.4],[24,.22,.8]);box(stage,trim,[0,3.62,-3.12],[24,.035,.05]);for(let i=-3;i<=3;i++){cone(stage,'#5b3230',[i*3.6,1.77,-3.3],.17,.22,3.5);box(stage,'#99805a',[i*3.6,.06,-3.3],[.62,.13,.65]);cone(stage,trim,[i*3.6,3.4,-3.3],.26,.26,.11,.3);}
  for(const x of [-7,7]){box(stage,'#382d28',[x,.32,-2.1],[.6,.64,.6]);const lamp=ell(stage,'#edc985',[x,.76,-2.1],[.23,.31,.23]);lamp.material=new T.MeshStandardMaterial({color:'#e4bb77',emissive:'#b57b32',emissiveIntensity:.6});for(let j=0;j<6;j++)box(stage,'#684f37',[x+Math.cos(j/6*6.28)*.23,.76,-2.1+Math.sin(j/6*6.28)*.23],[.017,.64,.017]);}
 }else {for(const x of [-10,10])box(stage,'#46516b',[x,1.8,-3.2],[.10,3.6,.15]);box(stage,'#65738e',[0,3.60,-3.2],[20,.08,.16]);for(const x of [-5.5,5.5]){box(stage,'#2b354b',[x,.28,-2.6],[3.5,.55,.75]);box(stage,'#53617b',[x,.9,-2.95],[3.5,.75,.2]);for(const s of [-1,1])box(stage,trim,[x+s*1.8,.52,-2.6],[.07,.1,.85]);}
  ell(stage,'#8692b8',[7,2.8,-4.2],[.6,.6,.6]);ring(stage,'#cbb896',[7,2.8,-4.2],.96,.018).rotation.set(.55,.1,.2);for(let i=0;i<32;i++){const star=ell(stage,'#d2e1f1',[-10+(i*7.13)%20,1.5+(i*.59)%3,-4.5],[.012,.012,.012]);star.castShadow=false;}
 }
 return stage;
}
