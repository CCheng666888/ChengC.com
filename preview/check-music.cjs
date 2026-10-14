/* Cold-cache MP3 start measurements with real decoding and a Range-capable server. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const {chromium} = createRequire('C:/Users/19152/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/runner.cjs')('playwright');
const root = path.resolve(__dirname, '..');
const before = process.argv.includes('--before');
const functionalOnly = process.argv.includes('--functional');
const rate = 750000 / 8;
let failMusic = false;
let latency = 120;
let throttled = true;
const requests = [];
const transfers = new Set();
const tick = setInterval(() => {
  const active = [...transfers].filter(job => !job.res.destroyed);
  for (const job of active) {
    const end = Math.min(job.end, job.offset + Math.max(1, Math.floor(rate * .02 / active.length)));
    job.res.write(job.bytes.subarray(job.offset, end));
    job.log.sent += end - job.offset;
    job.offset = end;
    if (end === job.end) {job.res.end(); transfers.delete(job);}
  }
}, 20);
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const panel = source.match(/<div id="musicPanel"[^\n]*/)[0];
const mini = source.match(/<div id="musicMini"[^\n]*/)[0];
const html = `<button id="musicToggle">音乐</button>${panel}${mini}<script src="${before ? '/baseline.js' : '/js/music.js'}"></script>`;
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.json': 'application/json', '.svg': 'image/svg+xml'};
const server = http.createServer((req, res) => {
  let name;
  try {name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);} catch {res.writeHead(400).end();return;}
  if (name === '/check') {res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}).end(html);return;}
  const music = name.startsWith('/assets/music/');
  let file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) {res.writeHead(403).end();return;}
  if (name === '/baseline.js') file = path.join(root, '.game-work/music-baseline/music.js');
  if (music && before) file = path.join(root, '.game-work/music-originals-20261010', path.basename(file));
  if (!fs.existsSync(file)) {res.writeHead(404).end();return;}
  if (music && failMusic) {res.writeHead(503).end();return;}
  const bytes = fs.readFileSync(file);
  const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  const start = range ? Number(range[1]) : 0;
  const end = range && range[2] ? Math.min(bytes.length, Number(range[2]) + 1) : bytes.length;
  if (start >= bytes.length || start >= end) {res.writeHead(416, {'Content-Range': `bytes */${bytes.length}`}).end();return;}
  const headers = {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length': end - start, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store'};
  if (range) headers['Content-Range'] = `bytes ${start}-${end - 1}/${bytes.length}`;
  const log = {name, start, end, sent: 0};
  if (music) requests.push(log);
  const respond = () => {
    if (res.destroyed) return;
    res.writeHead(range ? 206 : 200, headers);
    if (music && throttled) {
      const job = {res, bytes, offset: start, end, log};
      transfers.add(job);
      res.on('close', () => transfers.delete(job));
    } else {log.sent = end - start; res.end(bytes.subarray(start, end));}
  };
  if (music) setTimeout(respond, latency); else respond();
});
async function instrument(context) {
  await context.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.__musicEvents = [];
    window.Audio = new Proxy(NativeAudio, {construct(target, args) {
      const audio = Reflect.construct(target, args);
      window.__musicAudio = audio;
      ['playing', 'waiting', 'loadedmetadata', 'error', 'pause', 'ended'].forEach(type => audio.addEventListener(type, () => {
        window.__musicEvents.push({type, time: performance.now(), src: audio.currentSrc});
      }));
      return audio;
    }});
  });
}
const report = {network: {bandwidthKbps: 750, latencyMs: 120, coldCache: true}, timings: [], checks: []};
if (functionalOnly) report.timings = JSON.parse(fs.readFileSync(path.join(__dirname, 'music-after.json'), 'utf8')).timings;
let browser;
let activePage;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  for (const song of before ? [0] : functionalOnly ? [] : [...Array(11).keys()]) {
    const context = await browser.newContext({serviceWorkers: 'block'});
    await instrument(context);
    const page = await context.newPage();
    activePage = page;
    await page.goto(base + '/check');
    await page.evaluate(() => {window.__start = performance.now();});
    await page.locator('#musicToggle').click();
    await page.locator('#musicList button').nth(song).click();
    try {
      await page.waitForFunction(() => window.__musicAudio.currentTime > .08 && !window.__musicAudio.paused, null, {timeout: 45000});
    } catch (error) {
      if (!before) throw error;
      const observed = await page.evaluate(() => ({currentTime: window.__musicAudio.currentTime, readyState: window.__musicAudio.readyState, error: window.__musicAudio.error?.message}));
      assert.equal(observed.error, undefined);
      assert.equal(observed.currentTime, 0);
      report.timings.push({song, startMs: null, notStartedWithinMs: 45000, ...observed});
      report.requests = requests;
      console.log('before: no playback within 45 seconds at 750 kbps');
      await context.close();
      continue;
    }
    const metrics = await page.evaluate(() => ({startMs: Math.round(window.__musicEvents.find(event => event.type === 'playing').time - window.__start), duration: window.__musicAudio.duration, title: document.getElementById('musicMiniTitle').textContent}));
    report.timings.push({song, ...metrics});
    assert(Number.isFinite(metrics.duration) && metrics.duration > 180);
    console.log(`${before ? 'before' : 'after'} ${song}: ${metrics.startMs} ms; ${metrics.title}`);
    await context.close();
  }
  if (before) return;
  throttled = false;
  latency = 0;
  const context = await browser.newContext({serviceWorkers: 'block', viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  await instrument(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const mark = name => {report.checks.push(name);console.log(`PASS ${name}`);};
  const openPanel = async () => {
    if (!await page.locator('#musicToggle').isVisible()) await page.locator('#menuToggle').click();
    if (await page.locator('#musicPanel').evaluate(el => el.hidden)) await page.locator('#musicToggle').click();
  };
  const selectSong = async i => {
    await openPanel();
    await page.locator('#musicList button').nth(i).click();
  };
  requests.length = 0;
  await page.goto(base + '/');
  await page.waitForTimeout(700);
  assert.equal(requests.length, 0);
  mark('Real homepage: no audio requests before player interaction');
  await page.locator('#menuToggle').click();
  await page.locator('#musicToggle').click();
  await page.waitForFunction(() => window.__musicAudio.readyState >= 1);
  assert.equal(await page.evaluate(() => window.__musicAudio.paused), true);
  mark('Opening player prepares metadata without autoplay');
  await page.locator('#musicList button').nth(0).click();
  await page.waitForFunction(() => document.getElementById('musicMini').dataset.state === 'playing');
  const duration = await page.evaluate(() => window.__musicAudio.duration);
  await page.locator('#musicMiniSeek').evaluate(el => {el.value = 30;el.dispatchEvent(new Event('input', {bubbles: true}));});
  await page.waitForFunction(d => window.__musicAudio.currentTime >= d * .3, duration);
  const metadataEvents = await page.evaluate(() => window.__musicEvents.filter(event => event.type === 'loadedmetadata').length);
  await page.locator('#musicList button').nth(0).click();
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => window.__musicEvents.filter(event => event.type === 'loadedmetadata').length), metadataEvents);
  assert(await page.evaluate(() => window.__musicAudio.currentTime) >= duration * .3);
  mark('Repeated song click retains playback position and decoded media');
  await page.locator('#musicMiniPause').click();
  await page.waitForFunction(() => window.__musicAudio.paused && document.getElementById('musicMini').dataset.state === 'paused');
  await page.locator('#musicMiniPause').click();
  await page.waitForFunction(() => document.getElementById('musicMini').dataset.state === 'playing');
  mark('Pause, resume and seeking work');
  await page.locator('#musicMiniNext').click();
  await page.waitForFunction(() => document.getElementById('musicMiniTitle').textContent.includes('孙燕姿') && document.getElementById('musicMini').dataset.state === 'playing');
  await page.locator('#musicMiniPrev').click();
  await page.waitForFunction(() => document.getElementById('musicMiniTitle').textContent.includes('起风了') && document.getElementById('musicMini').dataset.state === 'playing');
  await page.evaluate(() => {window.__musicAudio.currentTime = window.__musicAudio.duration - .12;});
  await page.waitForFunction(() => document.getElementById('musicMiniTitle').textContent.includes('孙燕姿') && document.getElementById('musicMini').dataset.state === 'playing');
  mark('Previous/next and natural end advance correctly');
  await page.evaluate(() => {document.querySelectorAll('#musicList button')[2].click();document.querySelectorAll('#musicList button')[3].click();document.querySelectorAll('#musicList button')[4].click();});
  await page.waitForFunction(() => document.getElementById('musicMiniTitle').textContent.includes('梁静茹') && document.getElementById('musicMini').dataset.state === 'playing');
  mark('Rapid selection plays the latest song without stale failure');
  await page.locator('#musicMiniStop').click();
  await page.waitForFunction(() => window.__musicAudio.getAttribute('src') === null && document.getElementById('musicMini').hidden);
  mark('Stop releases the audio source and hides player');
  failMusic = true;
  await selectSong(5);
  await page.waitForFunction(() => document.getElementById('musicMini').dataset.state === 'error');
  assert.equal(await page.locator('#musicMiniPause').getAttribute('aria-label'), '重试播放');
  assert.equal(await page.locator('#musicToggle').evaluate(el => el.classList.contains('playing')), false);
  failMusic = false;
  await page.locator('#musicMiniPause').click();
  await page.waitForFunction(() => document.getElementById('musicMini').dataset.state === 'playing');
  mark('Network failure is visible; retry resumes the selected song');
  await page.locator('#musicMiniStop').click();
  latency = 1500;
  await selectSong(6);
  assert(['loading', 'buffering'].includes(await page.locator('#musicMini').getAttribute('data-state')));
  await page.locator('#musicMiniPause').click();
  await page.waitForTimeout(1800);
  assert.equal(await page.locator('#musicMini').getAttribute('data-state'), 'paused');
  assert.equal(await page.evaluate(() => window.__musicAudio.paused), true);
  await page.locator('#musicMiniStop').click();
  await selectSong(7);
  await page.locator('#musicMiniStop').click();
  await page.waitForTimeout(1800);
  assert.equal(await page.locator('#musicMini').getAttribute('data-state'), 'idle');
  assert.equal(await page.locator('#musicMini').getAttribute('aria-hidden'), 'true');
  mark('Pause/stop while loading never starts delayed playback');
  latency = 0;
  await selectSong(0);
  await page.waitForFunction(() => document.getElementById('musicMini').dataset.state === 'playing');
  await openPanel();
  await page.locator('#musicClose').click();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({width, height: 900});
    const fits = await page.locator('#musicMini').evaluate(el => {const r = el.getBoundingClientRect();return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;});
    assert(fits, `Player overflow at ${width}px`);
  }
  mark('Player fits 320/390/1440px, including status text');
  await page.setViewportSize({width: 390, height: 844});
  await page.screenshot({path: path.join(__dirname, 'music-player-mobile.png')});
  assert.deepEqual(errors, []);
  mark('No unexpected browser exceptions');
  await context.close();
  const lowData = await browser.newContext({serviceWorkers: 'block'});
  await lowData.addInitScript(() => Object.defineProperty(navigator, 'connection', {value: {saveData: true, effectiveType: '4g'}}));
  await instrument(lowData);
  const lowPage = await lowData.newPage();
  requests.length = 0;
  await lowPage.goto(base + '/check');
  await lowPage.locator('#musicToggle').click();
  await lowPage.locator('#musicList button').nth(0).focus();
  await lowPage.waitForTimeout(250);
  assert.equal(requests.length, 0);
  await lowPage.locator('#musicList button').nth(0).click();
  await lowPage.waitForFunction(() => window.__musicAudio.currentTime > .08);
  mark('Data saver skips warming but permits intentional playback');
  await lowData.close();
  const local = await browser.newContext({serviceWorkers: 'block'});
  await instrument(local);
  const filePage = await local.newPage();
  await filePage.goto('file:///' + path.join(root, 'index.html').replaceAll('\\', '/'));
  await filePage.locator('#musicToggle').click();
  await filePage.locator('#musicList button').nth(0).click();
  await filePage.waitForFunction(() => window.__musicAudio.currentTime > .08);
  mark('Double-click file:// homepage still plays local MP3s');
  await local.close();
})().catch(async error => {
  report.error = error.stack;
  report.requests = requests;
  if (activePage && !activePage.isClosed()) {
    report.media = await activePage.evaluate(() => ({events: window.__musicEvents, currentTime: window.__musicAudio?.currentTime, networkState: window.__musicAudio?.networkState, readyState: window.__musicAudio?.readyState, error: window.__musicAudio?.error?.message, src: window.__musicAudio?.src})).catch(() => null);
  }
  console.error(error.message);
  console.log(JSON.stringify({requests: report.requests, media: report.media}));
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  clearInterval(tick);
  server.close();
  fs.writeFileSync(path.join(__dirname, before ? 'music-before.json' : 'music-after.json'), JSON.stringify(report, null, 2) + '\n');
});
