import * as T from './vendor/three.module.min.js';

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
