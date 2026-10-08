import { SAVE_KEY } from './Storage.js';

export async function openNativeStorage() {
  const config=globalThis.DOG_WALK_NATIVE;if(!config)return undefined;
  const headers={'X-DogWalk-Token':config.token};
  const response=await fetch('/api/save',{headers,cache:'no-store'});
  if(!response.ok)throw new Error('无法读取磁盘存档，请重新打开游戏。');
  const initial=await response.json();let cached=initial?JSON.stringify(initial):null;
  if(initial&&initial.version!==1)throw new Error('这份存档来自其他版本，原文件已保留。');
  // The game keeps its synchronous storage interface; disk writes are ordered and atomic.
  const backend={pending:Promise.resolve(),getItem:()=>cached,setItem(key,value){
    if(key!==SAVE_KEY)return;const before=cached;cached=value;
    this.pending=this.pending.then(async()=>{
      const reset=before&&JSON.parse(before).totalWalks>0&&JSON.parse(value).totalWalks===0;
      const result=await fetch('/api/save',{method:'POST',headers:{...headers,'Content-Type':'application/json',...(reset?{'X-DogWalk-Archive':'reset'}:{})},body:value,keepalive:true});
      if(!result.ok)throw new Error('Disk save failed');
      window.dispatchEvent(new CustomEvent('native-save-status',{detail:true}));
    }).catch(()=>{window.dispatchEvent(new CustomEvent('native-save-status',{detail:false}));});
  }};
  return backend;
}
