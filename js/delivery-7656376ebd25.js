/* js/lake-projection.js */
/* Shared camera and lake-plane coordinates. No DOM or rendering dependencies. */
(function (root) {
  'use strict';
  const camera = { horizon: .48, height: .20, focal: .92 };
  const bounds = { minX: -3, maxX: 3, minZ: .30, maxZ: 3.50 };
  function imageToWorld(x, y, aspect) {
    if (y <= camera.horizon) return null;
    const z = camera.height * camera.focal / (y - camera.horizon);
    return { x: (x - .5) * aspect * z / camera.focal, z };
  }
  function worldToImage(x, z, aspect, elevation = 0) {
    return { x: .5 + camera.focal * x / (aspect * z),
      y: camera.horizon + camera.focal * (camera.height - elevation) / z };
  }
  function screenToImage(x, y, width, height, photoWidth, photoHeight) {
    const cover = Math.max(width / photoWidth, height / photoHeight);
    const ratioX = width / (photoWidth * cover), ratioY = height / (photoHeight * cover);
    return { x: x * ratioX + (1 - ratioX) * (width < 600 ? .60 : .55),
      y: y * ratioY + (1 - ratioY) * .5 };
  }
  const api = { camera, bounds, imageToWorld, worldToImage, screenToImage };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LakeProjection = api;
})(typeof window !== 'undefined' ? window : this);

;
/* js/scene-images.js */
(() => {
  'use strict';
  // file:// photos can display in CSS while being rejected as WebGL textures.
  // Classic scripts carry the same image bytes as data URLs for local HTML use.
  const scriptURL = document.currentScript.src;
  const images = new Map(), pending = new Map();
  const bundles = {day: 'scene-day-data.js', night: 'scene-night-data.js', dayMobile: 'scene-day-mobile-data.js', nightMobile: 'scene-night-mobile-data.js'};

  function embeddedImage(key) {
    if (!Object.hasOwn(bundles, key)) return Promise.reject(new Error('Unknown scene image'));
    if (images.has(key)) return Promise.resolve(images.get(key));
    if (pending.has(key)) return pending.get(key);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(bundles[key], scriptURL).href;
      script.async = true;
      script.onload = () => {
        script.remove();
        if (images.has(key)) resolve(images.get(key));
        else reject(new Error('Scene image bundle is incomplete'));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('Scene image bundle is missing'));
      };
      document.head.appendChild(script);
    });
    pending.set(key, promise);
    promise.catch(() => pending.delete(key));
    return promise;
  }

  window.SceneImages = Object.freeze({
    register(key, dataURL) {
      if (!Object.hasOwn(bundles, key) || !/^data:image\/(?:webp|png);base64,/.test(dataURL)) {
        throw new Error('Invalid scene image bundle');
      }
      images.set(key, dataURL);
    },
    async assign(image, source, key, embedded = location.protocol === 'file:') {
      if (!source) throw new Error('Scene image URL is missing');
      image.src = embedded ? await embeddedImage(key) : new URL(source, document.baseURI).href;
    }
  });
})();

