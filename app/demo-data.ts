import {postOnlyDemoLeads} from './post-only-demo.ts';
import { scenarioLeads, presentName } from './preview-scenarios.ts';
import type { Prospect as Lead } from './operations-state';
const precisionDemoLeads: Lead[] = [
  { id: 7, sourceIssue: 'missing_context', name: '提问样本', handle: 'demo_07', grade: '待判断', score: 0, intent: '上下文不足', context: '这个可以吗？', evidence: '缺少所指对象与父评论，无法判断需求', location: '未知', status: '', source: '小红书评论', accountId: '', message: '',businessScene:'待判断',reachability:'暂不触达' },
  { id: 8, sourceIssue: 'missing_body', name: '异常样本', handle: 'demo_08', grade: '待判断', score: 0, intent: '内容未读出', context: '', evidence: '该条处理失败，尚未形成分类结果', location: '未知', status: '', source: '小红书评论', accountId: '', message: '' },
  { id: 5, name: '晚风散步', handle: 'demo_05', grade: 'C', score: 35, intent: '日常互动', context: '谢谢分享，先收藏啦。', evidence: '仅收藏互动，未表达业务需求', location: '未知', status: '', source: '小红书评论', accountId: '', message: '',businessScene:'泛讨论',reachability:'暂不触达' },
  { id: 6, name: '项目推广示例', handle: 'demo_06', grade: 'D', score: 12, intent: '推广信息', context: '本月活动，接种草合作。', evidence: '达人自荐或纯推广内容，不是品牌方需求', location: '未知', status: '', source: '小红书评论', accountId: '', message: '',businessScene:'推广广告',reachability:'暂不触达' },
  {
    id: 1,
    name: '南宁轻奢美业',
    handle: 'src_71•••9a',
    grade: 'A',
    score: 92,
    intent: '小红书代运营 / 问合作',
    context: '我们是美容工作室，想了解一下小红书代运营，怎么联系？',
    evidence: '主体明确 + 问合作 + 问联系方式',
    location: '南宁',
    status: '待审核话术',
    source: '小红书评论',
    accountId: '待核验',
    message: '',
    businessScene: '服务合作',
    reachability: '优先触达',
  },
  {
    id: 2,
    name: '星屿驰商旅',
    handle: 'src_b2•••41',
    grade: 'B',
    score: 88,
    intent: '商旅账号运营',
    context: '旅游类账号可以合作吗？想先看下你们的服务和收费。',
    evidence: '问合作 + 问服务与收费，主体行业可识别',
    location: '全国',
    status: '账号已核验',
    source: '小红书评论',
    accountId: 'xhs_6•••27',
    message: '',
    businessScene: '服务合作',
    reachability: '建议触达',
  },
  {
    id: 3,
    name: '运营求助小K',
    handle: 'src_0e•••c8',
    grade: 'B',
    score: 76,
    intent: '账号流量 / 转化问题',
    context: '笔记有流量但一直没转化，有什么方法能排查吗？',
    evidence: '明确表达运营问题，但业务主体与预算待确认',
    location: '未知',
    status: '待账号核验',
    source: '小红书评论',
    accountId: '待核验',
    message: '',
    businessScene: '运营问题',
    reachability: '建议触达',
  },
  {
    id: 4,
    name: '橘子汽水加冰',
    handle: 'src_33•••bf',
    grade: 'B',
    score: 71,
    intent: '投放效果 / 账号运营',
    context: '投了几轮但效果不稳定，是素材还是人群定向有问题？',
    evidence: '投放问题明确 + 正在寻找解决方案',
    location: '南京',
    status: '暂缓跟进',
    source: '小红书评论',
    accountId: 'xhs_demo_04',
    message: '',
    businessScene: '运营问题',
    reachability: '建议触达',
  },
  {
    id: 9, name: '羊驼大王', handle: 'src_demo_09', grade: 'B', score: 73,
    intent: '品牌种草 / 达人合作', context: '新品上市，有没有适合的小红书达人可以合作？',
    evidence: '品牌方明确寻找达人，属于可承接的投放需求', location: '未知', status: '', source: '小红书评论', accountId: 'xhs_demo_09', message: '',
    businessScene: '达人投放', reachability: '建议触达',
  },
  {
    id: 10, name: '冰杨梅', handle: 'src_demo_10', grade: 'C', score: 58,
    intent: '招聘运营 / 自建团队', context: '最近在找小红书运营，自己搭团队还是找外包比较合适？',
    evidence: '正在评估自建与外包，不是直接询价，但存在可承接的间接需求', location: '杭州', status: '', source: '小红书评论', accountId: 'xhs_demo_10', message: '',
    businessScene: '招聘运营', reachability: '探索触达',
  },
];

