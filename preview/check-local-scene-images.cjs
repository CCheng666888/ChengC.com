/* Exercise the real loader without a browser or a real user profile. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const loader = fs.readFileSync(path.join(root, 'js/scene-images.js'), 'utf8');
function environment(protocol) {
  const base = protocol === 'file:' ? 'file:///D:/site/index.html' : 'http://localhost/index.html';
  const scripts = [];
  const context = {URL, location:{protocol}, document:{
    baseURI:base, currentScript:{src:new URL('js/scene-images.js?v=5', base).href},
    createElement:()=>({remove(){this.removed=true}}),
    head:{appendChild(script){scripts.push(script)}}
  }};
  context.window = context;
  vm.createContext(context);
  vm.runInContext(loader, context);
  return {context, scripts, api:context.SceneImages};
}
function completeBundle(env, index, key) {
  vm.runInContext(fs.readFileSync(path.join(root, `js/scene-${key}-data.js`), 'utf8'), env.context);
  env.scripts[index].onload();
}
(async () => {
  const web = environment('http:');
  const webDay = {};
  await web.api.assign(webDay, 'assets/cangshan-erhai.webp', 'day');
  assert.equal(webDay.src, 'http://localhost/assets/cangshan-erhai.webp');
  assert.equal(web.scripts.length, 0, 'HTTP must not download duplicate embedded photos');

  const local = environment('file:');
  const a = {}, b = {};
  const assignments = [local.api.assign(a, 'assets/cangshan-erhai.webp', 'day'),
                       local.api.assign(b, 'assets/cangshan-erhai.webp', 'day')];
  assert.equal(local.scripts.length, 1, 'Concurrent texture requests share one bundle');
  assert.equal(local.scripts[0].src, 'file:///D:/site/js/scene-day-data.js');
  completeBundle(local, 0, 'day');
  await Promise.all(assignments);
  assert.equal(a.src, b.src);
  assert.ok(a.src.startsWith('data:image/webp;base64,'));
  assert.deepEqual(Buffer.from(a.src.split(',')[1], 'base64'), fs.readFileSync(path.join(root, 'assets/cangshan-erhai.webp')));
  assert.equal(local.scripts.length, 1, 'Night stays lazy until requested');

  const night = {};
  const nightAssignment = local.api.assign(night, 'assets/cangshan-erhai-night-v2.png', 'night');
  assert.equal(local.scripts.length, 2);
  completeBundle(local, 1, 'night');
  await nightAssignment;
  assert.deepEqual(Buffer.from(night.src.split(',')[1], 'base64'), fs.readFileSync(path.join(root, 'assets/cangshan-erhai-night-v2.png')));

  const missing = environment('file:');
  const failed = missing.api.assign({}, 'assets/cangshan-erhai.webp', 'day');
  const rejection = assert.rejects(failed, /bundle is missing/);
  missing.scripts[0].onerror();
  await rejection;
  const retryImage = {}, retry = missing.api.assign(retryImage, 'assets/cangshan-erhai.webp', 'day');
  assert.equal(missing.scripts.length, 2, 'A failed resource can be retried');
  completeBundle(missing, 1, 'day');
  await retry;
  assert.ok(retryImage.src.startsWith('data:image/'));

  const incomplete = environment('file:');
  const empty = incomplete.api.assign({}, 'assets/cangshan-erhai.webp', 'day');
  const emptyRejection = assert.rejects(empty, /incomplete/);
  incomplete.scripts[0].onload();
  await emptyRejection;
  await assert.rejects(web.api.assign({}, '', 'day'), /URL is missing/);
  assert.throws(()=>web.api.register('day', 'https://example.com/other.png'), /Invalid/);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.indexOf('js/scene-images.js') < html.indexOf('js/landscape.js'));
  console.log('Passed: file/HTTP asset selection, lazy night load, exact photo bytes, shared requests, missing bundle retry and incomplete bundle handling.');
})().catch(error => {console.error(error);process.exitCode=1});
