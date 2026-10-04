const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/19152/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/runner.cjs')('playwright');
const root=path.resolve(__dirname,'..');
const base=process.argv[2]||'http://127.0.0.1:8765/';
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'delivery-manifest.json')));
const report=[], errors=[], missing=[];
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  function observe(page){page.on('pageerror',e=>errors.push(`${page.url()}: ${e.message}`));page.on('response',response=>{if(response.status()===404&&!response.url().endsWith('/favicon.ico'))missing.push(response.url());});}
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    const page=await context.newPage();observe(page);
    for(const name of Object.keys(manifest.pages)) {
      await page.goto(new URL(name,base).href);
      assert.equal(await page.locator('link[href*="fonts.googleapis"]').count(),0);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+' overflows');
      if(['index.html','about.html','tools.html','games.html'].includes(name)){await page.waitForTimeout(1000);await page.screenshot({path:path.join(__dirname,`navigation-${name.replace('.html','')}-desktop.jpg`),type:'jpeg',quality:85});}
    }
    report.push('All 19 public editorial pages load, with no Google font dependency, missing resource or desktop overflow.');
    await page.goto(new URL('games.html',base).href);
    // Six rapid clicks must land on the sixth target within one short motion, without a backlog.
    await page.locator('#workNext').evaluate(button=>{for(let i=0;i<6;i++)button.click();});
    await page.waitForTimeout(550);
    assert.match(await page.locator('#workPosition').textContent(),/^02 \/ 05/);
    assert.equal(await page.locator('#workTrack').evaluate(track=>track.classList.contains('is-switching')),false);
    await page.locator('#workPrevious').click();await page.waitForTimeout(450);
    assert.match(await page.locator('#workPosition').textContent(),/^01 \/ 05/);
    await page.locator('.work-card.is-current:not([data-work-clone]) .work-copy h2').click();
    await page.waitForURL('**/work/mingchronicles.html');
    await page.locator('#pauseToggle').click();
    assert.equal(await page.locator('#pauseToggle').getAttribute('aria-pressed'),'true');
    await page.locator('#sceneToggle').click();
    assert(await page.locator('body').evaluate(body=>body.classList.contains('scene-only')));
    await page.locator('#sceneToggle').click();
    report.push('Rapid carousel clicks respond immediately; card detail navigation and scene controls pass.');
    await page.goto(base);
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    assert.match(await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL),/\/sw\.js$/);
    await page.locator('#navSearchInput').fill('Linux');
    await page.locator('#navSearchList a').click();await page.waitForURL('**/posts/linux-commands.html');
    await page.goto(base);await page.locator('#themeToggle').click();
    const dark=await page.locator('html').evaluate(html=>html.classList.contains('dark'));
    await page.goto(new URL('about.html',base).href);
    assert.equal(await page.locator('html').evaluate(html=>html.classList.contains('dark')),dark);
    await page.locator('a[href="index.html"]').first().click();await page.waitForURL(/\/(?:index\.html)?$/);
    assert.equal(await page.locator('body').evaluate(body=>body.classList.contains('page-leaving')),false);
    report.push('Search-to-article navigation, saved theme, return links and active worker pass.');
    await context.setOffline(true);
    for(const name of ['', 'tools.html','games.html','posts/linux-commands.html']) {
      await page.goto(new URL(name,base).href);
      assert(await page.locator('main').isVisible());
    }
    await context.setOffline(false);
    report.push('Previously prepared pages remain navigable when the network goes offline.');
    await context.close();
    for(const width of [390,320]) {
      const phone=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
      const mobile=await phone.newPage();observe(mobile);
      for(const name of ['index.html','about.html','tools.html','games.html','contact.html','posts/linux-commands.html','work/mingchronicles.html']) {
        await mobile.goto(new URL(name,base).href);
        assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${name} overflows`);
        if(name==='tools.html'||name==='games.html') {
          const first=mobile.locator('.work-card.is-current:not([data-work-clone]) img');
          await first.evaluate(image=>image.decode());
          assert.match(await first.evaluate(image=>image.currentSrc),/-mobile\.webp$/);
          await mobile.locator('#menuToggle').click();assert.equal(await mobile.locator('#menuToggle').getAttribute('aria-expanded'),'true');
          await mobile.locator('#menuToggle').click();
          await mobile.waitForTimeout(1000);await mobile.screenshot({path:path.join(__dirname,`navigation-${name.replace('.html','')}-${width}.jpg`),type:'jpeg',quality:85});
        }
      }
      await phone.close();
    }
    report.push('390/320px phones have no overflow, use mobile covers even at DPR 3, and menus pass.');
    const fallback=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const plain=await fallback.newPage();observe(plain);
    await plain.addInitScript(()=>{const supports=HTMLScriptElement.supports;HTMLScriptElement.supports=type=>type==='speculationrules'?false:supports.call(HTMLScriptElement,type);});
    await plain.goto(new URL('tools.html',base).href);
    await plain.locator('#menuToggle').click();await plain.locator('#navLinks a[href="games.html"]').click();
    await plain.waitForURL('**/games.html');await plain.locator('#workNext').click();
    assert.match(await plain.locator('#workPosition').textContent(),/^02 \/ 05/);
    await fallback.close();
    const local=await browser.newPage();observe(local);
    await local.goto('file:///'+path.join(root,'index.html').replaceAll('\\','/'));
    assert.equal(await local.locator('#postCount').textContent(),'共 7 条');
    await local.locator('.hero-actions a[href="tools.html"]').click();await local.waitForURL('**/tools.html');
    assert(await local.locator('#workTrack .work-card.is-current').count()>0);await local.close();
    const nojs=await browser.newPage({javaScriptEnabled:false});observe(nojs);
    await nojs.goto(base);assert.equal(await nojs.locator('#postsContainer .post-link').count(),7);
    await nojs.locator('.hero-actions a[href="tools.html"]').click();await nojs.waitForURL('**/tools.html');await nojs.close();
    report.push('Blocked worker, unsupported prerender, reduced motion, file:// and JavaScript-disabled native navigation pass.');
    assert.deepEqual(missing,[],'Missing public resources');assert.deepEqual(errors,[],'Page errors');
    fs.writeFileSync(path.join(__dirname,'navigation-check.json'),JSON.stringify({status:'passed',report,errors,missing},null,2)+'\n');
    console.log(report.map(line=>'PASS: '+line).join('\n'));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
