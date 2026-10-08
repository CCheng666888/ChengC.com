import { device } from '../game/Device.js';
const urls = {
  pc: new URL('../../public/videos/lzt-pc.mp4', import.meta.url).href,
  mobile: new URL('../../public/videos/lzt-mobile.mp4', import.meta.url).href,
  original: new URL('../../public/videos/lzt.mp4', import.meta.url).href,
  poster: new URL('../../public/videos/poster.jpg', import.meta.url).href
};

export class ArchiveMedia {
  constructor() {
    this.video=document.createElement('video');this.video.id='archive-video';this.video.playsInline=true;
    this.video.preload='auto';this.video.setAttribute('aria-label','Field recording LZT-001');
    this.video.setAttribute('webkit-playsinline','');this.disposed=false;
    this.quality=device.mobile?'mobile':'pc';
  }
  async prepare() {
    // Embedded HTML resolves to a Blob only when the event starts, keeping menu startup light.
    if(globalThis.DogWalkRecording){
      this.blob=globalThis.DogWalkRecording(this.quality);this.video.src=this.blob;this.video.load();return true;
    }
    for(const kind of [this.quality,'original']) {
      try {
        const response=await fetch(urls[kind],{method:'HEAD',signal:AbortSignal.timeout(6000)});
        if(this.disposed)return false;
        if(response.ok&&response.headers.get('content-type')?.includes('video/')) {
          this.quality=kind;this.video.src=urls[kind];this.video.poster=urls.poster;this.video.load();return true;
        }
      } catch { if(this.disposed)return false; }
    }
    return false;
  }
  dispose() {
    this.disposed=true;this.video.pause();this.video.removeAttribute('src');this.video.load();
    if(this.blob)URL.revokeObjectURL(this.blob);
  }
}
