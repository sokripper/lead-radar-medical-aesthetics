export type Prospect = {
  id: number; name: string; handle: string; grade: 'A' | 'B' | 'C' | 'D' | '待判断'; score: number;
  intent: string; context: string; evidence: string; location: string;
  status: string; source: string; accountId: string; message: string;
};
export type SendStatus = '待执行' | '执行中' | '发送成功' | '发送失败' | '结果待核实' | '已取消';
export const accountStates = ['未授权','授权中','正常','已失效','受限','连接异常'] as const;
export type AccountStatus = typeof accountStates[number];
export type TodoStatus = '待处理'|'处理中'|'待确认'|'等待发送结果'|'发送失败'|'结果待核实'|'已完成'|'已转人工'|'已关闭';
export function beijingTime(value:string) { return Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(value)?value:`${value.length===10?value+'T00:00':value}+08:00`); }
export function taskStatus(results:SendStatus[],paused=false,abnormal=false) {
  if(results.includes('结果待核实'))return '有待核实项';
  const pending=results.some(s=>s==='待执行'||s==='执行中');
  if(pending&&abnormal)return '异常暂停';
  if(pending&&paused)return '已暂停';
  if(results.includes('执行中'))return '执行中';
  if(results.every(s=>s==='待执行'))return '待执行';
  if(pending)return '执行中';
  if(results.every(s=>s==='发送成功'))return '已完成';
  if(results.every(s=>s==='已取消'))return '已取消';
  return results.includes('发送成功')?'部分完成':'已结束';
}
export function todoStatus(result?:SendStatus,local:TodoStatus='待处理'):TodoStatus {
  if((!result||result==='发送失败')&&(local==='已关闭'||local==='已转人工'))return local;
  if(result==='发送成功')return '已完成';
  if(result==='待执行'||result==='执行中')return '等待发送结果';
  if(result==='发送失败'||result==='结果待核实')return result;
  if(result==='已取消')return '已关闭';
  return local;
}
export type Monitoring = { enabled: boolean; interval: string; deadline: string; paused: boolean; ended: boolean; lastCheck: string; startedAt?:number };
export const emptyMonitoring = (): Monitoring => ({enabled:false,interval:'',deadline:'',paused:false,ended:false,lastCheck:''});
export function monitorError(m: Monitoring, now = Date.now()) {
  if (!m.enabled) return '';
  if (!['30','60'].includes(m.interval)) return '请选择 30 或 60 分钟';
  if (!m.deadline || !Number.isFinite(beijingTime(m.deadline)) || beijingTime(m.deadline)<=now) return '请选择晚于当前北京时间的截止时间';
  if(beijingTime(m.deadline)>(m.startedAt||now)+7*24*60*60*1000)return '截止时间不得超过启用后 7 天';
  return '';
}
export function monitorStatus(m: Monitoring, now = Date.now(), abnormal=false) {
  if (!m.enabled) return '未启用';
  if (m.ended) return '已结束';
  if (beijingTime(m.deadline)<=now) return '已到期';
  if(abnormal)return '异常暂停';
  return m.paused ? '已暂停' : '等待检查';
}
export function reviseMonitoring(previous:Monitoring,draft:Monitoring,now=Date.now()):Monitoring{
  if(!draft.enabled)return {...emptyMonitoring(),lastCheck:previous.lastCheck};
  const active=previous.enabled&&!['已结束','已到期'].includes(monitorStatus(previous,now));
  const next={...draft,startedAt:active?(previous.startedAt||now):now,paused:active?previous.paused:false,ended:false,lastCheck:previous.lastCheck};
  const error=monitorError(next,now);if(error)throw Error(error);return next;
}
export function canGenerate(mode: 'demo'|'formal', identity: string, attested: boolean) {
  return mode==='demo' || (Boolean(identity.trim()) && attested && !/示例|演示/.test(identity));
}
export type Adjustment = { from: Prospect['grade']; to: Prospect['grade']; reason: string; time: string; actor: string };
export function adjustGrade(from: Prospect['grade'], to: Prospect['grade'], reason: string): Adjustment {
  if (!reason.trim()) throw new Error('请填写调整原因');
  return {from,to,reason:reason.trim(),time:new Date().toISOString(),actor:'当前演示操作人'};
}
export function transitionSend(from: SendStatus, event: 'start'|'success'|'failure'|'unknown'|'retry'|'cancel'|'verified-success'|'verified-failure'): SendStatus {
  if (from==='待执行') return ({start:'执行中',success:'发送成功',failure:'发送失败',unknown:'结果待核实',cancel:'已取消'} as const)[event as 'success'] || from;
  if(from==='执行中')return ({success:'发送成功',failure:'发送失败',unknown:'结果待核实'} as const)[event as 'success']||from;
  if (from==='发送失败' && event==='retry') return '待执行';
  if (from==='结果待核实') return event==='verified-success'?'发送成功':event==='verified-failure'?'发送失败':from;
  return from;
}
export function contactStatus(statuses: SendStatus[]) {
  if (statuses.includes('结果待核实')) return '结果待核实';
  if (statuses.includes('待执行')||statuses.includes('执行中')) return '待执行';
  if (statuses.includes('发送成功')) return '已联系';
  if (statuses.includes('发送失败')) return '发送失败';
  return statuses.includes('已取消')?'已取消':'未联系';
}
export function exportRows<T extends {id:number}>(scope: 'selected'|'filtered', rows:T[], selected:number[], filtered:T[]) {
  return scope==='selected' ? rows.filter(x=>selected.includes(x.id)) : filtered;
}
export function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? "'"+value : value;
  return `"${safe.replaceAll('"','""')}"`;
}
export function toggleId(ids: number[], id: number) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}
export function eligibleIds(selected: number[], verified: number[], approved: number[], contacted: number[], drafts: Record<number, string>) {
  return selected.filter((id) => verified.includes(id) && approved.includes(id) && !contacted.includes(id) && Boolean(drafts[id]?.trim()));
}
export function canConfirmSend(ready: number[], account: string, preparing: boolean) {
  return ready.length > 0 && Boolean(account) && !preparing;
}
// Deterministic prototype adapter; a real identity service replaces this fixture.
export function prepareDemoRecipients(ids: number[], pool: number[], contacted: number[]) {
  const candidates = [...new Set(ids)].filter((id) => pool.includes(id) && !contacted.includes(id));
  return { candidates, matched: candidates.filter((id) => id !== 3), blocked: candidates.filter((id) => id === 3) };
}

