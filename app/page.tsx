"use client";
import { useState } from "react";
import Operations from "./Operations";
import Icon from "./Icon";
import { demoLeads } from "./demo-data";

export default function Home() {
  const [view, setView] = useState<"screening" | "leads" | "workflow" | "accounts">(
    "screening",
  );
  const [help, setHelp] = useState(false);
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
            触达与跟进
          </button>
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
            <i /> 交互原型
          </div>
          <p>
            数据与发送均为演示
            <br />
            状态保存在当前浏览器
          </p>
          <button onClick={() => setHelp(!help)}>
            <Icon name="info" size={17} /> 使用说明
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
                  : view === "accounts" ? "账号管理" : "触达与跟进"}
            </strong>
          </div>
          <span className="topbar-version">{view === "accounts" ? "管理权限 · 演示" : "小红书 · 私信"}</span>
        </header>
        <div className="console-content">
          {help && (
            <section className="help-strip">
              <div>
                <strong>从共享库筛选线索，确认后再触达</strong>
                <p>
                  个人侧只处理已入库数据并选择已分配账号。当前原型使用固定样本，未连接共享库、模型或社交平台。
                </p>
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
          <Operations leads={demoLeads} view={view} navigate={setView} />
        </div>
      </section>
    </main>
  );
}
