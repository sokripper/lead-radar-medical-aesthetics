export type Prospect = {
  id: number; name: string; handle: string; grade: 'A' | 'B' | 'C' | 'D' | '待判断'; score: number;
  intent: string; context: string; evidence: string; location: string;
  status: string; source: string; accountId: string; message: string;
};
export type SendStatus = '待执行' | '发送成功' | '发送失败' | '结果待核实' | '已取消';
export type Monitoring = { enabled: boolean; interval: string; deadline: string; paused: boolean; ended: boolean; lastCheck: string };
export const emptyMonitoring = (): Monitoring => ({enabled:false,interval:'',deadline:'',paused:false,ended:false,lastCheck:''});
export function monitorError(m: Monitoring, now = Date.now()) {
  if (!m.enabled) return '';
  if (!Number.isFinite(Number(m.interval)) || Number(m.interval)<=0 || !Number.isInteger(Number(m.interval))) return '请填写正整数检查间隔';
  if (!m.deadline || !Number.isFinite(Date.parse(m.deadline)) || Date.parse(m.deadline)<=now) return '请选择未来的截止时间';
  return '';
}
export function monitorStatus(m: Monitoring, now = Date.now()) {
  if (!m.enabled) return '未启用';
  if (m.ended) return '已结束';
  if (Date.parse(m.deadline)<=now) return '已到期';
  return m.paused ? '已暂停' : '等待检查';
}
export function canGenerate(mode: 'demo'|'formal', identity: string, attested: boolean) {
  return mode==='demo' || (Boolean(identity.trim()) && attested && !/示例|演示/.test(identity));
}
export type Adjustment = { from: Prospect['grade']; to: Prospect['grade']; reason: string; time: string; actor: string };
export function adjustGrade(from: Prospect['grade'], to: Prospect['grade'], reason: string): Adjustment {
  if (!reason.trim()) throw new Error('请填写调整原因');
  return {from,to,reason:reason.trim(),time:new Date().toISOString(),actor:'当前演示操作人'};
}
export function transitionSend(from: SendStatus, event: 'success'|'failure'|'unknown'|'retry'|'cancel'|'verified-success'|'verified-failure'): SendStatus {
  if (from==='待执行') return ({success:'发送成功',failure:'发送失败',unknown:'结果待核实',cancel:'已取消'} as const)[event as 'success'] || from;
  if (from==='发送失败' && event==='retry') return '待执行';
  if (from==='结果待核实') return event==='verified-success'?'发送成功':event==='verified-failure'?'发送失败':from;
  return from;
}
export function contactStatus(statuses: SendStatus[]) {
  if (statuses.includes('结果待核实')) return '结果待核实';
  if (statuses.includes('待执行')) return '待执行';
  if (statuses.includes('发送成功')) return '已联系';
  if (statuses.includes('发送失败')) return '发送失败';
  return '未联系';
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
  grades: Record<number,Prospect['grade']>, contacted: number[], accounts: Record<'小红书'|'抖音',boolean>,
) {
  return leads.filter((lead) => queue.ids.includes(lead.id) && !queue.blocked.includes(lead.id)
    && queue.included.includes(lead.id) && ['A','B'].includes(grades[lead.id])
    && !contacted.includes(lead.id) && accounts[lead.source.includes('抖音') ? '抖音' : '小红书']
    && Boolean(queue.drafts[lead.id]?.trim()));
}
