"use client";
import { type ScreeningRules, specialRules } from "./workflow-config";
const names = { A: "A 高意向", B: "B 有需求", C: "C 弱意向", D: "D 排除" };
export function RuleSummary({ rules }: { rules: ScreeningRules }) {
  return (
    <>
      <p className="rule-audience">
        {rules.industry} · {rules.region} · {rules.audience}
      </p>
      <div className="rule-cards">
        {(Object.keys(names) as (keyof typeof names)[]).map((g) => (
          <div key={g} className={`rule-card rule-${g}`}>
            <strong>{names[g]}</strong>
            <p>{rules.grades[g]}</p>
          </div>
        ))}
      </div>
      <details className="special-rules">
        <summary>查看特殊情况、排除项和正反例</summary>
        <dl>
          {specialRules.map(([name, text]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{text}</dd>
            </div>
          ))}
          <div>
            <dt>排除项</dt>
            <dd>{rules.exclusions}</dd>
          </div>
          <div>
            <dt>正例</dt>
            <dd>{rules.positive || "未补充"}</dd>
          </div>
          <div>
            <dt>反例</dt>
            <dd>{rules.negative || "未补充"}</dd>
          </div>
        </dl>
      </details>
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
        目标行业
        <input
          aria-label="规则目标行业"
          value={value.industry}
          onChange={(e) => onChange({ ...value, industry: e.target.value })}
        />
      </label>
      <label className="field">
        想找什么人
        <textarea
          aria-label="目标人群"
          value={value.audience}
          onChange={(e) => onChange({ ...value, audience: e.target.value })}
        />
      </label>
      <label className="field">
        地区范围
        <input
          aria-label="规则地区范围"
          value={value.region}
          onChange={(e) => onChange({ ...value, region: e.target.value })}
        />
      </label>
      {(Object.keys(names) as (keyof typeof names)[]).map((g) => (
        <label key={g} className="field">
          {names[g]}
          <textarea
            aria-label={`${g} 类判断标准`}
            value={value.grades[g]}
            onChange={(e) =>
              onChange({
                ...value,
                grades: { ...value.grades, [g]: e.target.value },
              })
            }
          />
        </label>
      ))}
      <label className="field">
        排除哪些人
        <textarea
          aria-label="排除项"
          value={value.exclusions}
          onChange={(e) => onChange({ ...value, exclusions: e.target.value })}
        />
      </label>
      <label className="field">
        符合的例子
        <textarea
          aria-label="正例"
          value={value.positive}
          onChange={(e) => onChange({ ...value, positive: e.target.value })}
        />
      </label>
      <label className="field">
        不符合的例子
        <textarea
          aria-label="反例"
          value={value.negative}
          onChange={(e) => onChange({ ...value, negative: e.target.value })}
        />
      </label>
    </div>
  );
}
