import * as T from './vendor/three.module.min.js';
import {characters} from './character-data.js';

// Original SD artwork is used directly as a two-dimensional sprite. There is
// no reconstructed face/body, procedural pixel art, or character volume mesh.
export async function createCutout(id){
 const config=characters.find(c=>c.id===id),texture=await new T.TextureLoader().loadAsync(new URL('../assets/contact/'+id+'.png',import.meta.url).href);
 texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.LinearFilter;
 const ratio=texture.image.width/texture.image.height,maxWidth=config.world==='qin'?1.70:1.90,height=Math.min(2.35,maxWidth/ratio),width=height*ratio;
 const root=new T.Group();root.name=id;root.userData={kind:'original-sd-sprite',character:config.name};
 const front=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.10,side:T.DoubleSide,toneMapped:false}));
 front.position.y=height/2;front.castShadow=true;
 front.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:texture,alphaTest:.25});root.add(front);
 return {root,config,front,height,width};
}
export function animateCutout(cutout,time,walking,acting){
 // Only intact original art moves. These motions are page behavior, not a claim
// that the static source picture contains official walking animation frames.
 cutout.root.rotation.z=walking?Math.sin(time*8)*.018:Math.sin(time*1.8)*.006;
 if(acting)cutout.root.rotation.z+=cutout.config.action==='nap'?.06:Math.sin(time*2)*.016;
}
