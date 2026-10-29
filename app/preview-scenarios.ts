import type { Workspace, Task } from './Operations';
import type { Prospect, SendStatus } from './operations-state';
import { emptyMonitoring } from './operations-state.ts';
import { defaultRules } from './workflow-config.ts';
import { commentTarget } from './comment-outreach.ts';
import type { InboxMessage } from './account-inbox';

// Fictional, linked records for reviewing the prototype; never real platform activity.
export const scenarioCode = 'preview-business-20261028';
const briefs = [
  { topic:'商旅品牌',name:'星途商旅',city:'杭州',title:'小团队做小红书，先把内容方向想清楚',author:'林禾｜品牌运营笔记',post:'最近和几位做本地服务的朋友聊账号运营，大家最纠结的不是发多少篇，而是内容该对谁说。建议先选一个具体场景，把客户常问的问题整理出来，再决定自己做还是找团队协作。你们现在最卡在哪一步？',comment:'我们做企业商旅，之前一直发酒店优惠，咨询不多。想找人一起梳理内容，服务怎么收费？',reply:'企业商旅和个人旅行的关注点确实不太一样。你们现在主要服务出差采购，还是会议团建？可以先从这两个场景里选一个，把客户常问的问题梳理出来。'},
  { topic:'门店获客',name:'初见皮肤管理',city:'南宁',title:'开店第二年，内容有人看却没人问怎么办',author:'阿宁的门店日记',post:'店里的小红书更了两个月，几篇护理知识的收藏不错，但咨询一直不多。复盘时发现大部分内容都在讲方法，几乎没说清门店适合谁、第一次到店是什么流程。准备先改这两块，再看咨询有没有变化。',comment:'我们也是这个情况，收藏很多却没有预约。只有两个人做店，有没有适合小团队的做法？',reply:'两个人做店可以先少做一点，把顾客进店前最常问的三个问题讲清楚。你们目前主要发护理知识，还是也有到店过程的内容？'},
  { topic:'新品种草',name:'山野茶事',city:'南京',title:'新品找达人，不妨先试一小组',author:'许珂｜消费品牌观察',post:'新品上市想找达人合作，先别急着看粉丝量。产品适合什么人、什么场景用，比账号体量更重要。先用一小组不同风格的内容看真实反馈，确认方向后再扩大。',comment:'下个月上冷泡茶新品，预算不算多，想找一些办公室生活类达人。怎么判断他们的受众合不合适？',reply:'冷泡茶放在办公室场景里比较好理解。可以先看达人最近几篇内容的评论，大家在问什么、有没有真实使用讨论，比只看粉丝量更有参考价值。'},
  { topic:'内容运营',name:'拾光家居',city:'苏州',title:'运营是招一个人，还是找外部团队',author:'苏苏的品牌手记',post:'自己招运营好沟通，但选题、拍摄、剪辑和投放不一定一个人都能做好。外包省下部分执行时间，也需要内部有人把产品和客户说清楚。先列清每周要完成的工作，再比较两种方案。',comment:'我们家具店想开始做小红书，正在招人。拍摄能自己做，选题和账号方向有点没底，能只找人做这部分吗？',reply:'可以先把拍摄和策划拆开看。既然店里能拍，先把目标客群、选题和更新节奏定下来会更实际。你们主要是成品家具，还是全屋定制？'},
  { topic:'本地生活',name:'橘屿咖啡',city:'宁波',title:'本地门店的内容，别只剩优惠',author:'周末探店研究室',post:'顾客收藏一家店，有时是因为窗边的位置、适合聊天的氛围，或者某一款产品。价格优惠能带来关注，但也可以试着多讲一点具体体验，让人知道为什么值得专程来。',comment:'店里做了几轮优惠，有浏览但到店不稳定。现在更想把周边办公人群做起来，内容方向应该怎么调整？',reply:'周边办公人群的需求可能更集中在工作日。可以先看看午休、下午茶和下班后三个时段，哪个最符合店里的实际客流，再围绕那个场景做内容。'},
  { topic:'旅游服务',name:'远岸旅行',city:'成都',title:'旅游账号的咨询，到底从哪里来',author:'叶青｜旅行内容记录',post:'同样是一条行程，有人只收藏，有人会问时间和价格。最近把路线拆成适合人群、体力要求和预算三部分后，问题具体了很多。内容不一定越全越好，先回答用户最在意的一件事。',comment:'我们做小团定制，咨询基本都是问价，后面就没动静了。想了解一下你说的内容梳理，有合作方式吗？',reply:'问价后没继续聊，可以先看看行程里有没有说明适合谁、包含什么。你们现在客户主要是家庭出游，还是年轻人结伴？不同人关心的细节差别挺大。'},
  { topic:'宠物服务',name:'小岛宠物生活馆',city:'上海',title:'新店起号，先记录真实的日常',author:'小满的运营观察',post:'新店不一定需要一开始就做很复杂的策划。认真记录服务过程、回答顾客的问题、把适合和不适合的情况讲清楚，也能慢慢建立信任。前提是内容和实际服务一致。',comment:'我们刚开宠物洗护店，自己拍了几篇日常但比较零散。想先了解怎么规划账号，暂时还没有定预算。',reply:'可以先把日常按顾客的问题归类，比如第一次到店、洗护过程和接回后的注意事项。你们目前最常被问到的是哪一类？从这类问题开始会比较好落地。'},
];
const names=[['星途商旅','程野｜企业差旅','映川会务'],['初见皮肤管理','知予护肤工作室','安然美学'],['山野茶事','山溪饮品','慢慢茶生活'],['拾光家居','木里定制','栖居设计'],['橘屿咖啡','小巷烘焙','岸边餐厅'],['远岸旅行','见山小团','行云假日'],['小岛宠物生活馆','尾巴洗护','橙子宠物店']];
export const scenarioLeads: Prospect[] = briefs.flatMap((b,i)=>Array.from({length:3},(_,j)=>({
  id:50000+i*3+j,name:names[i][j],handle:`preview-person-${i}-${j}`,grade:j===0?'A':j===1?'B':'C',score:90-j*16,intent:`${b.topic} / 内容合作`,context:j===0?b.comment:j===1?`我们也在做${b.topic}，想了解这套方法适不适合现阶段。`: `先收藏了，我们还在评估自己做还是找团队，想多了解一点。`,evidence:j===0?'明确描述业务现状并询问合作方式':j===1?'描述业务方向并主动了解方案':'正在评估方案，合作时间和范围尚未明确',location:b.city,status:'',source:'小红书评论',accountId:`preview-person-${i}-${j}`,message:j===0?b.reply:j===1?'可以先说说目前主要做哪些内容，以及最想改善哪一步。把现状讲清楚后，会更容易判断适不适合。':'可以先了解，不用急着决定。你们目前最缺的是内容方向，还是日常执行的人手？',sourceTaskCode:scenarioCode,commentId:`preview-comment-${i}-${j}`,businessScene:i===2?'达人投放':i===3?'招聘运营':'服务合作',sourcePost:{id:`preview-post-${i}`,authorId:`preview-author-${i}`,authorName:b.author,title:b.title,content:b.post}
} as Prospect)));
const scenarios: {name:string;results:SendStatus[];paused?:boolean}[]=[
  {name:'商旅品牌 · 合作咨询',results:['待执行','待执行','待执行']},
  {name:'门店获客 · 预约转化',results:['发送成功','执行中','待执行']},
  {name:'新品种草 · 达人合作',results:['发送成功','待执行','待执行'],paused:true},
  {name:'内容运营 · 团队协作',results:['发送成功','发送成功','发送成功']},
  {name:'本地生活 · 周边客群',results:['发送成功','发送失败','发送失败']},
  {name:'旅游服务 · 咨询承接',results:['发送成功','结果待核实','待执行']},
  {name:'宠物服务 · 内容规划',results:['已取消','已取消','已取消']},
];
export function withPreviewScenarios(w:Workspace,leads:Prospect[]):Workspace {
  if((w.presentationVersion===1 && w.tasks.some(t=>t.id===31000)) || !leads.some(l=>l.sourceTaskCode===scenarioCode))return w;
  const rules=defaultRules();
  const newTasks:Task[]=scenarios.map((s,i)=>{
    const people=leads.filter(l=>l.id>=50000+i*3&&l.id<50003+i*3);
    return {id:31000+i,name:s.name,channel:'comment',sourceTaskName:'品牌运营 · 十月意向咨询',sourceTaskCode:scenarioCode,createdAt:`2026/10/28 ${String(14-i).padStart(2,'0')}:20`,startedAt:i?`2026/10/28 ${String(14-i).padStart(2,'0')}:25`:undefined,senderAccountId:i===3?'xhs-sub':'xhs-main',senderAccountName:i===3?'小红书顾问号':'小红书品牌号',quotaModel:'G',ids:people.map(l=>l.id),texts:Object.fromEntries(people.map(l=>[l.id,l.message])),targets:Object.fromEntries(people.map(l=>[l.id,commentTarget(l)!])),results:Object.fromEntries(people.map((l,j)=>[l.id,s.results[j]])),replies:[],followups:{},followResults:{},monitor:emptyMonitoring(),paused:!!s.paused,todos:{},notes:{},events:['任务已创建'],copyRules:rules};
  });
  const makeMessage=(id:number,task:Task,personIndex:number,text:string,replyStatus?:SendStatus,unlinked=false):InboxMessage=>{
    const lead=leads.find(l=>l.id===task.ids[personIndex])!;
    return {id:`preview-inbox-${id}`,accountId:task.senderAccountId!,userName:lead.name,userId:lead.handle,text,receivedAt:`2026/10/28 15:${String(50-id*3).padStart(2,'0')}`,association:unlinked?undefined:{taskId:task.id,leadId:lead.id},replyStatus,replyText:replyStatus?'可以，先把你们现在的账号内容和具体想解决的问题整理一下，我们再一起看哪些部分适合调整。':undefined,quotaModel:replyStatus?'G':undefined};
  };
  const messages=[
    makeMessage(1,newTasks[1],0,'看到你在评论区说先梳理顾客的问题。我们现在主要发护理知识，能帮忙看看怎么调整吗？',undefined,true),
    makeMessage(2,newTasks[2],0,'关于刚才冷泡茶找达人的问题，我们想先试五到十位，可以具体聊一下合作范围吗？'),
    makeMessage(3,newTasks[4],0,'工作日午休客流确实比较多，想先从这个方向做，你说的内容规划大概包含哪些？','待执行'),
    makeMessage(4,newTasks[5],0,'我们主要做家庭小团。刚刚看了你的评论，想了解怎么把路线内容梳理得更清楚。','发送失败'),
    makeMessage(5,newTasks[4],0,'我们整理了最近几篇笔记，你方便的时候可以看一下吗？','结果待核实'),
    makeMessage(6,newTasks[3],0,'我们主要做全屋定制，店里有设计师能出镜，选题方面想找人一起梳理。','发送成功'),
    {id:'preview-inbox-unlinked',accountId:'xhs-main',userName:'林间小筑',text:'你好，请问这周方便沟通一下吗？',receivedAt:'2026/10/28 15:10'},
  ];
  const reserved=newTasks.flatMap(t=>Object.values(t.results)).filter(s=>['待执行','执行中','结果待核实'].includes(s)).length+messages.filter(m=>m.replyStatus&&['待执行','执行中','结果待核实'].includes(m.replyStatus)).length;
  const used=newTasks.flatMap(t=>Object.values(t.results)).filter(s=>s==='发送成功').length+messages.filter(m=>m.replyStatus==='发送成功').length;
  return {...w,presentationVersion:1,tasks:[...newTasks,...w.tasks],inboxMessages:[...messages,...w.inboxMessages],quota:{...w.quota,G:{...w.quota.G,total:w.quota.G.total+reserved+used,reserved:w.quota.G.reserved+reserved,used:w.quota.G.used+used}},collectionTasks:[{id:30000,name:'品牌运营 · 十月意向咨询',sourceTaskCode:scenarioCode,platform:'小红书',status:'解析完成',createdAt:'2026/10/28 08:30',rules,touchMode:'PRECISION',batchId:30000},...w.collectionTasks],batches:[{id:30000,name:'品牌运营 · 十月意向咨询',sourceTaskCode:scenarioCode,ids:scenarioLeads.map(l=>l.id),time:'2026/10/28 08:30',rules,touchMode:'PRECISION'},...w.batches],grades:{...Object.fromEntries(scenarioLeads.map(l=>[l.id,l.grade])),...w.grades}};
}
export function presentName(name:string) {
  return name.replace('评论触达演示 · G 类模型','品牌运营 · 评论咨询').replace('A 类模型 · 全量触达演示','品牌推广 · 十月内容触达').replace('主流程体验 · 从筛选到评论','品牌运营 · 新一期咨询').replace(/ · (?:评论演示|演示\d+|体验\d+|A模型演示)/g,'').replace(/（演示）/g,'').replace('新咨询用户','新咨询客户');
}
