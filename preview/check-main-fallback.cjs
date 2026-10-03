/* Exercise startup when storage is blocked; never touch a real browser profile. */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function element() {
  return {value:'',textContent:'',innerHTML:'',hidden:false,dataset:{},classList:{add(){},toggle(){return false},contains(){return false},remove(){}},setAttribute(){},addEventListener(){},querySelectorAll(){return []}};
}
function environment(storage) {
  const elements = new Map();
  const context = {localStorage:storage, URL, location:{href:'http://localhost/index.html'},matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},scrollY:0,scrollTo(){},confirm:()=>false,alert(){}};
  context.document = {documentElement:element(),readyState:'loading',getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},querySelectorAll(){return []},querySelector(){return element()},createElement(){return {textContent:'',get innerHTML(){return this.textContent.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}}},addEventListener(){}};
  return {context:vm.createContext(context),elements};
}
const blocked = {getItem(){throw Error('storage blocked')},setItem(){throw Error('storage blocked')}};
const env = environment(blocked);
vm.runInContext(fs.readFileSync(path.join(root,'js/theme.js'),'utf8'),env.context);
vm.runInContext(fs.readFileSync(path.join(root,'js/app.js'),'utf8'),env.context);
assert.equal(env.elements.get('postCount').textContent,'共 6 条');
assert.equal((env.elements.get('postsContainer').innerHTML.match(/class="post-link"/g)||[]).length,6);
const local = environment({getItem(){return JSON.stringify([{id:'multi-book-qa',title:'old',category:'study',content:'old',date:'2026/01/01',url:'javascript:alert(1)'},{id:'custom',title:'local',category:'life',content:'preserve',date:'2026/10/02',url:'javascript:alert(1)'}])}});
vm.runInContext(fs.readFileSync(path.join(root,'js/app.js'),'utf8'),local.context);
assert.equal(local.elements.get('postCount').textContent,'共 7 条');
assert.ok(local.elements.get('postsContainer').innerHTML.includes('posts/multi-book-qa.html'));
assert.ok(local.elements.get('postsContainer').innerHTML.includes('data-expand="custom"'));
assert.ok(!local.elements.get('postsContainer').innerHTML.includes('href="javascript:'));
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.equal((html.match(/class="post-link"/g)||[]).length,6);
assert.equal((html.match(/class="timeline-item"/g)||[]).length,13);
assert.ok(!html.includes('role="link"'));
console.log('Passed: blocked-storage startup, canonical links, retained local records, six static article links, and thirteen timeline entries, including ten retained historical entries.');