;
/* js/landscape.js */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const photo = new Image(), nightPhoto = new Image(), art = $('landscapeArt');
  const water = $('water'), birdsCanvas = $('particles'), ctx = birdsCanvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)'), coarse = matchMedia('(pointer: coarse)');
  const smallScreen = matchMedia('(max-width: 800px)');
  const lightweight = smallScreen.matches || coarse.matches;
  const saveData = Boolean(navigator.connection?.saveData);
  const frameInterval = lightweight ? 1000/24 : 30;
  const config = { density: 65, speed: 35, mist: 40, glow: 60, lanterns: 55 };
  const defaultConfig = {...config};
  const source = getComputedStyle(art).backgroundImage.match(/url\(["']?(.*?)["']?\)$/)?.[1];
  const embeddedImages = location.protocol === 'file:' || art.dataset.textureMode === 'embedded';
  const sceneNote = $('motionNote').textContent;
  let nightLoading = false, sceneRequested = false, initQueued = false, initializing = false, initGeneration = 0;
  photo.decoding = nightPhoto.decoding = 'async';
  const random = (a,b) => a+Math.random()*(b-a), clamp = (v,a,b) => Math.min(b,Math.max(a,v));
  // Simulate in a horizontal world plane, then project through the scene camera.
  const projection=window.LakeProjection,{camera,bounds}=projection;
  const cols=lightweight?128:256, rows=lightweight?96:192, length=cols*rows;
  const spacingX=(bounds.maxX-bounds.minX)/(cols-1),spacingZ=(bounds.maxZ-bounds.minZ)/(rows-1);
  const waveStep=.0055,weightX=(waveStep/spacingX)**2,weightZ=(waveStep/spacingZ)**2;
  const heights=new Float32Array(length), velocity=new Float32Array(length), pixels=new Uint8Array(length*4);
  let width=1,height=1,shore=.55,clock=0,previous=0,raf=0,visible=true;
  let paused=reduced.matches||saveData,ready=false,gl=null,program=null,locations={},heightTexture=null,nightTexture=null,nightReady=false;
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
      if(nightMix<.999 && light>0.0){
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

      }

      // Small stable lamp heads project through the scene camera. Only their reflections
      // use the displaced water sample, so a lamp stays round while its reflection ripples.
      if(nightMix>.001 && lanternDensity>0.0 && light>0.0){
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
      }
      gl_FragColor=vec4(color,1.0);
    }
  `;
  // Compile together, then poll completion without synchronously waiting on each shader.
  function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);return s;}
  async function initialize(){
    if(initializing||ready)return;
    initializing=true;
    const generation=++initGeneration;
    try{
      gl=water.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl)throw new Error('Scene unavailable');
      program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
      const parallel=gl.getExtension('KHR_parallel_shader_compile');
      if(parallel){
        while(!gl.getProgramParameter(program,parallel.COMPLETION_STATUS_KHR)){
          await new Promise(resolve=>setTimeout(resolve,16));
          if(generation!==initGeneration||!gl||gl.isContextLost())return;
        }
      }
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
      if(document.body.classList.contains('night'))loadNight();
    }catch(error){if(generation===initGeneration)failScene(error);}
    finally{if(generation===initGeneration)initializing=false;}
  }
  function loadScene(){
    if(sceneRequested||paused||!visible||document.hidden)return;
    sceneRequested=true;
    const key=source?.includes('cangshan-erhai-mobile.webp')?'dayMobile':'day';
    window.SceneImages.assign(photo,source,key,embeddedImages).catch(failScene);
  }
  function queueInitialization(){
    if(initQueued||initializing||ready||paused||!visible||document.hidden||!photo.naturalWidth)return;
    initQueued=true;
    // Let the static landscape and navigation paint before preparing animation.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const run=()=>{initQueued=false;if(!paused&&visible&&!document.hidden)initialize();};
      if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:1800});
      else setTimeout(run,150);
    }));
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
    nightLoading=true;
    const mobile=smallScreen.matches;
    window.SceneImages.assign(nightPhoto,mobile?art.dataset.nightImageMobile:art.dataset.nightImage,mobile?'nightMobile':'night',embeddedImages).catch(failNight);
  }
  function resize(){
    width=innerWidth;height=innerHeight;
    const dpr=Math.min(devicePixelRatio||1,lightweight?1:1.5);
    const scale=lightweight?Math.min(dpr,Math.sqrt(420000/(width*height))):Math.min(dpr,1.25);
    water.width=Math.floor(width*scale);water.height=Math.floor(height*scale);
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
    if(now-previous>=frameInterval){const dt=Math.min((now-previous)/1000,.075);previous=now;clock+=dt;simulate(dt);
      night+=(Number(document.body.classList.contains('night')&&nightReady)-night)*Math.min(1,dt*2);
      for(const b of birds){b.x-=dt*b.speed;b.y+=Math.sin(clock*.6+b.phase)*dt*1.8;}birds=birds.filter(b=>b.x>-20);
      if(clock>nextFlock){if(birds.length<10)addFlock();nextFlock=clock+random(13,20);}draw();
    }schedule();
  }
  function stop(){cancelAnimationFrame(raf);raf=0;previous=0;}
  function schedule(){
    if(paused||!visible||document.hidden)return;
    if(!ready){loadScene();if(photo.complete&&photo.naturalWidth)queueInitialization();return;}
    if(!raf)raf=requestAnimationFrame(frame);
  }
  function release(){if(touch.held&&touch.region==='mountain'&&clock-touch.started>1.25)touch.started=clock-1.25;touch.held=false;}
  function syncPause(){document.body.classList.toggle('paused',paused);$('pauseToggle').textContent=paused?'继续动画':'暂停动画';$('pauseToggle').setAttribute('aria-pressed',String(paused));$('sceneHint').textContent=paused?'动画已暂停':ready?'点水拨动倒影 · 点山吹动云雾':'苍山 · 洱海';if(paused){release();stop();draw();}else schedule();}
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
  $('nightToggle').addEventListener('click',()=>{const n=document.body.classList.toggle('night');if(n&&ready)loadNight();$('nightToggle').textContent=n?'切换晨光':'切换夜色';$('nightToggle').setAttribute('aria-pressed',String(n));if(paused){night=Number(n);draw();}});
  $('reset').addEventListener('click',()=>{Object.assign(config,defaultConfig);for(const key of Object.keys(config)){$(key).value=config[key];$(key+'Value').value=config[key]+'%';}heights.fill(0);velocity.fill(0);release();touch.force=touch.dx=touch.dy=0;touch.started=-10;document.body.classList.remove('night');$('nightToggle').textContent='切换夜色';$('nightToggle').setAttribute('aria-pressed','false');night=0;paused=reduced.matches||saveData;syncPause();draw();});
  let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(resize,120);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){release();stop();}else schedule();});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){release();stop();}else schedule();}).observe(document.querySelector('.hero'));
  reduced.addEventListener('change',()=>{paused=reduced.matches;syncPause();});
  water.addEventListener('webglcontextlost',e=>{e.preventDefault();initGeneration++;initializing=false;ready=false;paused=true;water.classList.remove('ready');$('pauseToggle').hidden=true;syncPause();});
  water.addEventListener('webglcontextrestored',()=>{paused=reduced.matches||saveData;$('pauseToggle').hidden=false;syncPause();});
  nightPhoto.onload=uploadNight;nightPhoto.onerror=()=>failNight(new Error('Night image could not be decoded'));
  photo.onload=queueInitialization;photo.onerror=()=>failScene(new Error('Day image could not be decoded'));
  if(paused)$('motionNote').textContent=reduced.matches?'系统已启用减少动画。点击“继续动画”可播放山水背景。':'已开启节省流量，先显示静态风景。点击“继续动画”可播放山水背景。';
  resize();syncPause();
})();

;
/* js/blog-search.js */
/* Local full-text search. The article index is loaded only when a search field is used. */
(() => {
  'use strict';
  const normalize = text => String(text).normalize('NFKC').toLocaleLowerCase();
  const terms = query => normalize(query).trim().split(/\s+/u).filter(Boolean);
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const documents = new Map();
  let indexPromise;

  function documentFor(post) {
    return documents.get(post.id) || {text: post.content, normalized: normalize(post.content)};
  }
  function find(posts, query) {
    const tokens = terms(query);
    return posts.map(post => {
      const title = normalize(post.title), summary = normalize(post.content);
      const text = documentFor(post).normalized;
      const haystack = `${title} ${summary} ${text}`;
      if (!tokens.every(token => haystack.includes(token))) return null;
      const score = tokens.reduce((n, token) => n + (title.includes(token) ? 8 : summary.includes(token) ? 3 : 1), 0);
      return {post, score};
    }).filter(Boolean).sort((a, b) => b.score - a.score || String(b.post.date).localeCompare(String(a.post.date))).map(item => item.post);
  }
  function excerpt(post, query) {
    const tokens = terms(query);
    if (!tokens.length || tokens.some(t => normalize(post.content).includes(t))) return post.content;
    const {text, normalized} = documentFor(post);
    const positions = tokens.map(t => normalized.indexOf(t)).filter(n => n >= 0);
    if (!positions.length) return post.content;
    const start = Math.max(0, Math.min(...positions) - 28), end = Math.min(text.length, start + 130);
    return `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
  }
  function highlight(text, query) {
    const tokens = terms(query).sort((a, b) => b.length - a.length);
    if (!tokens.length) return escape(text);
    // Escape regular-expression syntax before matching; HTML is always escaped separately.
    const pattern = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const expression = new RegExp(`(${pattern})`, 'giu');
    return String(text).split(expression).map((part, i) => i % 2 ? `<mark>${escape(part)}</mark>` : escape(part)).join('');
  }
  function loadIndex() {
    if (indexPromise) return indexPromise;
    indexPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'js/blog-search-index.js?v=20261003-search-v2';
      script.onload = () => {
        if (!Array.isArray(globalThis.ChenCBlogIndex)) { reject(new Error('Invalid index')); return; }
        globalThis.ChenCBlogIndex.forEach(item => documents.set(item.id, {text:item.text, normalized:normalize(item.text)}));
        resolve();
      };
      script.onerror = () => { script.remove(); indexPromise = null; reject(new Error('Index unavailable')); };
      document.head.append(script);
    });
    return indexPromise;
  }

  function connect({getPosts, onQuery, destination}) {
    const forms = [...document.querySelectorAll('[data-blog-search]')];
    const navbar = document.querySelector('.nav-search');
    const navInput = navbar.querySelector('input');
    const panel = document.getElementById('navSearchResults');
    const list = document.getElementById('navSearchList');
    const status = document.getElementById('navSearchStatus');
    let query = '', active = -1, matches = [], composing = false, timer;

    function close() {
      panel.hidden = true;
      navInput.setAttribute('aria-expanded', 'false');
      navInput.removeAttribute('aria-activedescendant');
      active = -1;
    }
    function preview() {
      if (document.activeElement !== navInput || !query.trim() || composing) { close(); return; }
      matches = find(getPosts(), query).filter(p => destination(p));
      active = -1;
      navInput.removeAttribute('aria-activedescendant');
      status.textContent = matches.length ? `找到 ${matches.length} 篇文章` : '没有找到文章，换个关键词试试';
      list.innerHTML = matches.slice(0, 4).map((p, i) => `<li role="option" aria-selected="false" id="search-result-${i}"><a tabindex="-1" href="${escape(destination(p))}"><span class="search-result-meta">${p.category === 'study' ? '学习' : '生活'} · ${escape(p.date.replaceAll('/', '.'))}</span><strong>${highlight(p.title, query)}</strong><span class="search-result-excerpt">${highlight(excerpt(p, query), query)}</span><span class="search-result-arrow" aria-hidden="true">↗</span></a></li>`).join('');
      navbar.querySelector('[data-search-all]').hidden = !matches.length;
      panel.hidden = false;
      navInput.setAttribute('aria-expanded', 'true');
    }
    function change(value, source) {
      query = value;
      forms.forEach(form => {
        const input = form.querySelector('input');
        if (input !== source) input.value = value;
        form.querySelector('[data-search-clear]').hidden = !value;
      });
      onQuery(value.trim());
      preview();
    }
    function refreshIndex() {
      loadIndex().then(() => {
        forms.forEach(f => f.querySelector('[data-search-hint]').textContent = '搜索全部文章 · 标题 / 正文');
        onQuery(query.trim());
        preview();
      }).catch(() => {
        forms.forEach(f => f.querySelector('[data-search-hint]').textContent = '正文索引暂不可用 · 可搜索标题和摘要');
      });
    }
    forms.forEach(form => {
      const input = form.querySelector('input');
      input.addEventListener('focus', () => { refreshIndex(); preview(); });
      input.addEventListener('compositionstart', () => { composing = true; clearTimeout(timer); close(); });
      input.addEventListener('compositionend', () => { composing = false; change(input.value, input); });
      input.addEventListener('input', event => {
        clearTimeout(timer);
        form.querySelector('[data-search-clear]').hidden = !input.value;
        if (!event.isComposing && !composing) timer = setTimeout(() => change(input.value, input), 80);
      });
      // Native search cancellation (including the browser's clear affordance).
      input.addEventListener('search', () => { if (!composing) { clearTimeout(timer); change(input.value, input); } });
      form.querySelector('[data-search-clear]').addEventListener('click', () => { clearTimeout(timer); change('', input); input.value = ''; input.focus(); });
      form.addEventListener('submit', event => {
        event.preventDefault();
        if (composing) return;
        clearTimeout(timer); change(input.value, input);
        document.querySelector('[data-filter="all"]').click();
        input.blur(); close();
        document.getElementById('blog').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'start'});
      });
      input.addEventListener('keydown', event => {
        if (event.isComposing || composing || event.keyCode === 229) return;
        if (event.key === 'Escape') { event.preventDefault(); input.blur(); close(); }
        if (input !== navInput || panel.hidden) return;
        const options = [...list.querySelectorAll('[role="option"]')];
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && options.length) {
          event.preventDefault();
          active = (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
          options.forEach((option, i) => option.setAttribute('aria-selected', String(i === active)));
          navInput.setAttribute('aria-activedescendant', options[active].id);
          options[active].scrollIntoView({block:'nearest'});
        }
        if (event.key === 'Enter' && active >= 0) { event.preventDefault(); options[active].querySelector('a').click(); }
      });
    });
    // Keep touch/click navigation in the suggestions alive when the input loses focus.
    navbar.addEventListener('focusout', event => {
      if (event.relatedTarget) { if (!navbar.contains(event.relatedTarget)) close(); }
      else setTimeout(() => { if (!navbar.contains(document.activeElement)) close(); },200);
    });
    document.addEventListener('pointerdown', event => { if (!navbar.contains(event.target)) close(); });
    return {refresh: () => { onQuery(query.trim()); preview(); }};
  }
  globalThis.ChenCBlogSearch = {find, excerpt, highlight, connect};
})();

