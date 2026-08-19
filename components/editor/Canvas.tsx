'use client';

import Frame from './Frame';
import { useEditor } from '@/lib/store';

const FONT_ASSETS: Record<string, { family: string; files: Array<[string, number]> }> = {
  en: { family: 'Plus Jakarta Sans', files: [['PlusJakartaSans-300.ttf', 300], ['PlusJakartaSans-400.ttf', 400], ['PlusJakartaSans-600.ttf', 600]] },
  sp: { family: 'Plus Jakarta Sans', files: [['PlusJakartaSans-300.ttf', 300], ['PlusJakartaSans-400.ttf', 400], ['PlusJakartaSans-600.ttf', 600]] },
  vi: { family: 'Plus Jakarta Sans', files: [['PlusJakartaSans-300.ttf', 300], ['PlusJakartaSans-400.ttf', 400], ['PlusJakartaSans-600.ttf', 600]] },
  ar: { family: 'Tajawal', files: [['Tajawal-Light.ttf', 300], ['Tajawal-Regular.ttf', 400], ['Tajawal-Medium.ttf', 500], ['Tajawal-Bold.ttf', 700]] },
  hi: { family: 'Mukta', files: [['Mukta-300.ttf', 300], ['Mukta-400.ttf', 400], ['Mukta-600.ttf', 600]] },
  th: { family: 'Prompt', files: [['Prompt-300.ttf', 300], ['Prompt-400.ttf', 400], ['Prompt-600.ttf', 600]] },
  ja: { family: 'Noto Sans JP', files: [['NotoSansJP.ttf', 400]] },
  kr: { family: 'Noto Sans KR', files: [['NotoSansKR.ttf', 400]] },
  cn: { family: 'Noto Sans SC', files: [['NotoSansSC.ttf', 400]] },
};

function databaseFontFaces(lang: string): string {
  const font = FONT_ASSETS[lang];
  if (!font) return '';
  return font.files.map(([name, weight]) => `
    @font-face {
      font-family: '${font.family}';
      src: url('/api/assets/font/${lang}/${name}') format('truetype');
      font-style: normal;
      font-weight: ${weight};
      font-display: swap;
    }
  `).join('\n');
}

export default function Canvas() {
  const frames = useEditor((s) => s.frames);
  const layout = useEditor((s) => s.layout);
  const lang = useEditor((s) => s.lang);
  const showingRef = useEditor((s) => s.showingRef);

  if (!layout) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        加载中…
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 overflow-auto p-6 bg-gray-50">
      <style data-font-source="database">{databaseFontFaces(lang)}</style>
      <div className="grid grid-cols-[repeat(3,360px)] gap-5 w-max">
        {frames.map((fid, i) => (
          <Frame
            key={fid}
            fid={fid}
            index={i}
            showingRef={showingRef}
          />
        ))}
      </div>
    </div>
  );
}
