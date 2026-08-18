import { NextResponse } from 'next/server';
import { listAssets, isConfigured, ensureSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/assets?lang=sp&type=logo
export async function GET(req: Request) {
  if (!(await isConfigured())) {
    return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 503 });
  }
  try {
    await ensureSchema();
    const url = new URL(req.url);
    const lang = url.searchParams.get('lang') || undefined;
    const type = url.searchParams.get('type') || undefined;
    const assets = await listAssets(lang, type);
    return NextResponse.json({ assets, count: assets.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}