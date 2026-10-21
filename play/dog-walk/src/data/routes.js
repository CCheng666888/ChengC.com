// Route IDs are permanent save identifiers. Add new routes after existing entries.
export const ROUTES = [
  {id:'maple',name:'公园初识',place:'MAPLE PARK',number:'01',theme:'maple',duration:180,color:'#94ad77',subtitle:'从熟悉的一小段路开始。',brief:'自由探索公园，结束一次散步后，下一段旅程就会开放。',spawn:{x:790,y:810},home:{x:810,y:880},stops:[],game:null},
  {id:'river',name:'河畔慢行',place:'WILLOW RIVER',number:'02',theme:'river',duration:300,color:'#83ada5',subtitle:'把脚步，交给水和风。',brief:'沿河安静观鸭，牵好小狗从木桥过河；成功接住一次飞盘，再一起回到入口。',spawn:{x:500,y:810},home:{x:500,y:875},game:'frisbee',gameLabel:'成功接住一次飞盘',stops:[
    {x:565,y:400,name:'芦苇边观鸭',hint:'停在浅滩边，等小狗安静下来。',kind:'wait',seconds:6},
    {x:800,y:560,name:'木桥上等一等',hint:'走到木桥中央，等小狗跟上。',kind:'wait',seconds:4}
  ]},
  {id:'orchard',name:'果园寻踪',place:'APPLE ORCHARD',number:'03',theme:'orchard',duration:300,color:'#c6a06e',subtitle:'跟着鼻子，找到秋天。',brief:'按气味提示依次找到三片遗落的丝带，完成一次找骨头，再带着线索回到入口。',spawn:{x:790,y:815},home:{x:800,y:885},game:'bone',gameLabel:'成功找到一根骨头',stops:[
    {x:430,y:665,name:'第一片丝带',hint:'老苹果树的南面，有一点熟悉的气味。',kind:'scent',seconds:1.5},
    {x:725,y:345,name:'第二片丝带',hint:'顺着石子路，往北边的树行找找。',kind:'scent',seconds:1.5},
    {x:1175,y:520,name:'最后一片丝带',hint:'气味往东边的果筐旁延伸。',kind:'scent',seconds:1.5}
  ]},
  {id:'dusk',name:'暮色归途',place:'LANTERN GARDEN',number:'04',theme:'dusk',duration:300,color:'#a08aa8',subtitle:'把回家的路，一盏盏点亮。',brief:'依次点亮三盏路灯，成功完成听指令；照顾好小狗的体力，最后一起走回园门。',spawn:{x:790,y:820},home:{x:800,y:885},game:'commands',gameLabel:'成功完成一轮听指令',stops:[
    {x:445,y:685,name:'花径路灯',hint:'绕过西边花坛，点亮第一盏灯。',kind:'lamp',seconds:2},
    {x:800,y:345,name:'广场路灯',hint:'沿着中央小径，走向北边广场。',kind:'lamp',seconds:2},
    {x:1160,y:650,name:'归途路灯',hint:'最后一盏灯，在东侧的回家路上。',kind:'lamp',seconds:2}
  ]}
];
export const routeById=id=>ROUTES.find(route=>route.id===id)||ROUTES[0];
export const routeUnlocked=(save,id)=>{const index=ROUTES.findIndex(route=>route.id===id);return index===0||(index>0&&save.routes.cleared.includes(ROUTES[index-1].id));};
export function cleanRouteProgress(raw,totalWalks=0) {
  const cleared=[],ids=Array.isArray(raw?.cleared)?raw.cleared:[];
  for(const route of ROUTES){if(ids.includes(route.id)||(route.id==='maple'&&totalWalks>0))cleared.push(route.id);else break;}
  const best={},attempts={};
  for(const route of ROUTES){best[route.id]=Math.max(0,Math.min(1000,Number(raw?.best?.[route.id])||0));attempts[route.id]=Math.max(0,Math.min(1e6,Math.floor(Number(raw?.attempts?.[route.id])||0)));}
  return {cleared,best,attempts};
}
