"use client";
import { useState } from "react";
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
      {rules.materials.length > 0 && <p className="additional-exclusion"><strong>已导入业务资料：</strong>{rules.materials.join("、")}</p>}
      <div className="system-rule-note">
        <strong>系统自动判断</strong>
        <p>结合行业相关性、身份匹配度、需求明确度和行动信号，判断本任务可触达的范围。</p>
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
  const [pendingFile, setPendingFile] = useState("");
  const [extracted, setExtracted] = useState(false);
  return (
    <div className="rule-editor">
      <section className="material-import">
        <div><strong>导入业务资料</strong><p>支持 Word、PPT。系统提取产品服务、目标客户和业务需求，确认后再写入筛选规则。</p></div>
        <label className="button secondary material-file-button">
          选择文件
          <input type="file" accept=".doc,.docx,.ppt,.pptx" onChange={event => {
            const file = event.target.files?.[0];
            setPendingFile(file?.name || "");
            setExtracted(false);
          }} />
        </label>
        {pendingFile && <div className="material-review">
          <div><span>待解析文件</span><strong>{pendingFile}</strong></div>
          {!extracted ? <button type="button" className="button secondary" onClick={() => setExtracted(true)}>AI解析资料</button> : <>
            <p className="notice">已提取业务信息。请核对下方现有表单内容，确认无误后保存本任务规则。</p>
            <button type="button" className="button secondary" onClick={() => {
              onChange({ ...value, materials: [...new Set([...value.materials, pendingFile])] });
              setPendingFile("");
              setExtracted(false);
            }}>确认采用提取结果</button>
          </>}
        </div>}
        {value.materials.length > 0 && <ul className="material-list">{value.materials.map(name => <li key={name}><span>{name}</span><button type="button" className="button text" onClick={() => onChange({ ...value, materials: value.materials.filter(item => item !== name) })}>移除</button></li>)}</ul>}
      </section>
      <label className="field compact-field">
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
