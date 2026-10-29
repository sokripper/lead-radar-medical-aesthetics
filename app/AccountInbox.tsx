"use client";
import {useState} from 'react';
import type {ManagedAccount} from './account-management';
import {matchComments, type InboxMessage, type CommentCandidate} from './account-inbox';
import CommentContext from './CommentContext';
import {presentName} from './preview-scenarios';
import type { SendStatus } from './operations-state';
import {StatusPill} from './WorkspaceUI';

type Props = {
  previewTools?:boolean;
  accounts:ManagedAccount[]; monitoring:Record<string,boolean>; messages:InboxMessage[];
  records:CommentCandidate[]; accountId:string|null;
  onAccount:(id:string|null)=>void; onToggle:(id:string)=>void;
  onSimulate:(id:string,unmatched:boolean)=>void;
  onAssociate:(id:string,record:CommentCandidate)=>void;
  onOpen:(message:InboxMessage)=>void;
  onReply:(id:string,text:string)=>void; onReplyResult:(id:string,result:SendStatus)=>void;
  replyAllowed:(message:InboxMessage)=>boolean;
};
export default function AccountInbox(props:Props) {
  const {previewTools=false,accounts,monitoring,messages,records,accountId,onAccount,onToggle,onSimulate,onAssociate,onOpen,onReply,onReplyResult,replyAllowed}=props;
  const [selected,setSelected]=useState<string|null>(null);
  const [candidateKey,setCandidateKey]=useState('');
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('all');
  const [page,setPage]=useState(1);
  const [drafts,setDrafts]=useState<Record<string,string>>({});
  const account=accounts.find(a=>a.id===accountId);
  const accountMessages=messages.filter(m=>m.accountId===accountId);
  const filtered=accountMessages.filter(m=>(filter==='all'||(filter==='unlinked'?!m.association:m.association&&m.status===filter))&&`${m.userName} ${m.text}`.includes(search.trim()));
  const pages=Math.max(1,Math.ceil(filtered.length/10));
  const currentPage=Math.min(page,pages);
  const visible=filtered.slice((currentPage-1)*10,currentPage*10);
  const active=filtered.find(m=>m.id===selected) || visible[0];
  const candidates=active&&!active.association ? matchComments(active,records):[];
  const candidate=candidates.find(c=>`${c.taskId}:${c.leadId}`===candidateKey)||candidates[0];
  const linked=active?.association ? records.find(c=>c.taskId===active.association?.taskId&&c.leadId===active.association?.leadId):undefined;
  const state=(a:ManagedAccount)=>a.status!=='正常'?'账号异常':monitoring[a.id]===false?'已暂停':'监控中';
  if(!account) return <section className="surface account-inbox-overview">
    <div className="section-heading"><div><h2>评论账号</h2><p>按账号查看收到的私信，再关联原评论。</p></div></div>
    {!accounts.length ? <div className="empty-state">暂无分配给你的评论账号。</div> : <div className="table-wrap"><table className="account-inbox-table"><thead><tr><th>账号</th><th>监控状态</th><th>收到私信</th><th>待关联</th><th>待跟进</th><th>最新私信</th><th>操作</th></tr></thead><tbody>{accounts.map(a=>{
      const items=messages.filter(m=>m.accountId===a.id);
      const pending=items.filter(m=>m.association&&!['已完成','已关闭','已转人工'].includes(m.status||'待处理')).length;
      return <tr key={a.id}><td><strong>{a.name}</strong><small>{a.platform} · {a.handle}</small></td><td><StatusPill status={state(a)} /></td><td>{items.length}</td><td>{items.filter(m=>!m.association).length}</td><td>{pending}</td><td><span className="inbox-latest">{items[0]?.text || '暂无私信'}</span></td><td><button className="button text" onClick={()=>{onAccount(a.id);setSelected(null);setSearch('');setFilter('all');setPage(1);}}>查看私信</button></td></tr>;
    })}</tbody></table></div>}
  </section>;
  return <>
    <section className="surface inbox-account-head">
      <button className="button text" onClick={()=>onAccount(null)}>← 返回账号列表</button>
      <div className="inbox-account-title"><div className="inbox-account-avatar">{account.name[0]}</div><div><h2>{account.name}</h2><p>{account.platform} · {account.handle}</p></div><StatusPill status={state(account)} /><button className="button secondary" disabled={account.status!=='正常'} onClick={()=>onToggle(account.id)}>{monitoring[account.id]===false?'恢复监控':'暂停监控'}</button></div>
      <div className="inbox-account-counts"><span><strong>{accountMessages.length}</strong> 条私信</span><span><strong>{accountMessages.filter(m=>!m.association).length}</strong> 待关联</span></div>
    </section>
    <section className="surface account-inbox-workspace">
      <div className="account-inbox-toolbar"><input aria-label="搜索账号下的私信" placeholder="搜索用户或私信内容" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/><select aria-label="私信关联状态" value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}}><option value="all">全部私信</option><option value="unlinked">待关联原评论</option>{["待处理","等待发送结果","已完成","发送失败","结果待核实"].map(s=><option key={s} value={s}>{s}</option>)}</select>{previewTools && <details className="inbox-demo"><summary>测试收信</summary><div><button className="button secondary" disabled={account.status!=='正常'||monitoring[account.id]===false} onClick={()=>onSimulate(account.id,false)}>模拟收到业务私信</button><button className="button secondary" disabled={account.status!=='正常'||monitoring[account.id]===false} onClick={()=>onSimulate(account.id,true)}>模拟无关联私信</button></div></details>}</div>
      {!accountMessages.length ? <div className="empty-state"><h3>这个账号还没有收到私信</h3><p>新私信会显示在这里，无需先绑定评论任务。</p></div> : !filtered.length ? <div className="empty-state">没有符合条件的私信。</div> : <div className="account-inbox-columns">
        <div className="inbox-message-list"><div className="inbox-message-list-body">{visible.map(m=><button className={`inbox-message-item ${active?.id===m.id?'active':''}`} key={m.id} onClick={()=>{setSelected(m.id);setCandidateKey('');}}><div><strong>{m.userName}</strong><StatusPill status={m.association?m.status||'待处理':'待关联'} /></div><p>{m.text}</p><small>{m.receivedAt}</small></button>)}</div><div className="inbox-pagination"><span>{filtered.length} 条</span><button className="button text" aria-label="上一页私信" disabled={currentPage===1} onClick={()=>{setPage(currentPage-1);setSelected(null);}}>‹</button><span>{currentPage}/{pages}</span><button className="button text" aria-label="下一页私信" disabled={currentPage===pages} onClick={()=>{setPage(currentPage+1);setSelected(null);}}>›</button></div></div>
        {active && <div className="inbox-message-detail"><div className="inbox-detail-title"><h3>{active.userName}</h3><span>{active.receivedAt}</span></div><div className="inbox-incoming-message"><span>收到的私信</span><p>{active.text}</p></div>
          {active.association ? <section className="inbox-association"><div className="inbox-association-title"><h4>{linked?'已关联原评论':'历史私信记录'}</h4>{active.id.startsWith("legacy-") && <button className="button secondary" onClick={()=>onOpen(active)}>查看历史对话</button>}</div>{linked&&<CommentContext lead={linked.lead} snapshot={linked.target}/>}</section> : <section className="inbox-association"><div className="inbox-association-title"><h4>关联原评论</h4><span>{candidates.length?`${candidates.length} 条候选`:'暂无匹配'}</span></div>
            {candidate ? <><p className="inbox-match-hint">{candidate.sameUser?'同账号、同一用户':'关键词候选，身份待确认'}{candidate.keywords.length?` · ${candidate.keywords.join('、')}`:''}</p><select aria-label="选择关联的原评论" value={`${candidate.taskId}:${candidate.leadId}`} onChange={e=>setCandidateKey(e.target.value)}>{candidates.map(c=><option value={`${c.taskId}:${c.leadId}`} key={`${c.taskId}:${c.leadId}`}>{presentName(c.target.userName)} · {c.target.text.slice(0,36)} · {c.taskName}</option>)}</select><CommentContext lead={candidate.lead} snapshot={candidate.target}/><button className="button primary" onClick={()=>onAssociate(active.id,candidate)}>确认关联这条评论</button></> : <p className="inbox-unmatched">私信已保留。暂未找到对应的已发送评论，可稍后再次查看。</p>}
          </section>}
          {active.association && !active.id.startsWith("legacy-") && <section className="inbox-reply-composer">
            {active.replyText ? <><div className="inbox-outgoing-message"><span>我方回复</span><p>{active.replyText}</p><StatusPill status={active.replyStatus || "待执行"}/>{active.replyStatus === "发送失败" && <p className="inbox-result-note">本条未发送成功，未扣除发送额度。</p>}{active.replyStatus === "结果待核实" && <p className="inbox-result-note">正在核对发送结果，请勿重复提交。</p>}</div>{previewTools && ["待执行","执行中"].includes(active.replyStatus || "") && <details className="inbox-result-demo"><summary>测试发送结果</summary><div>{(["发送成功","发送失败","结果待核实"] as SendStatus[]).map(result=><button key={result} className="button secondary" disabled={account.status !== "正常"} onClick={()=>onReplyResult(active.id,result)}>模拟{result}</button>)}</div></details>}</> : <><label>回复私信<textarea aria-label="账号私信回复内容" placeholder="结合用户的私信内容回复" value={drafts[active.id] || ""} onChange={e=>setDrafts({...drafts,[active.id]:e.target.value})}/></label><div className="inbox-reply-actions"><span>{replyAllowed(active)?"确认后由当前账号发送":"账号或额度暂不可用"}</span><button className="button primary" disabled={!drafts[active.id]?.trim() || !replyAllowed(active)} onClick={()=>onReply(active.id,drafts[active.id])}>确认发送私信</button></div></>}
          </section>}
        </div>}
      </div>}
    </section>
  </>;
}
