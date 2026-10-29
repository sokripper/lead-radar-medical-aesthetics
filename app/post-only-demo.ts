import type {Prospect, SendStatus} from './operations-state';
import {emptyMonitoring} from './operations-state.ts';
import type {Workspace, Task} from './Operations';
import {defaultRules} from './workflow-config.ts';
import {postActions, commentTarget} from './comment-outreach.ts';
import {postOpeningCopy, contextualOpeningCopy} from './outreach-copy.ts';

export const postOnlyCode = 'preview-post-only-20261029';
const subjects = [
  ['小店第一轮内容预算怎么分配', '林间小店', '刚开始做品牌内容，拍摄和投放都要花钱。准备先把产品使用场景讲清楚，再用一小部分预算测试，想听听大家怎么安排。'],
  ['工作日咖啡店内容怎么拍', '岸边咖啡', '周末客流还不错，工作日比较安静。打算围绕附近上班族的午休和下午茶做内容，先试试两个时段。'],
  ['新品上市先找哪类达人', '山间茶铺', '冷泡茶新品准备上线，预算有限，打算先找办公室生活类账号试一组内容，再看实际反馈。'],
  ['门店账号先整理什么内容', '初晴家居', '店里能自己拍摄，但选题比较散。想先整理顾客来店前常问的问题，再决定每周发什么。'],
  ['旅游账号怎样讲清路线差别', '远山旅行', '我们的路线适合家庭小团，之前一直发风景，没有说清行程节奏。准备把带孩子和带长辈的关注点分开写。'],
  ['运营团队应该先补哪个岗位', '木禾品牌', '拍摄可以内部做，账号方向还没有确定。正在比较招策划和找外部团队协作两种方式。'],
];
const rawPost = (id:number,code:string,index:number):Prospect => {
  const [title,authorName,content]=subjects[index];
  const post={id:`standalone-post-${id}`,authorId:`standalone-author-${id}`,authorName,title,content};
  return {id,sourceTaskCode:code,recordKind:'post',name:authorName,handle:post.authorId,grade:'D',score:0,
    intent:title,context:content,evidence:'独立主帖记录，未采集到评论。',location:'未知',status:'',source:'小红书主帖',accountId:'',message:'',sourcePost:post};
};
const discussionPost=rawPost(70010,postOnlyCode,3);
const discussionComment:Prospect={...discussionPost,recordKind:'comment',name:'木色家居',handle:'preview-home-owner',
  grade:'B',commentId:'preview-home-comment',context:'我们店能自己拍，选题一直没方向。可以只找人帮忙做内容规划吗？',
  intent:'内容规划合作',businessScene:'服务合作',source:'小红书评论',evidence:'明确询问内容规划合作。'};
