'use client';

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

const SCALE = 360 / 1080;  // 缩放

interface Props {
  fid: string;
  index: number;
  showingRef: boolean;
}

export default function Frame({ fid, showingRef }: Props) {
  const lang = useEditor((s) => s.lang);
  const layout = useEditor((s) => s.layout);
  const elements = useEditor((s) => s.frameConfigs[fid]?.elements || {});

  if (!layout) return null;
  const videoSrc = layout.video_src;
  const refFramePath = layout.frames?.[fid]?.gt_frame_path;

  return (
    <div
      className="relative w-[360px] h-[640px] bg-[#061540] rounded-md overflow-hidden border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer"
      data-fid={fid}
    >
      <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 bg-black/60 backdrop-blur text-white text-[10px] rounded font-medium">
        {fid} · {LABELS[fid] || ''}
      </div>

      {showingRef && refFramePath ? (
        <img
          src={refFramePath}
          alt="GT"
          loading="lazy"
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

      {Object.entries(elements).map(([eid, el]) => (
        <Element key={eid} fid={fid} eid={eid} element={el} lang={lang} />
      ))}
    </div>
  );
}