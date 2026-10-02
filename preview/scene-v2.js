(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('particles'), ctx = canvas.getContext('2d', { alpha: true });
  const waterCanvas = $('water'), art = $('landscapeArt');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const config = { density: 65, speed: 35, mist: 40, glow: 60 };
  const defaults = { ...config };
  let width = 1, height = 1, clock = 0, previous = 0, raf = 0, visible = true;
  let paused = reduced.matches || !ctx, particles = [], birds = [], sparkles = [], rings = [], clouds = [];
  let nextRipple = 1, nextBird = 4, lastTrail = -1, night = 0;
  const pointer = { x: -1e4, y: -1e4, dx: 0, dy: 0 };
  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const image = new Image();
  const imageSource = getComputedStyle(art).backgroundImage.match(/url\(["']?(.*?)["']?\)$/)?.[1];
  let gl = null, shader = null, uniforms = {}, texture = null, imageReady = false;
  const vertexSource = `attribute vec2 position; varying vec2 uv; void main(){ uv=vec2((position.x+1.0)*0.5, (1.0-position.y)*0.5); gl_Position=vec4(position,0.0,1.0); }`;
  const fragmentSource = `
    precision mediump float;
    varying vec2 uv;
    uniform sampler2D photo;
    uniform vec2 viewSize;
    uniform vec2 imageSize;
    uniform vec2 mouse;
    uniform float time;
    uniform float wind;
    uniform float glow;
    uniform float motion;
    uniform vec4 rings[12];
    void main(){
      float scale=max(viewSize.x/imageSize.x,viewSize.y/imageSize.y);
      vec2 ratio=viewSize/(imageSize*scale);
      vec2 focus=vec2(viewSize.x<600.0 ? 0.60 : 0.55,0.5);
      vec2 p=uv*ratio+(1.0-ratio)*focus;
      vec2 base=p;
      float lake=smoothstep(0.525,0.58,base.y);
      float depth=smoothstep(0.53,1.0,base.y);
      float slow=time*(0.5+wind);
      // Waves refract the real photograph instead of adding a flat painted overlay.
      float wave=sin(p.y*145.0-slow*1.7+p.x*9.0)+sin(p.y*290.0+slow*1.15-p.x*17.0)*0.38;
      p.x+=lake*(0.0008+depth*0.0025)*wave*motion;
      p.y+=lake*(0.00045+depth*0.0012)*sin(p.x*64.0-slow*1.3+p.y*25.0)*motion;
      float ringLight=0.0;
      for(int i=0;i<12;i++){
        vec4 r=rings[i];
        float age=time-r.z;
        if(r.w>0.0 && age>=0.0 && age<4.0){
          vec2 delta=(uv-r.xy)*vec2(viewSize.x/viewSize.y,1.9);
          float dist=length(delta);
          float radius=age*0.12;
          float envelope=exp(-pow((dist-radius)*43.0,2.0))*exp(-age*0.65)*r.w;
          float pulse=sin((dist-radius)*210.0);
          p+=normalize(delta+vec2(0.00001))*envelope*pulse*0.0045*lake;
          ringLight+=envelope*pulse*0.028*lake;
        }
      }
      // Very slow motion in the cloud layer keeps the distant scenery calm.
      float sky=1.0-smoothstep(0.18,0.35,base.y);
      p.x+=sin(time*0.055+p.y*11.0)*0.002*sky*motion;
      p+=mouse*vec2(0.0016,0.0010)*motion;
      vec3 color=texture2D(photo,clamp(p,0.001,0.999)).rgb;
      float highlight=pow(max(0.0,sin(p.y*550.0+slow*2.4+sin(p.x*35.0)*2.0)),16.0);
      highlight*=pow(max(0.0,sin(p.x*190.0+slow*0.4)),9.0);
      color+=vec3(0.78,0.86,0.68)*highlight*lake*depth*glow*0.18*motion;
      color+=ringLight;
      gl_FragColor=vec4(color,1.0);
    }
  `;

  function compile(type, source) {
    const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); throw new Error('Scene shader unavailable'); }
    return s;
  }
  function initWater() {
    try {
      gl = waterCanvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
      if (!gl) return;
      shader = gl.createProgram();
      gl.attachShader(shader, compile(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(shader, compile(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(shader);
      if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) throw new Error('Scene program unavailable');
      gl.useProgram(shader);
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const attr = gl.getAttribLocation(shader, 'position'); gl.enableVertexAttribArray(attr); gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);
      for (const name of ['photo','viewSize','imageSize','mouse','time','wind','glow','motion','rings[0]']) uniforms[name] = gl.getUniformLocation(shader, name);
      texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.uniform1i(uniforms.photo, 0); gl.uniform2f(uniforms.imageSize, image.naturalWidth, image.naturalHeight);
      imageReady = true; resize(); waterCanvas.classList.add('ready');
    } catch {
      gl = null; imageReady = false; waterCanvas.classList.remove('ready');
    }
  }
  function drawWater() {
    if (!gl || !imageReady) return;
    gl.viewport(0, 0, waterCanvas.width, waterCanvas.height);
    gl.uniform2f(uniforms.viewSize, width, height); gl.uniform2f(uniforms.mouse, pointer.dx, pointer.dy);
    gl.uniform1f(uniforms.time, clock); gl.uniform1f(uniforms.wind, config.speed / 100);
    gl.uniform1f(uniforms.glow, config.glow / 100); gl.uniform1f(uniforms.motion, !ctx || (reduced.matches && paused) ? 0 : 1);
    const values = new Float32Array(48);
    rings.slice(-12).forEach((r, i) => values.set([r.x / width, r.y / height, r.born, r.strength], i * 4));
    gl.uniform4fv(uniforms['rings[0]'], values); gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function addRing(x, y, strength = 1, automatic = false) {
    if (rings.length >= 12) rings.shift();
    rings.push({ x, y, born: clock, strength, automatic });
  }
  function addFlock() {
    const start = random(height * .12, height * .38);
    const count = Math.round(random(3, 6));
    for (let i = 0; i < count; i++) birds.push({ x: width + 25 + i * 30, y: start + Math.abs(i - 2) * 10, speed: random(29, 43), size: random(3.2, 5.7), phase: random(0, 6), home: start });
  }
  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, coarse.matches ? 1.25 : 1.6);
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr); ctx?.setTransform(dpr,0,0,dpr,0,0);
    waterCanvas.width = Math.round(width*Math.min(dpr,1.25)); waterCanvas.height = Math.round(height*Math.min(dpr,1.25));
    const amount = Math.min(coarse.matches ? 150 : 330, Math.round(width*height/4000));
    particles = Array.from({length:amount}, () => ({x:random(0,width),y:random(0,height),r:random(.45,1.9),phase:random(0,6),speed:random(4,15),a:random(.12,.6)}));
    clouds = Array.from({length:5}, (_,i) => ({x:(i*.34-.25)*width,y:height*(.36+i*.025),width:width*random(.25,.5),height:height*random(.032,.065),speed:random(3,8)}));
    birds = []; addFlock(); rings = []; draw(0); schedule();
  }
  function drawClouds(dt) {
    if (!config.mist) return;
    for (const cloud of clouds) {
      cloud.x += dt*cloud.speed*(.4+config.speed/100); if(cloud.x-cloud.width>width) cloud.x=-cloud.width;
      const gradient=ctx.createRadialGradient(0,0,0,0,0,1);
      gradient.addColorStop(0,`rgba(229,242,237,${config.mist/100*.17})`); gradient.addColorStop(.45,`rgba(229,242,237,${config.mist/100*.07})`); gradient.addColorStop(1,'rgba(229,242,237,0)');
      ctx.save(); ctx.translate(cloud.x,cloud.y); ctx.scale(cloud.width,cloud.height); ctx.fillStyle=gradient; ctx.fillRect(-1,-1,2,2); ctx.restore();
    }
  }
  function draw(dt) {
    drawWater();
    if (!ctx) return;
    ctx.clearRect(0,0,width,height);
    drawClouds(dt);
    for (let i=0;i<Math.round(particles.length*config.density/100);i++) {
      const p=particles[i]; p.x+=dt*p.speed*(.5+config.speed/60); p.y+=dt*Math.sin(clock*.5+p.phase)*3;
      if(p.x>width+10)p.x=-10;
      const dx=p.x-pointer.x,dy=p.y-pointer.y,distance=Math.hypot(dx,dy);
      const force=!paused&&distance<130?(1-distance/130)*24:0;
      ctx.globalAlpha=p.a*(.4+.6*Math.sin(clock*.7+p.phase)**2);
      ctx.fillStyle=p.y>height*.54?'#d6f6e9':'#fff2d7';
      ctx.beginPath();ctx.arc(p.x+dx/(distance||1)*force,p.y+dy/(distance||1)*force,p.r,0,Math.PI*2);ctx.fill();
    }
    for(const bird of birds) {
      bird.x-=dt*bird.speed; bird.y+=dt*Math.sin(clock*.5+bird.phase)*2;
      const flap=Math.sin(clock*5+bird.phase)*bird.size*.7;
      ctx.globalAlpha=.65*(1-night*.8);ctx.strokeStyle='#233d46';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(bird.x-bird.size,bird.y-flap);ctx.quadraticCurveTo(bird.x-bird.size*.35,bird.y-bird.size*.2,bird.x,bird.y);ctx.quadraticCurveTo(bird.x+bird.size*.35,bird.y-bird.size*.2,bird.x+bird.size,bird.y-flap);ctx.stroke();
    }
    birds=birds.filter(b=>b.x>-20);
    for(const r of rings) {
      const age=clock-r.born;
      for(let layer=0;layer<3;layer++) {
        const a=age-layer*.17;if(a<0)continue;
        const radius=9+a*height*.13;
        ctx.globalAlpha=Math.max(0,(1-a/3.8))*.32*r.strength;
        ctx.strokeStyle='#e0f8ef';ctx.lineWidth=1.2-layer*.2;
        ctx.beginPath();ctx.ellipse(r.x,r.y,radius,radius*.3,0,0,Math.PI*2);ctx.stroke();
      }
    }
    rings=rings.filter(r=>clock-r.born<4);
    for(const p of sparkles) {
      const age=clock-p.born;
      p.x+=dt*p.vx;p.y+=dt*p.vy;p.vy+=dt*8;
      ctx.globalAlpha=Math.max(0,1-age/p.life)*.9;ctx.fillStyle='#e8ffef';
      ctx.beginPath();ctx.arc(p.x,p.y,p.r*(1-age/p.life*.6),0,Math.PI*2);ctx.fill();
    }
    sparkles=sparkles.filter(p=>clock-p.born<p.life);
    if(night>.01) {
      for(let i=0;i<65;i++) {
        const x=(Math.sin(i*93.2)*.5+.5)*width,y=(Math.sin(i*35.8)*.5+.5)*height*.29;
        ctx.globalAlpha=night*(.25+.55*Math.sin(clock*.6+i)**2);ctx.fillStyle='#e7f1ff';ctx.fillRect(x,y,i%3===0?1.6:1,1.4);
      }
      const flight=clock%18;
      if(flight<1.6) {
        const x=width*.76-flight*width*.2,y=height*.08+flight*height*.07;
        const grad=ctx.createLinearGradient(x,y,x+70,y-24);grad.addColorStop(0,'#f2fbff');grad.addColorStop(1,'#f2fbff00');
        ctx.globalAlpha=night*Math.sin(flight/1.6*Math.PI);ctx.strokeStyle=grad;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+70,y-24);ctx.stroke();
      }
    }
    ctx.globalAlpha=1;
    if(!imageReady) art.style.transform=paused?'none':`translate3d(${Math.sin(clock*.07)*3+pointer.dx*5}px,${pointer.dy*3}px,0)`;
  }
  function frame(now) {
    raf=0;if(paused||!visible||document.hidden){previous=0;return;}
    if(!previous)previous=now;
    const elapsed=now-previous;
    if(elapsed>=32) {
      const dt=Math.min(elapsed/1000,.075);clock+=dt;previous=now;
      night+=(Number(document.body.classList.contains('night'))-night)*Math.min(1,dt*2);
      if(clock>nextRipple){addRing(random(width*.2,width*.95),random(height*.61,height*.94),.28,true);nextRipple=clock+random(2.5,5);}
      if(clock>nextBird){if(birds.length<10)addFlock();nextBird=clock+random(14,24);}
      draw(dt);
    }
    schedule();
  }
  function schedule(){if(!raf&&!paused&&visible&&!document.hidden&&ctx){document.body.classList.remove('motion-idle');raf=requestAnimationFrame(frame);}}
  function stop(){cancelAnimationFrame(raf);raf=0;previous=0;document.body.classList.add('motion-idle');}
  function updatePause(){
    paused=paused||!ctx;
    document.body.classList.toggle('paused',paused);$('pauseToggle').textContent=paused?'继续动画':'暂停动画';$('pauseToggle').setAttribute('aria-pressed',String(paused));
    $('sceneHint').textContent=paused?'静静看山海 · 动画已暂停':'点击湖面，泛起涟漪 · 划过山间，微风拂动';
    if(paused){stop();pointer.x=pointer.y=-1e4;pointer.dx=pointer.dy=0;draw(0);}else schedule();
  }
  function panel(open){$('settings').hidden=!open;$('settingsToggle').setAttribute('aria-expanded',String(open));(open?$('settingsClose'):$('settingsToggle')).focus();}
  for(const key of Object.keys(config))$(key).addEventListener('input',event=>{config[key]=Number(event.target.value);$(key+'Value').value=config[key]+'%';if(key==='mist')document.documentElement.style.setProperty('--mist-opacity',config.mist*.0055);if(paused)draw(0);});
  $('pauseToggle').addEventListener('click',()=>{paused=!paused;updatePause();});
  $('settingsToggle').addEventListener('click',()=>panel($('settings').hidden));$('settingsClose').addEventListener('click',()=>panel(false));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('settings').hidden)panel(false);});
  document.addEventListener('click',event=>{if(!$('settings').hidden&&!$('settings').contains(event.target)&&!$('settingsToggle').contains(event.target)){$('settings').hidden=true;$('settingsToggle').setAttribute('aria-expanded','false');}});
  $('sceneToggle').addEventListener('click',()=>{const only=document.body.classList.toggle('scene-only');$('sceneToggle').textContent=only?'显示首页':'只看风景';$('sceneToggle').setAttribute('aria-pressed',String(only));if(only)scrollTo({top:0,behavior:'instant'});});
  $('nightToggle').addEventListener('click',()=>{const value=document.body.classList.toggle('night');$('nightToggle').textContent=value?'切换晨光':'切换夜色';$('nightToggle').setAttribute('aria-pressed',String(value));if(paused){night=Number(value);draw(0);}});
  $('reset').addEventListener('click',()=>{
    Object.assign(config,defaults);for(const key of Object.keys(config)){$(key).value=config[key];$(key+'Value').value=config[key]+'%';}
    document.documentElement.style.setProperty('--mist-opacity','.22');document.body.classList.remove('night');$('nightToggle').textContent='切换夜色';$('nightToggle').setAttribute('aria-pressed','false');night=0;
    paused=reduced.matches||!ctx;rings=[];sparkles=[];updatePause();draw(0);
  });
  function sceneEvent(event){return visible&&!paused&&event.clientY<height&&!event.target.closest('a,button,input,.settings')&&scrollY<height*.55;}
  addEventListener('pointermove',event=>{
    if(!sceneEvent(event)||coarse.matches)return;
    pointer.x=event.clientX;pointer.y=event.clientY;pointer.dx=event.clientX/width-.5;pointer.dy=event.clientY/height-.5;
    if(event.clientY>height*.55&&clock-lastTrail>.15){addRing(event.clientX,event.clientY,.32);lastTrail=clock;}
  },{passive:true});
  addEventListener('pointerdown',event=>{
    if(!sceneEvent(event))return;
    const x=event.clientX,y=event.clientY,water=y>height*.53;
    if(water)addRing(x,y,1);
    const amount=coarse.matches?28:44;
    for(let i=0;i<amount;i++){const angle=random(0,Math.PI*2),velocity=random(18,95);sparkles.push({x,y,vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity*(water?.38:1)-16,r:random(.8,2.3),born:clock,life:random(1.2,2.5)});}
    if(sparkles.length>260)sparkles.splice(0,sparkles.length-260);
    if(!water&&birds.length<10){birds.push({x:x+10,y:y-20,speed:52,size:6,phase:0});birds.push({x:x+30,y:y-12,speed:48,size:5,phase:2});}
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{pointer.x=pointer.y=-1e4;pointer.dx=pointer.dy=0;});
  let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(resize,120);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else schedule();});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else stop();}).observe(document.querySelector('.hero'));
  waterCanvas.addEventListener('webglcontextlost',event=>{event.preventDefault();imageReady=false;waterCanvas.classList.remove('ready');});
  waterCanvas.addEventListener('webglcontextrestored',()=>initWater());
  function motionPreference(){paused=reduced.matches||!ctx;$('motionNote').textContent=!ctx?'当前浏览器显示静态山水背景。':reduced.matches?'已跟随系统的减少动态效果设置，默认静止；可手动选择继续动画。':'点击泛起涟漪，划过带起微风。飞鸟、流云与湖水会自然流动。';updatePause();}
  reduced.addEventListener('change',motionPreference);
  if(!ctx)$('pauseToggle').hidden=true;
  image.onload=initWater;if(imageSource)image.src=imageSource;
  resize();motionPreference();
})();
