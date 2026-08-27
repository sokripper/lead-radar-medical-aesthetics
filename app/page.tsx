'use client';

import { useMemo, useState } from 'react';

type NavKey = 'workflow' | 'overview' | 'screening' | 'leads' | 'conversations' | 'monitoring' | 'rules';
type Lead = {
  id: number;
  name: string;
  handle: string;
  grade: 'A' | 'B';
  score: number;
  intent: string;
  context: string;
  evidence: string;
  location: string;
  status: string;
  source: string;
  accountId: string;
  message: string;
};

const navItems: { key: NavKey; label: string; icon: string; badge?: string }[] = [
  { key: 'workflow', label: '任务工作台', icon: '→' },
  { key: 'overview', label: '工作总览', icon: '⌂' },
  { key: 'screening', label: '数据筛选', icon: '⌁' },
  { key: 'leads', label: '潜客池', icon: '◎', badge: '61' },
  { key: 'conversations', label: '会话中心', icon: '◫', badge: '5' },
  { key: 'monitoring', label: '监控任务', icon: '↻' },
  { key: 'rules', label: '规则设置', icon: '⚙' },
];

const workflowSteps = [
  ['导入数据', '选择羚羊导出的 Excel'],
  ['确认字段', '检查原帖与评论关联'],
  ['执行筛选', '运行 A/B/C/D 评分'],
  ['复核名单', '决定谁进入潜客池'],
  ['核验账号', '匹配真实 account_id'],
  ['审核话术', '确认首轮沟通内容'],
  ['启动任务', '授权发送并开始监控'],
];

const leads: Lead[] = [
  {
    id: 1,
    name: '小满今天早睡',
    handle: 'src_71•••9a',
    grade: 'A',
    score: 92,
    intent: '超声炮 / 面部提升',
    context: '想做超声炮，上海有推荐吗？主要想改善下颌线，最近正在看机构。',
    evidence: '明确项目 + 求机构推荐 + 近期决策',
    location: '上海',
    status: '待审核话术',
    source: '小红书评论',
    accountId: '待核验',
    message: '看到你在问超声炮，我前阵子也集中做过一轮功课。你更在意下颌线的效果，还是恢复期呀？我可以把我当时对比时比较有用的几点发你。',
  },
  {
    id: 2,
    name: '养乐多不要冰',
    handle: 'src_b2•••41',
    grade: 'A',
    score: 88,
    intent: '法令纹填充',
    context: '法令纹填充到底选玻尿酸还是再生材料？预算一万左右，怕做完很假。',
    evidence: '项目明确 + 有预算 + 主动对比方案',
    location: '杭州',
    status: '账号已核验',
    source: '小红书评论',
    accountId: 'xhs_6•••27',
    message: '刚好看到你在纠结法令纹材料，我之前也担心填完会显假。你现在主要是静态纹明显，还是笑起来更明显？不同情况关注点还挺不一样的。',
  },
  {
    id: 3,
    name: '月光小橘',
    handle: 'src_0e•••c8',
    grade: 'B',
    score: 76,
    intent: '双眼皮 / 恢复期',
    context: '想问问大家做完双眼皮多久能正常上班，看起来不那么肿？',
    evidence: '有项目意向 + 关注恢复，但地区与时间未知',
    location: '未知',
    status: '待账号核验',
    source: '小红书评论',
    accountId: '待核验',
    message: '你问的恢复期我也关注过，每个人肿胀差异挺大的。你是已经约了面诊，还是还在前期了解呀？',
  },
  {
    id: 4,
    name: '橘子汽水加冰',
    handle: 'src_33•••bf',
    grade: 'B',
    score: 71,
    intent: '皮秒 / 痘印',
    context: '皮秒去痘印真的有用吗？看到有人说要做好几次，有点拿不准。',
    evidence: '痛点明确 + 正在比较，但购买信号较弱',
    location: '南京',
    status: '暂缓跟进',
    source: '抖音评论',
    accountId: 'dy_2•••04',
    message: '刷到你在问皮秒去痘印，我之前也查过一阵。痘印颜色和类型不同，适合的方案好像差别挺大，你的是偏红还是偏褐色呀？',
  },
];

const batches = [
  { name: '医美线索_20260803-04.xlsx', time: '今天 09:18', total: 326, a: 24, b: 37, status: '已完成' },
  { name: '医美线索_20260801-02.xlsx', time: '8月3日 18:42', total: 281, a: 19, b: 34, status: '已归档' },
  { name: '医美线索_20260730-31.xlsx', time: '8月1日 10:06', total: 295, a: 16, b: 28, status: '已归档' },
];

const reviewCards = leads.slice(0, 2);

