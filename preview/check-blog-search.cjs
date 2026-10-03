/* Run with a local static server: node preview/check-blog-search.cjs [base URL]. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const runtime = 'C:/Users/19152/.cache/codex-runtimes/codex-primary-runtime/dependencies/node';
const {chromium} = createRequire(`${runtime}/runner.cjs`)('playwright');
const {expect} = createRequire(`${runtime}/runner.cjs`)('playwright/test');
const root = path.resolve(__dirname, '..');
const base = process.argv[2] || 'http://127.0.0.1:8765/';
const report = [];
const errorMessages = [];

async function swordAtCaret(page) {
  const geometry = await page.locator('#navSearchInput').evaluate(input => {
    const form = input.closest('form'), sprite = form.querySelector('.search-firefly');
    const style = getComputedStyle(input), field = input.getBoundingClientRect(), actor = sprite.getBoundingClientRect();
    const mirror = document.createElement('span');
    mirror.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;white-space:pre';
    mirror.style.font = style.font;mirror.style.letterSpacing = style.letterSpacing;mirror.style.fontKerning = style.fontKerning;
    const end = input.selectionDirection === 'backward' ? input.selectionStart : input.selectionEnd;
    mirror.textContent = input.value.slice(0,end);document.body.append(mirror);
    const width = mirror.getBoundingClientRect().width;mirror.remove();
    const caretX = Math.max(field.left, Math.min(field.right-2,field.left+width-input.scrollLeft));
    const caretY = field.top + field.height/2;
    const facing = new DOMMatrix(getComputedStyle(sprite).transform).a;
    return {caretX,caretY,swordX:actor.left+actor.width*(facing>0?.12:.88),swordY:actor.top+actor.height*.34,bodyX:actor.left+actor.width/2};
  });
  assert(Math.abs(geometry.swordX-geometry.caretX)<2,`Sword follows the text caret horizontally: ${JSON.stringify(geometry)}`);
  assert(Math.abs(geometry.swordY-geometry.caretY)<2,'Sword reaches the same text line as the caret');
  assert(Math.abs(geometry.bodyX-geometry.caretX)>10,'The character stands beside the caret instead of overlapping it');
}

(async () => {
  const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  try {
    const context = await browser.newContext({viewport:{width:1440,height:1000}});
    const page = await context.newPage();
    page.on('pageerror', error => errorMessages.push(error.message));
    const requested = [];
    page.on('request', request => requested.push(request.url()));
    await page.goto(base);
    await expect(page.locator('#postCount')).toHaveText('共 7 条');
    assert(await page.locator('.nav-search').evaluate(e=>!!e.closest('.site-header .nav-shell')),'Search belongs to the top navigation');
    assert.equal(await page.locator('.hero [data-blog-search]').count(),0,'The hero has no duplicate primary search box');
    assert(!requested.some(url => /blog-search-index|firefly-official/.test(url)), 'No initial search index or character download');
    await expect(page.locator('.nav-search .search-firefly')).toBeHidden();
    await page.screenshot({path:path.join(__dirname,'home-search-desktop.jpg'),type:'jpeg',quality:88});
    report.push('Initial page keeps seven articles; search index and character media load on demand.');

    const input = page.locator('#navSearchInput');
    await input.fill('128');
    await expect(page.locator('#navSearchList a')).toHaveCount(1);
    await expect(page.locator('#postCount')).toHaveText('找到 1 / 7 篇');
    await expect(page.locator('#searchInput')).toHaveValue('128');
    await expect(page.locator('#navSearchList mark')).toHaveText('128');
    await expect(page.locator('#navSearchList a')).toHaveAttribute('href','posts/building-this-site.html');
    await page.waitForFunction(() => document.querySelector('.nav-search video').readyState >= 2);
    assert.equal(await page.locator('.nav-search video').evaluate(e=>e.playbackRate),0.5);
    const sprite = page.locator('.nav-search .search-firefly');
    const formHeight = await page.locator('.nav-search').evaluate(e=>e.getBoundingClientRect().height);
    await swordAtCaret(page);
    const a = await sprite.evaluate(e=>getComputedStyle(e).transform);
    await input.fill('Linux 命令');
    await expect(page.locator('#navSearchList a')).toHaveCount(1);
    await expect(page.locator('#navSearchList a')).toHaveAttribute('href','posts/linux-commands.html');
    await page.waitForTimeout(300);
    assert.notEqual(await sprite.evaluate(e=>getComputedStyle(e).transform), a,'Character follows the typing caret');
    await input.press('Home');await swordAtCaret(page);
    await input.press('ArrowRight');await swordAtCaret(page);
    await input.fill('长句用于输入光标定位测试 '.repeat(12));
    await input.press('End');await swordAtCaret(page);
    await input.evaluate(e=>{e.setSelectionRange(2,2);e.dispatchEvent(new Event('select'));});
    await swordAtCaret(page);
    const fixedCaret = await sprite.evaluate(e=>getComputedStyle(e).transform);
    const box = await input.boundingBox();
    await page.mouse.move(box.x+box.width-10,box.y+20);
    await page.waitForTimeout(450);
    await page.mouse.move(box.x+10,box.y+20);
    await page.waitForTimeout(450);
    assert.equal(await sprite.evaluate(e=>getComputedStyle(e).transform),fixedCaret,'Mouse hovering does not displace the text-caret companion');
    assert.equal(await page.locator('.nav-search').evaluate(e=>e.getBoundingClientRect().height),formHeight,'Searching never adds a separate character row');
    await input.fill('Linux 命令');await expect(page.locator('#navSearchList a')).toHaveCount(1);
    await input.press('ArrowDown');
    await expect(input).toHaveAttribute('aria-activedescendant','search-result-0');
    await input.press('Enter');
    await page.waitForURL('**/posts/linux-commands.html');
    await page.goto(base);
    report.push('Search is in the top navigation. Sword reaches the text caret for typing, Home/arrows, middle insertion and horizontally scrolled text; character does not follow mouse hovering. Full-text and keyboard navigation pass.');

    await input.fill('没有这样的文章xyz');
    await expect(page.locator('#postCount')).toHaveText('找到 0 / 7 篇');
    await expect(page.locator('#navSearchList a')).toHaveCount(0);
    await page.locator('.nav-search [data-search-clear]').click();
    await expect(input).toHaveValue('');
    await expect(page.locator('#postCount')).toHaveText('共 7 条');
    await page.locator('[data-filter="life"]').click();
    await expect(page.locator('#postCount')).toHaveText('共 3 条');
    await input.fill('128');
    await expect(page.locator('#postCount')).toHaveText('找到 0 / 7 篇');
    await page.locator('.nav-search .search-submit').click();
    await expect(page.locator('#postCount')).toHaveText('找到 1 / 7 篇');
    await expect(page.locator('[data-filter="all"]')).toHaveAttribute('aria-pressed','true');
    assert(await page.locator('.nav-search video').evaluate(e=>e.paused),'Blur pauses the character');
    await expect(page.locator('.nav-search .search-firefly')).toBeHidden();
    await expect(page.locator('.tools')).toHaveCSS('visibility','visible');
    await page.locator('#searchInput').fill('<img src=x onerror=alert(1)>');
    await expect(page.locator('#postCount')).toHaveText('找到 0 / 7 篇');
    assert.equal(await page.locator('#postsContainer img').count(),0);
    await page.locator('.toolbar [data-search-clear]').click();
    await expect(input).toHaveValue('');
    await expect(page.locator('#postCount')).toHaveText('共 7 条');
    await page.evaluate(() => scrollTo(0,0));
    await input.fill('WebP');
    await expect(page.locator('#postCount')).toHaveText('找到 1 / 7 篇');
    await expect(page.locator('#navSearchList a')).toHaveCount(1);
    await page.screenshot({path:path.join(__dirname,'home-search-active-desktop.jpg'),type:'jpeg',quality:88});
    await page.evaluate(() => scrollTo({top:document.body.scrollHeight,behavior:'instant'}));
    await expect(page.locator('.nav-search')).toBeInViewport();
    assert.equal(await input.evaluate(e=>e.getBoundingClientRect().top<68),true,'Navigation search stays in the top bar while scrolling');
    await input.press('Escape');
    await expect(input).not.toBeFocused();
    await expect(page.locator('#navSearchResults')).toBeHidden();
    await expect(page.locator('.nav-search .search-firefly')).toBeHidden();
    report.push('No-result, clear, categories, submit, safe query rendering, Escape, blur and video cleanup pass.');

    await page.locator('#navSearchInput').evaluate(e => {
      e.focus(); e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
      e.value='三下乡'; e.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));
    });
    await expect(page.locator('#postCount')).toHaveText('找到 1 / 7 篇'); // previous WebP query remains during composition
    await page.locator('#navSearchInput').evaluate(e => e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'三下乡'})));
    await expect(page.locator('#navSearchStatus')).toContainText('找到 2 篇文章');
    report.push('IME composition does not prematurely filter or navigate.');

    for (const width of [320,390,768]) {
      const mobile = await browser.newPage({viewport:{width,height:width===320?640:844},deviceScaleFactor:width===390?3:1,isMobile:true,hasTouch:true});
      mobile.on('pageerror', error => errorMessages.push(error.message));
      await mobile.goto(base);
      await expect(mobile.locator('#postCount')).toHaveText('共 7 条');
      assert(await mobile.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),'No horizontal overflow');
      await mobile.locator('#menuToggle').tap();
      await expect(mobile.locator('#menuToggle')).toHaveAttribute('aria-expanded','true');
      await mobile.locator('#menuToggle').tap();
      await mobile.screenshot({path:path.join(__dirname,`home-search-mobile-${width}.jpg`),type:'jpeg',quality:88,scale:'css'});
      await mobile.locator('#navSearchInput').fill('三下乡');
      await expect(mobile.locator('#navSearchList a')).toHaveCount(2);
      assert(await mobile.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),'No focused search overflow');
      await swordAtCaret(mobile);
      if (width===390) {
        await mobile.screenshot({path:path.join(__dirname,'home-search-active-mobile.jpg'),type:'jpeg',quality:88,scale:'css'});
        // Simulate the viewport remaining after a software keyboard opens.
        await mobile.setViewportSize({width:390,height:440});
        await mobile.waitForTimeout(250);
        await mobile.screenshot({path:path.join(__dirname,'home-search-keyboard-mobile.jpg'),type:'jpeg',quality:88,scale:'css'});
      }
      await mobile.locator('#navSearchList a').first().tap();
      try { await mobile.waitForURL('**/posts/**',{timeout:5000}); }
      catch(error) { await mobile.screenshot({path:path.join(__dirname,`home-search-tap-failed-${width}.jpg`),type:'jpeg',quality:88,scale:'css'}); throw new Error(`Touch navigation failed at ${width}px: ${mobile.url()}\n${error}`); }
      await mobile.close();
    }
    report.push('320/390/768 px touch layouts, focused suggestions, tap navigation, menu and reduced-height viewport pass without horizontal overflow.');

    for (const width of [801,960]) {
      const narrow = await browser.newPage({viewport:{width,height:900}});
      await narrow.goto(base);
      assert(await narrow.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Narrow desktop navigation has no overflow');
      const searchBox = await narrow.locator('.nav-search').boundingBox(), linksBox = await narrow.locator('#navLinks').boundingBox();
      assert(searchBox.x+searchBox.width<=linksBox.x,'Search does not overlap desktop navigation links');
      await narrow.locator('#navSearchInput').fill('128');
      await expect(narrow.locator('#postCount')).toHaveText('找到 1 / 7 篇');
      await swordAtCaret(narrow);
      await narrow.close();
    }
    report.push('801/960 px desktop navigation keeps search, links and controls on the same row without overlap.');

    const light = await browser.newPage({viewport:{width:390,height:844},colorScheme:'light',isMobile:true,hasTouch:true});
    await light.goto(base);await light.locator('#searchInput').fill('man');
    await expect(light.locator('#postCount')).toHaveText('找到 1 / 7 篇');
    await light.locator('#blog').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
    await light.waitForTimeout(250);
    await light.screenshot({path:path.join(__dirname,'home-search-blog-mobile-light.jpg'),type:'jpeg',quality:88,scale:'css'});
    await light.close();
    const reduced = await browser.newPage({reducedMotion:'reduce'});
    await reduced.goto(base);await reduced.locator('#navSearchInput').fill('Linux');
    await expect(reduced.locator('#navSearchList a')).toHaveCount(1);
    assert(await reduced.locator('.nav-search video').evaluate(e=>e.paused),'Reduced-motion mode does not play video');
    await reduced.close();

    const offline = await browser.newPage();
    await offline.goto('file:///' + path.join(root,'index.html').replaceAll('\\','/'));
    await offline.locator('#navSearchInput').fill('128');
    await expect(offline.locator('#navSearchList a')).toHaveCount(1);
    await offline.close();
    const broken = await browser.newPage();
    await broken.route('**/blog-search-index.js*',r=>r.abort());
    await broken.goto(base);await broken.locator('#navSearchInput').fill('Linux');
    await expect(broken.locator('#navSearchList a')).toHaveCount(1);
    await expect(broken.locator('#navSearchHint')).toContainText('正文索引暂不可用');
    await broken.unroute('**/blog-search-index.js*');
    await broken.locator('#navSearchInput').press('Escape');
    await broken.locator('#navSearchInput').fill('128');
    await expect(broken.locator('#navSearchList a')).toHaveCount(1);
    await expect(broken.locator('#navSearchHint')).toHaveText('搜索全部文章 · 标题 / 正文');
    await broken.close();
    const local = await browser.newPage();
    await local.addInitScript(() => localStorage.setItem('chengc_posts', JSON.stringify([
      {id:'custom-local',title:'本地记录 <script>',category:'life',content:'独有关键词只存在本地记录中',date:'2026/10/03'},
      {id:'linux-commands',title:'stale',category:'life',content:'old content',date:'2026/01/01',url:'javascript:alert(1)'}
    ])));
    await local.goto(base);
    await expect(local.locator('#postCount')).toHaveText('共 8 条');
    await expect(local.locator('[data-post-id="linux-commands"] a')).toHaveAttribute('href','posts/linux-commands.html');
    await local.locator('#searchInput').fill('独有关键词');
    await expect(local.locator('#postCount')).toHaveText('找到 1 / 8 篇');
    await expect(local.locator('[data-expand="custom-local"]')).toBeVisible();
    assert.equal(await local.locator('#postsContainer script').count(),0,'Stored titles cannot inject markup');
    await local.close();
    const storage = await browser.newPage();
    await storage.addInitScript(() => { Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}}); });
    await storage.goto(base);await expect(storage.locator('#postCount')).toHaveText('共 7 条');
    await storage.close();
    const nojs = await browser.newPage({javaScriptEnabled:false});
    await nojs.goto(base);
    await expect(nojs.locator('#postsContainer .post-link')).toHaveCount(7);
    await expect(nojs.locator('.nav-search')).toBeHidden();
    await nojs.close();
    report.push('Light theme, reduced motion, file:// full-text search, failed-index fallback and retry, local records, blocked storage and seven no-JavaScript article links pass.');
    assert.deepEqual(errorMessages,[],'No page errors');
    fs.writeFileSync(path.join(__dirname,'blog-search-check.json'),JSON.stringify({status:'passed',report,pageErrors:errorMessages},null,2));
    console.log(report.map(s=>'PASS: '+s).join('\n'));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
