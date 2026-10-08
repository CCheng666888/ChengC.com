import { paw } from './icons.js';
import { timeLabel, clamp } from '../game/math.js';
import { device } from '../game/Device.js';
import { ArchiveMedia } from './ArchiveMedia.js';
import { ArchiveEncounter } from './ArchiveEncounter.js';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export class ArchivePanel {
  constructor(game,onReturn) {
    this.game=game;this.onReturn=onReturn;this.layer=document.querySelector('#archive');this.session=0;this.phase='closed';
    this.available=this.probe();
    this.layer.addEventListener('click',e=>{
      const b=e.target.closest('[data-archive]');if(!b)return;
      const action=b.dataset.archive;
      if(action==='back')this.close();if(action==='play')this.toggle();if(action==='fullscreen')this.fullscreen();if(action==='recording')this.showPlayback();
    });
    this.layer.addEventListener('input',e=>{const v=this.video;if(this.phase!=='playback'||!v)return;
      if(e.target.id==='archive-seek'&&Number.isFinite(v.duration))v.currentTime=Number(e.target.value);
      if(e.target.id==='archive-volume')v.volume=clamp(Number(e.target.value),0,1);
    });
    this.layer.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.close();}
      if(e.key===' '&&this.phase==='playback'&&!/INPUT|BUTTON/.test(e.target.tagName)){e.preventDefault();this.toggle();}
      if(e.key==='Tab'){const nodes=[...this.layer.querySelectorAll('button:not(:disabled),input')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    });
  }
  async probe() {
    if(globalThis.DogWalkRecording)return true;
    try {const url=new URL(`../../public/videos/lzt-${device.mobile?'mobile':'pc'}.mp4`,import.meta.url).href;const r=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(5000)});return r.ok;}catch{return false;}
  }
  shell(body,status='FIELD NOTES') {
    return `<div class="archive-shell" role="dialog" aria-modal="true" aria-label="DOG WALK ARCHIVES" tabindex="-1"><header class="archive-header"><div class="archive-brand">${paw}<span>DOG WALK ARCHIVES<small>Record: LZT-001 <i>·</i> Status: ${status}</small></span></div><button class="btn" data-archive="back">← 返回游戏</button></header>${body}<footer class="archive-footer"><span>FIELD RECORDING / 001</span><span>SMALL MOMENTS. LASTING LESSONS.</span></footer></div>`;
  }
  async open() {
    const token=++this.session;this.completed=false;this.phase='intro';this.returnFocus=document.activeElement;
    this.oldInert={root:this.game.ui.root.inert,dialogs:this.game.ui.dialogs.inert};this.game.ui.root.inert=true;this.game.ui.dialogs.inert=true;
    this.media=new ArchiveMedia();this.video=this.media.video;this.video.volume=this.game.storage.data.settings.volume;
    this.ready=this.media.prepare();this.mediaFailed=false;
    this.video.addEventListener('error',()=>{if(token===this.session){this.mediaFailed=true;if(this.phase==='playback')this.missing(true);}});
    this.layer.hidden=false;document.body.classList.add('archive-open');
    this.layer.innerHTML='<div class="archive-intro" role="dialog" aria-modal="true" aria-label="特殊事件"><p data-intro>…</p><button class="text-button" data-archive="back">返回游戏</button></div>';this.layer.querySelector('button').focus();
    await wait(900);if(token!==this.session)return;this.layer.querySelector('[data-intro]').textContent='Something feels familiar.';
    await wait(1050);if(token!==this.session)return;this.layer.querySelector('[data-intro]').textContent='Special Event Unlocked';
    await wait(750);if(token!==this.session)return;
    this.phase='encounter';this.layer.innerHTML=this.shell('<section class="archive-encounter" data-encounter-host></section>');
    this.encounter=new ArchiveEncounter(this.layer.querySelector('[data-encounter-host]'),this.game.audio,()=>this.bite(token));
  }
  async bite(token) {
    if(token!==this.session)return;this.encounter?.dispose();this.phase='bite';
    this.layer.innerHTML='<section class="bite-scene" role="dialog" aria-modal="true" aria-label="散步中的意外"><p class="eyebrow">A SUDDEN TURN</p><h2>一瞬间，散步停了下来。</h2><p class="bite-copy">身后响起突然的动静。<br>你还没来得及离开，小狗就回过了头。<br><strong>你被狗咬了一口。</strong></p><p class="bite-note">这段经历，似乎在哪里发生过。</p><div data-bite-action></div></section>';
    await wait(1500);if(token!==this.session)return;
    this.layer.querySelector('[data-bite-action]').innerHTML='<button class="btn" data-archive="recording">继续 · 查看现场记录 ↗</button><button class="text-button" data-archive="back">返回散步</button>';
    this.layer.querySelector('button').focus();
  }
  async showPlayback() {
    if(this.phase!=='bite')return;const token=this.session;this.phase='playback';
    this.layer.innerHTML=this.shell(`<section class="archive-content"><div class="recording-heading"><div><p class="eyebrow">THE ORIGINAL FIELD RECORDING</p><h2>刚刚发生的事。</h2></div><span class="recording-badge">${device.mobile?'随身档案':'公园档案'} · 00:35</span></div><div class="video-player" id="archive-player"><div class="video-screen" data-video-mount><button class="video-center-play" data-archive="play" aria-label="播放视频">▶</button><span class="video-loading" data-loading hidden>正在缓冲…</span></div><div class="video-controls"><button data-archive="play" class="btn icon" aria-label="播放或暂停"><span data-play-icon>▶</span></button><span data-video-time>00:00 / 00:35</span><div class="video-timeline"><span data-buffered></span><input id="archive-seek" type="range" min="0" max="35" value="0" step="0.05" aria-label="视频进度"></div><label class="video-volume"><span>♫</span><input id="archive-volume" type="range" min="0" max="1" step="0.05" value="${this.video.volume}" aria-label="视频音量"></label><button data-archive="fullscreen" class="btn icon" aria-label="视频全屏">⛶</button></div></div><p class="playback-status" data-video-status>正在准备这段记录…</p><p class="recording-note">现场记录 · 保留完整画面与原声</p></section>`,'PLAYBACK');
    const v=this.video;this.layer.querySelector('[data-video-mount]').prepend(v);
    const sync=()=>{if(token===this.session&&this.phase==='playback')this.sync();};
    ['loadedmetadata','durationchange','timeupdate','play','pause','progress','canplay'].forEach(name=>v.addEventListener(name,sync));
    v.addEventListener('waiting',()=>{this.buffering=true;sync();});v.addEventListener('playing',()=>{this.buffering=false;sync();});v.addEventListener('ended',()=>this.finish(token));
    this.layer.querySelector('[data-archive="back"]').focus();this.sync();
    // Keep playback in the button gesture on Safari and touch browsers.
    v.play().catch(()=>{if(token===this.session&&this.phase==='playback'){this.buffering=false;this.sync();}});
    const exists=await this.ready;if(token!==this.session||this.phase!=='playback')return;
    if(!exists||this.mediaFailed){this.missing(this.mediaFailed);return;}
    this.sync();
  }
  sync() {
    if(this.phase!=='playback'||!this.video)return;const v=this.video,duration=Number.isFinite(v.duration)?v.duration:35.16;
    const $=selector=>this.layer.querySelector(selector),time=$('[data-video-time]'),seek=$('#archive-seek'),icon=$('[data-play-icon]'),center=$('.video-center-play'),status=$('[data-video-status]'),loading=$('[data-loading]'),buffer=$('[data-buffered]');
    if(time)time.textContent=`${timeLabel(v.currentTime)} / ${timeLabel(duration)}`;
    if(seek){seek.max=duration;if(document.activeElement!==seek)seek.value=v.currentTime;seek.style.setProperty('--played',`${v.currentTime/duration*100}%`);}
    if(buffer){const end=v.buffered.length?v.buffered.end(v.buffered.length-1):0;buffer.style.width=`${Math.min(100,end/duration*100)}%`;}
    if(icon)icon.textContent=v.paused?'▶':'Ⅱ';if(center)center.hidden=!v.paused;if(loading)loading.hidden=!this.buffering;
    if(status)status.textContent=this.buffering?'正在缓冲，稍等片刻。':v.paused?'点按播放，继续这段记录。':'正在播放 · 现场原声';
  }
  toggle() {if(this.phase!=='playback'||!this.video)return;if(this.video.paused)this.video.play().catch(()=>this.sync());else this.video.pause();}
  fullscreen() {const p=this.layer.querySelector('#archive-player');if(!p)return;if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});else if(p.requestFullscreen)p.requestFullscreen().catch(()=>{});else this.video?.webkitEnterFullscreen?.();}
  missing(unplayable=false) {
    this.phase='missing';this.media?.dispose();
    this.layer.innerHTML=this.shell(`<section class="archive-missing"><div class="missing-icon">⌁</div><p class="eyebrow">${unplayable?'RECORDING UNAVAILABLE':'ARCHIVE FILE NOT FOUND'}</p><h2>${unplayable?'这段记录暂时无法播放。':'这段记录还没放进来。'}</h2><p>${unplayable?'请换成浏览器支持的 MP4，再重新打开这段记录。':'Place your video at:'}</p><code>public/videos/lzt.mp4</code><p class="panel-footnote">你的散步已暂停，可以随时继续。</p><button class="btn primary" data-archive="back">返回游戏 ↝</button></section>`,'UNAVAILABLE');this.layer.querySelector('button').focus();
  }
  async finish(token) {
    if(this.completed||token!==this.session)return;this.completed=true;this.phase='complete';this.video.pause();this.game.achievements.completeArchive();
    this.layer.classList.add('video-ending');await wait(700);if(token!==this.session)return;
    if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});
    this.layer.classList.remove('video-ending');this.layer.innerHTML='<section class="archive-complete" role="dialog" aria-modal="true" aria-label="Archive complete"><p class="eyebrow">ARCHIVE COMPLETE</p><div data-completion></div></section>';
    await wait(900);if(token!==this.session)return;this.layer.querySelector('[data-completion]').innerHTML='<p class="eyebrow lesson">LESSON LEARNED</p><h2>Respect the dog.</h2>';
    await wait(850);if(token!==this.session)return;this.layer.querySelector('[data-completion]').insertAdjacentHTML('beforeend',`<div class="hidden-award"><span>🏆</span><p class="eyebrow">Hidden Achievement</p><h3>Don't Mess With The Dog</h3><p>有些事情，看看别人做过就够了。</p></div><button class="btn primary" data-archive="back">返回散步 ↝</button>`);this.layer.querySelector('button').focus();
  }
  close() {
    ++this.session;this.phase='closed';this.encounter?.dispose();this.media?.dispose();this.video=null;
    if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});
    this.layer.hidden=true;this.layer.innerHTML='';this.layer.classList.remove('video-ending');document.body.classList.remove('archive-open');
    this.game.ui.root.inert=this.oldInert?.root||false;this.game.ui.dialogs.inert=this.oldInert?.dialogs||false;
    if(this.returnFocus?.isConnected)this.returnFocus.focus({preventScroll:true});this.onReturn();
  }
}
