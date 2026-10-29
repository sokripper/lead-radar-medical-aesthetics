import type { Prospect, SourcePost, SendStatus } from './operations-state';

export function retainedPosts(leads: Prospect[]): SourcePost[] {
  return [...new Map(leads.filter(l => l.sourcePost).map(l => [l.sourcePost!.id, l.sourcePost!])).values()];
}
export function commentTarget(lead: Prospect) {
  const post = lead.sourcePost;
  if (!post?.id || !post.authorId) return null;
  if (lead.targetKind === 'post') return {
    kind: 'post' as const, post: {...post}, commentId: '',
    userId: post.authorId, userName: post.authorName, text: post.content,
  };
  return lead.commentId && lead.handle ? {
    kind: 'comment' as const, post: {...post}, commentId: lead.commentId,
    userId: lead.handle, userName: lead.name, text: lead.context,
  } : null;
}
export type CommentTarget = Omit<NonNullable<ReturnType<typeof commentTarget>>, 'kind'> & {kind?: 'comment'|'post'};
// These are prototype fixtures. Production uses a contextual judgement, not keyword hits alone.
export function hasCommentContext(lead: Prospect) {
  return !lead.sourceIssue && Boolean(lead.context.trim() && lead.sourcePost?.content.trim() && commentTarget(lead))
    && !/^(这个可以吗[？?]?|私[。！!]?|蹲[。！!]?|联系[。！!]?|[.。…]+)$/.test(lead.context.trim());
}
export function canReply(lead: Prospect, mode: 'BULK'|'PRECISION', grade=lead.grade) {
  return lead.targetKind !== 'post' && lead.recordKind !== 'post' && hasCommentContext(lead)
    && (['A','B','C'].includes(grade) || (mode === 'BULK' && grade === 'D'));
}
// Main-post records are an action only when this task contains no corresponding user comment.
export function postActions(leads: Prospect[]): Prospect[] {
  const hasComment=new Set(leads.filter(l=>l.targetKind !== 'post' && l.recordKind !== 'post' && l.commentId && l.sourcePost)
    .map(l=>`${l.sourceTaskCode}:${l.sourcePost!.id}`));
  return leads.filter(l=>l.targetKind !== 'post' && l.recordKind === 'post' && l.sourcePost?.content.trim() && l.sourcePost.authorId
    && !hasComment.has(`${l.sourceTaskCode}:${l.sourcePost.id}`)).map(lead=>{
    const post=lead.sourcePost!;
    return {...lead,id:-lead.id,name:`主帖 · ${post.title}`,handle:post.authorId,
      targetKind:'post' as const,commentId:undefined,grade:'D' as const,context:post.content,intent:post.title,
      businessScene:undefined,sourceIssue:undefined,evidence:'没有对应用户评论，直接在主帖下评论。'};
  });
}
export function advanceCommentPlan(results: Record<number,SendStatus>, ids: number[], start=true) {
  const next={...results};
  if (!start || Object.values(next).some(s=>s==='执行中'||s==='结果待核实')) return {results:next};
  const pending=ids.find(id=>next[id]==='待执行');
  if (pending !== undefined) next[pending]='执行中';
  return {results:next};
}