export function readyRecipients<T extends { id: number; source: string }>(
  leads: T[], queue: { ids:number[]; blocked:number[]; included:number[]; drafts:Record<number,string> },
  grades: Record<number,Prospect['grade']>, contacted: number[], accounts: Record<'小红书',boolean>,
  unready: number[] = [],
) {
  return leads.filter((lead) => queue.ids.includes(lead.id) && !queue.blocked.includes(lead.id)
    && queue.included.includes(lead.id) && ['A','B'].includes(grades[lead.id])
    && !contacted.includes(lead.id) && lead.source.includes('小红书') && accounts['小红书']
    && !unready.includes(lead.id) && Boolean(queue.drafts[lead.id]?.trim()));
}

export function removeSubmitted<T extends {ids:number[];blocked:number[];included:number[];drafts:Record<number,string>;edited:number[];copyKeys?:Record<number,string>}>(queue:T, submitted:number[]):T {
  const keep=(id:number)=>!submitted.includes(id);
  return {...queue,ids:queue.ids.filter(keep),blocked:queue.blocked.filter(keep),included:queue.included.filter(keep),edited:queue.edited.filter(keep),
    drafts:Object.fromEntries(Object.entries(queue.drafts).filter(([id])=>keep(Number(id)))),
    copyKeys:Object.fromEntries(Object.entries(queue.copyKeys||{}).filter(([id])=>keep(Number(id))))};
}

export function mergePreparedQueue<T extends {ids:number[];blocked:number[];included:number[];drafts:Record<number,string>;edited:number[];copyKeys?:Record<number,string>}>(queue:T, prepared:{candidates:number[];blocked:number[];matched:number[]}, generated:Record<number,string>, key:string):T {
  const fresh = Object.entries(generated).filter(([id,text]) => prepared.matched.includes(Number(id)) && queue.drafts[Number(id)] === undefined && text.trim());
  return {...queue,
    ids:[...new Set([...queue.ids,...prepared.candidates])],
    blocked:[...new Set([...queue.blocked.filter(id=>!prepared.candidates.includes(id)),...prepared.blocked])],
    included:prepared.matched,
    drafts:{...queue.drafts,...Object.fromEntries(fresh)},
    copyKeys:{...queue.copyKeys,...Object.fromEntries(fresh.map(([id])=>[id,key]))},
  };
}
