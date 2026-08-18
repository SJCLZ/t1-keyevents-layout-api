import { NextResponse } from 'next/server';
import { listLayouts, isConfigured, ensureSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isConfigured())) {
    return NextResponse.json({
      error: 'DATABASE_URL not set in Vercel env',
    }, { status: 503 });
  }
  try {
    await ensureSchema();
    const langs = await listLayouts();
    return NextResponse.json({ langs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}