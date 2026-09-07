export type Prospect = {
  id: number; name: string; handle: string; grade: 'A' | 'B' | 'C' | 'D'; score: number;
  intent: string; context: string; evidence: string; location: string;
  status: string; source: string; accountId: string; message: string;
};
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
