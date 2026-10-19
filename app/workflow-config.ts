import type {Prospect} from './operations-state';

export const businessSceneOptions = [
  {key:'service',label:'服务合作',description:'询问合作、价格、联系方式，或正在寻找服务商。'},
  {key:'creator',label:'达人投放',description:'品牌方寻找达人、种草、投放或铺量合作。'},
  {key:'hiring',label:'招聘运营',description:'正在招聘运营、筹建或补充自建团队。'},
  {key:'problem',label:'运营问题',description:'明确表达流量、转化、投放或账号运营问题。'},
] as const;
export type BusinessSceneKey = typeof businessSceneOptions[number]['key'];

export type ScreeningRules = {
  revision:number; industry:string; offering:string; audience:string; businessNeeds:string; region:string;
  contactableScenes:BusinessSceneKey[];
  grades:Record<'A'|'B'|'C'|'D',string>;
  exclusions:string; positive:string; negative:string;
};
export const defaultRules=():ScreeningRules=>({
  revision:1,industry:'新媒体运营',offering:'小红书、抖音代运营与达人投放服务',audience:'有新媒体增长需求的品牌方和商家',businessNeeds:'寻找代运营或达人合作；招聘运营；存在流量、转化、投放或账号运营问题',region:'全国',
  contactableScenes:['service','creator','hiring','problem'],
  grades:{A:'明确问合作、价格、联系方式，或表达近期需求。',B:'有可承接的业务需求，正在了解、对比或寻找解决方案。',C:'存在间接机会或需要进一步确认，不因昵称中性或身份暂不明而直接排除。',D:'与目标业务无关，或有明确同行推广、达人自荐、纯广告特征。'},
  exclusions:'',
  positive:'A：怎么联系，想了解代运营合作。\nB：品牌在找达人做种草，正在看合作方案。\nC：正在招运营，团队方案还在评估。',
  negative:'C：谢谢分享，先收藏。\nD：本月活动，接种草合作。',
});
export const specialRules=[
  ['上下文','结合评论、关联原帖和可取得的父评论判断，不只匹配“多少钱”等单个词。'],
  ['地区未知','保留在名单；有地区限制时，补充地区依据后才能联系。'],
  ['信息咨询','有自身需求的比较咨询可归 B；只有泛知识讨论归 C，信息不足则待判断。'],
  ['负面评价','不直接作为潜客；结合上下文确认是否存在仍需解决的自身需求。'],
  ['同行与广告','有明确推广证据才排除，不仅凭昵称判断。'],
  ['意向与触达','意向等级与是否触达分开判断；品牌找达人、招聘运营等间接需求可作为探索触达。'],
  ['待判断','信息不够，不强行归类；可稍后补充或人工判断。'],
  ['处理失败','未完成分析，不是意向等级；单独重试，不影响正常结果。'],
];
export function restoreRules(value?:Partial<ScreeningRules>):ScreeningRules{
  const base=defaultRules();
  return {...base,...value,offering:value?.offering||base.offering,businessNeeds:value?.businessNeeds||base.businessNeeds,grades:{...base.grades,...value?.grades},contactableScenes:value?.contactableScenes?.length?[...value.contactableScenes]:base.contactableScenes};
}
export function rulesError(r:ScreeningRules){
  return [r.industry,r.offering,r.audience,r.businessNeeds].some(x=>!x.trim())
    ? '请完整填写业务行业、提供的产品或服务、目标客户和客户需求。'
    : '';
}
export function reviseRules(previous:ScreeningRules,draft:ScreeningRules):ScreeningRules{
  const error=rulesError(draft);if(error)throw Error(error);
  return {...draft,revision:previous.revision+1,grades:{...draft.grades},contactableScenes:[...draft.contactableScenes]};
}
export function partitionResults<T extends {id:number}>(rows:T[],grades:Record<number,Prospect['grade']>,failed:number[]){
  return {completed:rows.filter(x=>!failed.includes(x.id)&&grades[x.id]!=='待判断'),attention:rows.filter(x=>failed.includes(x.id)||grades[x.id]==='待判断')};
}
