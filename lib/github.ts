import { Octokit } from '@octokit/rest';

const OWNER = process.env.GITHUB_OWNER || '';
const REPO = process.env.GITHUB_REPO || '';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
// v51+:LAYOUTS_PATH 默认空字符串(layouts 在 GitHub 仓库根目录,sp.json / ar.json / ...)
const LAYOUTS_PATH = process.env.LAYOUTS_PATH || '';
const TOKEN = process.env.GITHUB_TOKEN;

let _octokit: Octokit | null = null;
function getOctokit(): Octokit {
  if (!_octokit) {
    // v51+:传 no-cache fetch,避免 Vercel / Octokit 缓存旧版 layouts
    const noCacheFetch = (url: string, opts: any = {}) => {
      const headers = { ...opts.headers, 'Cache-Control': 'no-cache' };
      return fetch(url, { ...opts, headers, cache: 'no-store' });
    };
    _octokit = new Octokit({
      auth: TOKEN,
      userAgent: 't1-keyevents-layout-api/0.1',
      request: { fetch: noCacheFetch as any },
    });
  }
  return _octokit;
}

export function filePathForLang(lang: string): string {
  return `${LAYOUTS_PATH}/${lang}.json`;
}

export interface LayoutFile {
  name: string;
  sha: string;
  size: number;
  path: string;
}

export async function listLayouts(): Promise<string[]> {
  const octokit = getOctokit();
  const { data } = await octokit.rest.repos.getContent({
    owner: OWNER, repo: REPO, path: LAYOUTS_PATH, ref: BRANCH,
  });
  if (!Array.isArray(data)) {
    throw new Error('Expected directory listing');
  }
  return data
    .filter((f) => f.type === 'file' && f.name.endsWith('.json'))
    .map((f) => f.name.replace(/\.json$/, ''));
}

export async function readLayout(lang: string): Promise<{ data: any; sha: string }> {
  const octokit = getOctokit();
  const { data } = await octokit.rest.repos.getContent({
    owner: OWNER, repo: REPO, path: filePathForLang(lang), ref: BRANCH,
  });
  // data 可能是 file / dir / symlink 等;我们只处理 file
  const file = Array.isArray(data) ? null : (data as any);
  if (!file || file.type !== 'file') {
    throw new Error(`Expected file, got ${Array.isArray(data) ? 'directory' : file?.type}`);
  }
  // content 是 base64 编码
  const content = Buffer.from(file.content, 'base64').toString('utf-8');
  return { data: JSON.parse(content), sha: file.sha };
}

export async function writeLayout(
  lang: string,
  data: any,
  message: string,
  sha?: string,
): Promise<{ sha: string }> {
  const octokit = getOctokit();
  // 乐观锁:必须提供当前 sha 才能写(防止覆盖别人改动)
  if (!sha) {
    // PUT 时不传 sha 会失败,告知用户先 GET
    throw new Error('sha required for PUT (need to GET first to obtain current sha)');
  }
  const content = Buffer.from(JSON.stringify(data, null, 2), 'utf-8').toString('base64');
  const { data: result } = await octokit.rest.repos.createOrUpdateFileContents({
    owner: OWNER, repo: REPO, path: filePathForLang(lang),
    message, content, sha, branch: BRANCH,
  });
  return { sha: result.content?.sha || '' };
}

export function isConfigured(): boolean {
  return !!(TOKEN && OWNER && REPO);
}