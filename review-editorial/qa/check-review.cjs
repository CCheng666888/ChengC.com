const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const {createRequire} = require('node:module');
const requireRuntime = createRequire('C:/Users/19152/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/runner.cjs');
const {chromium} = requireRuntime('playwright');
const root = path.resolve(__dirname, '../..'), review = path.resolve(__dirname, '..');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.mp4':'video/mp4','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  let file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  if(req.method==='HEAD'){res.end();return;}fs.createReadStream(file).pipe(res);
});
const assertions=[];
function check(name, condition, detail=''){assertions.push({name,pass:!!condition,detail});if(!condition)console.log('FAIL',name,detail);}
async function overflow(page,name){const result=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>getComputedStyle(e).position!=='absolute'&&e.getBoundingClientRect().right>innerWidth+2).slice(0,6).map(e=>e.className)}));check(name,result.width<=result.viewport+1,result);}
async function main(){
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}/review-editorial/`;
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light'});
    const page=await context.newPage();const errors=[],bad=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push([r.status(),r.url()]);});page.on('request',r=>requests.push(r.url()));
    await page.goto(base,{waitUntil:'networkidle'});
    check('8 canonical blog entries',await page.locator('.post-card').count()===8);
    check('22 retained recent records',await page.locator('.timeline-item').count()===22);
    check('12 project entrances',await page.locator('.project-row,.project-feature').count()===12);
    check('Cover image loads',await page.locator('#coverImage').evaluate(e=>e.complete&&e.naturalWidth>0));
    check('Navigation begins below first viewport',await page.locator('.site-header').evaluate(e=>e.getBoundingClientRect().top>=innerHeight-1));
    check('Initial page avoids legacy engine, audio and models',!requests.some(u=>/landscape\.js|lake-projection|\.mp3|\/models\/|\.mp4/.test(u)),requests);
    await overflow(page,'Desktop: no horizontal overflow');
    await page.screenshot({path:path.join(__dirname,'desktop-cover.png')});
    await page.mouse.wheel(0,760);await page.waitForTimeout(160);
    check('Wheel scroll responds immediately',await page.evaluate(()=>scrollY>=700));
    await page.screenshot({path:path.join(__dirname,'desktop-transition.png')});
    await page.locator('#blog').evaluate(e=>e.scrollIntoView());await page.waitForTimeout(150);
    await page.screenshot({path:path.join(__dirname,'desktop-blog.png')});
    await page.locator('[data-filter="life"]').click();check('Life filter preserves all three life articles',await page.locator('.post-card').count()===3);
    await page.locator('[data-filter="all"]').click();
    await page.locator('#searchInput').fill('WebArena');await page.waitForTimeout(600);
    check('Fulltext search uses original index',await page.locator('.post-card').count()===1&&await page.locator('.post-card').getAttribute('data-post-id')==='ai-web-security');
    await page.locator('.blog-search [data-search-clear]').click();await page.locator('#searchInput').blur();
    await page.locator('#projects').evaluate(e=>e.scrollIntoView());await page.screenshot({path:path.join(__dirname,'desktop-projects.png')});
    await page.locator('.project-archive summary').click();check('Project archive opens normally',await page.locator('.project-archive').getAttribute('open')!==null);await overflow(page,'Expanded desktop archive has no horizontal overflow');
    await page.locator('#journal').evaluate(e=>e.scrollIntoView());await page.locator('.recent-archive summary').click();check('Recent archive expands in page flow',await page.locator('.recent-archive').getAttribute('open')!==null);
    await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);check('Paper transition settles once',await page.evaluate(()=>ChenCReview.stageSettled&&!document.body.classList.contains('stage-active')));
    await page.locator('#settingsToggle').click();await page.locator('#density').fill('80');check('Existing parameter values update',await page.locator('#densityValue').textContent()==='80%');
    await page.locator('#nightToggle').click();await page.waitForTimeout(250);check('Night cover works without loading animation',await page.locator('#coverImage').getAttribute('src')==='../assets/cangshan-erhai-night.webp'&&!requests.some(u=>u.endsWith('/landscape.js')));
    await page.locator('#reset').click();await page.locator('#settingsClose').click();
    await page.evaluate(()=>scrollTo(0,innerHeight+500));await page.locator('#musicToggle').click();check('Existing music list retained',await page.locator('.music-item').count()===11);await page.locator('#musicClose').click();
    await page.locator('#privateBtn').click();check('Private entry retained',await page.locator('#privateOverlay').isVisible());await page.locator('#privateClose').click();
    await page.locator('#themeToggle').click();check('Dark theme works',await page.evaluate(()=>document.documentElement.classList.contains('dark')));await page.locator('#blog').evaluate(e=>e.scrollIntoView());await page.screenshot({path:path.join(__dirname,'desktop-dark.png')});await page.locator('#themeToggle').click();
    await page.goto(base+'posts/ai-web-security.html',{waitUntil:'networkidle'});await page.screenshot({path:path.join(__dirname,'desktop-article.png')});
    check('Article reference anchors retained',await page.locator('a[href^="ai-web-security-references.html#ref"]').count()>0);
    await page.goto(base+'posts/ai-web-security-references.html',{waitUntil:'networkidle'});check('22 references retained',await page.locator('.ref-item').count()===22);await overflow(page,'References page has no horizontal overflow');
    for(const width of [390,320,768]){
      const mobile=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,colorScheme:'light'});const p=await mobile.newPage();p.on('pageerror',e=>errors.push(e.message));
      await p.goto(base,{waitUntil:'networkidle'});await overflow(p,`${width}px cover: no horizontal overflow`);
      check(`${width}px: lightweight cover used`,await p.locator('#coverImage').evaluate(e=>e.currentSrc.includes('mobile.webp')));
      check(`${width}px: paper effects disabled`,await p.locator('.stage-papers').evaluate(e=>getComputedStyle(e).display==='none'));
      if(width===390)await p.screenshot({path:path.join(__dirname,'mobile-cover.png')});
      await p.locator('#blog').evaluate(e=>e.scrollIntoView());await overflow(p,`${width}px blog: no horizontal overflow`);if(width===390)await p.screenshot({path:path.join(__dirname,'mobile-blog.png')});
      await p.locator('#mobileSearchToggle').click();await p.locator('#navSearchInput').fill('Linux');await p.waitForTimeout(400);check(`${width}px: mobile navigation search works`,await p.locator('#navSearchResults').isVisible());await p.keyboard.press('Escape');
      await p.locator('#menuToggle').click();check(`${width}px: all sections reachable in menu`,await p.locator('#navLinks').isVisible());await p.locator('#navLinks a[href="#projects"]').click();
      await p.locator('.project-archive summary').click();await overflow(p,`${width}px expanded projects: no horizontal overflow`);if(width===390)await p.screenshot({path:path.join(__dirname,'mobile-projects.png')});
      await p.goto(base+'posts/linux-commands.html',{waitUntil:'networkidle'});await overflow(p,`${width}px article: no horizontal overflow`);if(width===390)await p.screenshot({path:path.join(__dirname,'mobile-article.png')});await mobile.close();
    }
    const reduced=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',colorScheme:'light'});const rp=await reduced.newPage();await rp.goto(base,{waitUntil:'networkidle'});await rp.evaluate(()=>scrollTo(0,900));check('Reduced motion keeps static cover and full content',await rp.locator('.post-card').count()===8&&await rp.locator('.stage-papers').evaluate(e=>getComputedStyle(e).display==='none'));await reduced.close();
    const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const np=await nojs.newPage();await np.goto(base);check('Without JavaScript all content remains available',await np.locator('.post-card a').count()===8&&await np.locator('.timeline-item').count()===22&&await np.locator('.project-row,.project-feature').count()===12);await nojs.close();
    const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'content-manifest.json')));check('All nine copied article bodies retain their source text',manifest.articles.length===9&&manifest.articles.every(a=>a.textRetained));
    for(const article of manifest.articles){await page.setViewportSize({width:320,height:844});await page.goto(base+'posts/'+article.file,{waitUntil:'networkidle'});await overflow(page,`320px ${article.file}: readable without horizontal overflow`);}
    await page.setViewportSize({width:1440,height:1000});await page.goto(base,{waitUntil:'networkidle'});await page.locator('#settingsToggle').click();await page.locator('#nightToggle').click();await page.locator('#pauseToggle').click();await page.waitForTimeout(1800);
    check('Legacy photo controls load only after opting in',await page.evaluate(()=>document.body.classList.contains('legacy-loaded')&&!!window.LakeProjection&&!!window.SceneImages));
    check('Opting into animation never hides blog content',await page.locator('.post-card').count()===8&&await page.locator('#blog').isVisible());
    await page.locator('#mist').fill('72');check('Legacy photo parameter adapter remains active',await page.locator('#mistValue').textContent()==='72%');
    await page.locator('#sceneToggle').click();await page.locator('#settingsClose').click();await page.mouse.wheel(0,1200);await page.waitForTimeout(150);check('Photo-only option still permits immediate normal scrolling',await page.evaluate(()=>scrollY>=1100)&&await page.locator('#blog').isVisible());
    const editionContext=await browser.newContext({viewport:{width:1440,height:1000}});const ep=await editionContext.newPage();const config=fs.readFileSync(path.join(review,'js/cover-editions.js'),'utf8');
    await ep.route('**/cover-editions.js',route=>route.fulfill({contentType:'text/javascript',body:config+`\nconst t=Date.now(); const base=window.ChenCCoverEditions.default; window.ChenCCoverEditions.editions=[{...base,id:'expired',priority:100,startsAt:new Date(t-60000).toISOString(),endsAt:new Date(t-10000).toISOString()},{...base,id:'ordinary',priority:1,startsAt:new Date(t-10000).toISOString(),endsAt:new Date(t+60000).toISOString()},{...base,id:'special',title:'Edition test',priority:2,startsAt:new Date(t-10000).toISOString(),endsAt:new Date(t+60000).toISOString()}];`}));
    await ep.goto(base,{waitUntil:'networkidle'});check('Current Edition picks the active cover by date and priority',await ep.evaluate(()=>ChenCReview.edition==='special')&&await ep.locator('#editionTitle').textContent()==='Edition test');await editionContext.close();
    // Validate every local file and hash destination in review HTML, including disclosures.
    let missing=[];for(const file of [path.join(review,'index.html'),...fs.readdirSync(path.join(review,'posts')).filter(f=>f.endsWith('.html')).map(f=>path.join(review,'posts',f))]){
      const source=fs.readFileSync(file,'utf8');for(const match of source.matchAll(/(?:href|src|srcset)="([^"\s]+)"/g)){
        const target=match[1].replace(/&amp;/g,'&');if(/^(?:https?:|mailto:|data:)/.test(target))continue;
        const [url,hash]=target.split('#'), clean=url.split('?')[0];let destination=clean?path.resolve(path.dirname(file),decodeURIComponent(clean)):file;
        if(fs.existsSync(destination)&&fs.statSync(destination).isDirectory())destination=path.join(destination,'index.html');
        if(!fs.existsSync(destination)){missing.push({file:path.relative(review,file),target});continue;}
        if(hash&&path.extname(destination)==='.html'&&!new RegExp(`id=["']${hash}["']`).test(fs.readFileSync(destination,'utf8')))missing.push({file:path.relative(review,file),target,reason:'anchor'});
      }
    }check('All copied internal links and assets resolve',missing.length===0,missing);
    const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'source-hashes.json')));const changed=Object.entries(baseline).filter(([file,hash])=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')!==hash).map(([file])=>file);check('Main site source files remain unchanged',changed.length===0,changed);
    check('Browser has no script errors',errors.length===0,errors);check('Browser has no failed static requests',bad.length===0,bad);
    const report={time:new Date().toISOString(),assertions,errors,bad,initialRequests:requests.slice(0,16)};fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:assertions.filter(a=>a.pass).length,total:assertions.length,failures:assertions.filter(a=>!a.pass),errors,bad},null,2));
    if(assertions.some(a=>!a.pass))process.exitCode=1;
  }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
