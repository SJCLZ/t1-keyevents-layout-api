'use client';

import { useEditor } from '@/lib/store';

export default function PropertyPanel() {
  const fid = useEditor((s) => s.selectedFid);
  const eid = useEditor((s) => s.selectedEid);
  const element = useEditor((s) =>
    fid && eid ? (s.frameConfigs[fid]?.elements?.[eid] as any) : null,
  );
  const updateElement = useEditor((s) => s.updateElement);

  if (!fid || !eid || !element) {
    return (
      <div className="w-72 bg-white border-l border-gray-200 p-5">
        <div className="text-xs text-gray-400">点击元素查看属性</div>
      </div>
    );
  }

  const onChange = (prop: string, value: any) => updateElement(fid, eid, prop, value);

  return (
    <div className="w-72 bg-white border-l border-gray-200 p-5 overflow-y-auto shrink-0">
      <div className="text-xs text-gray-400 mb-3">
        {fid} · {element.type}
      </div>
      <h2 className="text-sm font-semibold text-gray-900 mb-4">{eid}</h2>

      <Field label="x" value={element.x} onChange={(v) => onChange('x', v)} />
      <Field label="y" value={element.y} onChange={(v) => onChange('y', v)} />
      <Field label="宽" value={element.w} onChange={(v) => onChange('w', v)} />
      <Field label="高" value={element.h} onChange={(v) => onChange('h', v)} />

      {element.fontSize !== undefined && (
        <>
          <Field label="字号" value={element.fontSize} onChange={(v) => onChange('fontSize', v)} />
          <Field label="字重" value={element.fontWeight || 300} onChange={(v) => onChange('fontWeight', v)} />
        </>
      )}
      {element.line_pitch !== undefined && (
        <Field label="行距" value={element.line_pitch} onChange={(v) => onChange('line_pitch', v)} />
      )}
      {element.text !== undefined && (
        <div className="mt-3">
          <label className="text-xs text-gray-500 block mb-1">文字</label>
          <textarea
            value={element.text}
            onChange={(e) => onChange('text', e.target.value)}
            rows={4}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center mb-2">
      <label className="w-12 text-xs text-gray-500">{label}</label>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}