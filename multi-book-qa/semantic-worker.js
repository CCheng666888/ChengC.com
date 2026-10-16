/* Loaded only when the visitor explicitly enables semantic search. */
import {pipeline,env} from './lib/transformers.min.js';

env.remoteHost=new URL('models',self.location.href).href.replace(/\/$/,'');
env.allowLocalModels=false;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.wasmPaths={
  mjs:new URL('lib/ort-wasm-simd-threaded.asyncify.mjs',self.location.href).href,
  wasm:new URL('lib/ort-wasm-simd-threaded.asyncify.wasm',self.location.href).href
};
let extractor,loadTask,index,norms;
async function load(){
  if(extractor)return;
  if(loadTask)return loadTask;
  loadTask=(async()=>{
    const response=await fetch('semantic-index.json');
    if(!response.ok)throw Error('向量索引加载失败');
    index=await response.json();
    norms=new Float32Array(index.vec.length/index.dim);
    for(let i=0;i<norms.length;i++){
      let sum=0;for(let j=0;j<index.dim;j++)sum+=index.vec[i*index.dim+j]**2;
      norms[i]=Math.sqrt(sum);
    }
    extractor=await pipeline('feature-extraction','Xenova/bge-small-zh-v1.5',{
      dtype:'q8',device:'wasm',progress_callback:p=>{
        if(p.status==='progress_total'||p.status==='progress')self.postMessage({type:'progress',loaded:p.loaded,total:p.total});
        else if(p.status==='ready')self.postMessage({type:'progress',text:'正在完成语义引擎初始化…'});
      }
    });
  })();
  return loadTask;
}
self.onmessage=async event=>{
  const {id,type,query}=event.data;
  try{
    await load();
    if(type==='load'){self.postMessage({id,result:true});return;}
    // The bundled feature-extraction pipeline expects `pooling`, not `pool`.
    const output=await extractor('为这个句子生成表示以用于检索相关文章：'+query,{pooling:'cls',normalize:true});
    const vector=output.data;
    if(vector.length!==index.dim)throw Error('语义向量维度不匹配');
    let queryNorm=0;for(let j=0;j<index.dim;j++)queryNorm+=vector[j]**2;queryNorm=Math.sqrt(queryNorm);
    const scored=[];
    for(let i=0;i<norms.length;i++){
      let dot=0;for(let j=0;j<index.dim;j++)dot+=vector[j]*index.vec[i*index.dim+j];
      scored.push({i,s:dot/(queryNorm*norms[i]||1)});
    }
    scored.sort((a,b)=>b.s-a.s);self.postMessage({id,result:scored});
  }catch(error){self.postMessage({id,error:String(error.message||error)});}
};
