import * as T from './vendor/three.module.min.js';
import {characters} from './character-data.js';

// A compact articulated 2.5D puppet. The face and hair use the original image;
// added torso/limbs carry original clothing pixels and matching flat outlines.
// No face redraw, pixel-grid replacement, or rounded doll head is generated.
const INK='#302936',SKIN='#f0cbb5';
const HEAD_END={firefly:.82,sparkle:.75,sparxie:.82,castorice:.84,jingyuan:.82,robin:.83,sunday:.83,aventurine:.80,yingzheng:.55,lisi:.70,mengtian:.70,wangjian:.63};
function g(parent,name,pos){const v=new T.Group();v.name=name;if(pos)v.position.set(...pos);parent.add(v);return v;}
function material(color,map=null){return new T.MeshBasicMaterial({color,map,transparent:!!map,alphaTest:map?.10:0,side:T.DoubleSide,toneMapped:false});}
function polygon(parent,points,color,pos,map=null){
 const shape=new T.Shape();shape.moveTo(...points[0]);points.slice(1).forEach(p=>shape.lineTo(...p));shape.closePath();
 const geometry=new T.ShapeGeometry(shape);geometry.computeBoundingBox();const b=geometry.boundingBox,p=geometry.attributes.position,uv=geometry.attributes.uv;
 for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)-b.min.x)/(b.max.x-b.min.x),(p.getY(i)-b.min.y)/(b.max.y-b.min.y));
 const root=g(parent,'flat-piece',pos),outline=new T.Mesh(geometry,material(INK));outline.scale.set(1.10,1.06,1);outline.position.z=-.005;root.add(outline);
 const m=new T.Mesh(geometry,material(color));m.position.z=.002;m.castShadow=true;root.add(m);
 if(map){const original=new T.Mesh(geometry,material('#ffffff',map));original.position.z=.006;original.castShadow=true;original.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map,alphaTest:.25});root.add(original);}
 return root;
}
function oval(parent,color,pos,rx,ry){const pts=Array.from({length:16},(_,i)=>[Math.cos(i/16*6.283)*rx,Math.sin(i/16*6.283)*ry]);return polygon(parent,pts,color,pos);}
function patch(img,box){
 const canvas=document.createElement('canvas'),[x0,y0,x1,y1]=box;canvas.width=Math.max(1,Math.round(img.width*(x1-x0)));canvas.height=Math.max(1,Math.round(img.height*(y1-y0)));
 canvas.getContext('2d').drawImage(img,img.width*x0,img.height*y0,canvas.width,canvas.height,0,0,canvas.width,canvas.height);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
}
function clothingSwatch(img,color){
 const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
 const data=ctx.getImageData(0,0,img.width,img.height).data,target=new T.Color(color).convertLinearToSRGB(),rgb=[target.r*255,target.g*255,target.b*255];let best=Infinity,index=0;
 for(let i=0;i<data.length;i+=4)if(data[i+3]>240){const delta=(data[i]-rgb[0])**2+(data[i+1]-rgb[1])**2+(data[i+2]-rgb[2])**2;if(delta<best){best=delta;index=i/4;}}
 const sample=document.createElement('canvas');sample.width=sample.height=1;sample.getContext('2d').drawImage(img,index%img.width,Math.floor(index/img.width),1,1,0,0,1,1);
 const map=new T.CanvasTexture(sample);map.colorSpace=T.SRGBColorSpace;return map;
}
function prop(rig,c){
 const p=g(rig.rightArm,'persona-prop',[0,-.41,.08]);p.visible=false;
 if(['edict','scroll','map'].includes(c.action)){
  polygon(p,[[-.12,0],[.12,0],[.12,.22],[-.12,.22]],c.accent);
  for(let x=-.08;x<=.09;x+=.04)polygon(p,[[x,0],[x+.009,0],[x+.009,.22],[x,.22]],c.dark,[0,0,.01]);
 }else if(c.action==='cake'){
  polygon(p,[[-.08,0],[.08,0],[.08,.08],[-.08,.08]],'#be9664');polygon(p,[[-.08,.08],[.08,.08],[.06,.12],[-.06,.12]],'#f2dec1',[0,0,.01]);oval(p,'#a94450',[0,.12,.02],.015,.02);
 }else if(c.action==='coin')oval(p,c.accent,[0,.06,0],.075,.075);
 else if(c.action==='trick'){polygon(p,[[-.06,0],[.06,0],[.06,.18],[-.06,.18]],'#f0e5cb');polygon(p,[[0,.05],[.035,.08],[0,.12],[-.035,.08]],c.cloth,[0,0,.01]);}
 else if(c.action==='sing'){polygon(p,[[-.014,0],[.014,0],[.014,.17],[-.014,.17]],'#343747');oval(p,'#c7bbc0',[0,.18,.01],.035,.045);}
 else if(c.action==='conduct')polygon(p,[[-.006,0],[.006,0],[.006,.32],[-.006,.32]],'#f2e7cb');
 else if(c.action==='stream'){polygon(p,[[-.05,0],[.05,0],[.05,.16],[-.05,.16]],c.dark);polygon(p,[[-.035,.025],[.035,.025],[.035,.13],[-.035,.13]],c.accent,[0,0,.01]);}
 else if(c.action==='patrol'){polygon(p,[[-.008,-.30],[.008,-.30],[.008,.50],[-.008,.50]],'#87724f');polygon(p,[[0,.60],[.033,.50],[0,.44],[-.033,.50]],c.accent);}
 const effect=g(rig.root,'butterfly',[.42,1.25,.15]);effect.visible=false;
 if(c.action==='butterfly')for(const s of [-1,1])polygon(effect,[[0,0],[s*.11,.08],[s*.09,-.06],[s*.03,-.11]],c.accent);
 rig.effect=effect;return p;
}
export async function createTextureCharacter(id){
 const c=characters.find(c=>c.id===id),source=await new T.TextureLoader().loadAsync(new URL('../assets/contact/'+id+'.png',import.meta.url).href);
 source.colorSpace=T.SRGBColorSpace;
 const end=HEAD_END[id],headTexture=patch(source.image,[0,0,1,end]),clothTexture=patch(source.image,[.30,end,.70,.98]),clothSwatch=clothingSwatch(source.image,c.cloth);
 const root=new T.Group();root.name=id;root.userData={kind:'original-texture-articulated-puppet',originalArtwork:id+'.png'};
 const rig={root,config:c,limbs:[],height:2.25,width:1.22};
 const body=g(root,'torso',[0,0,0]);rig.body=body;
 // Feet, legs and sleeves are thin illustrated parts, with independent pivots.
 for(const s of [-1,1]){
  const leg=g(body,'leg'+s,[s*.13,.40,-.01]);
  polygon(leg,[[-.06,0],[.06,0],[.065,-.26],[-.065,-.26]],c.dark);
  polygon(leg,[[-.07,-.25],[.07,-.25],[.09,-.38],[-.09,-.38]],c.dark,[0,0,.02]);
  polygon(leg,[[-.065,-.28],[.065,-.28],[.065,-.30],[-.065,-.30]],c.accent,[0,0,.03]);rig.limbs.push(leg);
 }
 const qin=c.world==='qin',robe=qin||['jingyuan','sunday','aventurine'].includes(id);
 polygon(body,[[-.23,1.04],[.23,1.04],[.21,.57],[-.21,.57]],c.cloth,[0,0,.01],clothTexture);
 polygon(body,[[-.19,.60],[.19,.60],[.30,robe?.19:.40],[-.30,robe?.19:.40]],c.cloth,[0,0,.02],clothSwatch);
 polygon(body,[[-.24,.62],[.24,.62],[.24,.58],[-.24,.58]],c.accent,[0,0,.04]);
 polygon(body,[[-.18,1.05],[-.07,1.05],[.08,.84],[.025,.80]],c.dark,[0,0,.035]);
 polygon(body,[[.18,1.05],[.07,1.05],[-.08,.84],[-.025,.80]],c.dark,[0,0,.036]);
 oval(body,SKIN,[0,1.045,-.005],.065,.09);
 for(const s of [-1,1]){
  const arm=g(body,'arm'+s,[s*.26,.98,-.01]);
  polygon(arm,[[-.07,0],[.07,0],[.085,-.24],[-.085,-.24]],c.cloth,[0,0,0],clothSwatch);
  const forearm=g(arm,'forearm'+s,[0,-.23,.005]);
  polygon(forearm,[[-.065,0],[.065,0],[.065,-.16],[-.065,-.16]],c.cloth,null,clothSwatch);
  oval(forearm,SKIN,[0,-.18,.01],.056,.068);rig.limbs.push(arm);if(s===-1)rig.leftArm=arm;else rig.rightArm=arm;
 }
 const head=g(body,'original-head',[0,1.06,.07]);rig.head=head;
 const headWidth=1.18,headHeight=headWidth*headTexture.image.height/headTexture.image.width;
 const face=new T.Mesh(new T.PlaneGeometry(headWidth,headHeight),material('#ffffff',headTexture));face.position.y=headHeight/2;face.castShadow=true;
 face.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:headTexture,alphaTest:.25});head.add(face);
 rig.height=1.06+headHeight;rig.prop=prop(rig,c);return rig;
}
export function animateTextureCharacter(rig,time,walking,acting){
 rig.limbs.forEach((p,i)=>{p.rotation.z=walking?Math.sin(time*7+(i%2)*Math.PI)*(i<2?.16:.14):0;});
 rig.body.position.y=walking?Math.abs(Math.sin(time*7))*.014:0;
 rig.head.rotation.z=acting&&rig.config.action==='nap'?.075:Math.sin(time*.8)*.009;
 rig.leftArm.rotation.z=-.08;rig.rightArm.rotation.z=.08;
 if(walking){rig.leftArm.rotation.z+=Math.sin(time*7)*.16;rig.rightArm.rotation.z-=Math.sin(time*7)*.16;}
 rig.prop.visible=acting||rig.config.action==='patrol';rig.effect.visible=false;
 if(acting){
  const action=rig.config.action;rig.rightArm.rotation.z=1.1;
  if(['cake','edict','scroll','map'].includes(action)){rig.rightArm.rotation.z=1.0;rig.leftArm.rotation.z=-.85;}
  if(action==='coin'){rig.rightArm.rotation.z=.75+Math.sin(time*3)*.3;rig.prop.position.y=-.20+Math.abs(Math.sin(time*2))*.30;}
  if(action==='conduct'){rig.rightArm.rotation.z=1.2+Math.sin(time*3)*.25;rig.leftArm.rotation.z=-.6+Math.sin(time*3)*.13;}
  if(action==='sing')rig.rightArm.rotation.z=1.4;
  if(action==='butterfly'){rig.effect.visible=true;rig.effect.position.y=1.30+Math.sin(time*2)*.09;rig.effect.scale.x=.5+Math.abs(Math.sin(time*9))*.5;}
  if(action==='nap'){rig.rightArm.rotation.z=.12;rig.leftArm.rotation.z=-.12;rig.prop.visible=false;}
 }else {rig.prop.position.y=-.41;rig.head.rotation.z=Math.sin(time*.8)*.009;}
}
