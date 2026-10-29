import type { ReactNode } from "react";
import Icon from "./Icon";

export function StatusPill({
  status,
  children,
}: {
  status: string;
  children?: ReactNode;
}) {
  const tone = /核实/.test(status) ? "review"
    : /失败|受限|异常|失效/.test(status) ? "danger"
    : /暂停|待确认|待关联|部分完成/.test(status) ? "warning"
    : /成功|完成|正常|可解析/.test(status) ? "success"
    : /执行中|待处理|处理中|等待|监控中/.test(status) ? "active"
    : "neutral";
  return (
    <span className={`status-pill status-${tone}`}>
      <i />
      {children || status}
    </span>
  );
}
export function MessageBubble({
  text,
  sender,
  status,
  incoming = false,
}: {
  text: string;
  sender: string;
  status?: string;
  incoming?: boolean;
}) {
  return (
    <article className={`message-row ${incoming ? "incoming" : "outgoing"}`}>
      <span className="message-avatar">
        {incoming ? sender[0] : <Icon name="chat" size={16} />}
      </span>
      <div className="message-content">
        <div className="message-meta">{sender}</div>
        <p className="message-bubble">{text}</p>
        {status && (
          <div className="message-result">
            <StatusPill status={status} />
          </div>
        )}
      </div>
    </article>
  );
}
export function Disclosure({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={`ui-disclosure ${className}`}>
      <summary>
        {title}
        <Icon name="down" size={16} />
      </summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}
export function MetricLine({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  return (
    <div className="task-metrics">
      {items.map((item) => (
        <div key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function ProgressSteps({ steps, current, complete = false, className = "" }: {
  steps: string[]; current: number; complete?: boolean; className?: string;
}) {
  return <ol className={`progress-steps ${className}`} aria-label="任务进度">
    {steps.map((label, index) => <li key={label}
      className={complete || index < current ? "done" : index === current ? "active" : ""}
      aria-current={!complete && index === current ? "step" : undefined}>
      <span className="progress-step-number">{index + 1}</span>
      <span className="progress-step-label">{label}</span>
    </li>)}
  </ol>;
}
