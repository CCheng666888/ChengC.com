(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const photo = new Image(), art = $('landscapeArt');
  const water = $('water'), birdsCanvas = $('particles'), ctx = birdsCanvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)'), coarse = matchMedia('(pointer: coarse)');
  const config = { density: 65, speed: 35, mist: 40, glow: 60 };
  const defaultConfig = {...config};
  const source = getComputedStyle(art).backgroundImage.match(/url\(["']?(.*?)["']?\)$/)?.[1];
  const random = (a,b) => a+Math.random()*(b-a), clamp = (v,a,b) => Math.min(b,Math.max(a,v));
  // The lake is a damped height field. Its gradients refract the original photograph.
  const cols=144, rows=96, length=cols*rows;
  const heights=new Float32Array(length), velocity=new Float32Array(length), pixels=new Uint8Array(length*4);
  let width=1,height=1,shore=.55,clock=0,previous=0,raf=0,visible=true;
  let paused=reduced.matches,ready=false,gl=null,program=null,locations={},heightTexture=null;
  let accumulator=0,nextWind=0,nextFlock=12,night=0,birds=[],lastStroke=-1;
  const touch={x:.5,y:.4,held:false,region:'',force:0,speed:0,target:0,dx:0,dy:0};

  const vertex=`attribute vec2 position; varying vec2 uv;void main(){uv=vec2((position.x+1.0)*.5,(1.0-position.y)*.5);gl_Position=vec4(position,0.0,1.0);}`;
  const fragment=`
    precision mediump float;
    varying vec2 uv;
    uniform sampler2D image;
    uniform sampler2D lakeHeight;
    uniform vec2 viewport;
    uniform vec2 photoSize;
    uniform vec4 touch;
    uniform vec2 drag;
    uniform float time;
    uniform float wind;
    uniform float swell;
    uniform float mist;
    uniform float light;
    uniform float motion;
    void main(){
      float cover=max(viewport.x/photoSize.x,viewport.y/photoSize.y);
      vec2 ratio=viewport/(photoSize*cover);
      vec2 focus=vec2(viewport.x<600.0?.60:.55,.5);
      vec2 p=uv*ratio+(1.0-ratio)*focus;
      vec2 original=p;
      vec3 sampleColor=texture2D(image,p).rgb;
      float lake=smoothstep(.542,.558,p.y);
      float depth=smoothstep(.55,1.0,p.y);
      float mountain=smoothstep(.19,.28,p.y)*(1.0-smoothstep(.515,.547,p.y));
      float sky=1.0-smoothstep(.20,.29,p.y);
      float tint=max(sampleColor.r,max(sampleColor.g,sampleColor.b))-min(sampleColor.r,min(sampleColor.g,sampleColor.b));
      float cloud=smoothstep(.49,.78,dot(sampleColor,vec3(.3,.5,.2)))*(1.0-smoothstep(.06,.24,tint));
      float t=time*(.6+wind);
      // Ambient water and clouds move their own pixels, with no separate painted effects.
      p.x+=motion*lake*(.0010+.0031*depth)*sin(p.y*112.0-t*2.4+p.x*10.0)*swell;
      p.y+=motion*lake*(.0008+.0016*depth)*sin(p.x*67.0+t*1.7+p.y*34.0)*swell;
      p.x+=motion*cloud*(sky+mountain*.5)*sin(time*.14+p.y*7.0)*.006*mist;
      p.y+=motion*cloud*sin(time*.19+p.x*14.0)*.0018*mist;
      vec2 delta=(uv-touch.xy)*vec2(viewport.x/viewport.y,1.0);
      float distance2=dot(delta,delta);
      float pressure=exp(-distance2/.022)*touch.z*mountain;
      // Pressing the mountain moves its original features in depth, then springs back on release.
      float depthHint=.45+.55*smoothstep(.23,.52,original.y);
      p+=delta*pressure*.047*depthHint;
      p-=drag*pressure*vec2(.16,.12)*depthHint;
      vec3 field=texture2D(lakeHeight,uv).rgb;
      vec2 slope=(field.gb*255.0-128.0)/64.0;
      p+=slope*vec2(.012,.009)*lake;
      vec3 color=texture2D(image,clamp(p,.001,.999)).rgb;
      float reflectedLight=clamp(1.0+(slope.x*.10-slope.y*.14)*light,.82,1.15);
      color*=mix(1.0,reflectedLight,lake);
      gl_FragColor=vec4(color,1.0);
    }
  `;
  function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Scene unavailable');return s;}
  function initialize(){
    try{
      gl=water.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl)throw new Error('Scene unavailable');
      program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Scene unavailable');gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const attribute=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
      for(const key of ['image','lakeHeight','viewport','photoSize','touch','drag','time','wind','swell','mist','light','motion'])locations[key]=gl.getUniformLocation(program,key);
      const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);textureSettings();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,photo);gl.uniform1i(locations.image,0);
      heightTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,heightTexture);textureSettings();
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,cols,rows,0,gl.RGBA,gl.UNSIGNED_BYTE,pixels);gl.uniform1i(locations.lakeHeight,1);gl.activeTexture(gl.TEXTURE0);
      gl.uniform2f(locations.photoSize,photo.naturalWidth,photo.naturalHeight);
      ready=true;resize();water.classList.add('ready');syncPause();
    }catch{ready=false;gl=null;paused=true;water.classList.remove('ready');$('motionNote').textContent='当前浏览器显示静态山水背景。';$('pauseToggle').hidden=true;syncPause();}
  }
  function textureSettings(){gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);}
  function resize(){
    width=innerWidth;height=innerHeight;
    const dpr=Math.min(devicePixelRatio||1,coarse.matches?1.25:1.5);
    water.width=Math.round(width*Math.min(dpr,1.25));water.height=Math.round(height*Math.min(dpr,1.25));
    birdsCanvas.width=Math.round(width*dpr);birdsCanvas.height=Math.round(height*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);
    const cover=Math.max(width/(photo.naturalWidth||1672),height/(photo.naturalHeight||940));
    const ratio=height/((photo.naturalHeight||940)*cover);shore=clamp((.55-(1-ratio)*.5)/ratio,.1,.85);
    heights.fill(0);velocity.fill(0);accumulator=0;birds=[];addFlock(width*.93,height*.22);draw();schedule();
  }
  function disturb(x,y,power=-.8,radius=3.3){
    if(y<shore)return;
    const gx=x*(cols-1),gy=y*(rows-1),range=Math.ceil(radius*2.7);
    for(let yy=Math.max(Math.ceil(shore*rows),Math.floor(gy)-range);yy<Math.min(rows-1,gy+range);yy++){
      for(let xx=Math.max(1,Math.floor(gx)-range);xx<Math.min(cols-1,gx+range);xx++){
        const d=(xx-gx)**2+(yy-gy)**2,index=yy*cols+xx;
        velocity[index]=clamp(velocity[index]+power*Math.exp(-d/(radius*radius)),-1.8,1.8);
      }
    }
  }
  function simulate(dt){
    accumulator+=dt;
    const start=Math.max(1,Math.ceil(shore*rows));
    let steps=0;
    while(accumulator>=1/60 && steps++<5){
      for(let y=start;y<rows-1;y++)for(let x=1;x<cols-1;x++){
        const i=y*cols+x;
        const laplacian=heights[i-1]+heights[i+1]+heights[i-cols]+heights[i+cols]-4*heights[i];
        const edge=Math.min(x,cols-1-x,y-start,rows-1-y);
        velocity[i]=(velocity[i]+laplacian*.21)*(edge<3?.88:.987);
      }
      for(let i=start*cols;i<length;i++)heights[i]=clamp(heights[i]+velocity[i],-2.5,2.5);
      accumulator-=1/60;
    }
    if(clock>nextWind){disturb(random(.1,.9),random(shore+.05,.92),-.025,5);nextWind=clock+2.4;}
    if(touch.held&&touch.region==='water'&&clock-lastStroke>.08){disturb(touch.x,touch.y,-.06,2.8);lastStroke=clock;}
    const acceleration=(touch.target-touch.force)*70-touch.speed*15;
    touch.speed+=acceleration*dt;touch.force+=touch.speed*dt;
    if(Math.abs(touch.force)<.0001&&Math.abs(touch.speed)<.0001)touch.force=touch.speed=0;
  }
  function draw(){
    if(ready){
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
        const i=y*cols+x,j=i*4;
        const dx=(heights[y*cols+Math.min(cols-1,x+1)]-heights[y*cols+Math.max(0,x-1)])*.5;
        const dy=(heights[Math.min(rows-1,y+1)*cols+x]-heights[Math.max(0,y-1)*cols+x])*.5;
        pixels[j]=clamp(128+heights[i]*25,0,255);pixels[j+1]=clamp(128+dx*64,0,255);pixels[j+2]=clamp(128+dy*64,0,255);pixels[j+3]=255;
      }
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,heightTexture);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,cols,rows,gl.RGBA,gl.UNSIGNED_BYTE,pixels);gl.activeTexture(gl.TEXTURE0);
      gl.viewport(0,0,water.width,water.height);gl.uniform2f(locations.viewport,width,height);gl.uniform1f(locations.time,clock);
      gl.uniform1f(locations.wind,config.speed/100);gl.uniform1f(locations.swell,config.density/65);gl.uniform1f(locations.mist,config.mist/40);gl.uniform1f(locations.light,config.glow/60);
      gl.uniform1f(locations.motion,reduced.matches&&paused?0:1);gl.uniform4f(locations.touch,touch.x,touch.y,touch.force,0);gl.uniform2f(locations.drag,touch.dx,touch.dy);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
    if(ctx){ctx.clearRect(0,0,width,height);ctx.globalAlpha=.65*(1-night*.8);ctx.strokeStyle='#243d45';ctx.lineWidth=1.25;
      for(const b of birds){const flap=Math.sin(clock*5.6+b.phase)*b.size*.8;ctx.beginPath();ctx.moveTo(b.x-b.size,b.y-flap);ctx.quadraticCurveTo(b.x-b.size*.3,b.y-b.size*.2,b.x,b.y);ctx.quadraticCurveTo(b.x+b.size*.3,b.y-b.size*.2,b.x+b.size,b.y-flap);ctx.stroke();}ctx.globalAlpha=1;
    }
  }
  function addFlock(x=width+15,y=random(height*.12,height*.3)){for(let i=0;i<5;i++)birds.push({x:x+i*26,y:y+Math.abs(i-2)*8,size:random(3,5),speed:random(34,45),phase:random(0,6)});}
  function frame(now){
    raf=0;if(paused||!visible||document.hidden||!ready){previous=0;return;}
    if(!previous)previous=now;
    if(now-previous>=30){const dt=Math.min((now-previous)/1000,.075);previous=now;clock+=dt;simulate(dt);
      night+=(Number(document.body.classList.contains('night'))-night)*Math.min(1,dt*2);
      for(const b of birds){b.x-=dt*b.speed;b.y+=Math.sin(clock*.6+b.phase)*dt*1.8;}birds=birds.filter(b=>b.x>-20);
      if(clock>nextFlock){if(birds.length<10)addFlock();nextFlock=clock+random(13,20);}draw();
    }schedule();
  }
  function stop(){cancelAnimationFrame(raf);raf=0;previous=0;}
  function schedule(){if(!raf&&!paused&&visible&&!document.hidden&&ready)raf=requestAnimationFrame(frame);}
  function release(){touch.held=false;touch.target=0;}
  function syncPause(){document.body.classList.toggle('paused',paused);$('pauseToggle').textContent=paused?'继续动画':'暂停动画';$('pauseToggle').setAttribute('aria-pressed',String(paused));$('sceneHint').textContent=paused?'动画已暂停':'点水拨动湖面 · 按住山间轻轻拖动';if(paused){release();stop();draw();}else schedule();}
  function panel(open){$('settings').hidden=!open;$('settingsToggle').setAttribute('aria-expanded',String(open));(open?$('settingsClose'):$('settingsToggle')).focus();}
  function position(event){return {x:clamp(event.clientX/width,0,1),y:clamp(event.clientY/height,0,1)};}
  function eligible(event){return ready&&visible&&!paused&&event.clientY<height&&scrollY<height*.5&&!event.target.closest('a,button,input,.settings');}
  addEventListener('pointerdown',event=>{
    if(!eligible(event))return;
    const p=position(event);touch.x=p.x;touch.y=p.y;touch.dx=touch.dy=0;touch.held=true;touch.region=p.y>shore?'water':'mountain';
    if(touch.region==='water'){disturb(p.x,p.y,-.72,3.5);lastStroke=clock;}
    else{touch.target=1;touch.speed+=3;}
  },{passive:true});
  addEventListener('pointermove',event=>{
    if(!eligible(event))return;
    const p=position(event);
    if(touch.held&&touch.region==='mountain'){touch.dx=clamp(p.x-touch.x,-.13,.13);touch.dy=clamp(p.y-touch.y,-.10,.10);}
    else if(p.y>shore&&clock-lastStroke>(touch.held?.045:.12)){disturb(p.x,p.y,touch.held?-.24:-.025,touch.held?2.3:2);lastStroke=clock;touch.x=p.x;touch.y=p.y;}
  },{passive:true});
  addEventListener('pointerup',release);addEventListener('pointercancel',release);addEventListener('blur',release);
  document.documentElement.addEventListener('pointerleave',release);
  $('pauseToggle').addEventListener('click',()=>{paused=!paused;syncPause();});
  $('settingsToggle').addEventListener('click',()=>panel($('settings').hidden));$('settingsClose').addEventListener('click',()=>panel(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('settings').hidden)panel(false);});
  document.addEventListener('click',e=>{if(!$('settings').hidden&&!$('settings').contains(e.target)&&!$('settingsToggle').contains(e.target)){$('settings').hidden=true;$('settingsToggle').setAttribute('aria-expanded','false');}});
  for(const key of Object.keys(config))$(key).addEventListener('input',e=>{config[key]=Number(e.target.value);$(key+'Value').value=config[key]+'%';if(paused)draw();});
  $('sceneToggle').addEventListener('click',()=>{const only=document.body.classList.toggle('scene-only');$('sceneToggle').textContent=only?'显示首页':'只看风景';$('sceneToggle').setAttribute('aria-pressed',String(only));if(only)scrollTo({top:0,behavior:'instant'});});
  document.querySelectorAll('a[href="#writing"]').forEach(a=>a.addEventListener('click',()=>{document.body.classList.remove('scene-only');$('sceneToggle').textContent='只看风景';$('sceneToggle').setAttribute('aria-pressed','false');}));
  $('nightToggle').addEventListener('click',()=>{const n=document.body.classList.toggle('night');$('nightToggle').textContent=n?'切换晨光':'切换夜色';$('nightToggle').setAttribute('aria-pressed',String(n));if(paused){night=Number(n);draw();}});
  $('reset').addEventListener('click',()=>{Object.assign(config,defaultConfig);for(const key of Object.keys(config)){$(key).value=config[key];$(key+'Value').value=config[key]+'%';}heights.fill(0);velocity.fill(0);release();touch.force=touch.speed=touch.dx=touch.dy=0;document.body.classList.remove('night');$('nightToggle').textContent='切换夜色';$('nightToggle').setAttribute('aria-pressed','false');night=0;paused=reduced.matches;syncPause();draw();});
  let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(resize,120);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){release();stop();}else schedule();});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){release();stop();}else schedule();}).observe(document.querySelector('.hero'));
  reduced.addEventListener('change',()=>{paused=reduced.matches;syncPause();});
  water.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;paused=true;water.classList.remove('ready');$('pauseToggle').hidden=true;syncPause();});
  water.addEventListener('webglcontextrestored',()=>{paused=reduced.matches;$('pauseToggle').hidden=false;initialize();});
  photo.onload=initialize;if(source)photo.src=source;
  resize();syncPause();
})();
