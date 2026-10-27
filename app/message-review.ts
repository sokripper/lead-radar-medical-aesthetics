export type ReviewRecipient = {
  id: number; name: string; grade: string; scene?: string; context: string;
  text: string; status: string; edited?: boolean; issue?: string;
};

// Filtering and pagination are view state only; never change task membership.
export function reviewPage<T extends ReviewRecipient>(items: T[], query: string, grade: string, status: string, requestedPage: number, size: number) {
  const needle = query.trim().toLocaleLowerCase();
  const filtered = items.filter(item =>
    (!needle || [item.name, item.context, item.text, item.scene || ""].some(value => value.toLocaleLowerCase().includes(needle))) &&
    (grade === "全部" || item.grade === grade) &&
    (status === "全部" || (status === "待处理" ? Boolean(item.issue) : status === "已编辑" ? item.edited : item.status === status)),
  );
  const pageSize = [10, 20, 50].includes(size) ? size : 10;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(pages, Math.max(1, Math.floor(requestedPage) || 1));
  return { filtered, pages, page, pageSize, rows: filtered.slice((page - 1) * pageSize, page * pageSize) };
}
