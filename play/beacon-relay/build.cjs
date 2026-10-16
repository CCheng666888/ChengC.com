const fs=require('node:fs'),path=require('node:path');
const root=__dirname;
const read=name=>fs.readFileSync(path.join(root,'src',name),'utf8');
const image='data:image/svg+xml;base64,'+Buffer.from(read('ending.svg')).toString('base64');
const code='const ENDING_IMAGE='+JSON.stringify(image)+';\n'+['story.js','core.js','app.js'].map(read).join('\n');
const style=read('style.css');
const routes=['intro',...Array.from({length:7},(_,i)=>['chat-'+(i+1),'receipt-'+(i+1)+'-good','receipt-'+(i+1)+'-bad']).flat(),'ending'];
function html(route,mode){return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f7f6f1"><meta name="description" content="一封必须在天亮前抵达的军报。根据子夜军令，在七座烽燧间解读来信。"><meta name="robots" content="noindex"><title>烽火来信 · 子夜军令</title><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Ctext y=%2726%27 font-size=%2728%27%3E🔥%3C/text%3E%3C/svg%3E"><style>'+style+'</style></head><body data-route="'+route+'" data-mode="'+mode+'"><div id="app"></div><noscript><p>请启用 JavaScript 后打开《烽火来信》。</p></noscript><script>'+code.replace(/<\/script/gi,'<\\/script')+'</script></body></html>\n';}
for(const route of routes)fs.writeFileSync(path.join(root,(route==='intro'?'index':route)+'.html'),html(route,'multi'));
fs.writeFileSync(path.join(root,'烽火来信-单文件试玩版.html'),html('intro','single'));
console.log('Built '+routes.length+' standalone pages + offline single HTML.');
