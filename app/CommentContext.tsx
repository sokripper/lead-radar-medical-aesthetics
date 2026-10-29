import { presentName } from './preview-scenarios';
import type { Prospect } from './operations-state';
import type { CommentTarget } from './comment-outreach';
import { originalPostUrl } from './source-data';

export default function CommentContext({ lead, snapshot }: { lead: Prospect; snapshot?: CommentTarget }) {
  const post = snapshot?.post || lead.sourcePost;
  const url = originalPostUrl(post?.url);
  return <section className="thread-context" aria-label="主帖与用户评论">
    <div className="thread-post">
      <div className="thread-caption"><span>主帖</span>{url && <a href={url} target="_blank" rel="noreferrer">查看原帖 ↗</a>}</div>
      {post ? <><h4>{post.title}</h4><p>{post.content}</p><small>{presentName(post.authorName)}</small></> : <p className="thread-missing">主帖内容缺失</p>}
    </div>
    {(snapshot?.kind || lead.targetKind) !== "post" && <div className="thread-comment"><div className="thread-caption"><span>用户原评论</span><strong>{presentName(snapshot?.commentId.startsWith("preview-") ? lead.name : snapshot?.userName || lead.name)}</strong></div><p>{snapshot?.text || lead.context || '评论正文缺失'}</p></div>}
    {post && <details className="thread-location"><summary>定位信息</summary><dl><dt>主帖 ID</dt><dd>{post.id}</dd><dt>发帖人 ID</dt><dd>{post.authorId}</dd>{(snapshot?.kind || lead.targetKind) !== 'post' && <><dt>评论 ID</dt><dd>{snapshot?.commentId || lead.commentId || '缺失'}</dd></>}</dl></details>}
  </section>;
}
