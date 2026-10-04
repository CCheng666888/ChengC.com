(function(root){
  'use strict';
  const WINDOWS=[.045,.095,.15];
  const DIFFICULTIES=['EASY','NORMAL','HARD','INSANE'];
  function judgement(error){let v=Math.abs(error);return v<=WINDOWS[0]?'PERFECT':v<=WINDOWS[1]?'GREAT':v<=WINDOWS[2]?'GOOD':'MISS'}
  class Session{
    constructor(chart,onJudge=()=>{},difficulty='NORMAL'){
      this.notes=chart.map((n,i)=>({...n,id:i,state:0,startGrade:null}));this.onJudge=onJudge;
      this.total=this.notes.reduce((s,n)=>s+(n.type==='tap'?1:2),0);this.counts={PERFECT:0,GREAT:0,GOOD:0,MISS:0};this.counted=0;this.points=0;this.combo=0;this.maxCombo=0;this.health=100;this.failed=false;this.difficulty=difficulty;this.errors=[];
    }
    award(grade,n,tail=false,error=null){
      this.counts[grade]++;this.counted++;this.points+=({PERFECT:1,GREAT:.8,GOOD:.45,MISS:0})[grade];
      if(grade==='MISS'){this.combo=0;this.health-=this.difficulty==='EASY'?3:5;}else{this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);this.health=Math.min(100,this.health+.65);}
      if(error!==null&&grade!=='MISS'&&!tail)this.errors.push(error);
      if(this.health<=0){this.health=0;this.failed=true;}
      this.onJudge({grade,n,tail,error,combo:this.combo});
    }
    press(lane,time){
      if(this.failed)return false;
      let slide=this.notes.filter(n=>n.state===1&&n.type==='slide'&&n.target===lane&&Math.abs(time-n.t-n.duration)<=.15).sort((a,b)=>Math.abs(time-a.t-a.duration)-Math.abs(time-b.t-b.duration))[0];
      if(slide){this.award(judgement(time-slide.t-slide.duration),slide,true);slide.state=2;return true;}
      let note=this.notes.filter(n=>n.state===0&&n.lane===lane&&Math.abs(time-n.t)<=.15).sort((a,b)=>Math.abs(time-a.t)-Math.abs(time-b.t))[0];
      if(!note)return false;
      note.startGrade=judgement(time-note.t);this.award(note.startGrade,note,false,time-note.t);note.state=note.type==='tap'?2:1;return true;
    }
    release(lane,time){
      for(const n of this.notes){if(n.state===1&&n.type==='hold'&&n.lane===lane){let remaining=n.t+n.duration-time;this.award(remaining<=.08?judgement(Math.max(0,remaining)):'MISS',n,true);n.state=2;}}
    }
    update(time,held,assist=false){
      for(const n of this.notes){
        if(assist&&n.state===0&&time>=n.t){this.award('PERFECT',n);n.state=n.type==='tap'?2:1;}
        if(n.state===0&&time>n.t+.15){this.award('MISS',n);if(n.type!=='tap')this.award('MISS',n,true);n.state=2;}
        if(n.state===1&&time>=n.t+n.duration){
          if(n.type==='hold'&&(assist||held.has(n.lane))){this.award('PERFECT',n,true);n.state=2;}
          else if(assist){this.award('PERFECT',n,true);n.state=2;}
          else if(time>n.t+n.duration+.15){this.award('MISS',n,true);n.state=2;}
        }
      }
    }
    finish(){for(const n of this.notes){if(n.state===0){this.award('MISS',n);if(n.type!=='tap')this.award('MISS',n,true);}else if(n.state===1)this.award('MISS',n,true);n.state=2;}return this.result()}
    get score(){return this.total?Math.round(this.points/this.total*1000000):0}
    get accuracy(){return this.counted?this.points/this.counted*100:100}
    result(){let a=this.accuracy;return {score:this.score,accuracy:a,maxCombo:this.maxCombo,total:this.total,counts:{...this.counts},fullCombo:this.counts.MISS===0,failed:this.failed,grade:this.failed?'F':a>=99.9?'SS':a>=98?'S':a>=90?'A':a>=80?'B':a>=65?'C':'D',offset:this.errors.length?this.errors.reduce((s,n)=>s+n,0)/this.errors.length*1000:0}}
  }
  const defaults=()=>({version:1,updatedAt:0,plays:0,clears:0,hiddenUnlocked:false,hiddenCleared:false,records:{},favorites:[],achievements:[],settings:{volume:.7,speed:1,offset:0,reduceMotion:false,assist:false,background:'orbit'}});
  function validateSave(input){
    if(!input||typeof input!=='object'||input.version!==1)throw new Error('不支持的存档版本');
    const d=defaults(),num=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b;
    for(const k of ['plays','clears']){if(!num(input[k],0,1e7))throw new Error('存档数据不完整');d[k]=Math.floor(input[k]);}
    d.updatedAt=num(input.updatedAt,0,1e16)?input.updatedAt:0;d.hiddenUnlocked=input.hiddenUnlocked===true;d.hiddenCleared=input.hiddenCleared===true;
    d.favorites=Array.isArray(input.favorites)?input.favorites.filter(s=>typeof s==='string'&&/^[a-z0-9_-]{1,64}$/.test(s)).slice(0,100):[];
    d.achievements=Array.isArray(input.achievements)?input.achievements.filter(s=>typeof s==='string'&&s.length<64).slice(0,100):[];
    if(input.records&&typeof input.records==='object')for(const [key,r] of Object.entries(input.records).slice(0,400)){
      if(!/^[a-z0-9_-]+:(EASY|NORMAL|HARD|INSANE)$/.test(key)||!r||!num(r.score,0,1000000)||!num(r.accuracy,0,100)||!num(r.maxCombo,0,100000))continue;
      d.records[key]={score:Math.round(r.score),accuracy:r.accuracy,maxCombo:Math.floor(r.maxCombo),grade:['SS','S','A','B','C','D','F'].includes(r.grade)?r.grade:'D',fullCombo:r.fullCombo===true,cleared:r.cleared===true,plays:num(r.plays,0,1e7)?Math.floor(r.plays):1};
    }
    const s=input.settings||{};
    for(const [k,min,max] of [['volume',0,1],['speed',.65,1.8],['offset',-150,150]])if(num(s[k],min,max))d.settings[k]=s[k];
    d.settings.reduceMotion=s.reduceMotion===true;d.settings.assist=s.assist===true;d.settings.background=['orbit','grid','aurora'].includes(s.background)?s.background:'orbit';return d;
  }
  const api={Session,judgement,DIFFICULTIES,defaults,validateSave};root.BeatEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
