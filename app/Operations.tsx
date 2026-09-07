'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Icon from './Icon';
import { toggleId, prepareDemoRecipients, readyRecipients, type Prospect } from './operations-state';

type View = 'screening' | 'leads' | 'workflow';
type Grade = Prospect['grade'];
type Platform = '小红书' | '抖音';
type Batch = { id: number; name: string; ids: number[]; time: string };
type Queue = { ids: number[]; blocked: number[]; included: number[]; drafts: Record<number, string> };
type Task = { id: number; name: string; ids: number[]; texts: Record<number,string>; senders: Record<number,string>; paused: boolean; interval: string; replies: number[]; followups: Record<number,string> };
const platform = (lead: Prospect): Platform => lead.source.includes('抖音') ? '抖音' : '小红书';
const emptyQueue = (): Queue => ({ids:[], blocked:[], included:[], drafts:{}});
const gradeLabels = { A:'高意向', B:'有需求', C:'弱意向', D:'已排除' };

function Sheet({ open, title, subtitle, children, footer, onClose, wide = false }: {open:boolean; title:string; subtitle?:string; children:ReactNode; footer?:ReactNode; onClose:()=>void; wide?:boolean}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className={`side-sheet ${wide ? 'wide' : ''}`} onCancel={onClose} onClick={(event) => {if(event.target === event.currentTarget) onClose();}}>
    <div className="sheet-shell"><header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" aria-label="关闭面板" onClick={onClose}><Icon name="close"/></button></header><div className="sheet-scroll">{children}</div>{footer && <footer>{footer}</footer>}</div>
  </dialog>;
}

