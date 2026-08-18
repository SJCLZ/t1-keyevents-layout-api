import { NextRequest, NextResponse } from 'next/server';
import { readLayout, writeLayout, isConfigured, ensureSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/layouts/sp — 读 SP 模板
export async function GET(
  _req: NextRequest,
  { params }: { params: { lang: string } },
) {
  if (!(await isConfigured())) {
    return NextResponse.json({ error: 'DATABASE_URL not set in Vercel env' }, { status: 503 });
  }
  try {
    await ensureSchema();
    const row = await readLayout(params.lang);
    if (!row) {
      return NextResponse.json({ error: `Layout ${params.lang} not found` }, { status: 404 });
    }
    return NextResponse.json(row.data, {
      headers: {
        ETag: `"${row.sha}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/layouts/sp — 写 SP 模板(自动保存,带 ETag 乐观锁)
export async function PUT(
  req: NextRequest,
  { params }: { params: { lang: string } },
) {
  if (!(await isConfigured())) {
    return NextResponse.json({ error: 'DATABASE_URL not set in Vercel env' }, { status: 503 });
  }
  const ifMatch = req.headers.get('If-Match');
  const expectedSha = ifMatch ? ifMatch.replace(/^"|"$/g, '') : undefined;
  try {
    await ensureSchema();
    const body = await req.json();
    const message = body.message || `Update ${params.lang}`;
    const data = body.data || body;
    const { sha } = await writeLayout(params.lang, data, message, expectedSha);
    return NextResponse.json(
      { ok: true, sha, lang: params.lang },
      { headers: { ETag: `"${sha}"`, 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (e: any) {
    if (e.statusCode === 409) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}