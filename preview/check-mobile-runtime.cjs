const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve(__dirname,'../.game-work/playwright-browsers');
const {chromium,webkit}=createRequire('C:/Users/19152/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/runner.cjs')('playwright');
const root=path.resolve(__dirname,'..'),label=process.argv[2]||'after';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.mp4':'video/mp4','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.wav':'audio/wav'};
const server=http.createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404).end();return;}
  const size=fs.statSync(file).size,range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/),start=range?Number(range[1]):0,end=range&&range[2]?Math.min(size-1,Number(range[2])):size-1;
  if(start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}
  res.writeHead(range?206:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Content-Length':end-start+1,...(range?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});
  if(req.method==='HEAD')res.end();else fs.createReadStream(file,{start,end}).pipe(res);
});
async function checkBeat(browser,engine,base,report){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.route('**/bonus_pack/zxx.json',async route=>{await new Promise(resolve=>setTimeout(resolve,1800));await route.continue();});
  await page.addInitScript(()=>{window.mediaStarts=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.mediaStarts.push({src:this.src,activation:navigator.userActivation?.isActive,muted:this.muted,inline:this.playsInline});return play.call(this);};});
  try{
    await page.goto(base+'play/beat-exe.html');await page.locator('[data-action="close"]').last().tap();
    await page.locator('#mobileTerminalOpen').tap();await page.locator('#terminalCode').fill('bad');await page.locator('#terminalCode').press('Enter');
    assert.match(await page.locator('#terminalError').textContent(),/未找到/);
    assert.equal(requests.some(url=>url.endsWith('.mp4')||url.endsWith('.wav')),false,'Menu must not load audio/video');
    await page.setViewportSize({width:390,height:420});
    const button=await page.locator('#terminalConnect').boundingBox();assert(button.y>=0&&button.y+button.height<=420,'Connection button obscured by keyboard-sized viewport');
    await page.locator('#terminalCode').fill(' ZxX ');await page.locator('#terminalConnect').tap();
    // Real media decoding, not a mocked play() promise.
    await page.waitForFunction(()=>document.getElementById('stageVideo').currentTime>.15,{},{timeout:20000});
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(2100);
    assert.equal(await page.locator('#overlay').isVisible(),false,'Delayed init overwrote the terminal/game');
    assert.match(await page.locator('#stageVideo').getAttribute('src'),/zxx-stage-mobile\.mp4$/);
    assert.match(await page.locator('#playTitle').textContent(),/UNKNOWN_07/);
    assert.equal(await page.locator('#stageVideo').evaluate(v=>v.muted),false);
    await page.locator('#stageVideo').evaluate(v=>v.currentTime=20.1);await page.waitForFunction(()=>document.getElementById('stageStatus').textContent==='PLAYER SIGNATURE DETECTED');
    await page.locator('#stageVideo').evaluate(v=>v.currentTime=30.1);await page.waitForFunction(()=>document.getElementById('playScreen').classList.contains('video-visible'));
    await page.locator('#pauseBtn').tap();const pausedTime=await page.locator('#stageVideo').evaluate(v=>v.currentTime);await page.waitForTimeout(200);
    assert.equal(await page.locator('#stageVideo').evaluate(v=>v.paused),true);
    await page.locator('[data-action="resume"]').tap();await page.waitForFunction(t=>document.getElementById('stageVideo').currentTime>t+.1,pausedTime);
    await page.screenshot({path:path.join(__dirname,`mobile-beat-${engine}.png`)});
    await page.locator('#pauseBtn').tap();await page.locator('[data-action="menu"]').tap();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('beat_exe_save_v1')).hiddenUnlocked),true);
    // Reproduce iOS rejection of an Enter submission, then require a real button tap to retry.
    await page.evaluate(()=>{const play=HTMLMediaElement.prototype.play;let rejectOnce=true;HTMLMediaElement.prototype.play=function(){if(rejectOnce){rejectOnce=false;return Promise.reject(new DOMException('Gesture required','NotAllowedError'));}return play.call(this);};});
    await page.locator('#mobileTerminalOpen').tap();await page.locator('#terminalCode').fill('zxx');await page.locator('#terminalCode').press('Enter');
    await page.locator('[data-action="retry"]').waitFor();await page.locator('[data-action="retry"]').tap();
    await page.waitForFunction(()=>document.getElementById('stageVideo').currentTime>.1);assert.equal(await page.locator('#overlay').isVisible(),false);
    await page.locator('#pauseBtn').tap();await page.locator('[data-action="menu"]').tap();
    await page.locator('.track-card[data-song="neon"]').tap();await page.locator('#startBtn').tap();
    await page.waitForFunction(()=>document.getElementById('soundtrack')?.currentTime>.1);
    assert.deepEqual(errors,[]);report.checks.push(`${engine}: real mobile video/audio playback, wrong code, keyboard viewport, delayed initialization, 20/30s phases, pause/resume, saved unlock and gesture-denial retry passed.`);
    report.checks.push(`${engine}: regular NEON AFTERLIFE audio playback also passed.`);
    report[`${engine}MediaStarts`]=await page.evaluate(()=>window.mediaStarts);
  }finally{await context.close();}
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/`;
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--autoplay-policy=document-user-activation-required']});
  const report={label,cpuThrottle:4,viewport:'390x844 DPR 3',pages:[],checks:[]},errors=[];
  try{
    for(const name of ['index.html','games.html','about.html']){
      const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await context.newPage();
      page.on('pageerror',e=>errors.push(`${name}: ${e.message}`));
      await page.addInitScript(()=>{
        window.scenePaints={};for(const [type,method] of [[CanvasRenderingContext2D,'drawImage'],[WebGLRenderingContext,'drawArrays']]){
          const original=type.prototype[method];type.prototype[method]=function(...args){if(['workScene','water'].includes(this.canvas.id))window.scenePaints[this.canvas.id]=(window.scenePaints[this.canvas.id]||0)+1;return original.apply(this,args);};
        }
      });
      const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');
      await page.goto(base+name);await page.waitForTimeout(1800);
      const before=(await cdp.send('Performance.getMetrics')).metrics.find(m=>m.name==='TaskDuration').value;
      const paints=await page.evaluate(()=>({...window.scenePaints}));await page.waitForTimeout(3000);
      const after=(await cdp.send('Performance.getMetrics')).metrics.find(m=>m.name==='TaskDuration').value;
      const state=await page.evaluate(()=>({paints:window.scenePaints,prerender:!!document.querySelector('script[type="speculationrules"]'),overflow:document.documentElement.scrollWidth>innerWidth,pause:document.getElementById('pauseToggle')?.getAttribute('aria-pressed')}));
      report.pages.push({name,idleMainThreadMs:Math.round((after-before)*1000),drawsIn3Seconds:Object.fromEntries(Object.entries(state.paints).map(([key,n])=>[key,n-(paints[key]||0)])),...state});
      if(label==='after'){
        assert.equal(state.overflow,false);assert.equal(state.prerender,false);
        for(const [key,n] of Object.entries(state.paints))assert.equal(n-(paints[key]||0),0,`${name}: idle ${key} keeps drawing`);
        if(name!=='about.html'){
          assert.equal(state.pause,'true');await page.locator('#pauseToggle').tap();await page.waitForTimeout(2000);
          assert.equal(await page.locator('#pauseToggle').getAttribute('aria-pressed'),'false');
          const running=await page.evaluate(()=>({...window.scenePaints}));await page.waitForTimeout(700);
          assert(Object.entries(await page.evaluate(()=>window.scenePaints)).some(([key,n])=>n>(running[key]||0)),'Continue animation must draw');
          await page.locator('#pauseToggle').tap();
          if(name==='games.html'){await page.locator('#workNext').tap();await page.waitForTimeout(500);assert.match(await page.locator('#workPosition').textContent(),/^02 \/ 05/);}
        }
        await page.screenshot({path:path.join(__dirname,`mobile-runtime-${name.replace('.html','')}.png`)});
      }
      await context.close();
    }
    if(label==='after'){
      await checkBeat(browser,'Chromium',base,report);
      const safari=await webkit.launch({headless:true});try{await checkBeat(safari,'WebKit',base,report);}finally{await safari.close();}
      const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'delivery-manifest.json')));
      for(const width of [320,1440]){
        const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',hasTouch:width===320,isMobile:width===320});const page=await context.newPage();
        page.on('pageerror',e=>errors.push(e.message));
        for(const name of Object.keys(manifest.pages)){await page.goto(base+name);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}: ${name} overflow`);}
        await context.close();
      }
      report.checks.push('All 22 public pages passed 320px mobile / 1440px desktop layout and script checks.');
    }
    assert.deepEqual(errors,[]);report.checks.push('No page errors; mobile decoration CPU and idle canvas paints measured.');
    fs.writeFileSync(path.join(__dirname,`mobile-runtime-${label}.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
