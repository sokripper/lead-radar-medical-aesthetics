"use client";
import { useState } from "react";
import Operations from "./Operations";
import Icon from "./Icon";
import { demoLeads } from "./demo-data";

export default function Home() {
  const [view, setView] = useState<"screening" | "leads" | "workflow" | "accounts" | "inbox">(
    "screening",
  );
  const [help, setHelp] = useState(false);
  const [previewTools,setPreviewTools]=useState(false);
  return (
    <main className="console-shell">
      <aside className="console-nav">
        <a className="console-brand" href="#main">
          <span>
            <Icon name="data" size={22} />
          </span>
          <div>
            线索雷达<small>LEAD RADAR</small>
          </div>
        </a>
        <p className="workspace-caption">社交线索工作台</p>
        <nav aria-label="主导航">
          <button
            className={view === "screening" ? "active" : ""}
            aria-current={view === "screening" ? "page" : undefined}
            onClick={() => setView("screening")}
          >
            <Icon name="data" />
            数据处理
          </button>
          <button
            className={view === "leads" ? "active" : ""}
            aria-current={view === "leads" ? "page" : undefined}
            onClick={() => setView("leads")}
          >
            <Icon name="folder" />
            历史名单
          </button>
          <button
            className={view === "workflow" ? "active" : ""}
            aria-current={view === "workflow" ? "page" : undefined}
            onClick={() => setView("workflow")}
          >
            <Icon name="chat" />
            评论触达
          </button>
          <button className={view === "inbox" ? "active" : ""} aria-current={view === "inbox" ? "page" : undefined} onClick={() => setView("inbox")}><Icon name="chat" />私信监控</button>
          <button
            className={`admin-nav-button ${view === "accounts" ? "active" : ""}`}
            aria-current={view === "accounts" ? "page" : undefined}
            aria-label="账号管理（管理权限）"
            onClick={() => setView("accounts")}
          >
            <Icon name="settings" />
            <span>账号管理<small>管理权限</small></span>
          </button>
        </nav>
        <div className="nav-bottom">
          <div className="demo-badge">
            <i /> 交互原型 · 虚构数据
          </div>

          <button onClick={() => setHelp(!help)}>
            <Icon name="info" size={17} /> 原型工具
          </button>
        </div>
      </aside>
      <section className="console-main" id="main">
        <header className="console-topbar">
          <div>
            工作空间 <span>/</span>{" "}
            <strong>
              {view === "screening"
                ? "数据处理"
                : view === "leads"
                  ? "历史名单"
                  : view === "accounts" ? "账号管理" : view === "inbox" ? "私信监控" : "评论触达"}
            </strong>
          </div>
          <span className="topbar-version">{view === "accounts" ? "管理权限" : view === "inbox" ? "小红书 · 账号私信" : "小红书 · 评论触达"}</span>
        </header>
        <div className="console-content">
          {help && (
            <section className="help-strip">
              <div>
                <strong>筛选评论用户，评论触达后跟进私信</strong>
                <p>当前使用虚构业务数据，不连接真实社交平台。开启测试操作后，可模拟收信和发送结果；关闭后查看正常业务界面。</p>
                <label className="preview-toggle"><input type="checkbox" checked={previewTools} onChange={e=>setPreviewTools(e.target.checked)}/> 显示测试操作</label>
              </div>
              <button
                className="icon-button"
                aria-label="关闭说明"
                onClick={() => setHelp(false)}
              >
                <Icon name="close" />
              </button>
            </section>
          )}
          <Operations leads={demoLeads} view={view} navigate={setView} previewTools={previewTools} />
        </div>
      </section>
    </main>
  );
}
