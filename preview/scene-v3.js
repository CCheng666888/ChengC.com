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
  let gusts = [], boats = [], fish = [], wakes = [];
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
    uniform vec4 gusts[4];
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
      float wave=sin(p.y*118.0-slow*2.8+p.x*9.0)+sin(p.y*235.0+slow*1.85-p.x*17.0)*0.38;
      p.x+=lake*(0.0012+depth*0.0048)*wave*motion;
      p.y+=lake*(0.0007+depth*0.0022)*sin(p.x*54.0-slow*2.0+p.y*25.0)*motion;
      float ringLight=0.0;
      for(int i=0;i<12;i++){
        vec4 r=rings[i];
        float age=time-r.z;
        if(r.w>0.0 && age>=0.0 && age<4.0){
          vec2 delta=(uv-r.xy)*vec2(viewSize.x/viewSize.y,1.9);
          float dist=length(delta);
          float radius=age*0.12;
          float edge=(dist-radius)*43.0;
          float envelope=exp(-edge*edge)*exp(-age*0.65)*r.w;
          float pulse=sin((dist-radius)*210.0);
          p+=normalize(delta+vec2(0.00001))*envelope*pulse*0.0045*lake;
          ringLight+=envelope*pulse*0.028*lake;
        }
      }
      // Very slow motion in the cloud layer keeps the distant scenery calm.
      float sky=1.0-smoothstep(0.18,0.35,base.y);
      p.x+=sin(time*0.12+p.y*11.0)*0.007*sky*motion;
      p+=mouse*vec2(0.0025,0.0015)*motion;
      float mountain=smoothstep(0.2,0.3,base.y)*(1.0-smoothstep(0.48,0.545,base.y));
      float sunlight=0.0;
      for(int i=0;i<4;i++){
        vec4 gust=gusts[i];
        float age=time-gust.z;
        if(gust.w>0.0 && age>=0.0 && age<6.0){
          vec2 delta=(uv-gust.xy-vec2(age*0.028,-age*0.003))*vec2(viewSize.x/viewSize.y,1.4);
          float radius=0.04+age*0.065;
          float envelope=exp(-dot(delta,delta)/(radius*radius))*sin(age/6.0*3.14159)*gust.w;
          p.x+=envelope*0.0035*mountain;
          sunlight+=envelope*mountain;
        }
      }
      vec3 color=texture2D(photo,clamp(p,0.001,0.999)).rgb;
      float highlight=pow(max(0.0,sin(p.y*550.0+slow*2.4+sin(p.x*35.0)*2.0)),16.0);
      highlight*=pow(max(0.0,sin(p.x*190.0+slow*0.4)),9.0);
      color+=vec3(0.78,0.86,0.68)*highlight*lake*depth*glow*0.28*motion;
      color+=vec3(0.15,0.13,0.065)*sunlight;
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
      for (const name of ['photo','viewSize','imageSize','mouse','time','wind','glow','motion','rings[0]','gusts[0]']) uniforms[name] = gl.getUniformLocation(shader, name);
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
    gl.uniform4fv(uniforms['rings[0]'], values);
    const gustValues = new Float32Array(16);
    gusts.slice(-4).forEach((g,i)=>gustValues.set([g.x/width,g.y/height,g.born,1],i*4));
    gl.uniform4fv(uniforms['gusts[0]'],gustValues); gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function addRing(x, y, strength = 1, automatic = false) {
    if (rings.length >= 12) rings.shift();
    rings.push({ x, y, born: clock, strength, automatic });
  }
  function addFlock(x = width + 25, y = random(height * .12, height * .38), startled = false) {
    const start = y;
    const count = Math.round(random(3, 6));
    for (let i = 0; i < count; i++) birds.push({ x: x + i * 23, y: start + Math.abs(i - 2) * 9, speed: random(startled?58:34,startled?80:48), size: random(startled?4.5:3.2,startled?7:5.7), phase: random(0, 6), rise: startled?random(14,25):0 });
  }
  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, coarse.matches ? 1.25 : 1.6);
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr); ctx?.setTransform(dpr,0,0,dpr,0,0);
    waterCanvas.width = Math.round(width*Math.min(dpr,1.25)); waterCanvas.height = Math.round(height*Math.min(dpr,1.25));
    const amount = Math.min(coarse.matches ? 150 : 330, Math.round(width*height/4000));
    particles = Array.from({length:amount}, () => ({x:random(0,width),y:random(0,height),r:random(.45,1.9),phase:random(0,6),speed:random(4,15),a:random(.12,.6)}));
    clouds = Array.from({length:5}, (_,i) => ({x:(i*.34-.25)*width,y:height*(.34+i*.034),width:width*random(.22,.42),height:height*random(.025,.052),speed:random(12,21)}));
    // Keep life in the lake visible from the first frame, rather than waiting for a spawn timer.
    boats = [{x:width*.68,y:height*.655,scale:coarse.matches?.65:1,speed:coarse.matches?8:14,direction:1,phase:1}, {x:width*.29,y:height*.585,scale:coarse.matches?.34:.5,speed:8,direction:-1,phase:3}];
    fish = Array.from({length:coarse.matches?5:10}, (_,i)=>({x:width*(.12+(i%5)*.16),y:height*(.8+Math.floor(i/5)*.09),size:random(12,21),phase:random(0,6),speed:random(17,28),direction:i%2?1:-1,escape:0}));
    birds = []; addFlock(width*.92,height*.23); rings = []; gusts=[]; wakes=[]; draw(0); schedule();
  }
  function drawClouds(dt) {
    if (!config.mist) return;
    for (const cloud of clouds) {
      cloud.x += dt*cloud.speed*(.65+config.speed/100+gusts.length*.7); if(cloud.x-cloud.width>width) cloud.x=-cloud.width;
      const gradient=ctx.createRadialGradient(0,0,0,0,0,1);
      gradient.addColorStop(0,`rgba(229,242,237,${config.mist/100*.17})`); gradient.addColorStop(.45,`rgba(229,242,237,${config.mist/100*.07})`); gradient.addColorStop(1,'rgba(229,242,237,0)');
      ctx.save(); ctx.translate(cloud.x,cloud.y); ctx.scale(cloud.width,cloud.height); ctx.fillStyle=gradient; ctx.fillRect(-1,-1,2,2); ctx.restore();
    }
  }
  function drawMountainWind() {
    for(const gust of gusts) {
      const age=clock-gust.born;
      const fade=Math.min(1,age*5)*Math.max(0,1-age/6);
      const cx=gust.x+age*56,cy=gust.y-age*3;
      // A moving bank of mist follows the mountain band; no fireworks on the ridge.
      ctx.save();
      ctx.beginPath();ctx.rect(0,height*.23,width,height*.31);ctx.clip();
      for(let layer=0;layer<5;layer++) {
        const stretch=100+age*25+layer*18;
        const offset=Math.sin(age*1.5+layer)*14;
        ctx.save();ctx.translate(cx+layer*18,cy+layer*7-17+offset);ctx.scale(stretch,14+layer*2);
        const fog=ctx.createRadialGradient(0,0,0,0,0,1);
        fog.addColorStop(0,`rgba(244,250,238,${fade*.2})`);fog.addColorStop(.5,`rgba(224,242,235,${fade*.09})`);fog.addColorStop(1,'rgba(224,242,235,0)');
        ctx.fillStyle=fog;ctx.globalAlpha=1;ctx.fillRect(-1,-1,2,2);ctx.restore();
      }
      ctx.globalAlpha=fade*.21;ctx.strokeStyle='#e1eee4';ctx.lineWidth=.9;
      for(let line=0;line<3;line++) {
        const y=cy-17+line*12;
        ctx.beginPath();ctx.moveTo(cx-95,y);ctx.bezierCurveTo(cx-30,y-15,cx+30,y+12,cx+100+age*15,y-6);ctx.stroke();
      }
      ctx.restore();
    }
    gusts=gusts.filter(g=>clock-g.born<6);
  }
  function boatShape() {
    // Small silhouettes and soft reflected sails blend into the photographic water.
    ctx.strokeStyle='#354954';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(-3,4);ctx.lineTo(-3,-51);ctx.stroke();
    const sail=ctx.createLinearGradient(-23,-40,16,0);sail.addColorStop(0,'#fffbed');sail.addColorStop(1,'#c3d4d4');
    ctx.fillStyle=sail;ctx.beginPath();ctx.moveTo(-5,-48);ctx.quadraticCurveTo(-26,-29,-26,-1);ctx.lineTo(-5,-4);ctx.closePath();ctx.fill();
    ctx.fillStyle='#e4e8dc';ctx.beginPath();ctx.moveTo(0,-42);ctx.quadraticCurveTo(22,-19,25,0);ctx.lineTo(0,-3);ctx.closePath();ctx.fill();
    ctx.fillStyle='#f0ece0';ctx.beginPath();ctx.moveTo(-30,3);ctx.lineTo(30,3);ctx.lineTo(19,11);ctx.quadraticCurveTo(-13,13,-25,8);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#6e5a43';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-29,4);ctx.lineTo(29,4);ctx.stroke();
    ctx.fillStyle='#304955';ctx.fillRect(-9,0,13,3);
  }
  function drawLakeLife(dt) {
    for(const f of fish) {
      f.escape=Math.max(0,f.escape-dt);
      f.x+=dt*f.direction*(f.speed+(f.escape>0?85:0));
      f.y+=Math.sin(clock*1.7+f.phase)*dt*(f.escape>0?9:2.5);
      if(f.x>width+45)f.x=-40;if(f.x<-45)f.x=width+40;
      const tail=Math.sin(clock*(f.escape>0?15:7)+f.phase)*4;
      ctx.save();ctx.translate(f.x,f.y);ctx.scale(f.direction,1);ctx.rotate(Math.sin(clock*.8+f.phase)*.09);
      ctx.globalAlpha=(.28+.12*Math.sin(clock*.6+f.phase))*(1-night*.4);ctx.fillStyle='#194852';
      ctx.beginPath();ctx.ellipse(0,0,f.size,f.size*.27,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.moveTo(-f.size+2,0);ctx.quadraticCurveTo(-f.size-7,tail-6,-f.size-12,tail-5);ctx.lineTo(-f.size-10,tail+6);ctx.closePath();ctx.fill();
      ctx.fillStyle='#82b9b3';ctx.globalAlpha=.18;ctx.beginPath();ctx.ellipse(3,-2,f.size*.72,1.1,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    for(const b of boats) {
      b.x+=dt*b.direction*b.speed*(.65+config.speed/100);
      if(b.x>width+80)b.x=-80;if(b.x<-80)b.x=width+80;
      const bob=Math.sin(clock*2+b.phase)*1.4*b.scale;
      if(clock-(b.lastWake||0)>.22){
        wakes.push({x:b.x-b.direction*27*b.scale,y:b.y+9*b.scale,born:clock,scale:b.scale,direction:b.direction});b.lastWake=clock;
      }
      // Reflection stretches downwards and moves with the boat.
      ctx.save();ctx.translate(b.x,b.y+13*b.scale);ctx.scale(b.direction*b.scale,-b.scale*.42);ctx.globalAlpha=.19*(1-night*.6);boatShape();ctx.restore();
      ctx.save();ctx.translate(b.x,b.y+bob);ctx.rotate(Math.sin(clock*1.3+b.phase)*.025);ctx.scale(b.direction*b.scale,b.scale);ctx.globalAlpha=.92*(1-night*.55);boatShape();ctx.restore();
    }
    for(const w of wakes) {
      const age=clock-w.born,spread=4+age*4;
      ctx.globalAlpha=Math.max(0,1-age/6)*.28*(1-night*.5);ctx.strokeStyle='#d7ebe1';ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(w.x-w.direction*spread,w.y-spread*.27*w.scale);ctx.quadraticCurveTo(w.x-w.direction*spread*1.4,w.y,w.x-w.direction*spread,w.y+spread*.27*w.scale);ctx.stroke();
    }
    wakes=wakes.filter(w=>clock-w.born<6).slice(-140);ctx.globalAlpha=1;
  }
  function draw(dt) {
    drawWater();
    if (!ctx) return;
    ctx.clearRect(0,0,width,height);
    drawClouds(dt);
    drawMountainWind();
    drawLakeLife(dt);
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
      bird.x-=dt*bird.speed; bird.y+=dt*Math.sin(clock*.5+bird.phase)*2-dt*bird.rise; bird.rise*=Math.exp(-dt*.36);
      const flap=Math.sin(clock*6+bird.phase)*bird.size*.85;
      ctx.globalAlpha=.65*(1-night*.8);ctx.strokeStyle='#233d46';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(bird.x-bird.size,bird.y-flap);ctx.quadraticCurveTo(bird.x-bird.size*.35,bird.y-bird.size*.2,bird.x,bird.y);ctx.quadraticCurveTo(bird.x+bird.size*.35,bird.y-bird.size*.2,bird.x+bird.size,bird.y-flap);ctx.stroke();
    }
    birds=birds.filter(b=>b.x>-20 && b.y>-20);
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
    $('sceneHint').textContent=paused?'静静看山海 · 动画已暂停':'点山看风起云涌 · 点水看涟漪鱼游';
    if(paused){stop();pointer.x=pointer.y=-1e4;pointer.dx=pointer.dy=0;draw(0);}else schedule();
  }
  function panel(open){$('settings').hidden=!open;$('settingsToggle').setAttribute('aria-expanded',String(open));(open?$('settingsClose'):$('settingsToggle')).focus();}
  for(const key of Object.keys(config))$(key).addEventListener('input',event=>{config[key]=Number(event.target.value);$(key+'Value').value=config[key]+'%';if(key==='mist')document.documentElement.style.setProperty('--mist-opacity',config.mist*.0055);if(paused)draw(0);});
  $('pauseToggle').addEventListener('click',()=>{paused=!paused;updatePause();});
  $('settingsToggle').addEventListener('click',()=>panel($('settings').hidden));$('settingsClose').addEventListener('click',()=>panel(false));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('settings').hidden)panel(false);});
  document.addEventListener('click',event=>{if(!$('settings').hidden&&!$('settings').contains(event.target)&&!$('settingsToggle').contains(event.target)){$('settings').hidden=true;$('settingsToggle').setAttribute('aria-expanded','false');}});
  $('sceneToggle').addEventListener('click',()=>{const only=document.body.classList.toggle('scene-only');$('sceneToggle').textContent=only?'显示首页':'只看风景';$('sceneToggle').setAttribute('aria-pressed',String(only));if(only)scrollTo({top:0,behavior:'instant'});});
  document.querySelectorAll('a[href="#writing"]').forEach(link=>link.addEventListener('click',()=>{document.body.classList.remove('scene-only');$('sceneToggle').textContent='只看风景';$('sceneToggle').setAttribute('aria-pressed','false');}));
  $('nightToggle').addEventListener('click',()=>{const value=document.body.classList.toggle('night');$('nightToggle').textContent=value?'切换晨光':'切换夜色';$('nightToggle').setAttribute('aria-pressed',String(value));if(paused){night=Number(value);draw(0);}});
  $('reset').addEventListener('click',()=>{
    Object.assign(config,defaults);for(const key of Object.keys(config)){$(key).value=config[key];$(key+'Value').value=config[key]+'%';}
    document.documentElement.style.setProperty('--mist-opacity','.22');document.body.classList.remove('night');$('nightToggle').textContent='切换夜色';$('nightToggle').setAttribute('aria-pressed','false');night=0;
    paused=reduced.matches||!ctx;rings=[];sparkles=[];gusts=[];wakes=[];updatePause();draw(0);
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
    if(!water){
      if(gusts.length>=4)gusts.shift();
      gusts.push({x,y:clamp(y,height*.29,height*.49),born:clock});
      if(birds.length>16)birds.splice(0,birds.length-16);
      addFlock(x,y,true);
      return;
    }
    addRing(x,y,1);
    for(const f of fish){if(Math.hypot(f.x-x,f.y-y)<220){f.escape=2.5;f.direction=f.x<x?-1:1;}}
    const amount=coarse.matches?28:44;
    for(let i=0;i<amount;i++){const angle=random(0,Math.PI*2),velocity=random(18,95);sparkles.push({x,y,vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity*(water?.38:1)-16,r:random(.8,2.3),born:clock,life:random(1.2,2.5)});}
    if(sparkles.length>260)sparkles.splice(0,sparkles.length-260);
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{pointer.x=pointer.y=-1e4;pointer.dx=pointer.dy=0;});
  let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(resize,120);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else schedule();});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else stop();}).observe(document.querySelector('.hero'));
  waterCanvas.addEventListener('webglcontextlost',event=>{event.preventDefault();imageReady=false;waterCanvas.classList.remove('ready');});
  waterCanvas.addEventListener('webglcontextrestored',()=>initWater());
  function motionPreference(){paused=reduced.matches||!ctx;$('motionNote').textContent=!ctx?'当前浏览器显示静态山水背景。':reduced.matches?'已跟随系统的减少动态效果设置，默认静止；可手动选择继续动画。':'点山：山风推雾、飞鸟起飞。点水：扩散涟漪、鱼群散开。帆船与尾流会持续移动。';updatePause();}
  reduced.addEventListener('change',motionPreference);
  if(!ctx)$('pauseToggle').hidden=true;
  image.onload=initWater;if(imageSource)image.src=imageSource;
  resize();motionPreference();
})();