export default function Home() {
  const [activeNav, setActiveNav] = useState<NavKey>('workflow');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [filter, setFilter] = useState<'全部' | 'A' | 'B'>('全部');
  const [query, setQuery] = useState('');
  const [approved, setApproved] = useState<number[]>([]);
  const [monitoring, setMonitoring] = useState(true);
  const [newReplies, setNewReplies] = useState(5);
  const [toast, setToast] = useState('');
  const [workflowStep, setWorkflowStep] = useState(0);
  const [workflowFile, setWorkflowFile] = useState('');
  const [screeningState, setScreeningState] = useState<'idle' | 'running' | 'done'>('idle');
  const [reviewSelection, setReviewSelection] = useState<number[]>([1, 2, 3]);
  const [accountChecked, setAccountChecked] = useState(false);
  const [messageSelection, setMessageSelection] = useState<number[]>([1, 2]);
  const [permissionChecks, setPermissionChecks] = useState<string[]>([]);
  const [taskStarted, setTaskStarted] = useState(false);

  const visibleLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesGrade = filter === '全部' || lead.grade === filter;
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || `${lead.name}${lead.intent}${lead.context}${lead.location}`.toLowerCase().includes(q);
      return matchesGrade && matchesQuery;
    });
  }, [filter, query]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }

  function approveLead(id: number) {
    if (!approved.includes(id)) setApproved((items) => [...items, id]);
    notify('已通过人工审核，进入待发送队列');
  }

  function toggleNumber(items: number[], id: number, setter: (next: number[]) => void) {
    setter(items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  }

  function togglePermission(key: string) {
    setPermissionChecks((items) => items.includes(key) ? items.filter((item) => item !== key) : [...items, key]);
  }

  function goToWorkflowStep(step: number) {
    setWorkflowStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderLeadTable(compact = false) {
    return (
      <div className="table-shell">
        <div className="table-head">
          <div className="lead-col">潜客</div>
          <div>等级</div>
          <div>需求判断</div>
          {!compact && <div>证据摘要</div>}
          <div>状态</div>
          <div />
        </div>
        {visibleLeads.map((lead) => (
          <button className="table-row" key={lead.id} onClick={() => setSelectedLead(lead)}>
            <div className="lead-col">
              <span className={`avatar avatar-${lead.id}`}>{lead.name.slice(0, 1)}</span>
              <span>
                <strong>{lead.name}</strong>
                <small>{lead.source} · {lead.location}</small>
              </span>
            </div>
            <div><span className={`grade grade-${lead.grade.toLowerCase()}`}>{lead.grade}</span><small className="score">{lead.score}分</small></div>
            <div><strong className="intent">{lead.intent}</strong><small className="one-line">{lead.context}</small></div>
            {!compact && <div><small className="evidence">{lead.evidence}</small></div>}
            <div><span className={`status-dot ${lead.status.includes('待') ? 'waiting' : ''}`} />{approved.includes(lead.id) ? '待发送' : lead.status}</div>
            <div className="row-arrow">›</div>
          </button>
        ))}
        {visibleLeads.length === 0 && <div className="empty">没有找到符合条件的潜客</div>}
      </div>
    );
  }

  function Workflow() {
    let stepContent: React.ReactNode;

    if (workflowStep === 0) {
      stepContent = (
        <section className="workflow-card">
          <div className="workflow-card-head">
            <span className="step-kicker">步骤 1 / 7</span>
            <h2>先把本批数据导进来</h2>
            <p>支持羚羊导出的 Excel、CSV。原始文件只读取，不会在系统里重复维护一份。</p>
          </div>
          <label className={`workflow-upload ${workflowFile ? 'has-file' : ''}`}>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => setWorkflowFile(event.target.files?.[0]?.name ?? '')} />
            <span className="workflow-upload-icon">⇧</span>
            {workflowFile ? <><strong>{workflowFile}</strong><small>文件已选择，可以开始解析</small></> : <><strong>点击选择文件，或拖到这里</strong><small>.xlsx / .xls / .csv，单文件不超过 50 MB</small></>}
          </label>
          <button className="demo-file-button" onClick={() => setWorkflowFile('医美social_media_20260803_to_20260804.xlsx')}>没有文件？使用本次演示数据</button>
          <div className="operation-note"><span>i</span><div><strong>这一阶段只做结构检查</strong><p>系统会识别原帖、评论、作者 ID、doc_url 等字段，不会执行发送或账号操作。</p></div></div>
          <div className="workflow-footer"><span>预计耗时：10–30 秒</span><button className="primary-button" disabled={!workflowFile} onClick={() => goToWorkflowStep(1)}>解析文件并继续 →</button></div>
        </section>
      );
    } else if (workflowStep === 1) {
      stepContent = (
        <section className="workflow-card">
          <div className="workflow-card-head"><span className="step-kicker">步骤 2 / 7</span><h2>确认系统识别的字段</h2><p>这一步决定后面能不能正确关联原帖、评论和评论作者。</p></div>
          <div className="structure-summary"><div><strong>326</strong><small>数据行</small></div><div><strong>19</strong><small>识别字段</small></div><div><strong>1</strong><small>工作表</small></div><div><strong className="healthy">正常</strong><small>结构状态</small></div></div>
          <div className="mapping-table">
            <div className="mapping-head"><span>系统需要的字段</span><span>识别到的 Excel 列</span><span>示例值</span><span>状态</span></div>
            {[
              ['内容类型', 'data_type', '1 / 2', '已匹配'],
              ['原帖关联地址', 'doc_url', 'xiaohongshu.com/…', '已匹配'],
              ['评论作者 ID', 'src_author_id', '5f3•••82', '已匹配'],
              ['正文 / 评论', 'content', '想问下恢复期…', '已匹配'],
              ['标题', 'headline', '超声炮避坑…', '已匹配'],
            ].map(([label, field, example, status]) => <div className="mapping-row" key={field}><strong>{label}</strong><select defaultValue={field}><option>{field}</option><option>暂不使用</option></select><code>{example}</code><span>✓ {status}</span></div>)}
          </div>
          <div className="association-check"><span>✓</span><div><strong>原帖关联检查通过</strong><p>共发现 84 条原帖，242 条评论；当前数据可以通过 doc_url 回溯到对应原帖。未发现评论层级字段，二级评论按原帖上下文处理。</p></div></div>
          <div className="workflow-footer"><button className="back-button" onClick={() => goToWorkflowStep(0)}>← 返回</button><button className="primary-button" onClick={() => goToWorkflowStep(2)}>确认字段，设置筛选 →</button></div>
        </section>
      );
    } else if (workflowStep === 2) {
      stepContent = (
        <section className="workflow-card">
          <div className="workflow-card-head"><span className="step-kicker">步骤 3 / 7</span><h2>设置筛选目标并执行评分</h2><p>模型会同时读取原帖和评论，按照统一证据维度分为 A / B / C / D。</p></div>
          <div className="screening-config">
            <label><span>目标行业</span><select defaultValue="医美"><option>医美</option><option>口腔</option><option>大健康</option></select></label>
            <label><span>重点项目</span><input defaultValue="抗衰、注射、皮肤、眼鼻整形" /></label>
            <label><span>地区范围</span><select defaultValue="全国"><option>全国</option><option>指定城市</option></select></label>
          </div>
          <div className="class-definition-grid">
            {[['A','高意向','项目明确，并出现预算、时间、机构推荐等决策信号'],['B','中高意向','需求明确，但还缺少地区、预算或决策时间'],['C','低意向','泛讨论、经验交流或仅有轻度兴趣'],['D','排除','广告、同行、非目标行业或无有效需求']].map(([grade,title,copy]) => <article key={grade}><span className={`grade grade-${grade.toLowerCase()}`}>{grade}</span><div><strong>{title}</strong><p>{copy}</p></div></article>)}
          </div>
          {screeningState === 'running' && <div className="screening-running"><span className="spinner"/><div><strong>正在读取上下文并评分…</strong><p>已处理 218 / 326 条，当前只生成结构化判断，不执行外部动作。</p></div><b>67%</b></div>}
          {screeningState === 'done' && <div className="screening-result"><div><small>A 类</small><strong>24</strong></div><div><small>B 类</small><strong>37</strong></div><div><small>C 类</small><strong>183</strong></div><div><small>D 类</small><strong>82</strong></div><span>共提炼出 61 条可复核潜客</span></div>}
          <div className="workflow-footer"><button className="back-button" onClick={() => goToWorkflowStep(1)}>← 返回</button>{screeningState !== 'done' ? <button className="primary-button" disabled={screeningState === 'running'} onClick={() => { setScreeningState('running'); window.setTimeout(() => { setScreeningState('done'); notify('326 条数据筛选完成'); }, 1300); }}>{screeningState === 'running' ? '筛选进行中…' : '开始筛选 326 条数据'}</button> : <button className="primary-button" onClick={() => goToWorkflowStep(3)}>查看并复核 A / B 名单 →</button>}</div>
        </section>
      );
    } else if (workflowStep === 3) {
      stepContent = (
        <section className="workflow-card wide-card">
          <div className="workflow-card-head"><span className="step-kicker">步骤 4 / 7</span><h2>复核进入潜客池的用户</h2><p>系统已提炼 61 条 A / B 记录。你可以查看证据、取消勾选，或打开详情修改判断。</p></div>
          <div className="review-toolbar"><label><input type="checkbox" checked={reviewSelection.length === leads.length} onChange={() => setReviewSelection(reviewSelection.length === leads.length ? [] : leads.map((lead) => lead.id))}/> 全选当前页</label><div><span>已选择 <strong>{reviewSelection.length}</strong> / 61 条</span><button onClick={() => setReviewSelection([])}>清空选择</button></div></div>
          <div className="workflow-review-list">
            {leads.map((lead) => <article className={reviewSelection.includes(lead.id) ? 'selected' : ''} key={lead.id}><label><input type="checkbox" checked={reviewSelection.includes(lead.id)} onChange={() => toggleNumber(reviewSelection, lead.id, setReviewSelection)} /><span className={`avatar avatar-${lead.id}`}>{lead.name.slice(0,1)}</span></label><div className="review-identity"><strong>{lead.name}</strong><small>{lead.source} · {lead.location}</small></div><span className={`grade grade-${lead.grade.toLowerCase()}`}>{lead.grade}</span><div className="review-intent"><strong>{lead.intent}</strong><p>{lead.context}</p></div><div className="review-reason"><small>模型证据</small><p>{lead.evidence}</p></div><button onClick={() => setSelectedLead(lead)}>查看</button></article>)}
          </div>
          <div className="pagination-note">当前展示 4 条演示记录 · 实际任务共 61 条</div>
          <div className="workflow-footer"><button className="back-button" onClick={() => goToWorkflowStep(2)}>← 返回筛选结果</button><button className="primary-button" disabled={reviewSelection.length === 0} onClick={() => goToWorkflowStep(4)}>确认名单，开始账号核验 →</button></div>
        </section>
      );
    } else if (workflowStep === 4) {
      stepContent = (
        <section className="workflow-card">
          <div className="workflow-card-head"><span className="step-kicker">步骤 5 / 7</span><h2>把作者 ID 核验成可沟通账号</h2><p>src_author_id 只代表数据里的作者标识，必须核验后才能作为真实 account_id 使用。</p></div>
          <div className="identity-warning"><span>≠</span><p><strong>不要直接把 src_author_id 当成 account_id</strong>核验会结合平台、用户主页和来源内容，无法确认的记录进入人工队列。</p></div>
          <div className="verification-table"><div className="verification-head"><span>潜客</span><span>src_author_id</span><span>核验结果</span><span>可信度</span></div>{leads.slice(0,3).map((lead,index) => <div className="verification-row" key={lead.id}><div><span className={`avatar avatar-${lead.id}`}>{lead.name.slice(0,1)}</span><strong>{lead.name}</strong></div><code>{lead.handle}</code>{accountChecked ? <strong className={index === 2 ? 'needs-manual' : 'verified-account'}>{index === 2 ? '需人工确认' : `xhs_${lead.id}•••${27 + lead.id}`}</strong> : <span className="pending-account">等待核验</span>}<span>{accountChecked ? (index === 2 ? '—' : `${96-index*3}%`) : '—'}</span></div>)}</div>
          {accountChecked && <div className="verification-summary"><span>✓</span><div><strong>49 个账号自动核验成功</strong><p>12 个账号需要人工打开平台主页确认，未核验记录不会进入发送队列。</p></div><button onClick={() => notify('已打开人工核验队列')}>处理 12 条</button></div>}
          <div className="workflow-footer"><button className="back-button" onClick={() => goToWorkflowStep(3)}>← 返回名单</button>{!accountChecked ? <button className="primary-button" onClick={() => { setAccountChecked(true); notify('账号批量核验完成'); }}>开始批量核验</button> : <button className="primary-button" onClick={() => goToWorkflowStep(5)}>使用已核验账号，生成话术 →</button>}</div>
        </section>
      );
    } else if (workflowStep === 5) {
      stepContent = (
        <section className="workflow-card wide-card">
          <div className="workflow-card-head"><span className="step-kicker">步骤 6 / 7</span><h2>逐条确认首轮沟通话术</h2><p>话术结合评论和原帖上下文生成。勾选表示审核通过，不勾选的用户不会发送。</p></div>
          <div className="message-review-grid">{leads.slice(0,3).map((lead) => <article className={messageSelection.includes(lead.id) ? 'selected' : ''} key={lead.id}><header><div><span className={`avatar avatar-${lead.id}`}>{lead.name.slice(0,1)}</span><div><strong>{lead.name}</strong><small><span className={`grade mini grade-${lead.grade.toLowerCase()}`}>{lead.grade}</span>{lead.intent}</small></div></div><label><input type="checkbox" checked={messageSelection.includes(lead.id)} onChange={() => toggleNumber(messageSelection, lead.id, setMessageSelection)} />通过</label></header><blockquote>“{lead.context}”</blockquote><label className="message-editor"><span>拟发送内容</span><textarea defaultValue={lead.message}/></label><footer><button onClick={() => notify('已根据上下文重新生成一版')}>重新生成</button><span>{messageSelection.includes(lead.id) ? '✓ 已审核' : '暂不发送'}</span></footer></article>)}</div>
          <div className="compliance-bar"><span>!</span><p>话术不能伪装成真实使用者，不能做疗效保证，也不能在用户拒绝后继续触达。当前设置为每条发送前人工确认。</p></div>
          <div className="workflow-footer"><button className="back-button" onClick={() => goToWorkflowStep(4)}>← 返回账号核验</button><button className="primary-button" disabled={messageSelection.length === 0} onClick={() => goToWorkflowStep(6)}>确认 {messageSelection.length} 条话术并继续 →</button></div>
        </section>
      );
    } else {
      stepContent = taskStarted ? (
        <section className="workflow-card success-card">
          <span className="success-mark">✓</span><p className="eyebrow">任务已启动</p><h2>发送队列和回复监控已经开始</h2><p>本轮共纳入 {messageSelection.length} 个演示账号。系统会按计划执行，并在出现新回复时生成下一步建议。</p>
          <div className="running-task"><div><span className="live-pulse"/><div><strong>医美获客实验 · 2026-08-27</strong><small>运行中 · 下一次检查约 12 分钟后</small></div></div><dl><div><dt>待发送</dt><dd>{messageSelection.length}</dd></div><div><dt>监控会话</dt><dd>{messageSelection.length}</dd></div><div><dt>新回复</dt><dd>0</dd></div><div><dt>需人工接管</dt><dd>0</dd></div></dl></div>
          <div className="success-actions"><button className="secondary-button" onClick={() => { setWorkflowStep(0); setWorkflowFile(''); setTaskStarted(false); setScreeningState('idle'); }}>新建另一批任务</button><button className="primary-button" onClick={() => setActiveNav('monitoring')}>进入监控中心 →</button></div>
        </section>
      ) : (
        <section className="workflow-card">
          <div className="workflow-card-head"><span className="step-kicker">步骤 7 / 7</span><h2>确认授权并启动任务</h2><p>启动后系统只处理本次确认过的名单和话术；遇到登录、验证码、风控或拒绝会立即停下。</p></div>
          <div className="launch-summary"><div><small>数据批次</small><strong>{workflowFile || '演示数据.xlsx'}</strong></div><div><small>进入发送队列</small><strong>{messageSelection.length} 条</strong></div><div><small>监控间隔</small><select defaultValue="15"><option value="15">每 15 分钟</option><option value="30">每 30 分钟</option><option value="60">每 60 分钟</option></select></div><div><small>无新回复时</small><strong>不调用模型</strong></div></div>
          <div className="permission-list">
            {[['account','我确认使用的是已授权的业务账号'],['content','我已经审核本轮发送名单和话术'],['risk','我了解验证码、风控和用户拒绝会触发人工接管']].map(([key,label]) => <label className={permissionChecks.includes(key) ? 'checked' : ''} key={key}><input type="checkbox" checked={permissionChecks.includes(key)} onChange={() => togglePermission(key)} /><span>{permissionChecks.includes(key) ? '✓' : ''}</span><p>{label}</p></label>)}
          </div>
          <div className="launch-boundary"><strong>系统可以做</strong><p>按审核队列执行、定时检查新回复、生成建议、记录状态。</p><strong>系统不会做</strong><p>绕过平台风控、批量养号、伪装真实体验、未经确认持续群发。</p></div>
          <div className="workflow-footer"><button className="back-button" onClick={() => goToWorkflowStep(5)}>← 返回话术审核</button><button className="primary-button" disabled={permissionChecks.length < 3} onClick={() => { setTaskStarted(true); setMonitoring(true); notify('任务已创建并启动监控'); }}>创建任务并启动监控</button></div>
        </section>
      );
    }

    return (
      <>
        <section className="workflow-hero">
          <div><span className="demo-mode">交互原型 · 演示模式</span><p className="eyebrow">从数据到会话的操作入口</p><h1>新建一批潜客运营任务</h1><p>跟着步骤完成，系统不会在你确认前执行任何外部动作。</p></div>
          <div className="task-meta"><small>当前任务</small><strong>TASK-20260827-01</strong><span>草稿自动保存</span></div>
        </section>
        <div className="workflow-layout">
          <aside className="workflow-steps">
            <div className="workflow-steps-head"><strong>任务流程</strong><span>{Math.round(((workflowStep + (taskStarted ? 1 : 0)) / workflowSteps.length) * 100)}%</span></div>
            <div className="progress-line"><i style={{ width: `${Math.round(((workflowStep + (taskStarted ? 1 : 0)) / workflowSteps.length) * 100)}%` }}/></div>
            {workflowSteps.map(([title, detail], index) => <button key={title} className={`${index === workflowStep ? 'active' : ''} ${index < workflowStep || taskStarted ? 'done' : ''}`} disabled={index > workflowStep} onClick={() => index <= workflowStep && goToWorkflowStep(index)}><span>{index < workflowStep || taskStarted ? '✓' : index + 1}</span><div><strong>{title}</strong><small>{detail}</small></div></button>)}
            <div className="workflow-help"><span>?</span><div><strong>不确定下一步？</strong><p>每一步都可以先保存退出，不会丢失当前选择。</p></div></div>
          </aside>
          <div className="workflow-main">{stepContent}</div>
        </div>
      </>
    );
  }

  function Overview() {
    return (
      <>
        <section className="hero-row">
          <div>
            <p className="eyebrow">今日工作台</p>
            <h1>早上好，先处理这 8 条话术</h1>
            <p>最近一次筛选在 09:18 完成，系统只把 A / B 类潜客带入后续流程。</p>
          </div>
          <div className="hero-actions">
            <button className="secondary-button" onClick={() => setActiveNav('screening')}>查看本批结果</button>
            <button className="primary-button" onClick={() => setActiveNav('workflow')}>＋ 新建获客任务</button>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card"><span className="stat-icon blue">⌁</span><div><small>本批原始数据</small><strong>326</strong><em>条评论与原帖</em></div></article>
          <article className="stat-card"><span className="stat-icon green">◎</span><div><small>A / B 潜客</small><strong>61</strong><em className="positive">18.7% 命中率</em></div></article>
          <article className="stat-card"><span className="stat-icon amber">✓</span><div><small>待审核话术</small><strong>{Math.max(0, 8 - approved.length)}</strong><em>需要人工确认</em></div></article>
          <article className="stat-card"><span className="stat-icon violet">↻</span><div><small>新回复</small><strong>{newReplies}</strong><em>来自 4 个会话</em></div></article>
        </section>

        <section className="pipeline-card">
          <div className="section-title-row"><div><h2>本批处理进度</h2><p>医美线索_20260803-04.xlsx</p></div><span className="complete-pill">筛选已完成</span></div>
          <div className="pipeline">
            {[
              ['01', '导入数据', '326 条'], ['02', 'AI 筛选', 'A 24 · B 37'], ['03', '人工复核', '完成 53 条'],
              ['04', '账号核验', '待核验 12 条'], ['05', '话术审核', '待处理 8 条'], ['06', '发送与监控', '进行中'],
            ].map(([num, title, detail], index) => (
              <div className={`pipeline-step ${index < 3 ? 'done' : index === 3 ? 'current' : ''}`} key={num}>
                <div className="step-track"><span>{index < 3 ? '✓' : num}</span></div>
                <strong>{title}</strong><small>{detail}</small>
              </div>
            ))}
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="panel leads-panel">
            <div className="section-title-row">
              <div><h2>高价值潜客</h2><p>优先展示近期最值得沟通的 A / B 用户</p></div>
              <button className="text-button" onClick={() => setActiveNav('leads')}>查看全部 61 条 →</button>
            </div>
            {renderLeadTable(true)}
          </section>

          <aside className="panel review-panel">
            <div className="section-title-row"><div><h2>需要你处理</h2><p>话术发送前必须人工确认</p></div><span className="count-badge">{Math.max(0, 8 - approved.length)}</span></div>
            {reviewCards.map((lead) => (
              <article className={`review-card ${approved.includes(lead.id) ? 'approved' : ''}`} key={lead.id}>
                <div className="review-user"><span className={`avatar avatar-${lead.id}`}>{lead.name.slice(0, 1)}</span><div><strong>{lead.name}</strong><small><span className={`grade mini grade-${lead.grade.toLowerCase()}`}>{lead.grade}</span>{lead.intent}</small></div></div>
                <blockquote>“{lead.context}”</blockquote>
                <div className="draft"><span>建议话术</span><p>{lead.message}</p></div>
                {approved.includes(lead.id) ? <div className="approved-state">✓ 已通过，等待发送</div> : <div className="review-actions"><button onClick={() => setSelectedLead(lead)}>编辑</button><button className="approve-button" onClick={() => approveLead(lead.id)}>通过</button></div>}
              </article>
            ))}
          </aside>
        </div>
      </>
    );
  }

  function Screening() {
    return (
      <>
        <section className="hero-row compact-hero"><div><p className="eyebrow">Skill 01 · 线索筛选</p><h1>批次与筛选结果</h1><p>保留客户原始表，只提炼进入运营流程所需的 A / B 名单。</p></div><button className="primary-button" onClick={() => setShowImport(true)}>＋ 导入新批次</button></section>
        <div className="two-column">
          <section className="panel batch-panel">
            <div className="section-title-row"><div><h2>处理批次</h2><p>客户原始 Excel 不在这里重复维护</p></div></div>
            {batches.map((batch, index) => <article className={`batch-row ${index === 0 ? 'active' : ''}`} key={batch.name}>
              <span className="file-icon">X</span><div className="batch-name"><strong>{batch.name}</strong><small>{batch.time} · 原始 {batch.total} 条</small></div>
              <div className="batch-count"><strong>{batch.a + batch.b}</strong><small>A/B 潜客</small></div><span className="complete-pill">{batch.status}</span>
            </article>)}
          </section>
          <aside className="panel grade-panel">
            <div className="section-title-row"><div><h2>本批分类</h2><p>326 条数据的结构化结果</p></div></div>
            {[['A', 24, '明确需求，近期有决策信号'], ['B', 37, '有需求，但信息仍需补全'], ['C', 183, '互动或弱意向，暂不进入名单'], ['D', 82, '非目标、广告或无效信息']].map(([g, n, d]) => <div className="grade-row" key={g}><span className={`grade grade-${String(g).toLowerCase()}`}>{g}</span><div><strong>{n} 条</strong><small>{d}</small></div><div className="grade-bar"><i style={{ width: `${Math.max(12, Number(n) / 2)}%` }} /></div></div>)}
          </aside>
        </div>
        <section className="panel criteria-panel"><div className="section-title-row"><div><h2>当前评分维度</h2><p>每条记录都保留证据，不只给一个模型结论</p></div><button className="text-button" onClick={() => setActiveNav('rules')}>调整规则 →</button></div><div className="criteria-grid">{[['01','行业相关性','原帖与评论是否属于目标医美场景'],['02','需求明确度','是否说清项目、痛点或想解决的问题'],['03','决策信号','时间、预算、机构比较与求推荐'],['04','可联系性','作者身份是否可核验，账号映射是否可信'],['05','风险排除','广告、同行、无效互动与医疗安全风险']].map(([n,t,d]) => <article key={n}><span>{n}</span><strong>{t}</strong><p>{d}</p></article>)}</div></section>
      </>
    );
  }

  function LeadsView() {
    return (
      <><section className="hero-row compact-hero"><div><p className="eyebrow">A / B 可沟通名单</p><h1>潜客池</h1><p>这里是原始数据的提炼结果，也是会话运营唯一使用的名单。</p></div><button className="primary-button" onClick={() => notify('已导出 61 条 A/B 潜客名单')}>导出名单</button></section>
      <section className="panel"><div className="toolbar"><div className="segmented">{(['全部','A','B'] as const).map((item) => <button className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item === '全部' ? '全部 61' : `${item} 类`}</button>)}</div><label className="search-box">⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索用户、项目或地区" /></label><select aria-label="状态"><option>全部状态</option><option>待审核话术</option><option>待账号核验</option><option>已进入监控</option></select></div>{renderLeadTable(false)}</section></>
    );
  }

  function Conversations() {
    return (
      <><section className="hero-row compact-hero"><div><p className="eyebrow">Skill 02 · 会话运营</p><h1>会话中心</h1><p>有新回复才调用模型；每次只携带摘要、最近消息和业务规则。</p></div><span className="live-pill"><i /> 增量监控中</span></section>
      <section className="conversation-layout panel">
        <div className="thread-list"><div className="thread-filter"><strong>最近会话</strong><span>{newReplies} 条新回复</span></div>{leads.slice(0,3).map((lead, index) => <button className={index === 0 ? 'active' : ''} key={lead.id}><span className={`avatar avatar-${lead.id}`}>{lead.name.slice(0,1)}</span><div><strong>{lead.name}<time>{index === 0 ? '10:24' : '昨天'}</time></strong><p>{index === 0 ? '我主要是想改善下颌线…' : lead.context}</p></div>{index === 0 && <i className="unread-dot" />}</button>)}</div>
        <div className="chat-window"><header><div><strong>小满今天早睡</strong><span><span className="grade mini grade-a">A</span> 超声炮 / 面部提升</span></div><button onClick={() => setSelectedLead(leads[0])}>查看潜客档案</button></header><div className="chat-body"><div className="context-chip">来自原帖：上海超声炮到底怎么选？先看这 4 点</div><div className="message incoming">想做超声炮，上海有推荐吗？主要想改善下颌线，最近正在看机构。<time>昨天 18:46</time></div><div className="message outgoing">看到你在问超声炮，我前阵子也集中做过一轮功课。你更在意下颌线的效果，还是恢复期呀？<time>昨天 18:52 · 已发送</time></div><div className="new-divider"><span>1 条新回复</span></div><div className="message incoming">我主要是想改善下颌线，也怕做了没什么效果。<time>今天 10:24</time></div><div className="ai-suggestion"><header><span>✦ 基于新回复生成</span><small>需人工确认</small></header><textarea defaultValue="明白，你更在意的是实际提升效果。你之前有做过类似项目吗？如果是第一次，我可以把我当时判断机构和方案时用的几个问题发你参考。"/><div><button>重新生成</button><button className="approve-button" onClick={() => notify('回复已进入待发送队列')}>确认并发送</button></div></div></div></div>
      </section></>
    );
  }

  function Monitoring() {
    return (
      <><section className="hero-row compact-hero"><div><p className="eyebrow">增量拉取，不做全量重跑</p><h1>监控任务</h1><p>任务只检查是否出现新回复；没有新内容时不会调用模型。</p></div><button className="primary-button" onClick={() => { setNewReplies((n) => n + 1); notify('本轮检查完成：发现 1 条新回复'); }}>立即检查一次</button></section>
      <div className="monitor-grid"><section className="panel monitor-main"><div className="section-title-row"><div><h2>小红书会话监控</h2><p>任务 ID · MON-XHS-0827</p></div><label className="switch"><input type="checkbox" checked={monitoring} onChange={(e) => setMonitoring(e.target.checked)} /><span /></label></div><div className="monitor-status"><div className={`radar ${monitoring ? '' : 'paused'}`}><i /><b /></div><div><strong>{monitoring ? '正在运行' : '已暂停'}</strong><p>{monitoring ? '下一次检查：约 12 分钟后' : '恢复后将继续增量检查'}</p></div></div><div className="monitor-metrics"><div><small>检查间隔</small><strong>15 分钟</strong></div><div><small>监控会话</small><strong>29 个</strong></div><div><small>今日模型调用</small><strong>11 次</strong></div><div><small>空轮询</small><strong>68 次</strong></div></div><div className="log-list"><h3>最近运行记录</h3>{[['10:30:04','发现 1 条新回复，已生成建议话术','success'],['10:15:02','未发现新内容，跳过模型调用','quiet'],['10:00:03','未发现新内容，跳过模型调用','quiet'],['09:45:06','发现 2 条新回复，1 条需人工接管','warning']].map(([time,text,status]) => <div key={time}><time>{time}</time><span className={`log-dot ${status}`} /> <p>{text}</p></div>)}</div></section><aside className="panel boundary-panel"><h2>自动化边界</h2><p>出现以下情况，任务会停止自动动作并提醒人工。</p>{['登录失效或出现验证码','平台返回风控提示','用户拒绝继续沟通','涉及诊断、疗效承诺等医疗风险','上下文不足，无法确认回复对象'].map((item) => <div key={item}><span>!</span><p>{item}</p></div>)}<button onClick={() => setActiveNav('rules')}>查看完整规则</button></aside></div></>
    );
  }

  function Rules() {
    const ruleGroups: [string, string, string[][]][] = [
      ['筛选规则','决定谁能进入 A / B 潜客池',[['A 类最低分','85 分'],['B 类最低分','65 分'],['重复用户处理','按作者 ID 合并']]],
      ['发送权限','所有外部动作都必须有明确授权',[['首轮私信','人工审核'],['后续回复','人工审核'],['拒绝后再次触达','禁止']]],
      ['监控与成本','只对活跃会话做增量检查',[['检查间隔','15 分钟'],['无新回复','不调用模型'],['上下文窗口','摘要 + 最近 6 条消息']]],
    ];
    return (
      <><section className="hero-row compact-hero"><div><p className="eyebrow">流程配置</p><h1>规则设置</h1><p>把模型判断、人工权限与平台边界分开配置。</p></div><button className="primary-button" onClick={() => notify('规则草稿已保存')}>保存草稿</button></section><div className="rules-layout">
        {ruleGroups.map(([title,desc,items]) => <section className="panel rule-card" key={title}><div><h2>{title}</h2><p>{desc}</p></div>{items.map(([label,value]) => <button key={label}><span>{label}</span><strong>{value}</strong><b>›</b></button>)}</section>)}
      </div></>
    );
  }

  const views: Record<NavKey, () => React.ReactNode> = { workflow: Workflow, overview: Overview, screening: Screening, leads: LeadsView, conversations: Conversations, monitoring: Monitoring, rules: Rules };
  const ActiveView = views[activeNav];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>线</span><div><strong>线索雷达</strong><small>潜客运营台</small></div></div>
        <div className="workspace"><span className="workspace-icon">医</span><div><small>当前项目</small><strong>医美获客实验</strong></div><b>⌄</b></div>
        <nav>{navItems.map((item) => <button className={activeNav === item.key ? 'active' : ''} key={item.key} onClick={() => setActiveNav(item.key)}><span>{item.icon}</span>{item.label}{item.badge && <b>{item.key === 'conversations' ? newReplies : item.badge}</b>}</button>)}</nav>
        <div className="sidebar-footer"><div className="safe-status"><i />自动化边界正常</div><button><span className="avatar avatar-me">B</span><div><strong>Bramble</strong><small>管理员</small></div><b>•••</b></button></div>
      </aside>

      <section className="main-area">
        <header className="topbar"><div className="crumb">医美获客实验 <span>/</span> {navItems.find((n) => n.key === activeNav)?.label}</div><div className="top-actions"><button className="icon-button" aria-label="搜索">⌕</button><button className="icon-button notification" aria-label="通知">♢<i /></button><button className="help-button">? <span>使用说明</span></button></div></header>
        <div className="content"><ActiveView /></div>
      </section>

      {selectedLead && <div className="overlay" onMouseDown={() => setSelectedLead(null)}><aside className="drawer" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">潜客详情</p><h2>{selectedLead.name}</h2></div><button onClick={() => setSelectedLead(null)}>×</button></header><div className="drawer-body"><div className="profile-block"><span className={`avatar large avatar-${selectedLead.id}`}>{selectedLead.name.slice(0,1)}</span><div><strong>{selectedLead.name}</strong><small>{selectedLead.source} · {selectedLead.location}</small></div><span className={`grade grade-${selectedLead.grade.toLowerCase()}`}>{selectedLead.grade}</span><b>{selectedLead.score}<small>分</small></b></div><div className="id-compare"><div><small>数据作者 ID</small><strong>{selectedLead.handle}</strong></div><span>≠</span><div><small>已确认 account_id</small><strong>{selectedLead.accountId}</strong></div></div><section className="detail-section"><h3>原帖与评论上下文</h3><div className="source-context"><small>原帖</small><strong>关于{selectedLead.intent}，真实体验和避坑建议</strong><p>从同一条 doc_url 关联的原帖与评论中提取。</p></div><blockquote>“{selectedLead.context}”</blockquote></section><section className="detail-section"><h3>判断依据</h3><div className="score-grid">{[['行业相关',19],['需求明确',20],['决策信号',18],['身份可信',17],['风险排除',18]].map(([label,n]) => <div key={String(label)}><span>{label}</span><b>{n}/20</b><i><em style={{width:`${Number(n)*5}%`}}/></i></div>)}</div><p className="evidence-note">模型证据：{selectedLead.evidence}</p></section><section className="detail-section"><h3>建议首轮话术</h3><textarea defaultValue={selectedLead.message}/><p className="safety-note">不会伪装成真实使用者，也不承诺医疗效果；发送前需要人工确认。</p></section></div><footer><button onClick={() => setSelectedLead(null)}>暂不处理</button><button className="primary-button" onClick={() => { approveLead(selectedLead.id); setSelectedLead(null); }}>确认进入待发送</button></footer></aside></div>}

      {showImport && <div className="modal-backdrop" onMouseDown={() => setShowImport(false)}><section className="import-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowImport(false)}>×</button><span className="upload-icon">⇧</span><h2>导入羚羊数据</h2><p>上传客户提供的 Excel。系统只读取并生成本批 A / B 提炼名单，不会复制维护整张原始表。</p><label className="drop-zone"><input type="file" accept=".xlsx,.xls,.csv"/><strong>点击选择文件</strong><span>支持 .xlsx / .xls / .csv，单文件不超过 50 MB</span></label><div className="import-note"><span>✓</span><p><strong>导入后自动完成</strong>原帖关联检查、A/B/C/D 分类、五维评分和重复用户合并。</p></div><button className="primary-button full" onClick={() => { setShowImport(false); notify('演示批次已创建，正在进行结构检查'); }}>开始解析</button></section></div>}

      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}
