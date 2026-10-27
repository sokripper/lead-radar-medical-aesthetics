// Only use the original URL supplied with the source record. Never reconstruct
// a post URL from a user ID or substitute a search/home page for the original.
export function originalPostUrl(value?: string): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (!(host === 'xiaohongshu.com' || host.endsWith('.xiaohongshu.com') || host === 'xhslink.com' || host === 'www.xhslink.com')) return null;
    return url.pathname !== '/' ? url.href : null;
  } catch { return null; }
}
