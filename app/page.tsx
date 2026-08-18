export const dynamic = 'force-dynamic';

export default async function Home() {
  const owner = process.env.GITHUB_OWNER || '(unset)';
  const repo = process.env.GITHUB_REPO || '(unset)';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const path = process.env.LAYOUTS_PATH || 'skills/04_parameterized_video/tools/editor/layouts';
  const hasToken = !!process.env.GITHUB_TOKEN;

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '40px', maxWidth: '720px', margin: '0 auto' }}>
      <h1>T1_KeyEvents Layouts API</h1>
      <p>GitHub 仓库的 templates 转发层。读写通过 GitHub Contents API。</p>

      <h2>配置</h2>
      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td style={td}>GITHUB_OWNER</td><td style={td}>{owner}</td></tr>
          <tr><td style={td}>GITHUB_REPO</td><td style={td}>{repo}</td></tr>
          <tr><td style={td}>GITHUB_BRANCH</td><td style={td}>{branch}</td></tr>
          <tr><td style={td}>LAYOUTS_PATH</td><td style={td}>{path}</td></tr>
          <tr><td style={td}>GITHUB_TOKEN</td><td style={td}>{hasToken ? '✓ 已配置' : '✗ 未配置'}</td></tr>
        </tbody>
      </table>

      <h2>端点</h2>
      <pre style={pre}>
{`GET  /api/layouts                          # 列出所有语言
GET  /api/layouts/sp                       # 读 SP 模板
PUT  /api/layouts/sp                       # 写 SP 模板 (If-Match: "<sha>")
GET  /api/layouts/health                   # 健康检查`}
      </pre>

      <h2>用法</h2>
      <p>编辑器(skills/04_parameterized_video/tools/editor/index.html)可以
        <code>fetch('/api/layouts/sp')</code> 代替直接读
        <code>layouts/sp.json</code>。</p>
      <p>本地开发时仍可用 <code>file://</code> 打开编辑器直接读本地文件。</p>

      <h2>部署</h2>
      <p>推到 GitHub → Vercel 自动部署。需要在 Vercel 项目设置环境变量:</p>
      <ul>
        <li><code>GITHUB_TOKEN</code> — Personal Access Token with <code>repo</code> scope</li>
        <li><code>GITHUB_OWNER</code>, <code>GITHUB_REPO</code>, <code>GITHUB_BRANCH</code>, <code>LAYOUTS_PATH</code></li>
      </ul>
    </main>
  );
}

const td = { padding: '6px 12px', border: '1px solid #ccc' } as const;
const pre = { background: '#f4f4f4', padding: '12px', borderRadius: '4px', fontSize: '13px' } as const;