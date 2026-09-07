import type { CSSProperties } from 'react';

const paths: Record<string, string> = {
  data: 'M4 4h16v16H4z M4 9h16 M9 9v11',
  chat: 'M21 11a8 8 0 0 1-8 8H7l-4 3V11a9 9 0 0 1 18 0Z M7 10h10 M7 14h6',
  folder: 'M3 7V4h7l2 3h9v13H3Z',
  upload: 'M12 16V3 M7 8l5-5 5 5 M4 15v6h16v-6',
  file: 'M14 2H5v20h14V7Z M14 2v6h5 M8 12h8 M8 16h6',
  arrow: 'M5 12h14 M14 7l5 5-5 5',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12 M6 18 18 6',
  settings: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
  search: 'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  down: 'm6 9 6 6 6-6',
  clock: 'M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',
  shield: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6Z m-5 10 3 3 5-6',
  info: 'M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  plus: 'M12 5v14 M5 12h14',
  back: 'M19 12H5 m5-5-5 5 5 5',
};
export default function Icon({ name, size = 20, style }: { name: string; size?: number; style?: CSSProperties }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={paths[name] || paths.data} /></svg>;
}
