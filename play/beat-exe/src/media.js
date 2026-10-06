(function(root){
  'use strict';
  function timeline(pack){
    const stages=pack?.stages||{};
    const bossStart=Number.isFinite(stages.bossStart)?stages.bossStart:20;
    const videoStart=Number.isFinite(stages.videoStart)?stages.videoStart:30;
    return {bossStart:Math.max(0,bossStart),videoStart:Math.max(bossStart,videoStart)};
  }
  function phaseAt(time,pack){const s=timeline(pack);return time<s.bossStart?0:time<s.videoStart?1:2;}
  // Start inside the click/submit event before awaiting loading; mobile playback needs user activation.
  function videoSource(pack,mobile=false){return mobile&&pack?.mobileVideo?pack.mobileVideo:pack?.video;}
  function createMissFlash(show,hide,{schedule=setTimeout,cancel=clearTimeout,random=Math.random}={}){
    let timer=null;
    function clear(){if(timer!==null)cancel(timer);timer=null;hide();}
    function trigger(grade,time,pack,hidden){
      // Treat simultaneous or overlapping misses as one fixed flash, without queuing photos.
      if(grade!=='MISS'||!hidden||phaseAt(time,pack)!==2||timer!==null)return false;
      const images=(pack?.missImages||[]).filter(src=>typeof src==='string'&&src.length);
      if(!images.length)return false;
      const index=Math.min(images.length-1,Math.max(0,Math.floor(random()*images.length)));
      const seconds=Number.isFinite(pack.missFlashDuration)&&pack.missFlashDuration>0?pack.missFlashDuration:.5;
      show(images[index]);timer=schedule(()=>{timer=null;hide();},seconds*1000);return true;
    }
    return {trigger,clear};
  }
  function beginPlayback(media,timeout=45000){
    let timer;
    let onPlaying,onError;
    const started=new Promise((resolve,reject)=>{
      onPlaying=resolve;
      onError=()=>reject(new Error(media.error?.code===4?'浏览器无法播放此媒体':'媒体加载失败，请检查网络后重试'));
      media.addEventListener?.('playing',onPlaying,{once:true});
      media.addEventListener?.('error',onError,{once:true});
      timer=setTimeout(()=>reject(new Error('媒体加载超时，请检查网络后重试')),timeout);
      // This call must remain synchronous in the actual tap/submit handler.
      try{const request=media.play();if(request?.then)request.then(resolve,reject);else if(!media.paused&&media.readyState>=2)resolve();}catch(error){reject(error);}
    });
    return started.finally(()=>{clearTimeout(timer);media.removeEventListener?.('playing',onPlaying);media.removeEventListener?.('error',onError);});
  }
  const api={timeline,phaseAt,videoSource,createMissFlash,beginPlayback};
  root.BeatMedia=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
