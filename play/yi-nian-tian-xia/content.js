/* Historical setting is sourced; all tasks, dialogue and card mechanics are fictional. */
globalThis.YinianContent = (() => {
  const VERSION = '0.3.0';
  const types = {
    person: {name:'人物牌',glyph:'人',use:'借助一个人的能力或关系来执行事务。人物有立场，帮助不是无条件忠诚。',limit:'单独请人不等于办成事；要配合信息、命令或谋略。',example:'少年侍从 + 观察朝堂 → 核实朝臣的真实反应。'},
    authority: {name:'权柄牌',glyph:'令',use:'把决定变成正式要求、任命或王命。它代表你目前被承认的权力。',limit:'没有执行者、证据和回报，命令可能只停留在文书上。',example:'试行任免 + 廷臣 → 把已经核实的任命落实到地方。'},
    intel: {name:'情报牌',glyph:'察',use:'调查并核验隐藏条件，为后续行动提供依据。成功执行后线索保留到后续回合。',limit:'选中只是计划，执行调查才取得情报；情报本身不能完成任命或安全转移。',example:'观察环境 + 赵国伙伴 → 对照两份消息的时间。'},
    resource: {name:'资源牌',glyph:'资',use:'补充当前回合的执行能力。“有限时间”让本回合多 1 点行动点。',limit:'执行时才消耗库存；不能恢复整关资源，也不能独自达成目标。撤回可以返还未执行的预算。',example:'有限时间 + 王的身份 + 侍从 + 观察 → 原本超出 3 点预算的四点方案。'},
    strategy: {name:'谋略牌',glyph:'谋',use:'改变行动方式：示弱、核验、隐匿或借势。能与人物、情报、权柄形成连携。',limit:'有方法也需要依据和执行者；同一谋略不能包办每个回合。',example:'隐藏身份 + 观察环境 → 低调核验；借势 + 吕不韦 → 稳定但欠下政治债。'}
  };
  const cards = {
    attendant:['person','少年侍从',1,'近身见闻与传达能力；协助核验、传话或取得回报。'],
    observe:['intel','观察朝堂',1,'核验朝臣反应或环境线索，须配合人物或谋略。'],
    silence:['strategy','保持沉默',1,'等待对方表态，配合调查；不能单独保证事务完成。'],
    identity:['authority','王的身份',2,'提出正式要求；需要侍从或已核验的执行路径。'],
    zhaoFriend:['person','赵国少年伙伴',1,'提供当地消息、引路或传达；过度试探会影响关系。'],
    qinEnvoy:['person','秦国使者',2,'核对秦方接应与护送；公开借力会增加暴露风险。'],
    hide:['strategy','隐藏身份',1,'低调观察或保护已建立的藏身处；不能替代接应。'],
    probe:['strategy','试探',1,'核验消息与人物反应；适用于建立关系和检查回报。'],
    time:['resource','有限时间',0,'本回合行动点 +1；执行时消耗一份，本关库存不会随回合恢复。'],
    lv:['person','吕不韦',1,'协调相府、官署；可稳定解决问题，但会增加相国影响。'],
    courtier:['person','廷臣',1,'核账、执行任命与呈报回执；需要明确流程。'],
    relations:['intel','朝臣关系图',1,'核验候选人的隐性关系与执行阻力；配合廷臣或试探。'],
    royalOrder:['authority','王命',2,'发出命令；不能替代证据、执行或最终验收。'],
    appointment:['authority','试行任免',2,'先做小范围任命；需可靠候选依据与执行人员。'],
    borrow:['strategy','借势',1,'借相府影响协调流程；需要吕不韦参与并承担依赖。']
  };
  Object.entries(cards).forEach(([id,v]) => cards[id]={id,type:v[0],name:v[1],cost:v[2],text:v[3]});
  const route=(all,gain,name,tag='',deltas=[])=>({all,gain,name,tag,deltas});
  const round=(title,objective,hint,cards,routes,intel='')=>({title,objective,hint,cards,routes,intel});
  const levels = [
    {id:'tutorial',chapter:'教程 · 第一课',year:'前246年 · 朝会教学演练',title:'王的位置',ap:3,supplies:1,authority:18,art:'court',
      objective:'核实权力结构、准备表达方式、提出可执行要求，并取得真实回报。五类卡牌均需完成教学练习。',
      background:'十三岁的嬴政即位，王冠没有让官署立刻听命。本教程把一次虚构朝会拆成四个回合，让你练习五类政治资源，而不是随手出牌就算通关。',
      truth:'史实：秦王政年少即位，国事委于大臣。本关朝会、侍从、任务和对话均为教学虚构。',source:'《史记·秦始皇本纪》',sourceUrl:'https://zh.wikisource.org/wiki/史記/卷006',relations:[['吕不韦',65,'相邦，有自己的政治影响'],['宗室',42,'谨慎观望'],['朝臣',35,'尊位未必尊权']],
      required:['structure','preparation','request','receipt'],goals:{structure:'已核实朝堂权力结构',preparation:'已准备表达方式',request:'已提出可执行要求',receipt:'已取得并验证回报'},
      rounds:[
        round('先看清谁在办事','用人物能力配合调查，核实真正的传令路径。','侍从的说法需要验证。试试人物 + 情报，而不是只请人或只下令。',['attendant','observe','silence','identity'],[route(['attendant','observe'],['structure'],'近身调查','善于观察'),route(['attendant','silence'],['structure'],'旁听核验','重视关系')],'奏报虽然先向秦王呈报，执行文书仍需经过相府；说“谨遵王命”不等于已经执行。'),
        round('为发言争取余地','实践资源与谋略，获得足够时间并核验表达方式。','本轮必须实际使用有限时间与一种谋略。资源只补能力，不替你完成目标。',['time','silence','probe','attendant'],[route(['time','silence','probe'],['preparation'],'缓兵试探','重视情报'),route(['time','silence','attendant'],['preparation'],'先问后言','重视关系')]),
        round('把身份变成要求','使用权柄提出一个可传达、可检验的要求。','王的身份需要执行路径。可请侍从传达，也可沿刚才看清的流程缓行。',['identity','attendant','silence','observe'],[route(['identity','attendant'],['request'],'正式传令','稳健用权'),route(['identity','silence'],['request'],'循序要求','谨慎用权')]),
        round('证明事情真的发生了','核验朝臣回报，完成本次朝会的大目标。','所有前置工作保留到本轮。调查回报，或要求侍从当面呈报。',['observe','silence','identity','attendant'],[route(['observe','silence'],['receipt'],'证据验收','善于观察'),route(['identity','attendant'],['receipt'],'当面复核','重视关系')],'朝臣交来的是受理记录而非执行回执。经复核后才得到真正的传达回报。')],
      epilogue:'王冠给你提出问题的资格。人物、信息、资源、方法与执行回报，才让资格逐渐成为力量。'},
    {id:'handan',chapter:'第一章 · 邯郸归秦',year:'归秦前夕 · 前250年前后',title:'赵国少年',ap:4,supplies:2,authority:7,art:'handan',
      objective:'核实归秦消息、建立可信接应、保护母子藏身处、安排转移，并确认安全交接。',
      background:'子楚已先行归秦，你和母亲仍在邯郸。归秦消息传来，但旧日秦赵交兵留下的猜疑没有消失。你要分别核验消息、人心与路径；少年没有王命，只能借有限关系求生。',
      truth:'史实：《吕不韦列传》记子楚先逃归秦，母子藏匿后生还；子楚成为太子后，赵国送母子归秦。本关以归秦前夕为框架，伙伴、密信、路线与任务均属虚构，不把两三岁的嬴政写成独立主持脱逃的少年。',source:'《史记·吕不韦列传》',sourceUrl:'https://zh.wikisource.org/wiki/史記/卷085',relations:[['母亲',72,'共同求生'],['赵国伙伴',38,'需核验的当地关系'],['秦国使者',30,'秦方接应者']],
      required:['facts','contact','shelter','transfer','handover'],goals:{facts:'已核实消息时间',contact:'已建立可信接应',shelter:'已保护母子藏身处',transfer:'已安排转移',handover:'已确认安全交接'},
      rounds:[
        round('两份不同的消息','核对归秦消息的时间与来源。','情报需要交叉核验，消息越多不代表越可靠。',['zhaoFriend','qinEnvoy','observe','hide','probe','time'],[route(['observe','hide'],['facts'],'低调核验','善于观察'),route(['zhaoFriend','probe'],['facts'],'旧识对照','重视关系'),route(['qinEnvoy','observe'],['facts'],'秦方复核','倚重秦使')],'两份消息的日期不一致。较早的一份是试探，正式接应要等身份核验完成。'),
        round('谁愿意为你冒险','建立经过试探的接应关系。','单纯隐藏不能让人愿意帮忙；比较本地关系和秦方接应。',['zhaoFriend','qinEnvoy','probe','hide','silence','time'],[route(['zhaoFriend','probe'],['contact'],'结交旧识','重视关系',[['赵国伙伴',8]]),route(['qinEnvoy','silence'],['contact'],'谨慎接使','倚重秦使',[['秦国使者',6]])]),
        round('藏身处的风声','保护母子暂居地，避免提前暴露。','已经核实的情报可用，但本轮仍需安排具体保护。',['hide','observe','zhaoFriend','qinEnvoy','probe','time'],[route(['hide','observe'],['shelter'],'避开巡查','善于观察'),route(['zhaoFriend','hide'],['shelter'],'街巷掩护','重视关系'),route(['qinEnvoy','probe'],['shelter'],'另设接应','主动出击',[['风险',2]])]),
        round('离开邯郸的路径','安排一条与接应时间吻合的转移路径。','引路与隐匿可以结合，也可借秦使按核实的时间转移。',['zhaoFriend','hide','qinEnvoy','observe','probe','time'],[route(['zhaoFriend','hide'],['transfer'],'市井护送','重视关系'),route(['qinEnvoy','observe'],['transfer'],'按期接应','倚重秦使')]),
        round('安全不是一封回信','确认母子已经与可信接应者交接。','必须验证结果。仅发出消息、单纯隐藏或拿到传言都不算归秦。',['zhaoFriend','qinEnvoy','observe','probe','hide','time'],[route(['qinEnvoy','probe'],['handover'],'秦使验信','倚重秦使'),route(['zhaoFriend','observe'],['handover'],'旧识见证','重视关系')],'接应口信必须与先前核实的暗号和时间同时吻合，交接才算完成。')],epilogue:'史书给出了母子归秦的结果，没有记下这些选择。本关的交接过程是艺术加工，而你留下的信任与调查习惯会影响下一章。'},
    {id:'youngking',chapter:'第二章 · 少年秦王',year:'前246年',title:'秦王即位',ap:4,supplies:2,authority:24,art:'court',
      objective:'查清仓政积案、核验候选人、完成任命、确保地方执行，并拿到核账回执。',
      background:'你继位为秦王，朝堂却仍受旧有结构影响。河西一县仓吏任命拖延，账册与相府属官有关。一次王命不足以解决问题：你必须依次处理证据、人才、任命、执行与验收。',
      truth:'史实：秦王政年少即位，吕不韦为相邦并主持国政。河西仓吏案、候选人、廷臣关系与具体任命都是游戏虚构，不是史书中的真实案件。',source:'《史记·秦始皇本纪》《吕不韦列传》',sourceUrl:'https://zh.wikisource.org/wiki/史記/卷006',relations:[['吕不韦',62,'合作与制衡'],['宗室',46,'等待表态'],['廷臣',40,'服从流程']],required:['accounts','candidate','appointed','execution','audit'],goals:{accounts:'已查清账册与阻力',candidate:'已核验可用候选人',appointed:'已完成正式任命',execution:'已确认地方执行',audit:'已取得核账回执'},
      rounds:[
        round('账册背后的关系','核验账册和朝臣关系，找出拖延原因。','单独发王命只能催办，不能替代调查。可自行核验，也可请相邦协调查账。',['relations','courtier','lv','borrow','royalOrder','time'],[route(['relations','courtier'],['accounts'],'廷臣核账','重视情报'),route(['lv','borrow'],['accounts'],'相府查账','倚重相府',[['相国影响',3]])],'账册缺印不是唯一原因，旧任与相府属官的关系也在拖延交接。'),
        round('候选人不只看出身','核验候选人的能力与政治关联。','上一轮调查保留，但还需要选人的证据。',['relations','courtier','probe','lv','borrow','royalOrder','time'],[route(['relations','probe'],['candidate'],'关系与能力核验','重视情报'),route(['courtier','probe'],['candidate'],'官署实务核验','倚重廷臣'),route(['lv','borrow'],['candidate'],'相府举荐','倚重相府',[['相国影响',3]])],'候选人乙熟悉仓政，甲有相府姻亲关系。能力、关系与执行风险不是同一件事。'),
        round('让任命离开纸面','正式任命并指定负责执行的人。','有任命权也要有执行者。小范围试任、直接王命和相府协调均可选择。',['appointment','royalOrder','courtier','lv','borrow','time'],[route(['appointment','courtier'],['appointed'],'试任与执行','稳健用权'),route(['royalOrder','courtier'],['appointed'],'明确王命','强硬君主',[['朝臣支持',-2]]),route(['lv','borrow','appointment'],['appointed'],'借相府任命','倚重相府',[['相国影响',3]])]),
        round('复核、缺印与交接','处理执行拖延，确认新任实际到岗。','重复任命不能替代交接。廷臣核验，或由相府协调具体阻力。',['courtier','relations','royalOrder','lv','borrow','appointment','time'],[route(['courtier','relations'],['execution'],'逐项核实交接','重视情报'),route(['royalOrder','courtier'],['execution'],'督促限期执行','强硬君主',[['朝臣支持',-2]]),route(['lv','borrow'],['execution'],'相府疏通','倚重相府',[['相国影响',3]])]),
        round('最后一份回执','拿到并核验实际账册与任命回执。','任命已发不等于目标已达成。验收可以独立进行，也可以借相府完成。',['relations','courtier','probe','lv','borrow','royalOrder','time'],[route(['relations','courtier'],['audit'],'独立核账验收','重视情报'),route(['courtier','probe'],['audit'],'实务回执复核','倚重廷臣'),route(['lv','borrow','relations'],['audit'],'相府协助验收','倚重相府',[['相国影响',3]])],'真正的回执同时记录到任、印信与核账结果。只有口头承诺的奏报不足以证明政务完成。')],epilogue:'你解决的是一次虚构政务，不是整个秦国。独立用权、直接督促或依靠相府都能办成事，但会留下不同的关系与权力代价。'}
  ];
  return {VERSION,types,cards,levels};
})();
