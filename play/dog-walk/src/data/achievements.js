export const ACHIEVEMENTS = [
  {id:'first',icon:'↟',name:'第一次散步',description:'完成第一局散步。',test:(s)=>s.totalWalks>=1},
  {id:'regular',icon:'☀',name:'公园常客',description:'累计完成 5 次散步。',test:s=>s.totalWalks>=5},
  {id:'distance',icon:'↝',name:'慢慢走，走很远',description:'累计散步 1000 米。',test:s=>s.totalDistance>=1000},
  {id:'frisbee',icon:'◎',name:'飞盘大师',description:'成功接中 10 次飞盘。',test:s=>s.frisbeeCatches>=10},
  {id:'firstCatch',icon:'◉',name:'漂亮的一接',description:'第一次成功接住飞盘。',test:s=>s.frisbeeCatches>=1},
  {id:'patience',icon:'♡',name:'耐心的主人',description:'一局里完成 5 次互动。',test:(s,g)=>g?.session.interactions>=5},
  {id:'friend',icon:'♥',name:'狗狗最好的朋友',description:'让信任达到 100。',test:(s,g)=>s.dogTrust>=100||g?.dog.stats.trust>=100},
  {id:'perfect',icon:'✧',name:'完美散步',description:'一局里五项属性都达到 80。',test:(s,g)=>g&&Object.values(g.dog.stats).every(v=>v>=80)},
  {id:'bone',icon:'⌕',name:'寻宝搭档',description:'找到 3 根埋藏的骨头。',test:s=>s.bonesFound>=3},
  {id:'commands',icon:'✓',name:'默契满分',description:'完成 5 轮听指令小游戏。',test:s=>s.commandsPassed>=5},
  {id:'explorer',icon:'⚑',name:'公园探险家',description:'一局里走访全部 4 个地点。',test:(s,g)=>g?.session.visits.size>=4},
  {id:'social',icon:'∞',name:'交个新朋友',description:'认识 3 次公园里的狗狗。',test:s=>s.dogsMet>=3},
  {id:'safe',icon:'♧',name:'安全第一',description:'阻止 3 次乱吃路边食物。',test:s=>s.foodsAvoided>=3}
];
