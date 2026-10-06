// Refresh the site's standalone rhythm-game entry after editing its original sources.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),game=path.join(root,'play/beat-exe');
const sharp=createRequire('C:/Users/19152/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/runner.cjs')('sharp');
const hash=content=>crypto.createHash('sha256').update(content).digest('hex').slice(0,12);
(async()=>{
  await sharp(path.join(game,'images/boss-zxx.png')).resize({width:720,withoutEnlargement:true}).webp({quality:76,effort:6}).toFile(path.join(game,'images/boss-zxx.webp'));
  const packFile=path.join(game,'bonus_pack/zxx.json'),pack=JSON.parse(fs.readFileSync(packFile,'utf8'));
  pack.bossImage='images/boss-zxx.webp';
  fs.writeFileSync(packFile,JSON.stringify(pack,null,2)+'\n');
  const contentFile=path.join(game,'src/content.js');
  const content=JSON.parse(fs.readFileSync(contentFile,'utf8').trim().replace(/^window\.BEAT_CONTENT\s*=\s*/,'').replace(/;$/,''));
  content.pack=pack;
  fs.writeFileSync(contentFile,'window.BEAT_CONTENT='+JSON.stringify(content)+';\n');
  for(const file of [path.join(root,'play/beat-exe.html'),path.join(game,'index.html')]){
    let html=fs.readFileSync(file,'utf8');
    html=html.replace(/(src|href)="(src\/[^"?]+)(?:\?[^" ]*)?"/g,(_,attr,asset)=>`${attr}="${asset}?v=${hash(fs.readFileSync(path.join(game,asset)))}"`);
    html=html.replace('preload="auto" class="hidden"','preload="none" class="hidden"');
    fs.writeFileSync(file,html);
  }
  console.log('Updated BEAT web resource hashes, mobile video configuration and compact Boss image.');
})().catch(error=>{console.error(error);process.exitCode=1;});
