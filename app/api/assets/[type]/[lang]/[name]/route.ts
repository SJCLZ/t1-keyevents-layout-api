import { NextRequest, NextResponse } from 'next/server';
import { getAsset, isConfigured, ensureSchema } from '@/lib/db';

// 资源内容会更新，不使用静态路由缓存。
export const dynamic = 'force-dynamic';

const CROSS_ORIGIN_ASSET_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CROSS_ORIGIN_ASSET_HEADERS });
}

function streamBuffer(data: Buffer): ReadableStream<Uint8Array> {
  const chunkSize = 64 * 1024;
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= data.length) {
        controller.close();
        return;
      }
      const end = Math.min(offset + chunkSize, data.length);
      controller.enqueue(new Uint8Array(data.buffer, data.byteOffset + offset, end - offset));
      offset = end;
    },
  });
}

// GET /api/assets/logo/sp/startrader_logo_official.png
export async function GET(
  _req: NextRequest,
  { params }: { params: { type: string; lang: string; name: string } },
) {
  try {
    const { type, lang, name } = params;

    if (!(await isConfigured())) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 503 });
    }
    await ensureSchema();
    const asset = await getAsset(lang, type, name);
    if (asset) {
      // Stream large CJK fonts so Vercel does not buffer them into the 4.5 MB
      // function response payload limit.
      return new NextResponse(streamBuffer(asset.data), {
        status: 200,
        headers: {
          'Content-Type': asset.content_type,
          'Cache-Control': 'public, max-age=3600',
          'ETag': `"${asset.sha}"`,
          'X-Asset-Source': 'database',
          ...CROSS_ORIGIN_ASSET_HEADERS,
        },
      });
    }

    return NextResponse.json({ error: `Asset ${lang}/${type}/${name} not found` }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
