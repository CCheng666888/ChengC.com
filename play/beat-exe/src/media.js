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
  function beginPlayback(media,timeout=20000){
    let timer;
    const expired=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('媒体加载超时，请检查网络后重试')),timeout);});
    let request;
    try{request=media.play();}catch(error){clearTimeout(timer);return Promise.reject(error);}
    return Promise.race([Promise.resolve(request),expired]).finally(()=>clearTimeout(timer));
  }
  const api={timeline,phaseAt,beginPlayback};
  root.BeatMedia=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
