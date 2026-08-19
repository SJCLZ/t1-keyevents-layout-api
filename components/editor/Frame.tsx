'use client';

import { useEffect, useState } from 'react';
import Element from './Element';
import { useEditor } from '@/lib/store';

const LABELS: Record<string, string> = {
  t002: 'intro',
  t004: 'card 1',
  t011: 'card 2',
  t018: 'card 3',
  t025: 'card 4',
  t032: 'card 5',
  t042: 'outro',
};

const SCALE = 360 / 1080;

function fixedGuidePositions(elements: Record<string, any>, axis: 'x' | 'y'): number[] {
  const positions = Object.values(elements).flatMap((element: any) => {
    if (![element?.x, element?.y, element?.w, element?.h].every(Number.isFinite)) return [];
    return axis === 'x' ? [element.x] : [element.y];
  }).sort((a, b) => a - b);
  // Avoid drawing several heavy lines for near-identical text edges (for example x=152/155).
  return positions.reduce<number[]>((unique, position) => {
    if (unique.length === 0 || Math.abs(position - unique[unique.length - 1]) > 6) unique.push(position);
    return unique;
  }, []);
}

const REF_FRAME_FILES: Record<string, string> = {
  t002: 't003.000.png',
  t004: 't004.000.png',
  t011: 't011.000.png',
  t018: 't018.000.png',
  t025: 't025.000.png',
  t032: 't032.000.png',
  t042: 't042.000.png',
};

interface Props {
  fid: string;
  index: number;
  showingRef: boolean;
}

export default function Frame({ fid, showingRef }: Props) {
  const lang = useEditor((s) => s.lang);
  const layout = useEditor((s) => s.layout);
  // v52+:订阅整个 frameConfigs,确保 textAlign 等字段变化触发 Element re-render
  useEditor((s) => s.frameConfigs);
  const elements = useEditor((s) => s.frameConfigs[fid]?.elements || {});
  const setSelected = useEditor((s) => s.setSelected);
  const snapGuides = useEditor((s) => s.snapGuides?.fid === fid ? s.snapGuides : null);
  const showingGuides = useEditor((s) => s.showingGuides);
  const [refFailed, setRefFailed] = useState(false);
  // 原版对比图与语言、帧一一对应，优先使用项目内资源，不依赖外部 URL。
  const refFramePath = REF_FRAME_FILES[fid]
    ? `/assets/${lang}/gt_frames/${REF_FRAME_FILES[fid]}`
    : layout?.frames?.[fid]?.gt_frame_path;

  useEffect(() => {
    setRefFailed(false);
  }, [refFramePath]);

  if (!layout) return null;
  const videoSrc = layout.video_src;
  const hasReference = Boolean(refFramePath) && !refFailed;
  const referenceElements = layout.frames?.[fid]?.elements || {};
  const fixedXGuides = showingGuides ? fixedGuidePositions(referenceElements, 'x') : [];
  const fixedYGuides = showingGuides ? fixedGuidePositions(referenceElements, 'y') : [];

  return (
    <div
      className="relative w-[360px] h-[640px] bg-[#061540] rounded-md overflow-hidden border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer"
      data-fid={fid}
      onClick={() => setSelected(fid, '')}
    >
      <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 bg-black/60 backdrop-blur text-white text-[10px] rounded font-medium pointer-events-none">
        {fid} · {LABELS[fid] || ''}
      </div>

      {showingRef && hasReference ? (
        <img
          src={refFramePath}
          alt={`原版参考 ${fid}`}
          loading="lazy"
          onError={() => setRefFailed(true)}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      ) : (
        <video
          src={videoSrc}
          muted
          autoPlay
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}

      {showingRef && !hasReference && (
        <div className="absolute top-2 right-2 z-10 rounded bg-amber-50/95 px-2 py-1 text-[10px] font-medium text-amber-700 shadow-sm pointer-events-none">
          待添加原版参考图
        </div>
      )}

      {fixedXGuides.map((x) => (
        <div
          key={`fixed-x-${x}`}
          data-guide-axis="vertical"
          className="absolute inset-y-0 z-20 w-px bg-red-500/70 pointer-events-none"
          style={{ left: x * SCALE }}
        />
      ))}
      {fixedYGuides.map((y) => (
        <div
          key={`fixed-y-${y}`}
          data-guide-axis="horizontal"
          className="absolute inset-x-0 z-20 h-px bg-red-500/70 pointer-events-none"
          style={{ top: y * SCALE }}
        />
      ))}

      {(showingRef || showingGuides) && snapGuides?.x !== null && snapGuides?.x !== undefined && (
        <div
          data-guide-axis="vertical"
          className="absolute inset-y-0 z-20 w-px bg-red-600 shadow-[0_0_0_1px_rgba(220,38,38,0.35)] pointer-events-none"
          style={{ left: snapGuides.x * SCALE }}
        />
      )}
      {(showingRef || showingGuides) && snapGuides?.y !== null && snapGuides?.y !== undefined && (
        <div
          data-guide-axis="horizontal"
          className="absolute inset-x-0 z-20 h-px bg-red-600 shadow-[0_0_0_1px_rgba(220,38,38,0.35)] pointer-events-none"
          style={{ top: snapGuides.y * SCALE }}
        />
      )}

      {Object.entries(elements).map(([eid, el]) => (
        <Element key={eid} fid={fid} eid={eid} element={el} lang={lang} />
      ))}
    </div>
  );
}
