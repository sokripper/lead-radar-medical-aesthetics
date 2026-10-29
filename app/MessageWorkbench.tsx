"use client";
import { useState, type ReactNode } from "react";
import { StatusPill } from "./WorkspaceUI";
import { reviewPage, type ReviewRecipient } from "./message-review";

export default function MessageWorkbench({ items, renderEditor, listOnly = false }: {
  items: ReviewRecipient[];
  renderEditor: (id: number) => ReactNode;
  listOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("全部");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [selected, setSelected] = useState<number | null>(null);
  const [jump, setJump] = useState("");
  const result = reviewPage(items, query, "全部", status, page, size);
  const active = result.rows.find(item => item.id === selected) || result.rows[0];
  const index = active ? result.filtered.findIndex(item => item.id === active.id) : -1;
  const issues = items.filter(item => item.issue).length;
  const statuses = [...new Set(items.map(item => item.status))];
  function move(offset: number) {
    const next = result.filtered[index + offset];
    if (!next) return;
    setSelected(next.id);
    setPage(Math.floor((index + offset) / result.pageSize) + 1);
  }
  return <section className="message-workbench" aria-label="名单与话术工作台">
    <div className="message-toolbar">
      <label className="message-search"><span className="sr-only">搜索名单与话术</span><input aria-label="搜索名单与话术" placeholder="搜索姓名、需求或话术" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /></label>
      <select aria-label={listOnly ? "筛选纳入状态" : "筛选话术状态"} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="全部">全部状态</option>{!listOnly && <><option value="待处理">待处理</option><option value="已编辑">已编辑</option></>}{statuses.filter(value => !["待处理", "已编辑"].includes(value)).map(value => <option key={value}>{value}</option>)}</select>
      {issues > 0 && <button className={`button ${status === "待处理" ? "primary" : "secondary"}`} onClick={() => { setStatus(status === "待处理" ? "全部" : "待处理"); setPage(1); }}>待处理 {issues}</button>}
      <span className="message-total">{result.filtered.length.toLocaleString()} / {items.length.toLocaleString()} 条</span>
    </div>
    <div className={`message-workbench-grid ${listOnly ? "list-only" : ""}`}>
      <div className="message-list-panel">
        <div className="message-list-scroll">
          <table className="message-list-table"><thead><tr><th>{listOnly ? "对象" : "评论对象 / 话术摘要"}</th><th>状态</th>{listOnly && <th>操作</th>}</tr></thead><tbody>
            {result.rows.map(item => <tr key={item.id} className={!listOnly && active?.id === item.id ? "is-active" : ""}>
              <td>{listOnly ? <><strong>{item.name}</strong>{["主帖评论","回复评论"].includes(item.scene || "") && <small className="comment-kind-tag">{item.scene}</small>}</> : <button className="message-person-button" aria-label={`查看话术：${item.name}`} aria-pressed={active?.id === item.id} onClick={() => setSelected(item.id)}><strong>{item.name}</strong>{["主帖评论","回复评论"].includes(item.scene || "") && <small className="comment-kind-tag">{item.scene}</small>}<span>{item.text || "暂无话术"}</span></button>}</td>
              <td><StatusPill status={item.issue ? "待处理" : item.edited && item.status === "已生成" ? "已编辑" : item.status}/></td>
              {listOnly && <td>{renderEditor(item.id)}</td>}
            </tr>)}
          </tbody></table>
          {!result.rows.length && <div className="message-empty">没有符合条件的记录<button className="button text" onClick={() => { setQuery(""); setStatus("全部"); setPage(1); }}>清除筛选</button></div>}
        </div>
        <div className="message-pagination">
          <select aria-label="每页条数" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(1); }}>{[10, 20, 50].map(n => <option key={n} value={n}>{n} 条/页</option>)}</select>
          <button className="button secondary" aria-label="上一页名单" disabled={result.page === 1} onClick={() => setPage(result.page - 1)}>‹</button>
          <span>{result.page} / {result.pages}</span>
          <button className="button secondary" aria-label="下一页名单" disabled={result.page === result.pages} onClick={() => setPage(result.page + 1)}>›</button>
          <form onSubmit={e => { e.preventDefault(); setPage(Math.min(result.pages, Math.max(1, Number(jump) || 1))); setJump(""); }}><input aria-label="跳转页码" type="number" min={1} max={result.pages} placeholder="页码" value={jump} onChange={e => setJump(e.target.value)} /><button className="button text" type="submit">跳转</button></form>
        </div>
      </div>
      {!listOnly && <div className="message-editor-panel">
        {active ? <>
          <header className="message-editor-heading"><div><h3>{active.name}</h3><span>{active.scene || "需求待确认"}</span></div><div className="message-editor-navigation"><button className="button secondary" disabled={index <= 0} onClick={() => move(-1)}>上一条</button><button className="button secondary" disabled={index >= result.filtered.length - 1} onClick={() => move(1)}>下一条</button></div></header>
          <div className="message-editor-content" key={active.id}>{renderEditor(active.id)}</div>
        </> : <div className="message-empty">请选择一条记录查看话术</div>}
      </div>}
    </div>
  </section>;
}
