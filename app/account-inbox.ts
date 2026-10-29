import type { CommentTarget } from './comment-outreach';
import type { Prospect, SendStatus } from './operations-state';

export type InboxMessage = {
  id: string; accountId: string; userId?: string; userName: string;
  text: string; receivedAt: string;
  association?: { taskId: number; leadId: number };
  status?: string;
  replyText?: string; replyStatus?: SendStatus; quotaModel?: "A" | "G";
};
export type CommentCandidate = {
  taskId: number; leadId: number; accountId: string; taskName: string;
  target: CommentTarget; lead: Prospect; replyText: string;
};
const terms = ['代运营','商旅','旅游','收费','价格','流量','转化','投放','达人','招聘','外包','美容','合作','内容','品牌','团队','预算','账号'];
// Candidate hints only: keywords never silently confirm a source comment.
export function matchComments(message: InboxMessage, records: CommentCandidate[]) {
  return records.filter(record => record.accountId === message.accountId)
    .filter(record => !message.userId || record.target.userId === message.userId)
    .map(record => {
      const content = `${record.target.post.title} ${record.target.post.content} ${record.target.text} ${record.replyText}`;
      const keywords = terms.filter(term => message.text.includes(term) && content.includes(term));
      const sameUser = Boolean(message.userId && record.target.userId === message.userId);
      return {...record, keywords, sameUser};
    }).filter(record => record.sameUser || record.keywords.length > 0)
    .sort((a,b) => Number(b.sameUser)-Number(a.sameUser) || b.keywords.length-a.keywords.length);
}

export function newestMessages(messages: InboxMessage[]):InboxMessage[] {
  const key=(m:InboxMessage)=>m.receivedAt.replace(/[^0-9]/g,'').padEnd(14,'0');
  return [...messages].sort((a,b)=>key(b).localeCompare(key(a)));
}
