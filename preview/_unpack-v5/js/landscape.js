(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const photo = new Image(), nightPhoto = new Image(), art = $('landscapeArt');
  const water = $('water'), birdsCanvas = $('particles'), ctx = birdsCanvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)'), coarse = matchMedia('(pointer: coarse)');
  const config = { density: 65, speed: 35, mist: 40, glow: 60, lanterns: 55 };
  const defaultConfig = {...config};
  const source = getComputedStyle(art).backgroundImage.match(/url\(["']?(.*?)["']?\)$/)?.[1];
  const embeddedImages = location.protocol === 'file:' || art.dataset.textureMode === 'embedded';
  const sceneNote = $('motionNote').textContent;
  let nightLoading = false;
  const random = (a,b) => a+Math.random()*(b-a), clamp = (v,a,b) => Math.min(b,Math.max(a,v));
  // Simulate in a horizontal world plane, then project through the scene camera.
  const projection=window.LakeProjection,{camera,bounds}=projection;
  const cols=256, rows=192, length=cols*rows;
  const spacingX=(bounds.maxX-bounds.minX)/(cols-1),spacingZ=(bounds.maxZ-bounds.minZ)/(rows-1);
  const waveStep=.0055,weightX=(waveStep/spacingX)**2,weightZ=(waveStep/spacingZ)**2;
  const heights=new Float32Array(length), velocity=new Float32Array(length), pixels=new Uint8Array(length*4);
  let width=1,height=1,shore=.55,clock=0,previous=0,raf=0,visible=true;
  let paused=reduced.matches,ready=false,gl=null,program=null,locations={},heightTexture=null,nightTexture=null,nightReady=false;
  let accumulator=0,nextWind=0,nextFlock=12,night=0,birds=[],motes=[],lastStroke=-1;
  const touch={x:.5,y:.4,held:false,region:'',force:0,started:-10,dx:0,dy:0};

  const vertex=`attribute vec2 position; varying vec2 uv;void main(){uv=vec2((position.x+1.0)*.5,(1.0-position.y)*.5);gl_Position=vec4(position,0.0,1.0);}`;
  const fragment=`
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec2 uv;
    uniform sampler2D image;
    uniform sampler2D nightImage;
    uniform sampler2D lakeHeight;
    uniform vec2 viewport;
    uniform vec2 photoSize;
    uniform vec3 camera;
    uniform vec4 plane;
    uniform vec2 gridSpacing;
    uniform vec4 touch;
    uniform vec2 drag;
    uniform float time;
    uniform float wind;
    uniform float swell;
    uniform float mist;
    uniform float light;
    uniform float motion;
    uniform float nightMix;
    uniform float lanternDensity;
    float hash(vec2 point){
      vec3 p3=fract(vec3(point.xyx)*.1031);
      p3+=dot(p3,p3.yzx+33.33);
      return fract((p3.x+p3.y)*p3.z);
    }
    void main(){
      float cover=max(viewport.x/photoSize.x,viewport.y/photoSize.y);
      vec2 ratio=viewport/(photoSize*cover);
      vec2 focus=vec2(viewport.x<600.0?.60:.55,.5);
      vec2 p=uv*ratio+(1.0-ratio)*focus;
      vec2 original=p;
      vec3 sampleColor=texture2D(image,p).rgb;
      float lake=smoothstep(.542,.558,p.y);
      float worldZ=camera.y*camera.z/max(.025,p.y-camera.x);
      float worldX=(p.x-.5)*(photoSize.x/photoSize.y)*worldZ/camera.z;
      vec2 world=vec2(worldX,worldZ);
      vec2 planeUV=(world-plane.xy)/(plane.zw-plane.xy);
      float depth=clamp((2.8-worldZ)/2.45,0.0,1.0);
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
      float windEnvelope=sin(clamp(touch.w/3.2,0.0,1.0)*3.14159265);
      float windArea=exp(-distance2/.025)*windEnvelope*touch.z;
      // Wind only advects the cloud/air layer. Rock, snow, shoreline and buildings stay fixed.
      float cloudLayer=cloud*mountain*smoothstep(.32,.36,original.y)*(1.0-smoothstep(.485,.505,original.y));
      float airDepth=.3+.7*smoothstep(.33,.51,original.y);
      p-=vec2(.012+drag.x*.035,-.001+drag.y*.012)*windArea*cloudLayer*airDepth;
      vec3 field=texture2D(lakeHeight,clamp(planeUV,0.0,1.0)).rgb;
      vec2 slope=(field.gb*255.0-128.0)/64.0;
      float elevation=(field.r*255.0-128.0)/30.0*.0012;
      vec2 gradient=slope*.0012/gridSpacing;
      // The wave normal changes reflection direction; crest displacement uses perspective.
      vec3 normal=normalize(vec3(-gradient.x,1.0,-gradient.y));
      vec3 incident=normalize(vec3(worldX,-camera.y,worldZ));
      vec3 reflected=reflect(incident,normal),baseReflection=reflect(incident,vec3(0.0,1.0,0.0));
      vec2 rayChange=reflected.xy/max(.15,reflected.z)-baseReflection.xy/max(.15,baseReflection.z);
      vec2 reflectedOffset=vec2(rayChange.x*camera.z/(photoSize.x/photoSize.y),-rayChange.y*camera.z)*.065;
      p+=clamp(reflectedOffset,vec2(-.018),vec2(.018))*lake;
      p.y+=elevation*camera.z/worldZ*lake;
      vec2 sceneUV=clamp(p,.001,.999);
      vec3 color=mix(texture2D(image,sceneUV).rgb,texture2D(nightImage,sceneUV).rgb,nightMix);
      float reflectedLight=clamp(1.0+(gradient.x*.30-gradient.y*.45)*light,.89,1.12);
      color*=mix(1.0,reflectedLight,lake);
      // Daylight glints stay on the water surface.
      vec2 dayGrid=world*vec2(42.0,60.0),dayCell=floor(dayGrid),dayLocal=fract(dayGrid);
      float daySeed=hash(dayCell),dayPhase=hash(dayCell+19.0);
      vec2 dayCenter=vec2(.2+.6*hash(dayCell+7.0),.2+.6*dayPhase);
      vec2 dayOffset=(dayLocal-dayCenter)/vec2(.09+.15*depth,.075);
      float daySparkle=exp(-dot(dayOffset,dayOffset)*2.0)*step(.982,daySeed);
      float pulse=max(0.0,sin(time*(1.3+dayPhase*.8)+dayPhase*40.0+gradient.x*5.0-gradient.y*9.0));
      pulse=pow(pulse,6.0);
      float alongSun=(p.x-.89)/(.13+.11*depth);
      float sunPath=exp(-alongSun*alongSun);
      float dayIntensity=daySparkle*pulse*light*smoothstep(.558,.59,original.y)*(.17+.40*sunPath);
      color+=mix(vec3(.67,.82,.84),vec3(1.0,.87,.65),sunPath)*dayIntensity*(1.0-nightMix);

      // Small stable lamp heads project through the scene camera. Only their reflections
      // use the displaced water sample, so a lamp stays round while its reflection ripples.
      vec2 lampGrid=world*vec2(26.0,18.0),lampCell=floor(lampGrid);
      float seed=hash(lampCell+53.0),phase=hash(lampCell+29.0);
      vec2 center=vec2(.24+.52*hash(lampCell+11.0),.24+.52*phase);
      vec2 lampWorld=(lampCell+center)/vec2(26.0,18.0);
      float ribbonA=exp(-pow((lampWorld.x-.38*sin(lampWorld.y*2.7)-.13)/.25,2.0));
      float ribbonB=exp(-pow((lampWorld.x+.48*sin(lampWorld.y*1.8)-.68)/.28,2.0));
      float ribbonC=exp(-pow((lampWorld.x-.44*sin(lampWorld.y*1.3)+.76)/.27,2.0));
      float ribbon=max(ribbonA,max(ribbonB,ribbonC));
      float amount=clamp(lanternDensity,0.0,1.0);
      float present=step(1.0-amount*mix(.06,.57,ribbon),seed);
      vec2 lampPlane=(lampWorld-plane.xy)/(plane.zw-plane.xy);
      float bob=(texture2D(lakeHeight,clamp(lampPlane,0.0,1.0)).r*255.0-128.0)/30.0*.0012;
      vec2 lampBase=vec2(.5+camera.z*lampWorld.x/(photoSize.x/photoSize.y*lampWorld.y),camera.x+camera.z*(camera.y-bob)/lampWorld.y);
      vec2 imagePixels=photoSize*cover;
      float headLift=mix(1.0,2.0,depth);
      vec2 headUV=lampBase-vec2(0.0,headLift/imagePixels.y);
      vec2 headDelta=(original-headUV)*imagePixels;
      float radius=mix(.64,1.04,depth)*(.85+.25*phase);
      float head=exp(-dot(headDelta,headDelta)/(radius*radius));
      float halo=exp(-dot(headDelta,headDelta)/(radius*radius*7.0))*.10;
      float flare=(exp(-abs(headDelta.x)*5.0-abs(headDelta.y)*1.8)+exp(-abs(headDelta.y)*5.0-abs(headDelta.x)*1.8))*.075;
      vec2 reflectionDelta=(p-lampBase)*imagePixels;
      float tailLength=mix(2.2,7.0,depth);
      float reflection=exp(-reflectionDelta.x*reflectionDelta.x/(.4+.25*depth))*exp(-max(0.0,reflectionDelta.y)/tailLength)*step(.15,reflectionDelta.y);
      reflection*=.20*(.35+.65*pow(sin(reflectionDelta.y*1.7-time*1.3+phase*20.0),2.0));
      float steadiness=.92+.08*sin(time*.45+phase*20.0);
      float lampLight=(head+halo+flare+reflection)*present*steadiness*light*nightMix*smoothstep(.558,.585,original.y);
      vec3 lampColor=mix(vec3(1.0,.96,.84),vec3(1.0,.79,.50),hash(lampCell+41.0)*.42);
      color+=lampColor*lampLight*2.1;
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
      for(const key of ['image','nightImage','nightMix','lanternDensity','lakeHeight','viewport','photoSize','camera','plane','gridSpacing','touch','drag','time','wind','swell','mist','light','motion'])locations[key]=gl.getUniformLocation(program,key);
      const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);textureSettings();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,photo);gl.uniform1i(locations.image,0);
      heightTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,heightTexture);textureSettings();
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,cols,rows,0,gl.RGBA,gl.UNSIGNED_BYTE,pixels);gl.uniform1i(locations.lakeHeight,1);gl.activeTexture(gl.TEXTURE0);
      nightTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,nightTexture);textureSettings();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,photo);gl.uniform1i(locations.nightImage,2);gl.activeTexture(gl.TEXTURE0);
      if(nightPhoto.complete&&nightPhoto.naturalWidth)uploadNight();
      gl.uniform2f(locations.photoSize,photo.naturalWidth,photo.naturalHeight);
      gl.uniform3f(locations.camera,camera.horizon,camera.height,camera.focal);
      gl.uniform4f(locations.plane,bounds.minX,bounds.minZ,bounds.maxX,bounds.maxZ);
      gl.uniform2f(locations.gridSpacing,spacingX,spacingZ);
      ready=true;resize();water.classList.add('ready');$('pauseToggle').hidden=false;
      $('motionNote').textContent=paused&&reduced.matches?'系统已启用减少动画。点击“继续动画”可播放山水背景。':sceneNote;
      syncPause();
    }catch(error){failScene(error);}
  }
  function failScene(error){
    ready=false;gl=null;paused=true;water.classList.remove('ready');$('pauseToggle').hidden=true;syncPause();
    $('sceneHint').textContent='背景动画暂不可用';
    $('motionNote').textContent=error.name==='SecurityError'?'浏览器限制了背景图片的动画读取。请确认 js 文件夹已完整更新。':'背景动画未能加载。请确认 css、js 和 assets 文件夹与首页一起保留，且浏览器支持 WebGL。';
    console.warn('山水背景初始化失败：'+error.name+' / '+error.message);
  }
  function textureSettings(){gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);}
  function uploadNight(){
    if(!gl||!nightTexture)return;
    try{gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,nightTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,nightPhoto);nightReady=true;}
    catch(error){failNight(error);}
    finally{gl.activeTexture(gl.TEXTURE0);}
    if(ready)draw();
  }
  function failNight(error){
    nightLoading=false;nightReady=false;night=0;document.body.classList.remove('night');
    $('nightToggle').textContent='切换夜色';$('nightToggle').setAttribute('aria-pressed','false');
    $('motionNote').textContent='夜景图片未能加载，暂时保留晨光动画。请确认夜景资源已完整更新。';
    console.warn('山水夜景加载失败：'+error.message);
  }
  function loadNight(){
    if(nightLoading||nightReady)return;
    nightLoading=true;window.SceneImages.assign(nightPhoto,art.dataset.nightImage,'night',embeddedImages).catch(failNight);
  }
  function resize(){
    width=innerWidth;height=innerHeight;
    const dpr=Math.min(devicePixelRatio||1,coarse.matches?1.25:1.5);
    water.width=Math.round(width*Math.min(dpr,1.25));water.height=Math.round(height*Math.min(dpr,1.25));
    birdsCanvas.width=Math.round(width*dpr);birdsCanvas.height=Math.round(height*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);
    const cover=Math.max(width/(photo.naturalWidth||1672),height/(photo.naturalHeight||940));
    const ratio=height/((photo.naturalHeight||940)*cover);shore=clamp((.55-(1-ratio)*.5)/ratio,.1,.85);
    heights.fill(0);velocity.fill(0);accumulator=0;birds=[];addFlock(width*.93,height*.22);
    // A few fine, wind-carried motes; the sample's sparse scale, without pixelating the scenery.
    motes=Array.from({length:width<600?9:18},()=>{
      const p=projection.screenToImage(random(0,1),random(.13,.51),width,height,photo.naturalWidth||1672,photo.naturalHeight||940);
      const z=random(1.2,4.2),aspect=(photo.naturalWidth||1672)/(photo.naturalHeight||940);
      return {x:(p.x-.5)*aspect*z/camera.focal,y:camera.height-(p.y-camera.horizon)*z/camera.focal,z,phase:random(0,Math.PI*2),speed:random(.7,1.4)};
    });
    draw();schedule();
  }
  function disturb(x,y,power=-.55,radius=.05){
    if(y<shore)return;
    const p=projection.screenToImage(x,y,width,height,photo.naturalWidth,photo.naturalHeight);
    const world=projection.imageToWorld(p.x,p.y,photo.naturalWidth/photo.naturalHeight);
    if(!world||world.x<bounds.minX||world.x>bounds.maxX||world.z<bounds.minZ||world.z>bounds.maxZ)return;
    const gx=(world.x-bounds.minX)/spacingX,gz=(world.z-bounds.minZ)/spacingZ;
    const rangeX=Math.ceil(radius*2.7/spacingX),rangeZ=Math.ceil(radius*2.7/spacingZ);
    for(let yy=Math.max(1,Math.floor(gz)-rangeZ);yy<Math.min(rows-1,gz+rangeZ);yy++){
      for(let xx=Math.max(1,Math.floor(gx)-rangeX);xx<Math.min(cols-1,gx+rangeX);xx++){
        const d=((xx-gx)*spacingX)**2+((yy-gz)*spacingZ)**2,index=yy*cols+xx;
        velocity[index]=clamp(velocity[index]+power*Math.exp(-d/(radius*radius)),-1.2,1.2);
      }
    }
  }
  function simulate(dt){
    accumulator+=dt;
    let steps=0;
    while(accumulator>=1/60 && steps++<5){
      for(let y=1;y<rows-1;y++)for(let x=1;x<cols-1;x++){
        const i=y*cols+x;
        const lapX=heights[i-1]+heights[i+1]-2*heights[i];
        const lapZ=heights[i-cols]+heights[i+cols]-2*heights[i];
        const edge=Math.min(x,cols-1-x,y,rows-1-y);
        velocity[i]=(velocity[i]+lapX*weightX+lapZ*weightZ)*(edge<5?.85:.983);
      }
      for(let i=0;i<length;i++)heights[i]=clamp(heights[i]+velocity[i],-2.5,2.5);
      accumulator-=1/60;
    }
    if(clock>nextWind){disturb(random(.1,.9),random(shore+.05,.92),-.009,.07);nextWind=clock+2.4;}
    if(touch.held&&touch.region==='water'&&clock-lastStroke>.12){disturb(touch.x,touch.y,-.045,.04);lastStroke=clock;}
  }
  function draw(){
    if(ready){
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
        const i=y*cols+x,j=i*4;
        const dx=(heights[y*cols+Math.min(cols-1,x+1)]-heights[y*cols+Math.max(0,x-1)])*.5;
        const dy=(heights[Math.min(rows-1,y+1)*cols+x]-heights[Math.max(0,y-1)*cols+x])*.5;
        pixels[j]=clamp(128+heights[i]*30,0,255);pixels[j+1]=clamp(128+dx*64,0,255);pixels[j+2]=clamp(128+dy*64,0,255);pixels[j+3]=255;
      }
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,heightTexture);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,cols,rows,gl.RGBA,gl.UNSIGNED_BYTE,pixels);gl.activeTexture(gl.TEXTURE0);
      gl.viewport(0,0,water.width,water.height);gl.uniform2f(locations.viewport,width,height);gl.uniform1f(locations.time,clock);
      gl.uniform1f(locations.wind,config.speed/100);gl.uniform1f(locations.swell,config.density/65);gl.uniform1f(locations.mist,config.mist/40);gl.uniform1f(locations.light,config.glow/60);
      gl.uniform1f(locations.nightMix,nightReady?night:0);
      gl.uniform1f(locations.lanternDensity,config.lanterns/100);
      const age=touch.held&&touch.region==='mountain'?Math.min(1.25,clock-touch.started):clock-touch.started;
      gl.uniform1f(locations.motion,reduced.matches&&paused?0:1);gl.uniform4f(locations.touch,touch.x,touch.y,touch.force,age);gl.uniform2f(locations.drag,touch.dx,touch.dy);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
    if(ctx){ctx.clearRect(0,0,width,height);ctx.globalAlpha=.65*(1-night*.8);ctx.strokeStyle='#243d45';ctx.lineWidth=1.25;
      for(const b of birds){const flap=Math.sin(clock*5.6+b.phase)*b.size*.8;ctx.beginPath();ctx.moveTo(b.x-b.size,b.y-flap);ctx.quadraticCurveTo(b.x-b.size*.3,b.y-b.size*.2,b.x,b.y);ctx.quadraticCurveTo(b.x+b.size*.3,b.y-b.size*.2,b.x+b.size,b.y-flap);ctx.stroke();}
      for(const m of motes){
        const cover=Math.max(width/photo.naturalWidth,height/photo.naturalHeight),aspect=photo.naturalWidth/photo.naturalHeight;
        const rx=width/(photo.naturalWidth*cover),ry=height/(photo.naturalHeight*cover);
        const driftX=m.x+clock*.007*(.5+config.speed/60)*m.speed;
        const p={x:.5+camera.focal*driftX/(aspect*m.z),y:camera.horizon+camera.focal*(camera.height-m.y-Math.sin(clock*.22+m.phase)*.008)/m.z};
        const x=(((p.x-(1-rx)*(width<600?.60:.55))/rx*width)%(width+12)+width+12)%(width+12)-6;
        const y=(p.y-(1-ry)*.5)/ry*height;
        const fade=Math.max(0,Math.sin(clock*.7+m.phase));
        ctx.globalAlpha=fade*fade*.32*(config.glow/60)*(1-night*.65);
        ctx.fillStyle=m.z<2.4?'#eee5ca':'#cddfdd';
        const size=clamp(.002*camera.focal*photo.naturalHeight*cover/m.z,.35,1.7);ctx.fillRect(x,y,size,size);
      }
      ctx.globalAlpha=1;
    }
  }
  function addFlock(x=width+15,y=random(height*.12,height*.3)){for(let i=0;i<5;i++)birds.push({x:x+i*26,y:y+Math.abs(i-2)*8,size:random(3,5),speed:random(34,45),phase:random(0,6)});}
  function frame(now){
    raf=0;if(paused||!visible||document.hidden||!ready){previous=0;return;}
    if(!previous)previous=now;
    if(now-previous>=30){const dt=Math.min((now-previous)/1000,.075);previous=now;clock+=dt;simulate(dt);
      night+=(Number(document.body.classList.contains('night')&&nightReady)-night)*Math.min(1,dt*2);
      for(const b of birds){b.x-=dt*b.speed;b.y+=Math.sin(clock*.6+b.phase)*dt*1.8;}birds=birds.filter(b=>b.x>-20);
      if(clock>nextFlock){if(birds.length<10)addFlock();nextFlock=clock+random(13,20);}draw();
    }schedule();
  }
  function stop(){cancelAnimationFrame(raf);raf=0;previous=0;}
  function schedule(){if(!raf&&!paused&&visible&&!document.hidden&&ready)raf=requestAnimationFrame(frame);}
  function release(){if(touch.held&&touch.region==='mountain'&&clock-touch.started>1.25)touch.started=clock-1.25;touch.held=false;}
  function syncPause(){document.body.classList.toggle('paused',paused);$('pauseToggle').textContent=paused?'继续动画':'暂停动画';$('pauseToggle').setAttribute('aria-pressed',String(paused));$('sceneHint').textContent=paused?'动画已暂停':'点水拨动倒影 · 点山吹动云雾';if(paused){release();stop();draw();}else schedule();}
  function panel(open){$('settings').hidden=!open;$('settingsToggle').setAttribute('aria-expanded',String(open));(open?$('settingsClose'):$('settingsToggle')).focus();}
  function position(event){return {x:clamp(event.clientX/width,0,1),y:clamp(event.clientY/height,0,1)};}
  function eligible(event){return ready&&visible&&!paused&&event.clientY<height&&scrollY<height*.5&&!event.target.closest('a,button,input,textarea,.settings,.section,.showcase-head,.carousel-track,.carousel-controls,.profile-card,.profile-interests,footer,.site-header,.music-panel,.music-mini,.modal-overlay');}
  addEventListener('pointerdown',event=>{
    if(!eligible(event))return;
    const p=position(event);touch.x=p.x;touch.y=p.y;touch.dx=touch.dy=0;touch.held=true;touch.region=p.y>shore?'water':'mountain';
    if(touch.region==='water'){touch.force=0;disturb(p.x,p.y,-.55,.05);lastStroke=clock;}
    else{touch.force=1;touch.started=clock;}
  },{passive:true});
  addEventListener('pointermove',event=>{
    if(!eligible(event))return;
    const p=position(event);
    if(touch.held&&touch.region==='mountain'){touch.dx=clamp(p.x-touch.x,-.13,.13);touch.dy=clamp(p.y-touch.y,-.10,.10);}
    else if(p.y>shore&&clock-lastStroke>(touch.held?.07:.18)){disturb(p.x,p.y,touch.held?-.12:-.009,touch.held?.035:.025);lastStroke=clock;if(touch.held){touch.x=p.x;touch.y=p.y;}}
  },{passive:true});
  addEventListener('pointerup',release);addEventListener('pointercancel',release);addEventListener('blur',release);
  document.documentElement.addEventListener('pointerleave',release);
  $('pauseToggle').addEventListener('click',()=>{paused=!paused;syncPause();});
  $('settingsToggle').addEventListener('click',()=>panel($('settings').hidden));$('settingsClose').addEventListener('click',()=>panel(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('settings').hidden)panel(false);});
  document.addEventListener('click',e=>{if(!$('settings').hidden&&!$('settings').contains(e.target)&&!$('settingsToggle').contains(e.target)){$('settings').hidden=true;$('settingsToggle').setAttribute('aria-expanded','false');}});
  for(const key of Object.keys(config))$(key).addEventListener('input',e=>{config[key]=Number(e.target.value);$(key+'Value').value=config[key]+'%';if(paused)draw();});
  $('sceneToggle').addEventListener('click',()=>{const only=document.body.classList.toggle('scene-only');$('sceneToggle').textContent=only?(document.body.classList.contains('collection-page')?'显示内容':'显示首页'):'只看风景';$('sceneToggle').setAttribute('aria-pressed',String(only));if(only)scrollTo({top:0,behavior:'instant'});});
  document.querySelectorAll('.nav-links a, a[href="#blog"], a[data-animate], .brand').forEach(a=>a.addEventListener('click',()=>{document.body.classList.remove('scene-only');$('sceneToggle').textContent='只看风景';$('sceneToggle').setAttribute('aria-pressed','false');}));
  $('nightToggle').addEventListener('click',()=>{const n=document.body.classList.toggle('night');if(n)loadNight();$('nightToggle').textContent=n?'切换晨光':'切换夜色';$('nightToggle').setAttribute('aria-pressed',String(n));if(paused){night=Number(n);draw();}});
  $('reset').addEventListener('click',()=>{Object.assign(config,defaultConfig);for(const key of Object.keys(config)){$(key).value=config[key];$(key+'Value').value=config[key]+'%';}heights.fill(0);velocity.fill(0);release();touch.force=touch.dx=touch.dy=0;touch.started=-10;document.body.classList.remove('night');$('nightToggle').textContent='切换夜色';$('nightToggle').setAttribute('aria-pressed','false');night=0;paused=reduced.matches;syncPause();draw();});
  let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(resize,120);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){release();stop();}else schedule();});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){release();stop();}else schedule();}).observe(document.querySelector('.landscape'));
  reduced.addEventListener('change',()=>{paused=reduced.matches;syncPause();});
  water.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;paused=true;water.classList.remove('ready');$('pauseToggle').hidden=true;syncPause();});
  water.addEventListener('webglcontextrestored',()=>{paused=reduced.matches;$('pauseToggle').hidden=false;initialize();});
  nightPhoto.onload=uploadNight;nightPhoto.onerror=()=>failNight(new Error('Night image could not be decoded'));
  if(document.body.classList.contains('night'))loadNight();
  photo.onload=initialize;photo.onerror=()=>failScene(new Error('Day image could not be decoded'));
  window.SceneImages.assign(photo,source,'day',embeddedImages).catch(failScene);
  resize();syncPause();
})();
