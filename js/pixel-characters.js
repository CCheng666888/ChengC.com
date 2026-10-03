import * as T from './vendor/three.module.min.js';
import {characters} from './character-data.js';

// Authored 48x64 pixel-grid frames, rather than original PNG illustrations
// pasted into the room or image filters applied to those illustrations.
export async function createPixelCharacter(id){
 const config=characters.find(c=>c.id===id),map=await new T.TextureLoader().loadAsync(new URL('../assets/contact/pixel/'+id+'.png',import.meta.url).href);
 map.colorSpace=T.SRGBColorSpace;map.magFilter=T.NearestFilter;map.minFilter=T.NearestFilter;map.generateMipmaps=false;map.repeat.set(1/8,1);map.updateMatrix();
 const height=2.35,width=height*48/64,root=new T.Group();root.name=id;root.userData={kind:'authored-pixel-sprite',frameSize:[48,64],frames:8};
 const front=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map,transparent:true,alphaTest:.5,side:T.DoubleSide,toneMapped:false}));
 front.position.y=height/2-height/64;front.castShadow=true;
 front.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map,alphaTest:.5});root.add(front);
 return {root,config,front,map,height,width,frame:0};
}
export function animatePixelCharacter(character,time,walking,acting){
 let frame=0;
 if(walking)frame=2+Math.floor(time*7)%4;
 else if(acting)frame=6+Math.floor(time*2)%2;
 else frame=(time%4.2)>4?1:0;
 if(frame!==character.frame){character.frame=frame;character.map.offset.x=frame/8;character.map.updateMatrix();}
 character.root.rotation.z=0;
}
