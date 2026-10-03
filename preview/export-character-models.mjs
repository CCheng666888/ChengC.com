import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {characters,createCharacter,animateCharacter} from '../js/character-models.js';
const output=new URL('../assets/contact/models/',import.meta.url);await mkdir(output,{recursive:true});
// Small glTF 2.0 exporter for these untextured mesh rigs. Includes reusable
// geometry buffers, hierarchical joints, and three sampled animation clips.
function exportRig(rig){
 const json={asset:{version:'2.0',generator:'ChenC reference-based miniature reconstruction'},scene:0,scenes:[{nodes:[0]}],nodes:[],meshes:[],materials:[],accessors:[],bufferViews:[],buffers:[],animations:[]};
 const chunks=[],nodes=new Map(),geos=new Map(),mats=new Map();let bytes=0;
 function accessor(array,type,minmax=false){
  const raw=Buffer.from(array.buffer,array.byteOffset,array.byteLength),padded=Buffer.alloc(Math.ceil(raw.length/4)*4);raw.copy(padded);
  const view=json.bufferViews.push({buffer:0,byteOffset:bytes,byteLength:raw.length})-1;chunks.push(padded);bytes+=padded.length;
  const item={bufferView:view,componentType:array instanceof Float32Array?5126:array instanceof Uint16Array?5123:5125,count:array.length/({SCALAR:1,VEC3:3,VEC4:4}[type]),type};
  if(minmax){const components=type==='SCALAR'?1:3;item.min=Array(components).fill(Infinity);item.max=Array(components).fill(-Infinity);for(let i=0;i<array.length;i++){item.min[i%components]=Math.min(item.min[i%components],array[i]);item.max[i%components]=Math.max(item.max[i%components],array[i]);}}
  return json.accessors.push(item)-1;
 }
 function geometry(g){if(!geos.has(g)){const attributes={POSITION:accessor(g.attributes.position.array,'VEC3',true),NORMAL:accessor(g.attributes.normal.array,'VEC3')};geos.set(g,{attributes,...(g.index?{indices:accessor(g.index.array,'SCALAR')}:{}),mode:4});}return geos.get(g);}
 function material(m){if(!mats.has(m))mats.set(m,json.materials.push({pbrMetallicRoughness:{baseColorFactor:[...m.color.toArray(),1],metallicFactor:m.metalness,roughnessFactor:m.roughness}})-1);return mats.get(m);}
 function visit(obj){
  const index=json.nodes.length;nodes.set(obj,index);const node={name:obj.name||obj.type,translation:obj.position.toArray(),rotation:obj.quaternion.toArray(),scale:obj.scale.toArray()};json.nodes.push(node);
  if(obj.isMesh)node.mesh=json.meshes.push({primitives:[{...geometry(obj.geometry),material:material(obj.material)}]})-1;
  if(Object.keys(obj.userData).length)node.extras=obj.userData;
  const children=obj.children.filter(child=>child!==rig.effect);if(children.length)node.children=children.map(visit);return index;
 }
 visit(rig.root);
 const joints=[rig.body,rig.head,...rig.limbs,rig.prop];
 for(const [name,walking,acting,duration] of [['Idle',false,false,3],['Walk',true,false,2],['Signature',false,true,4]]){
  const times=Float32Array.from({length:33},(_,i)=>i/32*duration),input=accessor(times,'SCALAR',true),clip={name,samplers:[],channels:[]};
  const samples=joints.map(()=>({rotation:[],translation:[]}));
  times.forEach(time=>{animateCharacter(rig,time,walking,acting);joints.forEach((joint,i)=>{samples[i].rotation.push(...joint.quaternion.toArray());samples[i].translation.push(...joint.position.toArray());});});
  joints.forEach((joint,i)=>{for(const path of ['rotation','translation']){const sampler=clip.samplers.push({input,output:accessor(new Float32Array(samples[i][path]),path==='rotation'?'VEC4':'VEC3'),interpolation:'LINEAR'})-1;clip.channels.push({sampler,target:{node:nodes.get(joint),path}});}});
  json.animations.push(clip);
 }
 json.buffers=[{byteLength:bytes}];const binary=Buffer.concat(chunks),encoded=Buffer.from(JSON.stringify(json)),text=Buffer.alloc(Math.ceil(encoded.length/4)*4,32);encoded.copy(text);
 const total=12+8+text.length+8+binary.length,header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(total,8);jh.writeUInt32LE(text.length,0);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(binary.length,0);bh.writeUInt32LE(0x004e4942,4);
 return {buffer:Buffer.concat([header,jh,text,bh,binary]),json};
}
const summary=[];
for(const character of characters){
 const rig=createCharacter(character.id),{buffer,json}=exportRig(rig);
 assert.equal(json.images,undefined,'Character must not be a flat image');assert.equal(json.animations.length,3);
 assert.ok(json.meshes.length>40);assert.ok(json.nodes.length>json.meshes.length);
 for(const g of json.accessors){if(g.type==='VEC3'&&g.min){assert.ok(g.min.every(Number.isFinite));assert.ok(g.max.every(Number.isFinite));}}
 const path=new URL(character.id+'.glb',output);await writeFile(path,buffer);
 const saved=await readFile(path);assert.equal(saved.readUInt32LE(0),0x46546c67);assert.equal(saved.length,saved.readUInt32LE(8));
 summary.push({id:character.id,name:character.name,meshes:json.meshes.length,joints:7,animations:json.animations.map(a=>a.name),bytes:buffer.length});
}
await writeFile(new URL('manifest.json',output),JSON.stringify(summary,null,2));
console.log(JSON.stringify({exported:summary.length,totalMB:(summary.reduce((n,m)=>n+m.bytes,0)/1048576).toFixed(2),directory:fileURLToPath(output)}));
