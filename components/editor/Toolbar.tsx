'use client';

import { useEditor, useTemporalStore } from '@/lib/store';

const LABELS: Record<string, string> = {
  sp: 'SP 西',
  ar: 'AR 阿',
  ja: 'JA 日',
  en: 'EN 英',
  vi: 'VI 越',
  hi: 'HI 印',
  kr: 'KR 韩',
  th: 'TH 泰',
  cn: 'CN 中',
};

interface Props {
  lang: string;
  langs: string[];
  onLangChange: (l: string) => void;
  onSave: () => void;
}

export default function Toolbar({ lang, langs, onLangChange, onSave }: Props) {
  const showingRef = useEditor((s) => s.showingRef);
  const toggleRef = useEditor((s) => s.toggleRef);
  const { undo, redo, pastStates, futureStates } = useTemporalStore((s) => s);
  const hasUndo = pastStates.length > 0;
  const hasRedo = futureStates.length > 0;

  return (
    <div className="h-14 px-5 flex items-center gap-3 bg-white border-b border-gray-200 shrink-0">
      <h1 className="font-semibold text-sm text-gray-900 mr-2">T1_KeyEvents 编辑器</h1>

      <label className="flex items-center gap-1.5 text-sm">
        <span className="text-gray-500">语言</span>
        <select
          value={lang}
          onChange={(e) => onLangChange(e.target.value)}
          className="px-2.5 py-1 text-sm bg-white border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:border-blue-500"
        >
          {langs.map((l) => (
            <option key={l} value={l}>{LABELS[l] || l}</option>
          ))}
        </select>
      </label>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <button
        onClick={() => undo()}
        disabled={!hasUndo}
        className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30"
        title="Ctrl+Z"
      >
        ↶ 撤销
      </button>
      <button
        onClick={() => redo()}
        disabled={!hasRedo}
        className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30"
        title="Ctrl+Y"
      >
        ↷ 重做
      </button>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <button
        onClick={toggleRef}
        className={`px-3 py-1.5 text-sm rounded border ${
          showingRef
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        {showingRef ? '🖼️ 原版参考' : '🎬 模板'}
      </button>

      <button
        onClick={onSave}
        className="ml-auto px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
      >
        💾 写回 GitHub
      </button>
    </div>
  );
}