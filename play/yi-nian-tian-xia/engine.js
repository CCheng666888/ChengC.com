globalThis.YinianEngine = (() => {
  'use strict';
  const C=globalThis.YinianContent, SCHEMA=2, KEY='yinian-tianxia-save-v1'; // Never put the game version in this key.
  const clone=x=>JSON.parse(JSON.stringify(x));
  const fresh=()=>({version:SCHEMA,gameVersion:C.VERSION,revision:0,level:0,unlocked:0,completed:[],tags:[],relations:{},stats:{王权:18,情报:0,风险:0,朝臣支持:35,相国影响:50},history:[],selected:[],attempt:null,resumeScreen:'menu',savedAt:Date.now()});
  function attempt(state,l){return {level:l.id,round:0,flags:[],log:[],supplies:l.supplies,failures:0,lessons:[],coach:0,finished:false,startTags:[...state.tags]};}
  function migrate(v){
    if(!v||typeof v!=='object'||Array.isArray(v)||![1,SCHEMA].includes(v.version))throw Error('不支持或损坏的存档版本，原档未改写。');
    if(!Array.isArray(v.completed)||!Array.isArray(v.history)||!Number.isInteger(v.level)||v.level<0||v.level>=C.levels.length)throw Error('存档缺少必要进度，原档未改写。');
    const s={...fresh(),...clone(v),version:SCHEMA,gameVersion:C.VERSION};
    s.unlocked=Math.max(s.level,Math.min(C.levels.length-1,Number(s.unlocked)||0));
    s.tags=Array.isArray(s.tags)?s.tags.filter(x=>typeof x==='string'):[];
    s.relations={...s.relations};s.stats={...fresh().stats,...s.stats};
    s.selected=Array.isArray(s.selected)?s.selected.filter(id=>C.cards[id]):[];
    if(v.version===1){s.attempt=attempt(s,C.levels[s.level]);s.selected=[];s.resumeScreen='game';s.migratedFrom=1;}
    if(s.attempt){
      const a=s.attempt,l=C.levels[s.level];
      if(a.level!==l.id||!Number.isInteger(a.round)||a.round<0||a.round>=l.rounds.length||!Array.isArray(a.flags)||!Array.isArray(a.log)||!Array.isArray(a.lessons))throw Error('回合存档不完整，原档未改写。');
      a.supplies=Math.max(0,Math.min(l.supplies,Number(a.supplies)||0));a.coach=Math.max(0,Number(a.coach)||0);a.failures=Math.max(0,Number(a.failures)||0);
      s.selected=s.selected.filter(id=>l.rounds[a.round].cards.includes(id));
      if(cost(s.selected)>budget(s)){s.selected=[];}
    }
    return s;
  }
  function start(s,index){if(!Number.isInteger(index)||index<0||index>s.unlocked||index>=C.levels.length)return false;s.level=index;s.selected=[];s.attempt=attempt(s,C.levels[index]);s.resumeScreen='game';return true;}
  const cost=ids=>ids.reduce((n,id)=>n+(C.cards[id]?.cost||0),0);
  const budget=s=>C.levels[s.level].ap+(s.selected.includes('time')&&s.attempt?.supplies>0?1:0);
  function select(s,id){
    const a=s.attempt,l=C.levels[s.level],r=l.rounds[a?.round];
    if(!a||a.finished||!r?.cards.includes(id))return false;
    const ids=s.selected.includes(id)?s.selected.filter(x=>x!==id):[...s.selected,id];
    if(ids.includes('time')&&a.supplies<=0)return false;
    if(cost(ids)>l.ap+(ids.includes('time')?1:0))return false;
    s.selected=ids;return true;
  }
  function goal(s){const a=s.attempt,l=C.levels[s.level];return !!a&&a.round===l.rounds.length-1&&l.required.every(f=>a.flags.includes(f))&&(l.id!=='tutorial'||Object.keys(C.types).every(t=>a.lessons.includes(t)));}
  function preview(s){const a=s.attempt,l=C.levels[s.level],r=l.rounds[a.round];return r.routes.find(route=>route.all.every(id=>s.selected.includes(id)))||null;}
  function delta(s,key,value){if(key in s.stats)s.stats[key]+=value;else s.relations[key]=(s.relations[key]||0)+value;}
  function execute(s){
    const a=s.attempt,l=C.levels[s.level];
    if(!a||a.finished||!s.selected.length||cost(s.selected)>budget(s))return null;
    const ids=[...s.selected],r=l.rounds[a.round],route=preview(s);
    if(ids.includes('time'))a.supplies--;
    const entry={round:a.round+1,title:r.title,cards:ids,ok:!!route,text:route?`${route.name}：${r.objective} 已完成。`:`方案未完成小目标：${r.hint}`,at:Date.now()};
    a.log.push(entry);s.selected=[];
    if(!route){a.failures++;delta(s,'风险',1);s.resumeScreen='game';return {...entry,complete:false};}
    route.gain.forEach(f=>{if(!a.flags.includes(f))a.flags.push(f);});
    ids.forEach(id=>{const t=C.cards[id].type;if(!a.lessons.includes(t))a.lessons.push(t);});
    if(route.tag&&!s.tags.includes(route.tag))s.tags.push(route.tag);
    route.deltas.forEach(([k,v])=>delta(s,k,v));
    if(l.id==='handan'&&a.round===1){delta(s,'风险',a.startTags?.includes('善于观察')?-1:1);}
    if(l.id==='youngking'&&a.round===2&&a.startTags?.includes('重视关系'))delta(s,'朝臣支持',2);
    if(goal(s)){
      a.finished=true;
      if(!s.completed.includes(l.id))s.completed.push(l.id);
      s.unlocked=Math.max(s.unlocked,Math.min(C.levels.length-1,s.level+1));
      const tag=s.tags.at(-1)||'稳健用权',result={grade:a.failures?'完成目标 · 经历补救':'完成目标',text:'所有最终目标均已核验。不同执行路径留下的关系、风险与标签已保存。',tag,deltas:[],epilogue:l.epilogue};
      s.history.push({level:l.id,title:l.title,selected:ids,grade:result.grade,tag,result,rounds:clone(a.log),at:Date.now()});
      s.resumeScreen='result';return {...entry,complete:true};
    }
    if(a.round<l.rounds.length-1)a.round++;
    s.resumeScreen='game';return {...entry,complete:false};
  }
  return {SCHEMA,KEY,clone,fresh,migrate,attempt,start,cost,budget,select,goal,preview,execute};
})();