;
/* js/app.js */
(() => {
  'use strict';
  const STORAGE_KEY = 'chengc_posts';
  const DEFAULT_POSTS = [
  {
    "id": "building-this-site",
    "title": "我的小站是这样搭的：静态页面、博客系统与增量部署",
    "category": "study",
    "content": "没有框架、没有构建步骤，一个人维护的纯静态小站是怎么把博客、动画背景、音乐播放器和隐藏小游戏都装进去，还能稳定上线的？这篇从头拆一遍。",
    "date": "2026/10/03",
    "builtin": true,
    "url": "posts/building-this-site.html"
  },
  {
    "id": "multi-book-qa",
    "title": "我把 6 本书的知识点，做成了一个离线问答台",
    "category": "study",
    "content": "一个多书语义问答：6 本书 326 条知识点，语义检索 + 引用溯源，语义引擎随站托管、打开即用，回答每句都能找到出处。",
    "date": "2026/09/22",
    "builtin": true,
    "url": "posts/multi-book-qa.html"
  },
  {
    "id": "linux-commands",
    "title": "Linux 命令速查：增删查改，一篇讲清楚",
    "category": "study",
    "content": "整理 WSL / Linux 终端里最常用的文件操作命令，按查、增、改、删四类分类，每条都配了人话解释，附 nano 与 vi 编辑器用法。",
    "date": "2026/09/18",
    "builtin": true,
    "url": "posts/linux-commands.html"
  },
  {
    "id": "schedule-query",
    "title": "我开源了一个「空课查询系统」",
    "category": "study",
    "content": "一个纯前端的空课查询网页，支持课节多选、全天交集与值班表，选择周数、星期、课节即可查看该时段有空的干事与干部名单，MIT 开源。",
    "date": "2026/09/14",
    "builtin": true,
    "url": "posts/schedule-query.html"
  },
  {
    "id": "summer-support-teaching",
    "title": "我的“三下乡”丨岁月留夏韵，支教启新程",
    "category": "life",
    "content": "七日乡村支教里，少儿编程启蒙、红色诗歌朗诵和文艺展演串起了一段双向成长的青春记忆。",
    "date": "2026/08/13",
    "builtin": true,
    "url": "posts/summer-support-teaching.html"
  },
  {
    "id": "painting-the-countryside",
    "title": "我的“三下乡”丨以丹青妆乡野，以热爱润童心",
    "category": "life",
    "content": "从支教课堂到“和美石章”墙绘，再到雨中的文艺展演，一次乡村实践记录了陪伴、协作与成长。",
    "date": "2026/07/24",
    "builtin": true,
    "url": "posts/painting-the-countryside.html"
  },
  {
    "id": "hello-world",
    "title": "Hello World",
    "category": "life",
    "content": "你好，世界！欢迎来到 ChenC 的网站。这是我的第一篇博客，也是这个数字空间正式启程的记录。",
    "date": "2026/06/19",
    "builtin": true,
    "url": "posts/hello-world.html"
  }
];
  let currentFilter = 'all', searchQuery = '', posts = [];
  const $ = id => document.getElementById(id);
  function loadPosts() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const local = Array.isArray(data) ? data.filter(p => p && typeof p.id === 'string' && typeof p.title === 'string' && typeof p.content === 'string' && typeof p.date === 'string' && ['study', 'life'].includes(p.category)) : [];
      // Built-in entries always retain their canonical destinations. Local records stay intact.
      const custom = local.filter(p => !DEFAULT_POSTS.some(d => d.id === p.id));
      posts = [...custom, ...DEFAULT_POSTS];
    } catch { posts = [...DEFAULT_POSTS]; }
  }
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function destination(post) {
    if (typeof post.url !== 'string' || !post.url.trim()) return '';
    try {
      const url = new URL(post.url, location.href);
      return ['http:', 'https:', 'file:'].includes(url.protocol) ? post.url : '';
    } catch { return ''; }
  }
  function renderPosts() {
    const candidates = posts.filter(p => currentFilter === 'all' || p.category === currentFilter);
    const search = globalThis.ChenCBlogSearch;
    const shown = search ? search.find(candidates, searchQuery) : candidates.filter(p => !searchQuery || `${p.title} ${p.content}`.toLowerCase().includes(searchQuery)).sort((a,b) => String(b.date).localeCompare(String(a.date)));
    $('postCount').textContent = searchQuery ? `找到 ${shown.length} / ${posts.length} 篇` : `共 ${shown.length} 条`;
    if (!shown.length) {
      $('postsContainer').innerHTML = '<div class="empty-state"><strong>没有找到匹配记录</strong><p>换个关键词或分类试试。</p></div>';
      return;
    }
    $('postsContainer').innerHTML = shown.map(p => {
      const url = destination(p), id = escapeHtml(p.id), title = escapeHtml(p.title);
      const displayTitle = search ? search.highlight(p.title, searchQuery) : title;
      const snippet = searchQuery && search ? search.excerpt(p, searchQuery) : p.content;
      const displayContent = search ? search.highlight(snippet, searchQuery) : escapeHtml(snippet);
      const info = `<div class="post-top"><span class="post-tag tag-${p.category}">${p.category === 'study' ? '学习' : '生活'}</span><time>${escapeHtml(p.date.replaceAll('/', '.'))}</time></div><h3 class="post-title">${displayTitle}</h3><p class="post-content" id="content-${id}">${displayContent}</p>`;
      const body = url ? `<a class="post-link" href="${escapeHtml(url)}">${info}<span class="read-more">阅读全文 <span aria-hidden="true">↗</span></span></a>` : `<div class="local-post">${info}<button class="text-button" type="button" data-expand="${id}" aria-expanded="false" aria-controls="content-${id}">展开全文 ↓</button></div>`;
      return `<article class="post-card" data-post-id="${id}">${body}${p.builtin ? '' : `<div class="post-actions"><button class="delete-btn" type="button" data-delete-id="${id}" aria-label="删除《${title}》">删除</button></div>`}</article>`;
    }).join('');
  }
  document.querySelectorAll('.filter-btn').forEach(button => button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => {
      const active = b.dataset.filter === currentFilter;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    renderPosts();
  }));
  if (!globalThis.ChenCBlogSearch) $('searchInput').addEventListener('input', event => { searchQuery = event.target.value.trim().toLowerCase(); renderPosts(); });
  $('postsContainer').addEventListener('click', event => {
    const expand = event.target.closest('[data-expand]');
    if (expand) {
      const open = expand.closest('.post-card').classList.toggle('expanded');
      expand.setAttribute('aria-expanded', String(open));
      expand.textContent = open ? '收起全文 ↑' : '展开全文 ↓';
    }
    const remove = event.target.closest('[data-delete-id]');
    if (!remove || !confirm('确定要删除这条记录吗？')) return;
    const next = posts.filter(p => p.id !== remove.dataset.deleteId || p.builtin);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); posts = next; renderPosts(); }
    catch { alert('保存失败：浏览器存储不可用或空间已满。'); }
  });
  const menu = $('menuToggle'), links = $('navLinks');
  function setMenu(open) {
    links.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
  }
  menu.addEventListener('click', () => setMenu(!links.classList.contains('open')));
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && links.classList.contains('open')) { setMenu(false); menu.focus(); } });
  document.addEventListener('click', event => { if (!event.target.closest('.nav-shell')) setMenu(false); });
  $('backToTop').addEventListener('click', () => scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}));
  const header = document.querySelector('.site-header');
  const refreshHeader = () => header.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', refreshHeader, {passive:true}); refreshHeader();
  loadPosts(); renderPosts();
  globalThis.ChenCBlogSearch?.connect({getPosts: () => posts, destination, onQuery: query => { searchQuery = query; renderPosts(); }});
})();

