import { NextRequest, NextResponse } from 'next/server';
import { readLayout, writeLayout, isConfigured } from '@/lib/github';

export const dynamic = 'force-dynamic';  // 不缓存

// GET /api/layouts/sp — 读 SP 模板
export async function GET(
  _req: NextRequest,
  { params }: { params: { lang: string } },
) {
  if (!isConfigured()) {
    return NextResponse.json({
      error: 'API not configured. Set GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN env vars.',
    }, { status: 503 });
  }
  const { lang } = params;
  try {
    const { data, sha } = await readLayout(lang);
    // 加 ETag header,客户端 If-Match 头可走乐观锁
    return NextResponse.json(data, {
      headers: { ETag: `"${sha}"` },
    });
  } catch (e: any) {
    if (e.status === 404) {
      return NextResponse.json({ error: `Layout ${lang} not found` }, { status: 404 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/layouts/sp — 写 SP 模板(需要 sha 做乐观锁)
export async function PUT(
  req: NextRequest,
  { params }: { params: { lang: string } },
) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'API not configured' }, { status: 503 });
  }
  const { lang } = params;
  // 读 ETag header(乐观锁)
  const ifMatch = req.headers.get('If-Match');
  const sha = ifMatch ? ifMatch.replace(/^"|"$/g, '') : undefined;
  try {
    const body = await req.json();
    const message = body.message || `Update ${lang}.json via API`;
    const { sha: newSha } = await writeLayout(lang, body.data || body, message, sha);
    return NextResponse.json(
      { ok: true, sha: newSha, lang },
      { headers: { ETag: `"${newSha}"` } },
    );
  } catch (e: any) {
    if (e.status === 409 || (e.message || '').includes('does not match')) {
      return NextResponse.json({
        error: 'Conflict: sha mismatch (someone else updated this file). GET first, then retry.',
      }, { status: 409 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}