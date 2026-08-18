import { NextResponse } from 'next/server';
import { isConfigured } from '@/lib/github';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    configured: isConfigured(),
    time: new Date().toISOString(),
  });
}