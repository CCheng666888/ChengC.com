/* Rebuild hashed delivery bundles and the worker after editing HTML/CSS/JS.
   node preview/build-delivery.cjs --images also refreshes responsive WebP covers. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {createRequire} = require('node:module');
const runtimeRequire = createRequire('C:/Users/19152/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/runner.cjs');
const root = path.resolve(__dirname,'..');
const read = name => fs.readFileSync(path.join(root,name),'utf8').replace(/\r\n/g,'\n');
const write = (name,content) => fs.writeFileSync(path.join(root,name),content);
const hash = content => crypto.createHash('sha256').update(content).digest('hex').slice(0,12);
const pages = ['index.html','about.html','tools.html','games.html','contact.html',...['posts','work'].flatMap(dir=>fs.readdirSync(path.join(root,dir)).filter(name=>name.endsWith('.html')).map(name=>`${dir}/${name}`))];
const covers = ['assets/products/qa-cover-v1.png','assets/products/notes-cover-v1.png','assets/products/defense-cover-v1.png','assets/products/ming-cover.webp','assets/products/badminton-cover.webp','assets/game-bg.jpg'];
const coverNames = new Map(covers.map(name=>[name,name.replace(/\.(png|webp|jpg)$/,'-desktop.webp')]));
const resolve = (page,name) => path.posix.normalize(path.posix.join(path.posix.dirname(page),name));
const href = (page,name) => path.posix.relative(path.posix.dirname(page),name);
const attr = (tag,name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const cssBundles = new Map(), jsBundles = new Map();
const routes = {};
function bundle(kind,files) {
  const key = files.join(' '), registry = kind==='css'?cssBundles:jsBundles;
  if (registry.has(key)) return registry.get(key);
  let content = files.map(file=>`/* ${file} */\n${read(file)}`).join(kind==='js'?'\n;\n':'\n');
  if(kind==='css') content=content.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\n[ \t]*/g,'').trim();
  const name = `${kind}/delivery-${hash(content)}.${kind}`;
  write(name,content+'\n');registry.set(key,name);return name;
}
(async()=>{
  if(process.argv.includes('--scenery')) {
    const sharp=runtimeRequire('sharp');
    for(const [name,width,quality] of [['assets/cangshan-erhai.webp',1672,76],['assets/cangshan-erhai-mobile.webp',960,72]]) {
      const original=fs.readFileSync(path.join(root,name));
      const compressed=await sharp(original).resize({width,withoutEnlargement:true}).webp({quality,effort:6}).toBuffer();
      write(name,compressed);
      const key=name.includes('-mobile.')?'dayMobile':'day';
      write(`js/scene-${key==='dayMobile'?'day-mobile':'day'}-data.js`,`// Generated from ${name}; byte-identical local texture.\nwindow.SceneImages.register(${JSON.stringify(key)}, ${JSON.stringify('data:image/webp;base64,'+compressed.toString('base64'))});\n`);
      console.log(`${name}: ${original.length} -> ${compressed.length} bytes`);
    }
  }
  if(process.argv.includes('--images')) {
    const sharp = runtimeRequire('sharp');
    for(const original of covers) {
      const desktop = coverNames.get(original), mobile = desktop.replace('-desktop.','-mobile.');
      await sharp(path.join(root,original)).resize({width:1280,withoutEnlargement:true}).webp({quality:78,effort:6}).toFile(path.join(root,desktop));
      await sharp(path.join(root,original)).resize({width:640,withoutEnlargement:true}).webp({quality:72,effort:6}).toFile(path.join(root,mobile));
      console.log(`${original}: ${fs.statSync(path.join(root,original)).size} -> ${fs.statSync(path.join(root,desktop)).size} / ${fs.statSync(path.join(root,mobile)).size} bytes`);
    }
  }
  for(const page of pages) {
    let html = read(page);
    // External font CSS delayed article rendering on networks that cannot reach Google.
    html=html.replace(/<link\b[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>\s*/g,'');
    for(const [original,replacement] of coverNames) html=html.replaceAll(original,replacement);
    html=html.replace(/<img\b[^>]*>/g,tag=>{
      const source=attr(tag,'src');
      if(!source?.includes('-desktop.webp') || tag.includes('srcset='))return tag;
      return tag.replace(/>$/,` decoding="async" srcset="${source.replace('-desktop.','-mobile.')} 640w, ${source} 1280w" sizes="(max-width:480px) calc(100vw - 110px), (max-width:800px) calc(100vw - 140px), 740px"${attr(tag,'loading')==='eager'?' fetchpriority="high"':''}>`);
    });
    html=html.replace(/(<figure\b[^>]*>)\s*(<img\b[^>]*>)/g,(match,figure,image)=>{
      const source=attr(image,'src');
      if(!source?.includes('-desktop.webp'))return match;
      return `${figure}<picture><source media="(max-width:800px)" srcset="${source.replace('-desktop.','-mobile.')}">${image}</picture>`;
    });
    // Aggregate each page's extra styles; the common stylesheet remains shared.
    const css=[];
    html=html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g,tag=>{
      const source=attr(tag,'data-sources');
      if(source)css.push(...source.split(' '));
      else if(attr(tag,'href'))css.push(resolve(page,attr(tag,'href').split('?')[0]));
      return '';
    });
    if(!css.includes('css/navigation.css'))css.push('css/navigation.css');
    // Give article landscapes the same responsive background as the home page.
    if(page.startsWith('posts/')&&!css.includes('css/night-lake.css'))css.push('css/night-lake.css');
    const uniqueCss=[...new Set(css)], common=uniqueCss.filter(file=>file==='css/style.css'), extra=uniqueCss.filter(file=>file!=='css/style.css');
    const js=[];
    html=html.replace(/<script\b[^>]*(?:src="[^"]*"|data-theme-source="[^"]*")[^>]*>[\s\S]*?<\/script>/g,tag=>{
      if(attr(tag,'data-theme-source'))return '';
      const source=attr(tag,'data-sources');
      if(source)js.push(...source.split(' '));
      else {const file=resolve(page,attr(tag,'src').split('?')[0]);if(file!=='js/theme.js')js.push(file);}
      return '';
    });
    const uniqueJs=[...new Set(js)].filter(file=>file!=='js/navigation.js');
    // Navigation stays one shared file for all pages; scripts download in parallel in the head.
    const nav=`js/navigation.js?v=${hash(read('js/navigation.js'))}`;
    const resources=[];
    const tags=[];
    for(const files of [common,extra])if(files.length){const name=bundle('css',files);resources.push(name);tags.push(`<link rel="stylesheet" href="${href(page,name)}" data-sources="${files.join(' ')}">`);}
    tags.push(`<script data-theme-source="js/theme.js">${read('js/theme.js').trim()}</script>`);
    tags.push(`<script defer src="${href(page,nav)}"></script>`);resources.push(nav);
    if(uniqueJs.length){const name=bundle('js',uniqueJs);resources.push(name);tags.push(`<script defer src="${href(page,name)}" data-sources="${uniqueJs.join(' ')}"></script>`);}
    html=html.replace(/<!-- delivery:start -->[\s\S]*?<!-- delivery:end -->/g,'');
    html=html.replace(/\s*<\/head>/,`\n  <!-- delivery:start -->\n  ${tags.join('\n  ')}\n  <!-- delivery:end -->\n</head>`);
    const firstImage=html.match(/<img\b[^>]*loading="eager"[^>]*>/)?.[0];
    if(firstImage) {
      const source=attr(firstImage,'src');
      const image=resolve(page,source);
      resources.push(image);
      if(image.includes('-desktop.'))resources.push(image.replace('-desktop.','-mobile.'));
    }
    if(page==='index.html'||page.startsWith('posts/'))resources.push('assets/cangshan-erhai.webp','assets/cangshan-erhai-mobile.webp');
    routes[page]=resources;
    write(page,html.replace(/[ \t]+$/gm,''));
  }
  const assets=new Set(Object.values(routes).flat().map(name=>name.split('?')[0]));
  // Runtime caches also include small, optional resources; never audio, video or games.
  for(const name of fs.readdirSync(path.join(root,'js')))if(name.endsWith('.js')&&!name.startsWith('scene-')&&!name.startsWith('delivery-'))assets.add(`js/${name}`);
  for(const name of ['assets/cangshan-erhai-night.webp','assets/cangshan-erhai-night-mobile.webp','assets/avatar.jpg','assets/magpie-original-detective.png','assets/game-bg.jpg','assets/douyin-game-bg.jpg',...coverNames.values(),...[...coverNames.values()].map(name=>name.replace('-desktop.','-mobile.'))])assets.add(name);
  const revision=hash(read('preview/sw-template.js')+pages.map(page=>read(page)).join('')+[...assets].sort().map(name=>fs.existsSync(path.join(root,name))?hash(fs.readFileSync(path.join(root,name))):'').join(''));
  const worker=read('preview/sw-template.js').replace('__VERSION__',revision).replace('__ROUTES__',JSON.stringify(routes)).replace('__ASSETS__',JSON.stringify([...assets].sort()));
  write('sw.js',worker);
  write('preview/delivery-manifest.json',JSON.stringify({revision,pages:routes,assets:[...assets].sort()},null,2)+'\n');
  console.log(`Generated ${cssBundles.size} CSS / ${jsBundles.size} JS bundles for ${pages.length} pages; worker ${revision}.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
