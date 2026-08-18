# T1_KeyEvents Layouts API

GitHub Contents API 转发层,让编辑器(浏览器)和 skill(本地)能通过统一 HTTP 端读写 `layouts/*.json`。

## 架构

```
┌──────────────────┐    ┌─────────────────────┐    ┌──────────────────┐
│  编辑器(浏览器) │ ─→ │  Vercel Next.js API │ ─→ │  GitHub 仓库      │
│                  │ ←─ │  (转发层)         │ ←─ │  (权威源)        │
└──────────────────┘    └─────────────────────┘    └──────────────────┘
                              ▲
                              │
                       ┌──────────────┐
                       │ skill(本地) │
                       │ git pull    │
                       └──────────────┘
```

## 端点

- `GET  /api/layouts` — 列出所有语言
- `GET  /api/layouts/:lang` — 读单个模板(返回 `ETag: "<sha>"`)
- `PUT  /api/layouts/:lang` — 写单个模板(需 `If-Match: "<sha>"` 乐观锁)
- `GET  /api/layouts/health` — 健康检查

## 本地开发

```bash
cd layout-api
npm install
cp .env.example .env.local   # 填 GitHub 凭据
npm run dev                   # → http://localhost:3000
```

## 部署到 Vercel

1. 推到 GitHub:`git push origin main`
2. 在 Vercel 导入仓库
3. 设置环境变量:
 - - `GITHUB_TOKEN` — Personal Access Token (需要 `repo` scope)
 - - `GITHUB_OWNER` — 仓库 owner
 - - `GITHUB_REPO` — 仓库 name
 - - `GITHUB_BRANCH` — 默认 `main`
 - - `LAYOUTS_PATH` — 默认 `skills/04_parameterized_video/tools/editor/layouts`
4. 部署 → 拿到 URL(类似 `t1-keyevents-layout-api.vercel.app`)

## 编辑器改造

`tools/editor/index.html` 里的 `fetchLayout()` 函数改成:

```js
const API_BASE = process.env.API_BASE || 'https://t1-keyevents-layout-api.vercel.app';
async function fetchLayout(lang) {
  const resp = await fetch(`${API_BASE}/api/layouts/${lang}`);
  if (!resp.ok) return null;
  const data = await resp.json();
  // ETag 缓存(下次 PUT 带 If-Match)
  const sha = resp.headers.get('etag')?.replace(/^"|"$/g, '');
  return { data, sha };
}
```

`btn-export` 改成 PUT:

```js
fetch(`${API_BASE}/api/layouts/${lang}`, {
  method: 'PUT',
  headers: { 'If-Match': `"${sha}"`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: layout, message: 'Update via editor' }),
});
```

## 为什么这样设计

- **数据权威源是 GitHub**:版本控制、PR 协作、永久存储
- **Vercel 只做转发**:无状态 serverless,免费层够用
- **乐观锁(ETag/If-Match)**:防止覆盖别人改动
- **编辑器开发**:可以离线读 `layouts/xx.json`,上线后读 API
- **skill**:本地 `git pull` 拉最新,不走 API(更直接)