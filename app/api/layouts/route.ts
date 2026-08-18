import { NextResponse } from 'next/server';
import { listLayouts, isConfigured } from '@/lib/github';

export const dynamic = 'force-dynamic';  // 不缓存

export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json({
      error: 'API not configured. Set GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN env vars.',
    }, { status: 503 });
  }
  try {
    const langs = await listLayouts();
    return NextResponse.json({ langs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}