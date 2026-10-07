import { paw } from './icons.js';
import { timeLabel, clamp } from '../game/math.js';
const VIDEO_URL = new URL('../../public/videos/lzt.mp4',import.meta.url).href;
const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));

export class ArchivePanel {
  constructor(game,onReturn) {
    this.game=game;this.onReturn=onReturn;this.layer=document.querySelector('#archive');this.session=0;this.completed=false;
    this.available=this.probe();
    this.layer.addEventListener('click',e=>{
      const b=e.target.closest('[data-archive]');if(!b)return;
      if(b.dataset.archive==='back')this.close();if(b.dataset.archive==='play')this.toggle();if(b.dataset.archive==='fullscreen')this.fullscreen();
    });
    this.layer.addEventListener('input',e=>{const v=this.video;if(!v)return;if(e.target.id==='archive-seek'&&Number.isFinite(v.duration))v.currentTime=Number(e.target.value);if(e.target.id==='archive-volume')v.volume=clamp(Number(e.target.value),0,1);});
    this.layer.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.close();}
      if(e.key===' '&&!/INPUT|BUTTON/.test(e.target.tagName)){e.preventDefault();this.toggle();}
      if(e.key==='Tab'){const nodes=[...this.layer.querySelectorAll('button,input')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    });
  }
  async probe() {try{const r=await fetch(VIDEO_URL,{method:'HEAD',cache:'no-store',signal:AbortSignal.timeout(5000)});return r.ok&&r.headers.get('content-type')?.includes('video/');}catch{return false;}}
  shell(body) {
    return `<div class="archive-shell" role="dialog" aria-modal="true" aria-label="DOG WALK ARCHIVES" tabindex="-1"><header class="archive-header"><div class="archive-brand">${paw}<span>DOG WALK ARCHIVES<small>Record: LZT-001 <i>·</i> Status: PLAYBACK</small></span></div><button class="btn" data-archive="back">← 返回游戏</button></header>${body}<footer class="archive-footer"><span>FIELD RECORDING / 001</span><span>A MOMENT WORTH REMEMBERING.</span></footer></div>`;
  }
  async open() {
    const token=++this.session;this.completed=false;this.returnFocus=document.activeElement;
    this.oldInert={root:this.game.ui.root.inert,dialogs:this.game.ui.dialogs.inert};this.game.ui.root.inert=true;this.game.ui.dialogs.inert=true;
    this.layer.hidden=false;document.body.classList.add('archive-open');
    this.layer.innerHTML='<div class="archive-intro" role="dialog" aria-modal="true" aria-label="特殊事件"><p data-intro>…</p><button class="text-button" data-archive="back">返回游戏</button></div>';
    this.layer.querySelector('button').focus();
    await wait(1000);if(token!==this.session)return;this.layer.querySelector('[data-intro]').textContent='Something feels familiar.';
    await wait(1150);if(token!==this.session)return;this.layer.querySelector('[data-intro]').textContent='Special Event Unlocked';
    await wait(1000);if(token!==this.session)return;
    const exists=await this.probe();if(token!==this.session)return;if(!exists){this.missing();return;}
    this.layer.innerHTML=this.shell(`<section class="archive-content"><p class="eyebrow">THE DOG WALK FIELD RECORDINGS</p><div class="video-player" id="archive-player"><video id="archive-video" playsinline preload="auto" aria-label="Field recording LZT-001"></video><button class="video-center-play" data-archive="play" aria-label="播放视频">▶</button><div class="video-caption"><span>REC <i>●</i></span><span>LZT—001</span></div><div class="video-controls"><button data-archive="play" class="btn icon" aria-label="播放或暂停"><span data-play-icon>▶</span></button><span data-video-time>00:00 / 00:00</span><input id="archive-seek" type="range" min="0" max="1" value="0" step="0.05" aria-label="视频进度"><label class="video-volume"><span>♫</span><input id="archive-volume" type="range" min="0" max="1" step="0.05" value="${this.game.storage.data.settings.volume}" aria-label="视频音量"></label><button data-archive="fullscreen" class="btn icon" aria-label="视频全屏">⛶</button></div></div><p class="playback-status" data-video-status>正在载入这段记录…</p></section>`);
    this.video=this.layer.querySelector('video');const v=this.video;v.volume=this.game.storage.data.settings.volume;v.src=VIDEO_URL;
    v.addEventListener('loadedmetadata',()=>{if(token!==this.session)return;this.layer.querySelector('#archive-seek').max=v.duration;this.sync();});
    v.addEventListener('timeupdate',()=>this.sync());v.addEventListener('play',()=>this.sync());v.addEventListener('pause',()=>this.sync());
    v.addEventListener('ended',()=>this.finish(token));v.addEventListener('error',()=>{if(token===this.session&&!this.completed)this.missing(true);});
    this.layer.querySelector('[data-archive="back"]').focus();
    v.play().catch(()=>{const status=this.layer.querySelector('[data-video-status]');if(status)status.textContent='点击播放，开始这段记录。';});
  }
  sync() {
    if(!this.video)return;const v=this.video;
    const time=this.layer.querySelector('[data-video-time]'),seek=this.layer.querySelector('#archive-seek'),icon=this.layer.querySelector('[data-play-icon]'),center=this.layer.querySelector('.video-center-play'),status=this.layer.querySelector('[data-video-status]');
    if(time)time.textContent=`${timeLabel(v.currentTime)} / ${timeLabel(Number.isFinite(v.duration)?v.duration:0)}`;
    if(seek&&document.activeElement!==seek)seek.value=v.currentTime;
    if(icon)icon.textContent=v.paused?'▶':'Ⅱ';if(center)center.hidden=!v.paused;if(status)status.textContent=v.paused?'记录已暂停。':'正在播放 · 慢慢看。';
  }
  toggle() {if(!this.video)return;if(this.video.paused)this.video.play().catch(()=>{});else this.video.pause();}
  fullscreen() {const p=this.layer.querySelector('#archive-player');if(!p)return;if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});else if(p.requestFullscreen)p.requestFullscreen().catch(()=>{});else this.video?.webkitEnterFullscreen?.();}
  missing(unplayable=false) {
    if(this.video){this.video.pause();this.video=null;}
    this.layer.innerHTML=this.shell(`<section class="archive-missing"><div class="missing-icon">⌁</div><p class="eyebrow">${unplayable?'RECORDING UNAVAILABLE':'ARCHIVE FILE NOT FOUND'}</p><h2>${unplayable?'这段记录暂时无法播放。':'这段记录还没放进来。'}</h2><p>${unplayable?'请使用浏览器支持的 H.264 / AAC MP4 视频，然后重新进入。':'Place your video at:'}</p><code>public/videos/lzt.mp4</code><p class="panel-footnote">你的散步已暂停，可以随时继续。</p><button class="btn primary" data-archive="back">返回游戏 ↝</button></section>`);
    this.layer.querySelector('[data-archive="back"]').focus();
  }
  async finish(token) {
    if(this.completed||token!==this.session)return;this.completed=true;this.video.pause();this.game.achievements.completeArchive();
    this.layer.classList.add('video-ending');await wait(800);if(token!==this.session)return;
    if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});
    this.layer.classList.remove('video-ending');this.layer.innerHTML='<section class="archive-complete" role="dialog" aria-modal="true" aria-label="Archive complete"><p class="eyebrow">ARCHIVE COMPLETE</p><div data-completion></div></section>';
    await wait(1100);if(token!==this.session)return;
    this.layer.querySelector('[data-completion]').innerHTML='<p class="eyebrow lesson">LESSON LEARNED</p><h2>Respect the dog.</h2>';
    await wait(950);if(token!==this.session)return;
    this.layer.querySelector('[data-completion]').insertAdjacentHTML('beforeend',`<div class="hidden-award"><span>🏆</span><p class="eyebrow">Hidden Achievement</p><h3>Don't Mess With The Dog</h3><p>有些事情，看看别人做过就够了。</p></div><button class="btn primary" data-archive="back">返回散步 ↝</button>`);
    this.layer.querySelector('button').focus();
  }
  close() {
    ++this.session;if(this.video){this.video.pause();this.video.removeAttribute('src');this.video.load();this.video=null;}
    if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});
    this.layer.hidden=true;this.layer.innerHTML='';this.layer.classList.remove('video-ending');document.body.classList.remove('archive-open');
    this.game.ui.root.inert=this.oldInert?.root||false;this.game.ui.dialogs.inert=this.oldInert?.dialogs||false;
    if(this.returnFocus?.isConnected)this.returnFocus.focus({preventScroll:true});this.onReturn();
  }
}
