'use client';

import Frame from './Frame';
import { useEditor } from '@/lib/store';

export default function Canvas() {
  const frames = useEditor((s) => s.frames);
  const layout = useEditor((s) => s.layout);
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
