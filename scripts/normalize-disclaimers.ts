import {
  OFFICIAL_PICTURE_RISK_WARNINGS,
  OFFICIAL_PICTURE_RISK_WARNING_L2,
} from '../lib/riskWarnings';

const LANGUAGES = ['ar', 'cn', 'en', 'hi', 'ja', 'kr', 'sp', 'th', 'vi'];
const APPLY = process.argv.includes('--apply');
const BASE_URL = (process.env.LAYOUT_API_BASE_URL || 'https://layout-api-five.vercel.app').replace(/\/$/, '');

function canonical(value: any): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function withoutDisclaimerText(layout: any): any {
  const copy = structuredClone(layout);
  Object.values(copy.frames || {}).forEach((frame: any) => {
    for (const id of ['disclaimer_l1', 'disclaimer_l2']) {
      if (frame.elements?.[id]) frame.elements[id].text = '__DISCLAIMER_TEXT__';
    }
  });
  return copy;
}

async function readLayout(lang: string): Promise<{ data: any; sha: string }> {
  const response = await fetch(`${BASE_URL}/api/layouts/${lang}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${lang}: GET failed (${response.status})`);
  const sha = (response.headers.get('x-layout-sha') || response.headers.get('etag') || '').replace(/^"|"$/g, '');
  if (!sha) throw new Error(`${lang}: missing X-Layout-Sha`);
  return { data: await response.json(), sha };
}

async function main() {
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} ${BASE_URL}`);
  for (const lang of LANGUAGES) {
    const { data, sha } = await readLayout(lang);
    const before = structuredClone(data);
    const frames = Object.entries(data.frames || {});
    if (frames.length !== 7) throw new Error(`${lang}: expected 7 frames, got ${frames.length}`);

    let changedFields = 0;
    for (const [fid, frame] of frames as Array<[string, any]>) {
      const line1 = frame.elements?.disclaimer_l1;
      const line2 = frame.elements?.disclaimer_l2;
      if (!line1 || !line2) throw new Error(`${lang}/${fid}: disclaimer elements missing`);
      const nextLine1 = OFFICIAL_PICTURE_RISK_WARNINGS[lang];
      const nextLine2 = OFFICIAL_PICTURE_RISK_WARNING_L2[lang];
      if (line1.text !== nextLine1) changedFields += 1;
      if (line2.text !== nextLine2) changedFields += 1;
      line1.text = nextLine1;
      line2.text = nextLine2;
    }

    if (canonical(withoutDisclaimerText(before)) !== canonical(withoutDisclaimerText(data))) {
      throw new Error(`${lang}: non-disclaimer data changed during normalization`);
    }
    console.log(`${lang.toUpperCase()}: ${frames.length} frames, ${changedFields} text fields to update`);
    if (!APPLY || changedFields === 0) continue;

    const response = await fetch(`${BASE_URL}/api/layouts/${lang}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Layout-Sha': sha },
      body: JSON.stringify({ message: `Normalize ${lang} official disclaimer lines`, data }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${lang}: PUT failed (${response.status}) ${error}`);
    }

    const verified = await readLayout(lang);
    if (canonical(withoutDisclaimerText(before)) !== canonical(withoutDisclaimerText(verified.data))) {
      throw new Error(`${lang}: verification found a non-disclaimer change`);
    }
    for (const [fid, frame] of Object.entries(verified.data.frames || {}) as Array<[string, any]>) {
      if (frame.elements?.disclaimer_l1?.text !== OFFICIAL_PICTURE_RISK_WARNINGS[lang]
        || frame.elements?.disclaimer_l2?.text !== OFFICIAL_PICTURE_RISK_WARNING_L2[lang]) {
        throw new Error(`${lang}/${fid}: disclaimer verification failed`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
