import { NextRequest, NextResponse } from 'next/server';
import { getAsset, isConfigured, ensureSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/assets/logo/sp/startrader_logo_official.png
export async function GET(
  _req: NextRequest,
  { params }: { params: { type: string; lang: string; name: string } },
) {
  if (!(await isConfigured())) {
    return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 503 });
  }
  try {
    await ensureSchema();
    const { type, lang, name } = params;
    const asset = await getAsset(lang, type, name);
    if (!asset) {
      return NextResponse.json({ error: `Asset ${lang}/${type}/${name} not found` }, { status: 404 });
    }
    // 返回二进制(Buffer → ArrayBuffer)
    const body = new Uint8Array(asset.data);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': asset.content_type,
        'Content-Length': String(asset.size),
        'Cache-Control': 'public, max-age=3600',  // 1 小时缓存(asset 不常变)
        'ETag': `"${asset.sha}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}