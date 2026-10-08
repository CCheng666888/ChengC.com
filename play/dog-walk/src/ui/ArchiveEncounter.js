import { drawDog, drawPlayer, ellipse, rounded } from '../game/Art.js';
import { clamp } from '../game/math.js';
import { device } from '../game/Device.js';

export class ArchiveEncounter {
  constructor(host,audio,onDone) {
    this.host=host;this.audio=audio;this.onDone=onDone;this.step=0;this.progress=0;this.time=0;this.holding=false;this.disposed=false;this.last=performance.now();this.lastPaint=0;
    this.click=e=>{const b=e.target.closest('[data-encounter]');if(!b)return;
      if(b.dataset.encounter==='choice'){this.note=b.dataset.note;this.audio.play('click');this.step++;this.show();}
      if(b.dataset.encounter==='hold'&&this.step===2)this.progress=clamp(this.progress+.1,0,1);
    };
    this.down=e=>{if(this.step===2&&e.target.closest('[data-encounter="hold"]')){e.preventDefault();this.holding=true;e.target.closest('button').setPointerCapture?.(e.pointerId);}};
    this.up=()=>{this.holding=false;};
    this.key=e=>{if(e.code==='Space'&&this.step===2){e.preventDefault();this.holding=e.type==='keydown';}};
    host.addEventListener('click',this.click);host.addEventListener('pointerdown',this.down);host.addEventListener('pointerup',this.up);host.addEventListener('pointercancel',this.up);
    host.addEventListener('keydown',this.key);host.addEventListener('keyup',this.key);
    this.show();this.loop=this.loop.bind(this);this.frame=requestAnimationFrame(this.loop);
  }
  show() {
    const scenes=[
      {title:'广场边的陌生小狗。',text:'围栏旁，一只小狗看向你。今天的散步似乎有了一点不一样的走向。',choices:[['蹲下来，先看看它','你慢慢蹲下，让它先观察你。'],['轻声打个招呼','它听见你的声音，转过了头。']]},
      {title:'看懂它的小信号。',text:(this.note||'')+' 它把耳朵向后收，身体也绷紧了。你准备怎么回应？',choices:[['停住，给它一点空间','你停了下来，准备慢慢离开。'],['再靠近一点','你刚向前一步，它突然抬起了头。']]},
      {title:'稳住，然后慢慢退开。',text:(this.note||'')+' 身后传来一阵动静。'+(device.mobile?'按住下面的按钮，让自己慢慢退开。':'按住按钮或空格，让自己慢慢退开。'),choices:[]}
    ];
    const s=scenes[this.step];
    this.host.innerHTML=`<div class="encounter-heading"><p class="eyebrow">FIELD NOTES · ${String(this.step+1).padStart(2,'0')} / 03</p><h2>${s.title}</h2></div><canvas id="encounter-field" width="640" height="300" aria-label="广场边的人与陌生小狗"></canvas><p class="encounter-copy">${s.text}</p><div class="encounter-actions">${s.choices.map(([label,note])=>`<button class="btn" data-encounter="choice" data-note="${note}">${label}<span>↗</span></button>`).join('')}${this.step===2?'<div class="retreat-track" role="progressbar" aria-label="后退距离" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div><button class="btn primary hold-button" data-encounter="hold">按住 · 慢慢后退 <span>↝</span></button><small class="hold-hint">松手会停住；也可以连续点按。</small>':''}</div>`;
    this.canvas=this.host.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.host.querySelector('button')?.focus({preventScroll:true});
    this.holding=false;this.paint();
  }
  loop(now) {
    if(this.disposed)return;const dt=Math.min(.05,(now-this.last)/1000);this.last=now;
    if(!document.hidden){this.time+=dt;
      if(this.step===2){this.progress=clamp(this.progress+dt*(this.holding?.38:-.06),0,1);const track=this.host.querySelector('.retreat-track');if(track){track.firstChild.style.width=`${this.progress*100}%`;track.setAttribute('aria-valuenow',Math.round(this.progress*100));}if(this.progress>=1){this.dispose();this.onDone();return;}}
      if(now-this.lastPaint>1000/30){this.lastPaint=now;this.paint();}
    }
    this.frame=requestAnimationFrame(this.loop);
  }
  paint() {
    const c=this.ctx,t=this.time,tense=this.step>0;
    c.clearRect(0,0,640,300);c.fillStyle='#e4e6da';c.fillRect(0,0,640,300);
    c.fillStyle='#c6d0bc';c.fillRect(0,0,640,76);for(let i=0;i<8;i++)ellipse(c,i*100,32,62,44,i%2?'#9cac90':'#a9b59a');
    c.strokeStyle='#c4c7bb';c.lineWidth=1;for(let i=0;i<8;i++){c.beginPath();c.moveTo(i*90,90);c.lineTo(i*130-160,300);c.stroke();}for(let i=0;i<5;i++){c.beginPath();c.moveTo(0,105+i*43);c.lineTo(640,105+i*43);c.stroke();}
    rounded(c,336,55,253,117,8,'#dce0d7','#7d8d86');c.strokeStyle='#879890';c.lineWidth=3;
    for(let i=0;i<15;i++){c.beginPath();c.moveTo(343+i*17,64);c.lineTo(343+i*17,173);c.stroke();}
    for(const x of [315,600]){rounded(c,x-15,162,32,5,3,'#6d7569');c.fillStyle='#dc956d';c.beginPath();c.moveTo(x,120);c.lineTo(x+12,162);c.lineTo(x-10,162);c.fill();}
    const px=200-this.progress*36;
    drawPlayer(c,{x:px,y:226,direction:1,moving:this.holding,phase:t*5},t);
    drawDog(c,{x:428-this.progress*24,y:229,direction:-1,moving:false,phase:t*4,state:tense?'excited':'sitting',spec:{color:'#bf965e',light:'#f1d9a7'}},t,1.65);
    if(tense){c.font='18px Georgia';c.fillStyle='#b57e61';c.fillText('…',389,177);}
    ellipse(c,590,244,8,5,'#b5bba7');
  }
  dispose() {
    this.disposed=true;cancelAnimationFrame(this.frame);
    this.host.removeEventListener('click',this.click);this.host.removeEventListener('pointerdown',this.down);this.host.removeEventListener('pointerup',this.up);this.host.removeEventListener('pointercancel',this.up);this.host.removeEventListener('keydown',this.key);this.host.removeEventListener('keyup',this.key);
  }
}