;
/* js/search-firefly.js */
/* The character stays beside the text caret, with its sword tip anchored to it. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const widgets = [...document.querySelectorAll('[data-blog-search]')];
  const states = [];
  const measure = document.createElement('canvas').getContext('2d');
  const viewport = window.visualViewport;
  let viewportHeight = viewport?.height || innerHeight;
  let scrollTimer;
  document.addEventListener('pointerdown', () => clearTimeout(scrollTimer), {passive:true});

  widgets.forEach(form => {
    const input = form.querySelector('input');
    const control = form.querySelector('.search-control');
    const sprite = form.querySelector('.search-firefly');
    const movie = sprite.querySelector('video');
    const canvas = form.querySelector('.search-effects');
    const ctx = canvas.getContext('2d');
    const state = {form,input,control,movie,sprite,canvas,ctx,visible:true,frame:0,active:false,target:50,last:0,width:0,height:0,caretY:28,fieldRight:0,collapseTimer:0};
    states.push(state);
    movie.muted = true;
    sprite.hidden = true;
    movie.defaultPlaybackRate = movie.playbackRate = 0.5;
    movie.addEventListener('error', () => { movie.poster = 'assets/firefly-official-pixel.png'; });

    function caret() {
      if (!measure) return;
      const inputBox = input.getBoundingClientRect(), box = control.getBoundingClientRect();
      const styles = getComputedStyle(input);
      measure.font = `${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
      if ('fontKerning' in measure) measure.fontKerning = styles.fontKerning;
      // type=text retains selectionStart on Safari/Chromium, unlike type=search in some engines.
      const selection = (input.selectionDirection === 'backward' ? input.selectionStart : input.selectionEnd) ?? input.value.length;
      const text = input.value.slice(0, selection);
      const spacing = parseFloat(styles.letterSpacing) || 0;
      state.target = Math.max(inputBox.left - box.left, Math.min(inputBox.right - box.left - 2,
        inputBox.left - box.left + measure.measureText(text).width + text.length * spacing - input.scrollLeft));
      state.caretY = inputBox.top - box.top + inputBox.height / 2;
      state.fieldRight = inputBox.right - box.left;
    }
    function resize() {
      const rect = control.getBoundingClientRect();
      state.width = rect.width; state.height = rect.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
      ctx?.setTransform(dpr,0,0,dpr,0,0);
      caret();
      if (state.active) position();
    }
    function stop() {
      cancelAnimationFrame(state.frame); state.frame = 0; state.last = 0;
      movie.pause();
      ctx?.clearRect(0,0,state.width,state.height);
    }
    function play() {
      if (!state.active || !state.visible || document.hidden) return;
      if (reduced.matches) { movie.poster = 'assets/firefly-official-pixel.png'; movie.pause(); caret(); position(true); return; }
      if (!movie.src && !movie.error) { movie.src = 'assets/firefly-official-pixel-loop.mp4'; movie.load(); }
      movie.play().catch(() => { movie.poster = 'assets/firefly-official-pixel.png'; });
      if (!state.frame) state.frame = requestAnimationFrame(tick);
    }
    function position() {
      const width = 36, height = 32, swordX = width * .12, swordY = height * .34;
      const bodyFitsRight = state.target + width - swordX <= state.fieldRight;
      const x = state.target - (bodyFitsRight ? swordX : width - swordX);
      sprite.style.transform = `translate(${x.toFixed(2)}px,${(state.caretY-swordY).toFixed(2)}px) scaleX(${bodyFitsRight ? 1 : -1})`;
      return bodyFitsRight ? 1 : -1;
    }
    function tick(now) {
      state.frame = 0;
      if (!state.active || !state.visible || document.hidden || reduced.matches) { stop(); return; }
      // Decorative work is capped at 30 FPS, including high-refresh-rate phones.
      if (now - state.last < 33) { state.frame = requestAnimationFrame(tick); return; }
      state.last = now;
      caret();
      const facing = position();
      if (ctx) {
        ctx.clearRect(0,0,state.width,state.height);
        const phase = now % 870;
        if (phase < 170) {
          const x = state.target, y = state.caretY, radius = 3 + phase / 40;
          ctx.strokeStyle = '#b5f4d1';ctx.lineWidth = 1.4;ctx.globalAlpha = (1-phase/170)*.8;
          ctx.beginPath();ctx.moveTo(x+facing*9,y-6);ctx.lineTo(x,y);ctx.stroke();
          for (const [dx,dy] of [[-1,-1],[1,-.7],[.4,1]]) {
            ctx.beginPath();ctx.moveTo(x+dx*radius,y+dy*radius);ctx.lineTo(x+dx*(radius+3),y+dy*(radius+3));ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      }
      state.frame = requestAnimationFrame(tick);
    }
    input.addEventListener('focus', () => {
      clearTimeout(state.collapseTimer); sprite.hidden = false;
      state.active = true; viewportHeight = Math.max(viewportHeight, viewport?.height || innerHeight);
      document.body.classList.add('search-active');
      form.classList.add('search-engaged');
      resize(); position(true); play();
    });
    input.addEventListener('blur', () => {
      state.active = false; sprite.hidden = true;stop();
      document.body.classList.remove('search-keyboard');
    });
    form.addEventListener('focusout', () => {
      clearTimeout(state.collapseTimer);
      // A result tap must keep its position between pointerdown and click.
      // Hide/pause the character immediately, but collapse only after focus leaves the form.
      state.collapseTimer = setTimeout(() => {
        if (form.contains(document.activeElement)) return;
        form.classList.remove('search-engaged');
        if (!states.some(s => s.form.classList.contains('search-engaged'))) document.body.classList.remove('search-active');
      },200);
    });
    form.addEventListener('submit', () => {
      clearTimeout(state.collapseTimer);
      state.active = false; sprite.hidden = true;stop();
      form.classList.remove('search-engaged');
      document.body.classList.remove('search-keyboard');
      if (!states.some(s => s.active)) document.body.classList.remove('search-active');
    });
    ['input','keyup','click','select','scroll'].forEach(name => input.addEventListener(name, () => {
      caret(); if (state.active) position();
    }));
    if ('ResizeObserver' in window) { const observer = new ResizeObserver(resize);observer.observe(control);observer.observe(input); }
    else addEventListener('resize',resize,{passive:true});
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      state.visible = entries[0].isIntersecting;
      if (state.visible) play(); else stop();
    }).observe(control);
    state.stop = stop;state.play = play;state.caret = caret;state.position = position;
  });
  document.addEventListener('selectionchange', () => states.forEach(s => {
    if (s.active) { s.caret(); s.position(); }
  }));
  document.addEventListener('visibilitychange', () => states.forEach(s => document.hidden ? s.stop() : s.play()));
  reduced.addEventListener('change', () => states.forEach(s => { s.stop();s.play(); }));
  addEventListener('pagehide', () => states.forEach(s => s.stop()));
  addEventListener('pageshow', () => states.forEach(s => s.play()));
  viewport?.addEventListener('resize', () => {
    const current = states.find(s => s.active);
    if (!current) { viewportHeight = viewport.height;document.body.classList.remove('search-keyboard');return; }
    const keyboard = coarse.matches && viewportHeight - viewport.height > 120;
    document.body.classList.toggle('search-keyboard',keyboard);
    if (keyboard) {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        if (current.form.classList.contains('nav-search')) {
          document.body.style.setProperty('--search-result-height', `${Math.max(100,viewport.height - 100)}px`);
          return;
        }
        // Keep room below the field for suggestions, even while the software keyboard is open.
        const top = viewport.offsetTop + 88;
        scrollTo({top:scrollY + current.control.getBoundingClientRect().top - top,behavior:'instant'});
        document.body.style.setProperty('--search-result-height', `${Math.max(100,viewport.height - (current.control.getBoundingClientRect().bottom - viewport.offsetTop) - 48)}px`);
      },100);
    } else document.body.style.removeProperty('--search-result-height');
  },{passive:true});
})();

;
/* js/private.js */
(() => {
  'use strict';

  const VAULT_KEY = 'chengc_private_v1';
  const FIRST_CODE_HASH = '8f42c10f85004b57944db95c1029139efab7d1b92a200b09a05e7c1b88f12c12';
  const ITERATIONS = 310000;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const $ = id => document.getElementById(id);
  const overlay = $('privateOverlay');
  const gateOne = $('privateGateOne');
  const gateTwo = $('privateGateTwo');
  const vaultPanel = $('privateVault');
  let firstCode = '';
  let vaultKey = null;
  let saveTimer = null;

  function bytesToBase64(bytes) {
    let value = '';
    bytes.forEach(byte => { value += String.fromCharCode(byte); });
    return btoa(value);
  }

  function base64ToBytes(value) {
    return Uint8Array.from(atob(value), char => char.charCodeAt(0));
  }

  async function sha256(value) {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function deriveKey(primary, secondary, salt) {
    const materialBytes = encoder.encode(primary + '\u0000' + secondary);
    const material = await crypto.subtle.importKey('raw', materialBytes, 'PBKDF2', false, ['deriveKey']);
    materialBytes.fill(0);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptText(text, key, salt) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text));
    return { version: 1, iterations: ITERATIONS, salt: bytesToBase64(salt), iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(encrypted)) };
  }

  async function decryptVault(record, key) {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(record.iv) },
      key,
      base64ToBytes(record.data)
    );
    return decoder.decode(plain);
  }

  function storedVault() {
    try {
      const parsed = JSON.parse(localStorage.getItem(VAULT_KEY));
      return parsed && parsed.version === 1 && parsed.salt && parsed.iv && parsed.data ? parsed : null;
    } catch {
      return null;
    }
  }

  function clearCredentials() {
    firstCode = '';
    $('privateFirstCode').value = '';
    $('privateSecondCode').value = '';
    $('privateSecondConfirm').value = '';
  }

  function showStep(step) {
    [gateOne, gateTwo, vaultPanel].forEach(panel => panel.classList.toggle('hidden', panel !== step));
  }

  function openPrivate() {
    lockVault(false);
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    document.querySelector('main').inert = true;
    document.querySelector('.site-header').inert = true;
    requestAnimationFrame(() => $('privateFirstCode').focus());
  }

  async function closePrivate() {
    if (vaultKey) await saveVault();
    lockVault(false);
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    document.querySelector('main').inert = false;
    document.querySelector('.site-header').inert = false;
    $('privateBtn').focus();
  }

  function lockVault(focus = true) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    vaultKey = null;
    $('privateNotes').value = '';
    clearCredentials();
    $('privateFirstError').textContent = '';
    $('privateSecondError').textContent = '';
    showStep(gateOne);
    if (focus) $('privateFirstCode').focus();
  }

  async function saveVault() {
    if (!vaultKey) return;
    const record = storedVault();
    if (!record) return;
    $('privateSaveStatus').textContent = '正在加密…';
    try {
      const next = await encryptText($('privateNotes').value, vaultKey, base64ToBytes(record.salt));
      localStorage.setItem(VAULT_KEY, JSON.stringify(next));
      $('privateSaveStatus').textContent = '已加密保存 · ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      $('privateSaveStatus').textContent = '保存失败，请重试';
    }
  }

  $('privateBtn').addEventListener('click', openPrivate);
  $('privateClose').addEventListener('click', closePrivate);
  $('privateLock').addEventListener('click', async () => {
    await saveVault();
    lockVault();
  });
  overlay.addEventListener('click', event => { if (event.target === overlay) closePrivate(); });
  document.addEventListener('keydown', event => {
    if (overlay.classList.contains('hidden')) return;
    if (event.key === 'Escape') { event.preventDefault(); closePrivate(); return; }
    if (event.key === 'Tab') {
      const controls = [...overlay.querySelectorAll('button,input,textarea,a[href],[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
  });

  $('privateFirstForm').addEventListener('submit', async event => {
    event.preventDefault();
    const input = $('privateFirstCode');
    $('privateFirstError').textContent = '';
    if (await sha256(input.value) !== FIRST_CODE_HASH) {
      input.value = '';
      $('privateFirstError').textContent = '第一道密码不正确。';
      input.focus();
      return;
    }
    firstCode = input.value;
    input.value = '';
    const isSetup = !storedVault();
    $('privateSecondHeading').textContent = isSetup ? '设置第二道验证码' : '第二道验证';
    $('privateSecondHint').textContent = isSetup ? '首次使用，请设置至少 8 位的独立验证码。忘记后无法找回。' : '请输入首次使用时设置的验证码。';
    $('privateConfirmGroup').classList.toggle('hidden', !isSetup);
    $('privateSecondForm').querySelector('button').textContent = isSetup ? '创建加密保险箱' : '解锁保险箱';
    showStep(gateTwo);
    requestAnimationFrame(() => $('privateSecondCode').focus());
  });

  $('privateSecondForm').addEventListener('submit', async event => {
    event.preventDefault();
    const codeInput = $('privateSecondCode');
    const confirmInput = $('privateSecondConfirm');
    const secondCode = codeInput.value;
    const existing = storedVault();
    $('privateSecondError').textContent = '';
    if (secondCode.length < 8) {
      $('privateSecondError').textContent = '第二道验证码至少需要 8 位。';
      return;
    }
    if (!existing && secondCode !== confirmInput.value) {
      confirmInput.value = '';
      $('privateSecondError').textContent = '两次输入的验证码不一致。';
      confirmInput.focus();
      return;
    }
    codeInput.value = '';
    confirmInput.value = '';
    try {
      const salt = existing ? base64ToBytes(existing.salt) : crypto.getRandomValues(new Uint8Array(16));
      const key = await deriveKey(firstCode, secondCode, salt);
      const content = existing ? await decryptVault(existing, key) : '';
      if (!existing) localStorage.setItem(VAULT_KEY, JSON.stringify(await encryptText('', key, salt)));
      vaultKey = key;
      $('privateNotes').value = content;
      $('privateSaveStatus').textContent = '更改将自动加密保存';
      showStep(vaultPanel);
      clearCredentials();
      requestAnimationFrame(() => $('privateNotes').focus());
    } catch {
      clearCredentials();
      showStep(gateOne);
      $('privateFirstError').textContent = '第二道验证码不正确，或加密资料已损坏。请重新完成两道验证。';
      $('privateFirstCode').focus();
    }
  });

  $('privateNotes').addEventListener('input', () => {
    $('privateSaveStatus').textContent = '等待保存…';
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveVault, 650);
  });
  $('privateSave').addEventListener('click', saveVault);
  window.addEventListener('pagehide', () => {
    vaultKey = null;
    clearCredentials();
  });
})();

