import type {Prospect} from './operations-state';

export type ScreeningRules = {
  revision:number; industry:string; audience:string; region:string;
  grades:Record<'A'|'B'|'C'|'D',string>;
  exclusions:string; positive:string; negative:string;
};
export const defaultRules=():ScreeningRules=>({
  revision:1,industry:'医美',audience:'有自身医美需求、正在了解或选择项目与机构的用户',region:'全国',
  grades:{A:'明确问价、找机构或联系方式、咨询预约等。',B:'表达自身需求，正在了解、比较，或担心效果、恢复等。',C:'泛讨论、围观互动，没有明确自身需求。',D:'与目标业务无关，或有明确同行推广、广告特征。'},
  exclusions:'排除无关内容、明确同行推广和广告；负面评价不直接作为潜客。',
  positive:'A：想做超声炮，上海有没有机构推荐？\nB：想改善法令纹，正在比较不同方式，担心恢复。',
  negative:'C：谢谢分享，先收藏。\nD：本月活动，欢迎咨询合作。',
});
export const specialRules=[
  ['上下文','结合评论、关联原帖和可取得的父评论判断，不只匹配“多少钱”等单个词。'],
  ['地区未知','保留在名单；有地区限制时，补充地区依据后才能联系。'],
  ['信息咨询','有自身需求的比较咨询可归 B；只有泛知识讨论归 C，信息不足则待判断。'],
  ['负面评价','不直接作为潜客；结合上下文确认是否存在仍需解决的自身需求。'],
  ['同行与广告','有明确推广证据才排除，不仅凭昵称判断。'],
  ['待判断','信息不够，不强行归类；可稍后补充或人工判断。'],
  ['处理失败','未完成分析，不是意向等级；单独重试，不影响正常结果。'],
];
export function rulesError(r:ScreeningRules){return [r.industry,r.audience,r.region,...Object.values(r.grades),r.exclusions].some(x=>!x.trim())?'请填写目标行业、人群、地区、四类标准和排除项。':'';}
export function reviseRules(previous:ScreeningRules,draft:ScreeningRules):ScreeningRules{
  const error=rulesError(draft);if(error)throw Error(error);
  return {...draft,revision:previous.revision+1,grades:{...draft.grades}};
}
export function partitionResults<T extends {id:number}>(rows:T[],grades:Record<number,Prospect['grade']>,failed:number[]){
  return {completed:rows.filter(x=>!failed.includes(x.id)&&grades[x.id]!=='待判断'),attention:rows.filter(x=>failed.includes(x.id)||grades[x.id]==='待判断')};
}
