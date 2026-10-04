/* Slow-network browser measurements; starts a local GitHub Pages-like server. */
const {createRequire} = require('node:module');
const {chromium} = createRequire('C:/Users/19152/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/runner.cjs')('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {execFileSync}=require('node:child_process');
const root = path.resolve(__dirname, '..');
const label = process.argv[2] || 'after';
const snapshots=new Map();
if(label==='before') {
  const tracked=execFileSync('git',['ls-tree','-r','--name-only','HEAD'],{cwd:root,encoding:'utf8'}).trim().split('\n');
  for(const name of tracked.filter(name=>/^(index|about|tools|games|contact)\.html$/.test(name)||/^(css|js)\/[^/]+\.(css|js)$/.test(name)||/^assets\/(?:products\/)?[^/]+\.(png|webp|jpg)$/.test(name)))snapshots.set(name,execFileSync('git',['show',`HEAD:${name}`],{cwd:root,maxBuffer:10*1024*1024}));
}
// Throttle the server, including worker and prerender requests, so speculative
// requests cannot escape the slow-network simulation through another CDP target.
const transfers=[];
const pump=setInterval(()=>{
  const active=transfers.filter(job=>!job.res.destroyed);
  const budget=Math.floor((1600000/8)*.05/Math.max(1,active.length));
  for(const job of active){const end=Math.min(job.bytes.length,job.offset+budget);job.res.write(job.bytes.subarray(job.offset,end));job.offset=end;if(end===job.bytes.length){job.res.end();job.done=true;}}
  for(let i=transfers.length-1;i>=0;i--)if(transfers[i].done||transfers[i].res.destroyed)transfers.splice(i,1);
},50);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4','.json':'application/json'};
const server = http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file = path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if (!file.startsWith(root+path.sep)) {res.writeHead(403).end();return;}
  const name=path.relative(root,file).replaceAll('\\','/');
  const respond=(error,bytes)=>{
    if(error||!bytes){res.writeHead(404).end();return;}
    setTimeout(()=>{
      if(res.destroyed)return;
      res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':bytes.length,'Cache-Control':path.basename(file)==='sw.js'?'no-cache':'max-age=600'});
      transfers.push({res,bytes,offset:0});
    },120);
  };
  if(label==='before')respond(null,snapshots.get(name));
  else fs.readFile(file,respond);
});
const report = [];
(async()=>{
  await new Promise(resolve=>server.listen(8766,'127.0.0.1',resolve));
  const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  try {
    for(const mobile of [false,true]) {
      const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile});
      const page=await context.newPage();
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{
        window.__longTasks=[];
        new PerformanceObserver(list=>window.__longTasks.push(...list.getEntries().map(e=>Math.round(e.duration)))).observe({type:'longtask',buffered:true});
      });
      const cdp=await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
      await page.goto('http://127.0.0.1:8766/',{waitUntil:'load'});
      await page.waitForTimeout(2000);
      async function measure(name,clickMs=null,subject=page) {
        return {device:mobile?'mobile':'desktop',page:name,clickMs,errors,...await subject.evaluate(()=>{
          const nav=performance.getEntriesByType('navigation')[0];
          return {fcp:Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime||0),domReady:Math.round(nav.domContentLoadedEventEnd),load:Math.round(nav.loadEventEnd),worker:nav.workerStart>0,workerControlled:!!navigator.serviceWorker?.controller,prerendered:nav.activationStart>0,resources:performance.getEntriesByType('resource').length,bytes:performance.getEntriesByType('resource').reduce((n,e)=>n+e.transferSize,0),maxLongTask:Math.max(0,...(window.__longTasks||[])),overflow:document.documentElement.scrollWidth>innerWidth};
        })};
      }
      report.push(await measure('home'));
      await page.screenshot({path:path.join(__dirname,`performance-${label}-${mobile?'mobile':'desktop'}.jpg`),type:'jpeg',quality:85});
      if(mobile)await page.locator('#menuToggle').click();
      let start=Date.now();
      await Promise.all([page.waitForURL('**/tools.html'),page.locator('#navLinks a[href="tools.html"]').click()]);
      await page.waitForFunction(()=>document.querySelector('#workTrack .work-card.is-current'));
      const clickMs=Date.now()-start;
      await page.waitForLoadState('load');await page.waitForTimeout(2000);
      report.push(await measure('tools',clickMs));
      if(mobile)await page.locator('#menuToggle').click();
      start=Date.now();
      await Promise.all([page.waitForURL('**/games.html'),page.locator('#navLinks a[href="games.html"]').click()]);
      await page.waitForFunction(()=>document.querySelector('#workTrack .work-card.is-current'));
      const gamesMs=Date.now()-start;
      await page.waitForLoadState('load');await page.waitForTimeout(1200);
      report.push(await measure('games',gamesMs));
      if(label!=='before') {
        start=Date.now();await page.goto('http://127.0.0.1:8766/',{waitUntil:'load'});
        const repeatMs=Date.now()-start;await page.waitForTimeout(500);
        report.push(await measure('home-repeat',repeatMs));
      }
      await context.close();
      if(label!=='before')for(const name of ['tools','games']) {
        const cold=await browser.newContext({serviceWorkers:'block',viewport:mobile?{width:390,height:844}:{width:1440,height:1000},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile});
        const first=await cold.newPage();first.on('pageerror',e=>errors.push(e.message));
        const slow=await cold.newCDPSession(first);await slow.send('Emulation.setCPUThrottlingRate',{rate:4});
        const start=Date.now();await first.goto(`http://127.0.0.1:8766/${name}.html`,{waitUntil:'load'});
        const readyMs=Date.now()-start;await first.waitForTimeout(150);
        report.push(await measure(name+'-cold',readyMs,first));await cold.close();
      }
    }
    fs.writeFileSync(path.join(__dirname,`performance-${label}.json`),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
  } finally {await browser.close();server.close();clearInterval(pump);}
})().catch(error=>{console.error(error);server.close();clearInterval(pump);process.exitCode=1;});