export const bulkDemoTaskCode = 'demo-a-model-20261027';
// Separate record identities keep the A-model demo independent of existing G tasks.
export const bulkDemoLeads: Lead[] = [
  ...Array.from({ length: 24 }, (_, index) => {
    const grade = (['A', 'B', 'C', 'D'] as const)[index % 4];
    const examples = precisionDemoLeads.filter(lead => lead.grade === grade && !lead.sourceIssue);
    const example = examples[Math.floor(index / 4) % examples.length];
    return { ...example, id: 1001 + index, name: `${example.name} · 演示${Math.floor(index / 4) + 1}`, handle: `bulk_demo_${index + 1}`, accountId: `bulk_account_${index + 1}`, sourceTaskCode: bulkDemoTaskCode };
  }),
  ...precisionDemoLeads.filter(lead => lead.sourceIssue).map((lead, index) => ({ ...lead, id: 1091 + index, name: `${lead.name} · A模型演示`, handle: `bulk_anomaly_${index + 1}`, sourceTaskCode: bulkDemoTaskCode })),
];
const sourcePosts = [
  { id: 'demo-post-operations', authorId: 'demo-author-service', authorName: '账号运营服务商（演示）', title: '品牌账号运营与代运营合作交流', content: '提供内容运营与投放服务，欢迎商家在评论区交流需求。', },
  { id: 'demo-post-growth', authorId: 'demo-author-growth', authorName: '增长经验分享（演示）', title: '账号有流量，为什么没有咨询？', content: '讨论内容定位、投放与咨询转化的问题，评论区分享各自遇到的情况。', },
  { id: 'demo-post-team', authorId: 'demo-author-team', authorName: '品牌运营交流（演示）', title: '自建团队、达人合作还是外包？', content: '不同阶段的商家如何安排运营团队和达人合作，欢迎讨论。', },
];
export const commentDemoTaskCode = 'demo-comments-20261028';
export const commentDemoLeads: Lead[] = precisionDemoLeads.map((lead,index) => ({...lead,id:2001+index,name:`${lead.name} · 评论演示`,handle:`comment_user_${index+1}`,accountId:`comment_account_${index+1}`,sourceTaskCode:commentDemoTaskCode}));
export const walkthroughTaskCode = 'demo-walkthrough-20261028';
export const walkthroughLeads: Lead[] = bulkDemoLeads.map((lead,index) => ({
  ...lead, id:3001+index, name:lead.name.replace(/ · .*/, '') + ` · 体验${index+1}`,
  handle:`walkthrough_user_${index+1}`, accountId:`walkthrough_account_${index+1}`,sourceTaskCode:walkthroughTaskCode,
}));
export const demoLeads: Lead[] = [...[...precisionDemoLeads, ...bulkDemoLeads, ...commentDemoLeads, ...walkthroughLeads].map(lead => ({
  ...lead, name:presentName(lead.name),
  ...([1004,3004].includes(lead.id) ? {context:"这个可以吗？",evidence:"无法从原评论判断所指内容，不回复该评论；主帖仍保留供 A 模型补充。"} : {}),
  commentId: `demo-comment-${lead.id}`,
  sourcePost: lead.sourceIssue === "missing_context" ? undefined : [1004,3004].includes(lead.id) ? {id:"demo-post-budget",authorId:"demo-author-budget",authorName:"品牌经营笔记",title:"小店刚起步，怎样分配内容预算？",content:"预算有限，先把客户是谁、主打产品是什么说明白，再决定拍摄和投放的比例。"} : { ...sourcePosts[lead.businessScene === '运营问题' ? 1 : ['达人投放', '招聘运营'].includes(lead.businessScene || '') ? 2 : 0] },
})), ...scenarioLeads, ...postOnlyDemoLeads];
