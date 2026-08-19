'use client';

import { useEditor } from '@/lib/store';

export default function PropertyPanel() {
  const fid = useEditor((s) => s.selectedFid);
  const eid = useEditor((s) => s.selectedEid);
  const element = useEditor((s) =>
    fid && eid ? (s.frameConfigs[fid]?.elements?.[eid] as any) : null,
  );
  const updateElement = useEditor((s) => s.updateElement);
  const disclaimerL1 = useEditor((s) => fid ? s.frameConfigs[fid]?.elements?.disclaimer_l1?.text || '' : '');
  const disclaimerL2 = useEditor((s) => fid ? s.frameConfigs[fid]?.elements?.disclaimer_l2?.text || '' : '');
  const hasDisclaimer = useEditor((s) => Boolean(fid && s.frameConfigs[fid]?.elements?.disclaimer_l1));

  if (!fid || !eid || !element) {
    return (
      <div className="w-72 bg-white border-l border-gray-200 p-5">
        <div className="text-xs text-gray-400">点击元素查看属性</div>
        <div className="mt-3 text-xs text-gray-300">快捷键:Ctrl+Shift+&gt; 增大字号</div>
        {fid && hasDisclaimer && (
          <DisclaimerFields
            frameId={fid}
            line1={disclaimerL1}
            line2={disclaimerL2}
            onLine1={(value) => updateElement(fid, 'disclaimer_l1', 'text', value)}
            onLine2={(value) => updateElement(fid, 'disclaimer_l2', 'text', value)}
          />
        )}
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
        <FontSizeField
          value={element.fontSize}
          onChange={(v) => onChange('fontSize', v)}
        />
      )}
      {element.fontWeight !== undefined && (
        <Field label="字重" value={element.fontWeight || 300} onChange={(v) => onChange('fontWeight', v)} />
      )}
      {element.line_pitch !== undefined && (
        <Field label="行距" value={element.line_pitch} onChange={(v) => onChange('line_pitch', v)} />
      )}
      {element.text !== undefined && !['disclaimer_l1', 'disclaimer_l2'].includes(eid) && (
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
      {hasDisclaimer && (
        <DisclaimerFields
          frameId={fid}
          line1={disclaimerL1}
          line2={disclaimerL2}
          onLine1={(value) => updateElement(fid, 'disclaimer_l1', 'text', value)}
          onLine2={(value) => updateElement(fid, 'disclaimer_l2', 'text', value)}
        />
      )}
    </div>
  );
}

function DisclaimerFields({
  frameId,
  line1,
  line2,
  onLine1,
  onLine2,
}: {
  frameId: string;
  line1: string;
  line2: string;
  onLine1: (value: string) => void;
  onLine2: (value: string) => void;
}) {
  return (
    <div className="mt-5 border-t border-gray-200 pt-4">
      <h3 className="mb-3 text-xs font-semibold text-gray-700">底部声明 · {frameId}</h3>
      <label className="mb-1 block text-xs text-gray-500">disclaimer_l1</label>
      <textarea
        value={line1}
        onChange={(event) => onLine1(event.target.value)}
        rows={3}
        className="mb-3 w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
      />
      <label className="mb-1 block text-xs text-gray-500">disclaimer_l2</label>
      <textarea
        value={line2}
        onChange={(event) => onLine2(event.target.value)}
        rows={3}
        placeholder="官方表当前为空，可单独编辑"
        className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}

// 普通数值字段
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

// v52+:字号字段(PPT 风格:± 按钮 + 数字输入,Shift + ± 跳 10)
function FontSizeField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const adjust = (delta: number) => onChange(Math.max(1, Math.round(value + delta)));

  return (
    <div className="mb-2">
      <label className="text-xs text-gray-500 block mb-1">字号</label>
      <div className="flex items-stretch gap-0 border border-gray-300 rounded overflow-hidden focus-within:border-blue-500">
        <button
          type="button"
          onClick={(e) => adjust(e.shiftKey ? -10 : -1)}
          className="px-2 bg-gray-50 hover:bg-gray-200 text-gray-600 text-sm border-r border-gray-300"
          title="减小 1(Shift: 减小 10)"
        >
          −
        </button>
        <input
          type="number"
          value={Math.round(value)}
          onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
          className="flex-1 px-2 py-1 text-xs text-center focus:outline-none"
        />
        <button
          type="button"
          onClick={(e) => adjust(e.shiftKey ? 10 : 1)}
          className="px-2 bg-gray-50 hover:bg-gray-200 text-gray-600 text-sm border-l border-gray-300"
          title="增大 1(Shift: 增大 10)"
        >
          +
        </button>
      </div>
    </div>
  );
}
