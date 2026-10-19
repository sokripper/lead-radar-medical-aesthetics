"use client";
import { type ScreeningRules } from "./workflow-config";
export function RuleSummary({ rules }: { rules: ScreeningRules }) {
  return (
    <>
      <div className="business-rule-summary">
        <div><span>我们提供</span><strong>{rules.offering}</strong></div>
        <div><span>目标客户</span><strong>{rules.audience}</strong></div>
        <div><span>客户需求</span><strong>{rules.businessNeeds}</strong></div>
        {rules.region.trim() && <div><span>地区范围</span><strong>{rules.region}</strong></div>}
      </div>
      <div className="system-rule-note">
        <strong>系统自动判断</strong>
        <p>结合行业相关性、身份匹配度、需求明确度和行动信号，给出意向等级与触达建议。</p>
      </div>
      {rules.exclusions.trim() && <p className="additional-exclusion"><strong>补充排除：</strong>{rules.exclusions}</p>}
    </>
  );
}
export function RuleFields({
  value,
  onChange,
}: {
  value: ScreeningRules;
  onChange: (r: ScreeningRules) => void;
}) {
  return (
    <div className="rule-editor">
      <label className="field">
        业务行业
        <input
          aria-label="规则目标行业"
          value={value.industry}
          onChange={(e) => onChange({ ...value, industry: e.target.value })}
        />
      </label>
      <label className="field">
        我们提供什么产品或服务
        <textarea
          aria-label="提供的产品或服务"
          value={value.offering}
          onChange={(e) => onChange({ ...value, offering: e.target.value })}
        />
      </label>
      <label className="field">
        想找什么样的客户
        <textarea
          aria-label="目标客户"
          value={value.audience}
          onChange={(e) => onChange({ ...value, audience: e.target.value })}
        />
      </label>
      <label className="field">
        客户可能有哪些业务需求
        <textarea
          aria-label="客户业务需求"
          value={value.businessNeeds}
          onChange={(e) => onChange({ ...value, businessNeeds: e.target.value })}
        />
      </label>
      <label className="field compact-field">
        地区范围（选填）
        <input
          aria-label="规则地区范围"
          value={value.region}
          onChange={(e) => onChange({ ...value, region: e.target.value })}
        />
      </label>
      <label className="field compact-field">
        补充排除对象（选填）
        <textarea
          aria-label="补充排除对象"
          value={value.exclusions}
          onChange={(e) => onChange({ ...value, exclusions: e.target.value })}
        />
        <small>系统已内置通用排除规则，这里只需补充本业务的特殊情况。</small>
      </label>
    </div>
  );
}
