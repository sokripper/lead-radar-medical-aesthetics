export function resultPage<T>(items:T[],requested:number,size:number) {
  const pageSize=[10,20,50].includes(size)?size:10;
  const pages=Math.max(1,Math.ceil(items.length/pageSize));
  const page=Math.min(pages,Math.max(1,Math.trunc(requested)||1));
  const offset=(page-1)*pageSize;
  return {rows:items.slice(offset,offset+pageSize),page,pages,pageSize,offset,total:items.length};
}
