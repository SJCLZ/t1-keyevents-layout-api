import { NextResponse } from 'next/server';
import { isConfigured } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    configured: await isConfigured(),
    time: new Date().toISOString(),
  });
}