export default function Operations({ leads, view, navigate }: {leads:Prospect[]; view:View; navigate:(view:View)=>void}) {
  const [batches,setBatches] = useState<Batch[]>([]);
  const [batchId,setBatchId] = useState(0);
  const [selected,setSelected] = useState<number[]>([]);
  const [grades,setGrades] = useState<Record<number,Grade>>(() => Object.fromEntries(leads.map((lead)=>[lead.id,lead.grade])));
  const [filter,setFilter] = useState('AB');
  const [search,setSearch] = useState('');
  const [file,setFile] = useState<File|null>(null);
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState('');
  const [settings,setSettings] = useState(false);
  const [industry,setIndustry] = useState('医美');
  const [region,setRegion] = useState('全国');
  const [identity,setIdentity] = useState('咨询团队（示例身份）');
  const [accounts,setAccounts] = useState<Record<Platform,boolean>>({'小红书':true,'抖音':true});
  const [interval,setIntervalValue] = useState('15');
  const [dragging,setDragging] = useState(false);
  const [queue,setQueue] = useState<Queue>(emptyQueue);
  const [preparing,setPreparing] = useState(false);
  const [reviewOpen,setReviewOpen] = useState(false);
  const [detailId,setDetailId] = useState<number|null>(null);
  const [tasks,setTasks] = useState<Task[]>([]);
  const [replyTaskId,setReplyTaskId] = useState<number|null>(null);
  const [replyId,setReplyId] = useState<number|null>(null);
  const [replyText,setReplyText] = useState('');
  const uploadRef = useRef<HTMLInputElement>(null);
  const current = batches.find((batch)=>batch.id === batchId);
  const poolIds = [...new Set(batches.flatMap((batch)=>batch.ids))];
  const contacted = tasks.flatMap((task)=>task.ids);
  const ids = view === 'leads' ? poolIds : current?.ids || [];
  const available = (id:number) => ['A','B'].includes(grades[id]) && !contacted.includes(id);
  const rows = leads.filter((lead)=>ids.includes(lead.id));
  const visible = rows.filter((lead)=>(filter === 'ALL' || (filter === 'AB' ? ['A','B'].includes(grades[lead.id]) : grades[lead.id] === filter)) && `${lead.name}${lead.intent}${lead.context}${lead.location}`.includes(search.trim()));
  const actionable = selected.filter((id)=>ids.includes(id) && available(id));
  const verifiedRows = leads.filter((lead)=>queue.ids.includes(lead.id) && !queue.blocked.includes(lead.id));
  const ready = readyRecipients(leads,queue,grades,contacted,accounts);
  const detail = leads.find((lead)=>lead.id === detailId);
  const unread = tasks.reduce((sum,task)=>sum+task.replies.filter((id)=>!task.followups[id]).length,0);
  const activeReplyTask = tasks.find((task)=>task.id === replyTaskId);
  const replyLead = leads.find((lead)=>lead.id === replyId);
  const accountCount = Object.values(accounts).filter(Boolean).length;

  function chooseFile(candidate?:File) {
    if (!candidate) return;
    if (!/\.(xlsx|xls|csv)$/i.test(candidate.name)) { setNotice('请选择 Excel 或 CSV 文件。'); return; }
    if(candidate.size > 50*1024*1024) {setNotice('文件不能超过 50 MB。');return;}
    setFile(candidate);setNotice('');
  }
  function runSample(useFile=false) {
    if(busy) return;
    const id = batches.length+1;
    const name = useFile && file ? file.name : `医美需求样本 ${String(id).padStart(2,'0')}`;
    setBusy(true);setNotice('');
    window.setTimeout(()=>{
      const item = {id,name,ids:leads.map((lead)=>lead.id),time:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})};
      setBatches((items)=>[item,...items]);setBatchId(id);setSelected(leads.filter((lead)=>['A','B'].includes(grades[lead.id]) && !contacted.includes(lead.id)).map((lead)=>lead.id));
      setFilter('AB');setSearch('');setBusy(false);setFile(null);
      setNotice('示例筛选已完成。结果已保留，不会自动发送消息。');
    },800);
  }
  function switchBatch(id:number) {setBatchId(id);setSelected([]);setSearch('');setFilter('AB');}
  function demoMessage(lead:Prospect) {
    const intro = `你好，我是${identity.trim()}。`;
    const messages:Record<number,string> = {
      1:'看到你提到想在上海改善下颌线，最近也在比较机构。你更想先了解怎么选机构，还是面诊时该问哪些问题？',
      2:'看到你在比较法令纹填充材料，也提到预算一万左右、担心不自然。你现在主要想了解材料区别，还是怎么判断方案是否适合自己？',
      3:'看到你在问双眼皮恢复多久能上班。你是已经有安排，还是先了解一下恢复期？具体时间还是要让面诊医生结合情况判断。',
      4:'看到你在纠结皮秒去痘印需不需要做好几次。你更想先了解次数和费用，还是先弄清自己的痘印是否适合这个项目？'
    };
    return intro + (messages[lead.id] || `看到你在关注${lead.intent}，想先了解你目前最关心的问题。`);
  }
  function prepare() {
    if(!actionable.length || preparing) return;
    if(!identity.trim()) {setSettings(true);setNotice('先填写真实的对外身份，再生成沟通内容。');return;}
    const plan = prepareDemoRecipients(actionable,poolIds,contacted);
    setPreparing(true);setReviewOpen(true);
    window.setTimeout(()=>{
      setQueue((old)=>({ids:plan.candidates,blocked:plan.blocked,included:plan.matched,drafts:{...old.drafts,...Object.fromEntries(leads.filter((lead)=>plan.matched.includes(lead.id)).map((lead)=>[lead.id,old.drafts[lead.id] || demoMessage(lead)]))}}));
      setPreparing(false);
    },650);
  }
  function send() {
    if(!ready.length || preparing) return;
    const outgoing = ready.map((lead)=>lead.id);
    setTasks((items)=>[...items,{id:items.length+1,name:`触达任务 ${String(items.length+1).padStart(2,'0')}`,ids:outgoing,texts:Object.fromEntries(ready.map((lead)=>[lead.id,queue.drafts[lead.id]])),senders:Object.fromEntries(ready.map((lead)=>[lead.id,`${platform(lead)} · 演示业务账号`])),paused:false,interval,replies:[],followups:{}}]);
    setQueue(emptyQueue());
    setSelected((old)=>old.filter((id)=>!outgoing.includes(id)));setReviewOpen(false);navigate('workflow');
    setNotice(`已记录 ${outgoing.length} 条演示发送，未发送的用户仍保留在原名单。后续回复会进入待处理列表，未执行真实发送。`);
  }
  function exportList() {
    const content = [['用户','平台','等级','地区','评论','依据'],...rows.map((lead)=>[lead.name,platform(lead),grades[lead.id],lead.location,lead.context,lead.evidence])].map((row)=>row.map((cell)=>`"${cell.replaceAll('"','""')}"`).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\ufeff'+content],{type:'text/csv;charset=utf-8;'}));
    const a=document.createElement('a');a.href=url;a.download='线索雷达-示例名单.csv';a.click();URL.revokeObjectURL(url);
  }
  function selectAll() {
    const selectable=visible.filter((lead)=>available(lead.id)).map((lead)=>lead.id);
    setSelected((old)=>selectable.every((id)=>old.includes(id)) ? old.filter((id)=>!selectable.includes(id)) : [...new Set([...old,...selectable])]);
  }
  function simulateReply(task:Task) {
    const id=task.ids.find((entry)=>!task.replies.includes(entry));
    if(id===undefined || task.paused) return;
    setTasks((items)=>items.map((item)=>item.id === task.id ? {...item,replies:[...item.replies,id]} : item));
    setNotice('收到一条示例回复，请在任务内确认跟进内容。');
  }

  return <>
    <div className="page-heading"><div><div className="eyebrow">{view === 'workflow' ? 'ENGAGE' : 'WORKSPACE'}</div><h1>{view === 'screening' ? '数据处理' : view === 'leads' ? '历史名单' : '触达与跟进'}</h1><p>{view === 'screening' ? '把数据变成可用名单，后面的事由你决定。' : view === 'leads' ? '复用已筛选的用户，不必重新上传。' : '集中处理发送记录、新回复和需要关注的异常。'}</p></div><button className="button secondary account-trigger" onClick={()=>setSettings(true)}><Icon name="settings" size={17}/><span>账号与规则</span><i className={accountCount ? 'status-dot' : 'status-dot amber'}/></button></div>
    {notice && <div className="notice" role="status"><Icon name="info" size={17}/><span>{notice}</span><button className="icon-button" aria-label="关闭提示" onClick={()=>setNotice('')}><Icon name="close" size={16}/></button></div>}
    {view === 'screening' && <>
      {!current && !busy ? <div className="start-grid"><section className="surface import-surface"><div className="section-heading"><h2>开始一批新数据</h2><span className="subtle-tag">Excel / CSV</span></div><div className={`upload-zone ${dragging ? 'dragging' : ''}`} onDragOver={(event)=>{event.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={(event)=>{event.preventDefault();setDragging(false);chooseFile(event.dataTransfer.files[0]);}}><div className="upload-symbol"><Icon name="upload" size={30}/></div><h3>{file ? file.name : '将数据文件拖到这里'}</h3><p>{file ? '文件已选择，可以预览后续操作' : '上传羚羊导出的数据，自动完成结构识别与筛选'}</p><button className="button primary" onClick={()=>file ? runSample(true) : uploadRef.current?.click()}><Icon name={file ? 'spark' : 'plus'} size={17}/>{file ? '预览筛选结果' : '选择数据文件'}</button><small>支持 .xlsx、.xls、.csv · 最大 50 MB</small></div><div className="sample-entry"><div><strong>先看看完整流程？</strong><span>使用 6 条虚构样本体验筛选与发送确认</span></div><button className="button text" onClick={()=>runSample()}>体验示例数据 <Icon name="arrow" size={16}/></button></div><p className="prototype-note"><Icon name="info" size={15}/>当前为交互原型。文件仅记录名称，筛选使用示例数据，不读取真实内容。</p></section><aside className="surface rule-summary"><div className="section-heading"><h2>本次筛选</h2><button className="button text" onClick={()=>setSettings(true)}>调整</button></div><dl><div><dt>目标行业</dt><dd>{industry}</dd></div><div><dt>地区范围</dt><dd>{region}</dd></div></dl><div className="rule-audience"><span className="grade grade-a">A</span><div><strong>高意向用户</strong><p>有明确需求和决策信号</p></div></div><div className="rule-audience"><span className="grade grade-b">B</span><div><strong>有需求用户</strong><p>需求清晰，部分信息待补充</p></div></div><div className="quiet-note"><Icon name="shield" size={18}/><p>只生成结果。<br/>未经确认，不会发送任何消息。</p></div></aside></div> :
      <section className="surface compact-import"><div className="compact-import-icon"><Icon name="file"/></div><div><strong>{busy ? '正在处理新批次' : current?.name}</strong><small>{busy ? '字段识别、原帖关联与筛选将自动完成' : `示例数据 · ${current?.time} 处理完成 · ${industry} / ${region}`}</small></div><button className="button secondary" disabled={busy} onClick={()=>uploadRef.current?.click()}><Icon name="plus" size={17}/>上传新批次</button>{file && <button className="button primary" disabled={busy} onClick={()=>runSample(true)}>预览新批次结果</button>}</section>}
    </>}
    <input ref={uploadRef} type="file" accept=".xlsx,.xls,.csv" aria-label="选择数据文件" className="visually-hidden" onChange={(event)=>{chooseFile(event.target.files?.[0]);event.target.value='';}}/>
    {(view === 'screening' || view === 'leads') && (busy ? <section className="surface processing"><span className="loading-ring"/><h2>正在整理这批数据</h2><p>自动识别字段、关联上下文、合并重复用户并判断需求。</p><span className="subtle-tag">演示处理中 · 不执行外部动作</span></section> : ids.length > 0 ? <section className="surface result-surface"><div className="section-heading result-heading"><div><h2>{view === 'leads' ? '全部历史用户' : '筛选结果'} <span className="count">{rows.length}</span></h2><p>{rows.filter((lead)=>['A','B'].includes(grades[lead.id])).length} 位 A/B 用户 · 结果已保留，可随时开展沟通</p></div><div className="inline-actions">{view === 'screening' && batches.length>1 && <select aria-label="切换数据批次" value={batchId} onChange={(event)=>switchBatch(Number(event.target.value))}>{batches.map((batch)=><option value={batch.id} key={batch.id}>{batch.name}</option>)}</select>}<button className="button secondary" onClick={exportList}><Icon name="upload" size={16} style={{transform:'rotate(180deg)'}}/>导出</button></div></div><div className="result-toolbar"><div className="filter-tabs" aria-label="按等级筛选">{[['AB','A/B 潜客'],['ALL','全部'],['C','弱意向'],['D','已排除']].map(([key,label])=><button key={key} className={filter === key ? 'active' : ''} aria-pressed={filter === key} onClick={()=>setFilter(key)}>{label}<span>{key === 'ALL' ? rows.length : rows.filter((lead)=>key === 'AB' ? ['A','B'].includes(grades[lead.id]) : grades[lead.id]===key).length}</span></button>)}</div><label className="table-search"><Icon name="search" size={16}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="搜索用户、需求或地区" aria-label="搜索用户"/></label></div><div className="table-wrap"><table className="lead-table"><thead><tr><th><input aria-label="选择当前可联系用户" type="checkbox" checked={visible.some((lead)=>available(lead.id)) && visible.filter((lead)=>available(lead.id)).every((lead)=>selected.includes(lead.id))} onChange={selectAll}/></th><th>用户</th><th>意向等级</th><th>需求与判断依据</th><th>地区</th><th/></tr></thead><tbody>{visible.map((lead)=><tr key={lead.id} className={selected.includes(lead.id) ? 'selected' : ''}><td><input type="checkbox" aria-label={`选择 ${lead.name}`} checked={selected.includes(lead.id) && available(lead.id)} disabled={!available(lead.id)} onChange={()=>setSelected(toggleId(selected,lead.id))}/></td><td><div className="person"><span className={`avatar tone-${lead.id%4}`}>{lead.name[0]}</span><div><strong>{lead.name}</strong><small><span className={`platform-dot ${platform(lead)==='抖音'?'dark':''}`}/>{platform(lead)}{contacted.includes(lead.id) && ' · 已加入任务'}</small></div></div></td><td><label className={`grade-choice grade-${grades[lead.id].toLowerCase()}`}><select aria-label={`调整 ${lead.name} 的等级`} value={grades[lead.id]} onChange={(event)=>{setGrades((old)=>({...old,[lead.id]:event.target.value as Grade}));setSelected((old)=>old.filter((id)=>id!==lead.id));}}>{(['A','B','C','D'] as Grade[]).map((grade)=><option key={grade} value={grade}>{grade} · {gradeLabels[grade]}</option>)}</select></label></td><td><div className="need"><strong>{lead.intent}</strong><p>{lead.context}</p><small>{grades[lead.id] !== lead.grade ? '人工调整分类 · ' : ''}{lead.evidence}</small></div></td><td className="location-cell">{lead.location}</td><td><button className="button text" onClick={()=>setDetailId(lead.id)}>详情 <Icon name="arrow" size={14}/></button></td></tr>)}</tbody></table>{!visible.length && <div className="table-empty">没有符合当前条件的记录</div>}</div><div className="selection-bar"><div><span className="selection-count">{actionable.length}</span><strong>位用户已选择</strong><button className="button text" disabled={!selected.length} onClick={()=>setSelected([])}>清空</button></div><button className="button primary" disabled={!actionable.length || preparing} onClick={prepare}><Icon name="spark" size={17}/>生成沟通内容 <Icon name="arrow" size={16}/></button></div></section> : view === 'leads' ? <section className="surface empty-state"><Icon name="folder" size={36}/><h2>还没有历史名单</h2><p>完成一批数据处理后，结果会保留在这里。</p><button className="button primary" onClick={()=>navigate('screening')}>去上传数据</button></section> : null)}
    {view === 'workflow' && <>
      <div className="engage-summary"><div><strong>{tasks.length}</strong><span>触达任务</span></div><div><strong>{contacted.length}</strong><span>已纳入用户</span></div><div><strong className={unread?'blue-text':''}>{unread}</strong><span>待确认回复</span></div><span className="quiet-inline"><Icon name="shield" size={16}/>所有发送均需你确认</span></div>
      {queue.ids.some((id)=>!contacted.includes(id)) && <section className="draft-resume"><span className="draft-icon"><Icon name="file"/></span><div><strong>一批沟通内容等待确认</strong><p>{queue.ids.filter((id)=>!contacted.includes(id)).length} 位用户 · 已保留本次编辑</p></div><button className="button primary" onClick={()=>setReviewOpen(true)}>继续确认 <Icon name="arrow" size={16}/></button></section>}
      {!tasks.length ? <section className="surface empty-state"><Icon name="chat" size={38}/><h2>还没有触达任务</h2><p>从筛选结果选人，确认沟通内容后，<br/>发送记录和后续回复都会出现在这里。</p><button className="button primary" onClick={()=>navigate(poolIds.length ? 'leads' : 'screening')}>{poolIds.length ? '从已有名单选人' : '先处理一批数据'}<Icon name="arrow" size={16}/></button></section> :
      <div className="task-list">{tasks.map((task)=><section className="surface task-card" key={task.id}><div className="section-heading"><div><h2>{task.name}<span className={`subtle-tag ${task.paused?'':'green'}`}>{task.paused?'已暂停':'演示运行中'}</span></h2><p>{task.ids.length} 位用户 · 回复检查间隔 {task.interval} 分钟</p></div><div className="inline-actions"><button className="button secondary" onClick={()=>setTasks((items)=>items.map((item)=>item.id===task.id?{...item,paused:!item.paused}:item))}>{task.paused?'恢复':'暂停'}</button><button className="button secondary" disabled={task.paused || task.replies.length===task.ids.length} onClick={()=>simulateReply(task)}>模拟新回复</button></div></div>{task.ids.map((id)=>{const lead=leads.find((item)=>item.id===id)!;return <details className="task-person" key={id}><summary><div className="person"><span className={`avatar tone-${id%4}`}>{lead.name[0]}</span><div><strong>{lead.name}</strong><small>{task.senders[id]}</small></div></div><span className={task.replies.includes(id)&&!task.followups[id]?'reply-tag':'muted'}>{task.followups[id]?'已记录跟进':task.replies.includes(id)?'新回复 · 待确认':'首轮已记录（演示）'}</span><Icon name="down" size={17}/></summary><div className="task-conversation"><p className="message-caption">首轮沟通内容</p><p>{task.texts[id]}</p>{task.replies.includes(id) && <><p className="message-caption">用户回复 · 示例</p><blockquote>可以，想再了解一下。</blockquote>{task.followups[id]?<p>{task.followups[id]}</p>:<button className="button primary" disabled={task.paused} onClick={()=>{setReplyTaskId(task.id);setReplyId(id);setReplyText('可以，你先说说最想了解的问题。涉及具体方案，需要由专业人员结合实际情况确认。');}}>处理这条回复</button>}</>}</div></details>;})}</section>)}</div>}
    </>}
    <Sheet open={settings} onClose={()=>setSettings(false)} title="账号与规则" subtitle="配置一次，后续任务直接使用。" footer={<><span className="muted">当前会话内生效</span><button className="button primary" disabled={!identity.trim() || !industry.trim()} onClick={()=>setSettings(false)}>完成</button></>}>
      <section className="settings-section"><h3>平台账号</h3><p>每个平台使用对应账号。这里仅模拟配置状态。</p>{(['小红书','抖音'] as Platform[]).map((name)=><div className="account-row" key={name}><span className={`platform-logo ${name==='抖音'?'dark':''}`}>{name==='抖音'?'抖':'红'}</span><div><strong>{name}演示账号</strong><small>{accounts[name]?'已配置 · 仅演示':'未配置 · 不可发送'}</small></div><label className="toggle"><input aria-label={`启用${name}演示账号`} type="checkbox" checked={accounts[name]} onChange={(event)=>setAccounts((old)=>({...old,[name]:event.target.checked}))}/><span/></label></div>)}</section>
      <section className="settings-section"><h3>筛选规则</h3><label className="field">目标行业<input value={industry} onChange={(event)=>setIndustry(event.target.value)}/></label><label className="field">地区范围<input value={region} onChange={(event)=>setRegion(event.target.value)}/></label><p className="field-hint">正式接入后按规则筛选；当前示例数据不随规则变化。</p></section>
      <section className="settings-section"><h3>沟通设置</h3><label className="field">对外身份<input value={identity} onChange={(event)=>setIdentity(event.target.value)}/></label><p className="field-hint">填写真实身份，不编造使用经历或治疗效果。修改后，可在确认面板重新生成示例话术。</p><label className="field">新回复检查间隔<select value={interval} onChange={(event)=>setIntervalValue(event.target.value)}><option value="15">每 15 分钟</option><option value="30">每 30 分钟</option><option value="60">每 60 分钟</option></select></label></section>
    </Sheet>
    <Sheet open={reviewOpen} onClose={()=>setReviewOpen(false)} wide title="发送前确认" subtitle={preparing?'正在准备沟通内容…':`${queue.ids.length} 位候选用户 · 核验与话术准备已自动完成（演示）`} footer={<><div><strong>{ready.length} 条可发送</strong><small>确认当前收件人和正文 · 仅演示</small></div><button className="button primary" disabled={!ready.length || preparing} onClick={send}>确认发送 {ready.length} 条<Icon name="arrow" size={17}/></button></>}>
      {preparing?<div className="processing"><span className="loading-ring"/><h3>正在为选中用户准备内容</h3><p>自动匹配账号、检查重复触达，并读取需求上下文。</p></div>:<>
        <div className="review-intro"><Icon name="shield" size={18}/><p>修改正文或取消个别人，确认后再发送。关闭面板会保留草稿。</p></div>
        {queue.blocked.length>0 && <details className="exception-box"><summary><Icon name="info" size={16}/>{queue.blocked.length} 人身份无法确认，已排除<Icon name="down" size={15}/></summary>{queue.blocked.map((id)=><p key={id}>{leads.find((lead)=>lead.id===id)?.name}：需要补充账号依据，本次不会发送。</p>)}</details>}
        {verifiedRows.filter((lead)=>!contacted.includes(lead.id)).map((lead)=><article className={`review-card ${!queue.included.includes(lead.id)?'excluded':''}`} key={lead.id}><header><div className="person"><span className={`avatar tone-${lead.id%4}`}>{lead.name[0]}</span><div><strong>{lead.name}</strong><small>{platform(lead)} · {lead.location}</small></div></div><label className="checkbox-label"><input type="checkbox" aria-label={`本次发送给 ${lead.name}`} checked={queue.included.includes(lead.id)} onChange={()=>setQueue((old)=>({...old,included:toggleId(old.included,lead.id)}))}/>本次发送</label></header><div className="review-context"><span>联系依据</span><p>{lead.evidence}</p><blockquote>{lead.context}</blockquote></div><label className="field">拟发送内容<textarea aria-label={`${lead.name}的拟发送内容`} value={queue.drafts[lead.id] || ''} onChange={(event)=>setQueue((old)=>({...old,drafts:{...old.drafts,[lead.id]:event.target.value}}))}/></label><div className="review-tools"><span className={accounts[platform(lead)]?'sender-label':'sender-label unavailable'}>{accounts[platform(lead)]?<><Icon name="check" size={14}/>{platform(lead)} · 演示业务账号</>:<><Icon name="info" size={14}/>{platform(lead)}账号未配置 · 暂不发送</>}</span><button className="button text" disabled={!identity.trim()} onClick={()=>setQueue((old)=>({...old,drafts:{...old.drafts,[lead.id]:demoMessage(lead)}}))}>重新生成示例</button></div></article>)}
        {!verifiedRows.length && <div className="empty-state"><h3>这批用户暂不可联系</h3><p>没有用户通过账号检查，未执行任何发送。</p></div>}
        <p className="review-boundary">点击确认即表示你已审核名单和内容，并有权使用对应账号联系这些用户。遇到用户拒绝或平台限制应停止。本原型不连接真实平台，不会实际发送或后台监控。</p>
      </>}
    </Sheet>
    <Sheet open={Boolean(detail)} onClose={()=>setDetailId(null)} title={detail?.name || '用户详情'} subtitle="查看筛选依据">{detail && <><div className="detail-grade"><span className={`grade grade-${grades[detail.id].toLowerCase()}`}>{grades[detail.id]}</span><strong>{gradeLabels[grades[detail.id]]}</strong><span>{detail.location} · {platform(detail)}</span></div><section className="settings-section"><h3>用户原始评论</h3><blockquote>{detail.context}</blockquote><h3>判断依据</h3><p>{detail.evidence}</p><h3>原帖关联</h3><p>当前为虚构样本，未接入原帖与父评论。正式数据应保留可追溯的来源，不补写缺失内容。</p></section></>}</Sheet>
    <Sheet open={replyId!==null} onClose={()=>{setReplyId(null);setReplyTaskId(null);}} title="确认跟进回复" subtitle={replyLead?.name} footer={<><span className="muted">仅记录演示回复</span><button className="button primary" disabled={!replyText.trim() || !activeReplyTask || activeReplyTask.paused} onClick={()=>{if(replyId===null || !activeReplyTask || activeReplyTask.paused)return;setTasks((items)=>items.map((item)=>item.id===replyTaskId?{...item,followups:{...item.followups,[replyId]:replyText}}:item));setReplyId(null);setReplyTaskId(null);setNotice('已记录本条演示跟进回复。');}}>确认回复</button></>}>
      <div className="incoming-reply"><small>用户新回复 · 示例</small><p>可以，想再了解一下。</p></div><label className="field">拟回复内容<textarea value={replyText} onChange={(event)=>setReplyText(event.target.value)} /></label><p className="field-hint">发送前可编辑；不重新执行数据筛选。</p>
    </Sheet>
  </>;
}
