import type { Metadata } from 'next';
import './console.css';

export const metadata: Metadata = {
  title: '线索雷达 · 潜客运营台',
  description: '从社媒数据筛选到持续会话跟进的一体化潜客运营原型',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
