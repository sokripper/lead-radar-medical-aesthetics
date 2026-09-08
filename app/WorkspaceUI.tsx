import type { ReactNode } from "react";
import Icon from "./Icon";

export function StatusPill({
  status,
  children,
}: {
  status: string;
  children?: ReactNode;
}) {
  const tone = /成功|已完成|正常/.test(status)
    ? "success"
    : /失败|受限|异常/.test(status)
      ? "danger"
      : /核实|暂停|待确认/.test(status)
        ? "warning"
        : /执行中|待处理|处理中|等待/.test(status)
          ? "active"
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
            <span>演示消息</span>
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
