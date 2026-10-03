import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from '../js/vendor/three.module.min.js';
import {characters,createCharacter,animateCharacter} from '../js/character-models.js';
let meshCount=0,frames=0;
for(const c of characters){
 const rig=createCharacter(c.id);rig.root.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(rig.root),size=bounds.getSize(new T.Vector3());
 assert.ok(size.z>.5&&size.x>.65&&size.y>1.8,c.id+' must have full volume');
 rig.root.traverse(obj=>{assert.ok(!obj.isSprite);if(obj.isMesh){meshCount++;assert.ok(!obj.material.map,'No character image textures');assert.ok(obj.geometry.type!=='PlaneGeometry');for(const value of obj.geometry.attributes.position.array)assert.ok(Number.isFinite(value));}});
 for(const walking of [false,true])for(const acting of [false,true])for(let time=0;time<4;time+=.13){animateCharacter(rig,time,walking,acting);rig.root.updateMatrixWorld(true);for(const limb of rig.limbs)assert.ok(limb.quaternion.toArray().every(Number.isFinite));frames++;}
 const b=await readFile(new URL('../assets/contact/models/'+c.id+'.glb',import.meta.url));
 assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);
 const length=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+length).toString());
 const binaryStart=20+length+8;assert.equal(g.buffers[0].byteLength,b.length-binaryStart);
 for(const v of g.bufferViews)assert.ok(v.byteOffset+v.byteLength<=g.buffers[0].byteLength);
 for(const n of g.nodes){if(n.mesh!==undefined)assert.ok(g.meshes[n.mesh]);for(const child of n.children||[])assert.ok(g.nodes[child]);assert.ok(n.rotation.every(Number.isFinite));}
 assert.deepEqual(g.animations.map(a=>a.name),['Idle','Walk','Signature']);
 for(const animation of g.animations)for(const channel of animation.channels){assert.ok(g.nodes[channel.target.node]);const sampler=animation.samplers[channel.sampler];assert.ok(g.accessors[sampler.input]);assert.ok(g.accessors[sampler.output]);assert.equal(g.accessors[sampler.input].count,g.accessors[sampler.output].count);}
 assert.equal(g.images,undefined);assert.equal(g.textures,undefined);
}
console.log(JSON.stringify({models:characters.length,volumetricMeshes:meshCount,rigPoseFrames:frames,glbStructure:'valid',imagePlanes:0}));
