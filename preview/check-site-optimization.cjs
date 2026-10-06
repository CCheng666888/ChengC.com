/* Local public-site checks; excludes standalone games, downloads and private pages. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/19152/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/runner.cjs')('playwright');
const root=path.resolve(__dirname,'..'),label=process.argv[2]||'after';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.mp4':'video/mp4'};
const server=http.createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':fs.statSync(file).size});
  fs.createReadStream(file).pipe(res);
});
const primary=['index.html','games.html','tools.html','about.html','contact.html'];
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'delivery-manifest.json')));
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port+'/';
  if(label==='navigation'||label==='search'){
    const script=label==='navigation'?'check-navigation.cjs':'check-blog-search.cjs';
    const {spawn}=require('node:child_process');
    const child=spawn(process.execPath,[path.join(__dirname,script),base],{stdio:'inherit'});
    child.on('error',e=>{console.error(e);server.close();process.exitCode=1;});
    child.on('exit',code=>{server.close();process.exitCode=code||0;});
    return;
  }
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const report={label,pages:[],errors:[],missing:[],checks:[]};
  try{
    for(const width of label==='before'?[390]:[1440,320,390]){
      const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:width<800?3:1,hasTouch:width<800,isMobile:width<800,serviceWorkers:'block'});
      const page=await context.newPage();
      page.on('pageerror',e=>report.errors.push(page.url()+': '+e.message));
      page.on('response',r=>{if(r.status()===404&&!r.url().endsWith('/favicon.ico'))report.missing.push(r.url());});
      for(const name of label==='before'?primary:Object.keys(manifest.pages)){
        await page.goto(new URL(name,base).href);
        await page.waitForTimeout(180);
        const data=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,bytes:performance.getEntriesByType('resource').reduce((sum,r)=>sum+r.transferSize,0),images:[...document.images].filter(i=>i.complete&&i.naturalWidth).map(i=>i.currentSrc),cover:document.querySelector('.work-card:not([data-work-clone]) img')?.currentSrc}));
        assert.equal(data.overflow,false,width+' '+name+' overflows');
        report.pages.push({name,width,...data});
      }
      if(label!=='before'){
        for(const theme of ['light','dark'])for(const name of primary){
          await page.goto(new URL(name,base).href);await page.evaluate(theme=>{document.documentElement.classList.toggle('light',theme==='light');document.documentElement.classList.toggle('dark',theme==='dark');},theme);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,theme+' '+name);
        }
        await page.goto(new URL('games.html',base).href);
        await page.locator('.carousel-dot[data-work-index="1"]').click();
        await page.waitForTimeout(480);
        await page.locator('.work-card.is-current:not([data-work-clone]) a[href="work/yujing.html"]').click();
        await page.waitForURL('**/work/yujing.html');
        await page.goto(new URL('games.html',base).href);
        assert.match(await page.locator('#workPosition').textContent(),/^02 \/ 06/,'Return keeps viewed game');
        await page.locator('.carousel-dot[data-work-index="0"]').click();await page.waitForTimeout(480);
        await page.locator('#workNext').evaluate(button=>{for(let i=0;i<6;i++)button.click();});await page.waitForTimeout(550);
        assert.match(await page.locator('#workPosition').textContent(),/^01 \/ 06/);
        assert.equal(await page.locator('#workTrack').evaluate(t=>t.classList.contains('is-switching')),false);
        await page.locator('.carousel-dot[data-work-index="5"]').click();await page.waitForTimeout(480);
        assert.match(await page.locator('#workPosition').textContent(),/^06 \/ 06/);
        assert.equal(await page.locator('.coming-card.is-current:not([data-work-clone])').count(),1);
        await page.locator('.carousel-dot[data-work-index="0"]').click();await page.waitForTimeout(480);
        assert.equal(await page.locator('body').getAttribute('data-scene-theme'),'qin');
        if(width<800){const image=page.locator('.work-card.is-current:not([data-work-clone]) img');await image.evaluate(i=>i.decode());assert.match(await image.evaluate(i=>i.currentSrc),/yinian-cover-mobile\.webp$/);}
        await page.screenshot({path:path.join(__dirname,'site-optimized-games-'+width+'.png')});
        report.checks.push(width+'px: all public pages, light/dark primary pages, return position, rapid carousel and coming card pass');
      }
      await context.close();
    }
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);
    fs.writeFileSync(path.join(__dirname,'site-optimization-'+label+'.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({status:'passed',pages:report.pages.length,checks:report.checks,primary:report.pages.filter(p=>p.width===390&&primary.includes(p.name)).map(({name,bytes,cover})=>({name,bytes,cover}))},null,2));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