;
/* js/music.js */
(() => {
  'use strict';

  const SONG_FILES = [
    '冯沁苑(买辣椒也用券) - 起风了.mp3',
    '孙燕姿 - 我怀念的.mp3',
    '林俊杰 - 修炼爱情.mp3',
    '林俊杰 - 当你.mp3',
    '梁静茹 - 情歌.mp3',
    '毛不易 - 一程山路.mp3',
    '汪苏泷 - 我想念.mp3',
    '郑润泽 - 如果呢.mp3',
    '陈奕迅 - 好久不见.mp3',
    '陈奕迅 - 爱情转移.mp3',
    '韦礼安 - 如果可以.mp3'
  ];

  const SONGS = SONG_FILES.map(f => ({
    title: f.replace(/\.mp3$/, ''),
    src: 'assets/music/' + encodeURIComponent(f)
  }));

  const $ = id => document.getElementById(id);
  const toggle = $('musicToggle');
  const panel = $('musicPanel');
  const list = $('musicList');
  const mini = $('musicMini');
  const miniTitle = $('musicMiniTitle');
  const miniSeek = $('musicMiniSeek');
  const miniPause = $('musicMiniPause');
  const miniPrev = $('musicMiniPrev');
  const miniNext = $('musicMiniNext');
  const miniStop = $('musicMiniStop');
  const grip = $('musicMiniDrag');

  const audio = new Audio();
  audio.preload = 'none';
  let index = -1;
  let panelOpen = false;

  SONGS.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'music-item';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = s.title;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => playSong(i));
    li.appendChild(button);
    list.appendChild(li);
  });

  function refreshActive() {
    Array.prototype.forEach.call(list.children, (li, i) => {
      li.classList.toggle('active', i === index);
      li.querySelector('button').setAttribute('aria-pressed', String(i === index));
    });
  }

  function setMiniVisible(visible) {
    mini.hidden = !visible;
    mini.classList.toggle('show', visible);
    mini.setAttribute('aria-hidden', String(!visible));
  }

  function updatePauseBtn() {
    miniPause.textContent = audio.paused ? '▶' : '⏸';
    miniPause.setAttribute('aria-label', audio.paused ? '播放' : '暂停');
  }

  function playSong(i) {
    index = i;
    audio.src = SONGS[i].src;
    audio.play().catch(() => {});
    miniTitle.textContent = SONGS[i].title;
    miniSeek.value = 0;
    toggle.classList.add('playing');
    setMiniVisible(true);
    refreshActive();
    updatePauseBtn();
  }

  function next() { if (index < 0) return; playSong((index + 1) % SONGS.length); }
  function prev() { if (index < 0) return; playSong((index - 1 + SONGS.length) % SONGS.length); }

  function stop() {
    audio.pause();
    audio.currentTime = 0;
    index = -1;
    miniTitle.textContent = '未在播放';
    toggle.classList.remove('playing');
    setMiniVisible(false);
    refreshActive();
    miniSeek.value = 0;
    updatePauseBtn();
  }

  function setPanelOpen(next) {
    panelOpen = next;
    panel.hidden = !next;
    toggle.setAttribute('aria-expanded', String(next));
    panel.classList.toggle('open', next);
    panel.setAttribute('aria-hidden', String(!next));
    toggle.classList.toggle('panel-open', next);
  }

  toggle.addEventListener('click', () => {
    setPanelOpen(!panelOpen);
  });

  $('musicClose').addEventListener('click', () => { setPanelOpen(false); toggle.focus(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panelOpen) { setPanelOpen(false); toggle.focus(); }
  });
  miniPrev.addEventListener('click', prev);
  miniNext.addEventListener('click', next);
  miniPause.addEventListener('click', () => {
    if (index < 0) return;
    if (audio.paused) audio.play().catch(() => {}); else audio.pause();
  });
  miniStop.addEventListener('click', stop);

  audio.addEventListener('timeupdate', () => {
    if (isFinite(audio.duration) && audio.duration > 0) {
      miniSeek.value = (audio.currentTime / audio.duration) * 100;
    }
  });
  audio.addEventListener('play', updatePauseBtn);
  audio.addEventListener('pause', updatePauseBtn);
  audio.addEventListener('ended', next);

  miniSeek.addEventListener('input', () => {
    if (index < 0 || !isFinite(audio.duration)) return;
    audio.currentTime = (miniSeek.value / 100) * audio.duration;
  });

  // 拖动小窗
  let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0, width = 0, height = 0;
  grip.addEventListener('pointerdown', e => {
    dragging = true;
    const r = mini.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startLeft = r.left; startTop = r.top;
    width = r.width; height = r.height;
    grip.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  grip.addEventListener('pointermove', e => {
    if (!dragging) return;
    const left = Math.max(0, Math.min(startLeft + (e.clientX - startX), window.innerWidth - width));
    const top = Math.max(0, Math.min(startTop + (e.clientY - startY), window.innerHeight - height));
    mini.style.left = left + 'px';
    mini.style.top = top + 'px';
    mini.style.bottom = 'auto';
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    if (grip.hasPointerCapture && grip.hasPointerCapture(e.pointerId)) grip.releasePointerCapture(e.pointerId);
  }
  grip.addEventListener('pointerup', endDrag);
  grip.addEventListener('pointercancel', endDrag);

  document.addEventListener('click', e => {
    if (panelOpen && !panel.contains(e.target) && !toggle.contains(e.target)) setPanelOpen(false);
  });
})();