export const postOnlyDemoLeads:Prospect[] = [
  discussionComment,
  ...subjects.map((_,i)=>rawPost(70001+i,postOnlyCode,i)),
  rawPost(1100,'demo-a-model-20261027',0),
  rawPost(3100,'demo-walkthrough-20261028',0),
];
// Consolidate the previous standalone fixtures without erasing edited copy or send results.
export function withPostOnlyPreview(w:Workspace,leads:Prospect[]):Workspace {
  const source=leads.filter(l=>l.sourceTaskCode===postOnlyCode);
  if(!source.length || w.tasks.some(t=>t.id===32010))return w;
  const name='品牌内容 · 十月互动';
  const rules=defaultRules();
  const oldTasks=w.tasks.filter(t=>t.sourceTaskCode===postOnlyCode);
  const statuses:SendStatus[]=['待执行','待执行','发送成功','发送失败','结果待核实','已取消'];
  const actions=postActions(source);
  const comments=source.filter(l=>l.recordKind !== 'post');
  const items=[...comments,...actions];
  const existingResults=Object.assign({},...oldTasks.map(t=>t.results));
  const existingTexts=Object.assign({},...oldTasks.map(t=>t.texts));
  const results=Object.fromEntries(items.map(lead=>[lead.id,
    existingResults[lead.id] || (lead.targetKind !== 'post' ? '发送成功' : statuses[Math.abs(lead.id)-70001])])) as Record<number,SendStatus>;
  const task:Task={id:32010,name:'品牌内容 · 十月互动评论',channel:'comment',sourceTaskName:name,sourceTaskCode:postOnlyCode,
    createdAt:'2026/10/29 10:00',startedAt:'2026/10/29 10:10',senderAccountId:'xhs-main',senderAccountName:'小红书品牌号',quotaModel:'A',
    ids:items.map(l=>l.id),texts:Object.fromEntries(items.map(lead=>[lead.id,existingTexts[lead.id] ?? (lead.targetKind==='post' ? postOpeningCopy(lead.sourcePost!,rules) : contextualOpeningCopy(lead,rules))])),
    targets:Object.fromEntries(items.map(lead=>[lead.id,commentTarget(lead)!])),results,
    editedCopyIds:oldTasks.flatMap(t=>t.editedCopyIds || []),
    replies:[],followups:{},followResults:{},paused:true,monitor:emptyMonitoring(),todos:{},notes:{},events:['用户评论与主帖评论统一纳入本任务'],copyRules:rules};
  const oldUsed=oldTasks.flatMap(t=>Object.values(t.results)).filter(s=>s==='发送成功').length;
  const oldReserved=oldTasks.flatMap(t=>Object.values(t.results)).filter(s=>['待执行','执行中','结果待核实'].includes(s)).length;
  const used=Object.values(results).filter(s=>s==='发送成功').length-oldUsed;
  const reserved=Object.values(results).filter(s=>['待执行','执行中','结果待核实'].includes(s)).length-oldReserved;
  return {...w,tasks:[task,...w.tasks.filter(t=>t.sourceTaskCode!==postOnlyCode)],
    collectionTasks:[{id:32000,name,sourceTaskCode:postOnlyCode,platform:'小红书',status:'解析完成',createdAt:'2026/10/29 09:00',rules,touchMode:'BULK',batchId:32000},...w.collectionTasks.filter(t=>t.sourceTaskCode!==postOnlyCode)],
    batches:[{id:32000,name,sourceTaskCode:postOnlyCode,ids:source.map(l=>l.id),time:'2026/10/29 09:00',rules,touchMode:'BULK'},...w.batches.filter(b=>b.sourceTaskCode!==postOnlyCode)],
    quota:{...w.quota,A:{...w.quota.A,total:w.quota.A.total+used+reserved,used:w.quota.A.used+used,reserved:w.quota.A.reserved+reserved}}};
}

// Remove obsolete supplementary fixture rows left by earlier local previews.
// This is a one-time prototype compatibility cleanup, not a contact deduplication rule.
export function removeObsoletePostSamples(w:Workspace,leads:Prospect[]):Workspace {
  const valid=new Set(postActions(leads.filter(l=>l.targetKind !== 'post')).map(l=>l.id));
  const quota={...w.quota,A:{...w.quota.A},G:{...w.quota.G}};
  const tasks=w.tasks.map(task=>{
    const remove=task.ids.filter(id=>task.targets?.[id]?.kind==='post' && !valid.has(id));
    if(!remove.length)return task;
    const pool=quota[task.quotaModel];
    pool.used=Math.max(0,pool.used-remove.filter(id=>task.results[id]==='发送成功').length);
    pool.reserved=Math.max(0,pool.reserved-remove.filter(id=>['待执行','执行中','结果待核实'].includes(task.results[id])).length);
    const keep=<T,>(map:Record<number,T>)=>Object.fromEntries(Object.entries(map).filter(([id])=>!remove.includes(Number(id)))) as Record<number,T>;
    return {...task,ids:task.ids.filter(id=>!remove.includes(id)),results:keep(task.results),texts:keep(task.texts),targets:keep(task.targets || {})};
  });
  const invalid=(id:number)=>id<0 && !valid.has(id);
  const queue=w.queue ? {...w.queue,ids:w.queue.ids.filter(id=>!invalid(id)),included:w.queue.included.filter(id=>!invalid(id)),blocked:w.queue.blocked.filter(id=>!invalid(id))} : w.queue;
  return {...w,tasks,quota,queue};
}
