import './globals.css';

export const metadata = {
  title: 'T1_KeyEvents 编辑器',
  description: 'STARTRADER 关键事件视频模板编辑器',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}