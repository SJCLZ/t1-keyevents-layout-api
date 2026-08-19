import { NextRequest, NextResponse } from 'next/server';
import { getAsset, isConfigured, ensureSchema } from '@/lib/db';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// 资源内容会更新，不使用静态路由缓存。
export const dynamic = 'force-dynamic';

// GET /api/assets/logo/sp/startrader_logo_official.png
export async function GET(
  _req: NextRequest,
  { params }: { params: { type: string; lang: string; name: string } },
) {
  try {
    const { type, lang, name } = params;

    // 优先从数据库读取；本地/新部署尚未迁移 assets 时，logo 回退到 public。
    if (await isConfigured()) {
      await ensureSchema();
      const asset = await getAsset(lang, type, name);
      if (asset) {
        const body = new Uint8Array(asset.data);
        return new NextResponse(body, {
          status: 200,
          headers: {
            'Content-Type': asset.content_type,
            'Content-Length': String(asset.size),
            'Cache-Control': 'public, max-age=3600',
            'ETag': `"${asset.sha}"`,
          },
        });
      }
    }

    if (type === 'logo' && name === 'startrader_logo_official.png' && /^[a-z]{2}$/.test(lang)) {
      try {
        const data = await readFile(join(process.cwd(), 'public', 'assets', lang, 'logo.png'));
        return new NextResponse(new Uint8Array(data), {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Content-Length': String(data.length),
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch {
        // 统一在下方返回 404。
      }
    }

    return NextResponse.json({ error: `Asset ${lang}/${type}/${name} not found` }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
