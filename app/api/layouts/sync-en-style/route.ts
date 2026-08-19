import { NextResponse } from 'next/server';
import { ensureSchema, isConfigured, listLayouts, readLayout, writeLayout } from '@/lib/db';
import { applyEnglishStyle } from '@/lib/layoutStyleSync';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (!(await isConfigured())) {
    return NextResponse.json({ error: 'DATABASE_URL not set in Vercel env' }, { status: 503 });
  }

  try {
    await ensureSchema();
    const english = await readLayout('en');
    if (!english) {
      return NextResponse.json({ error: 'EN layout not found' }, { status: 404 });
    }

    const targets = (await listLayouts()).filter((lang) => lang !== 'en' && lang !== 'ar');
    const updated: string[] = [];
    const skipped: string[] = [];
    const failed: Array<{ lang: string; error: string }> = [];

    for (const lang of targets) {
      try {
        const target = await readLayout(lang);
        if (!target) {
          skipped.push(lang);
          continue;
        }
        const synced = applyEnglishStyle(english.data, target.data);
        await writeLayout(lang, synced, `Sync EN style to ${lang}`);
        updated.push(lang);
      } catch (error: any) {
        failed.push({ lang, error: error?.message || String(error) });
      }
    }

    return NextResponse.json({ ok: failed.length === 0, source: 'en', updated, skipped, failed });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
