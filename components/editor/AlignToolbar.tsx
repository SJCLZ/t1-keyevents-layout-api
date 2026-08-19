'use client';

import { useEditor } from '@/lib/store';

const ITEMS = [
  { id: 'left',   label: '左对齐',   icon: '⇤' },
  { id: 'center', label: '水平居中', icon: '↔' },
  { id: 'right',  label: '右对齐',   icon: '⇥' },
] as const;

export default function AlignToolbar() {
  const count = useEditor((s) => s.selectedEids.length);
  const canPaint = useEditor((s) => {
    if (s.selectedEids.length !== 1) return false;
    const selected = s.selectedEids[0];
    const element = s.frameConfigs[selected.fid]?.elements?.[selected.eid];
    return Boolean(element && element.type !== 'logo');
  });
  const formatPainter = useEditor((s) => s.formatPainter);
  const startFormatPainter = useEditor((s) => s.startFormatPainter);
  const cancelFormatPainter = useEditor((s) => s.cancelFormatPainter);
  // v52+:文字对齐,单选 / 多选都可以
  const enabled = count >= 1;

  const applyAlignment = (align: 'left' | 'center' | 'right') => {
    const editor = useEditor.getState();
    // 无论单选还是多选，都统一段落内部的文字对齐。
    editor.alignText(align);
    // 多选 2+ 时，左/右按钮同时对齐元素文本框边缘。
    if (editor.selectedEids.length >= 2 && align !== 'center') {
      editor.alignElements(align);
    }
  };

  return (
    <div className="w-12 bg-white border-l border-r border-gray-200 flex flex-col items-center py-3 gap-1 shrink-0">
      {ITEMS.map((item, i) => {
        const showSep = i === ITEMS.length - 1;
        return (
          <div key={item.id} className="flex flex-col items-center gap-1">
            <button
              onClick={() => applyAlignment(item.id)}
              disabled={!enabled}
              title={`${item.label}(${count} 已选)${count >= 2 && item.id !== 'center' ? ' — 同时对齐元素边缘' : ''}`}
              className={`w-8 h-8 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center`}
            >
              {item.icon}
            </button>
            {showSep ? <div className="w-6 h-px bg-gray-200 my-0.5" /> : null}
          </div>
        );
      })}
      <button
        onClick={formatPainter ? cancelFormatPainter : startFormatPainter}
        disabled={!formatPainter && !canPaint}
        aria-label={formatPainter ? '取消格式刷' : '格式刷'}
        aria-pressed={Boolean(formatPainter)}
        title={formatPainter ? '格式刷已启用：点击目标文字，Esc 取消' : '格式刷：先选中一个文字元素'}
        className={`w-8 h-8 text-base rounded flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${
          formatPainter
            ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-400 cursor-copy'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        🖌️
      </button>
    </div>
  );
}
