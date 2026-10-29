import type { Prospect, SourcePost } from './operations-state';

// Source material is retained independently of the prospect's grade or eligibility.
export function retainedPosts(leads: Prospect[]): SourcePost[] {
  return [...new Map(leads.filter(l => l.sourcePost).map(l => [l.sourcePost!.id, l.sourcePost!])).values()];
}
export function commentTarget(lead: Prospect) {
  return lead.sourcePost?.id && lead.sourcePost.authorId && lead.commentId && lead.handle ? {
    post: { ...lead.sourcePost }, commentId: lead.commentId,
    userId: lead.handle, userName: lead.name, text: lead.context,
  } : null;
}
export type CommentTarget = NonNullable<ReturnType<typeof commentTarget>>;
