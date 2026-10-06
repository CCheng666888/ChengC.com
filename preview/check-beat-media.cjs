const assert=require('node:assert/strict'),media=require('../play/beat-exe/src/media.js');
(async()=>{
  const pack={stages:{bossStart:20,videoStart:30},video:'desktop.mp4',mobileVideo:'mobile.mp4'};
  for(const [t,phase] of [[0,0],[19.999,0],[20,1],[29.999,1],[30,2],[252,2]])assert.equal(media.phaseAt(t,pack),phase);
  assert.equal(media.videoSource(pack,true),'mobile.mp4');assert.equal(media.videoSource(pack,false),'desktop.mp4');assert.equal(media.videoSource({video:'shared.mp4'},true),'shared.mp4');
  let invoked=false;const start=media.beginPlayback({play(){invoked=true;return Promise.resolve();}});assert(invoked,'play() must execute in the original tap handler');await start;
  const denied=new DOMException('Gesture required','NotAllowedError');await assert.rejects(media.beginPlayback({play(){return Promise.reject(denied);}}),e=>e===denied);
  await assert.rejects(media.beginPlayback({play(){return new Promise(()=>{});}},5),/超时/);
  class LegacyMedia extends EventTarget{play(){setTimeout(()=>this.dispatchEvent(new Event('playing')),1);}}
  await media.beginPlayback(new LegacyMedia(),100);
  class BrokenMedia extends EventTarget{error={code:4};play(){setTimeout(()=>this.dispatchEvent(new Event('error')),1);return new Promise(()=>{});}}
  await assert.rejects(media.beginPlayback(new BrokenMedia(),100),/无法播放/);
  console.log('PASS mobile/desktop source selection, 20/30s boundaries, synchronous gesture playback, denial, timeout, legacy media and immediate decode errors.');
})().catch(error=>{console.error(error);process.exitCode=1;});
