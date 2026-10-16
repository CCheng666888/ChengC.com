const VERSION = 3;
const SAVE_KEY = 'chencc.beacon.dispatch.v3';
const NUMBER_WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function chineseNumber(n, digits='零一二三四五六七八九', ten='十') {
  if(n<10)return digits[n];
  return (n<20?'':digits[Math.floor(n/10)])+ten+(n%10?digits[n%10]:'');
}
function englishNumber(n) { return n<20?NUMBER_WORDS[n]:TENS[Math.floor(n/10)]+(n%10?' '+NUMBER_WORDS[n%10]:''); }
function matchAnswer(input, expected) {
  if(typeof input!=='string'||input.length>64)return false;
  const s=input.normalize('NFKC').trim().toLowerCase();
  if(!s)return false;
  // Whitespace may separate digits. No other characters are discarded.
  if(/^\d(?:\s*\d)*$/u.test(s))return s.replace(/\s/gu,'')===String(expected);
  const chinese=s.replace(/\s/gu,'');
  const aliases=new Set();
  for(const digits of ['零一二三四五六七八九','零壹贰叁肆伍陆柒捌玖','零壹貳參肆伍陸柒捌玖']) {
    const ten=digits[1]==='一'?'十':'拾';
    aliases.add(chineseNumber(expected,digits,ten));
    // Financial numerals conventionally retain the leading one in 10–19.
    if(expected>=10&&expected<20)aliases.add(digits[1]+ten+(expected%10?digits[expected%10]:''));
    aliases.add(String(expected).split('').map(n=>digits[Number(n)]).join(''));
  }
  if(aliases.has(chinese))return true;
  // A hyphen or whitespace is a word boundary, never an arbitrary substring.
  if(!/^[a-z]+(?:\s+|\s*[-‐‑–—]\s*)?[a-z]*$/u.test(s))return false;
  return s.replace(/\s*[-‐‑–—]\s*/gu,' ').replace(/\s+/gu,' ')===englishNumber(expected);
}
function newRun() {
  const id=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
  return {v:VERSION,id,started:false,responses:Array(7).fill(null),trail:{},where:'intro',stamp:Date.now()};
}
function validState(value) {
  return value&&value.v===VERSION&&typeof value.id==='string'&&typeof value.started==='boolean'&&Array.isArray(value.responses)&&value.responses.length===7&&value.responses.every(r=>r===null||(typeof r.text==='string'&&r.text.length<=64&&typeof r.nonce==='string'))&&value.trail&&typeof value.trail==='object'&&!Array.isArray(value.trail)&&typeof value.stamp==='number'&&typeof value.where==='string';
}
function isCorrect(response,index) { return !!response&&matchAnswer(response.text,STORY[index].answer); }
function endingFor(state) {
  if(state.responses.some((r,i)=>r&&!isCorrect(r,i)))return 'bad';
  const complete=state.started&&STORY.every((q,i)=>{
    const r=state.responses[i];
    return isCorrect(r,i)&&state.trail['r'+q.id]===state.id+':'+r.nonce;
  });
  return complete?'true':'echo';
}
