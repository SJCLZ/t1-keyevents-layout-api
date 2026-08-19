'use client';

import { useRef, useState } from 'react';
import { useEditor, useTemporalStore } from '@/lib/store';

const LABELS: Record<string, string> = {
  sp: 'SP 西', ar: 'AR 阿', ja: 'JA 日', en: 'EN 英',
  vi: 'VI 越', hi: 'HI 印', kr: 'KR 韩', th: 'TH 泰', cn: 'CN 中',
};

interface Props {
  lang: string;
  langs: string[];
  onLangChange: (l: string) => void;
  onExcelFile: (file: File) => Promise<void>;
  onSyncEnglishStyle: () => Promise<void>;
  syncingEnglishStyle: boolean;
  savingState: 'idle' | 'saving' | 'saved' | 'error';
}

export default function Toolbar({
  lang,
  langs,
  onLangChange,
  onExcelFile,
  onSyncEnglishStyle,
  syncingEnglishStyle,
  savingState,
}: Props) {
  const showingRef = useEditor((s) => s.showingRef);
  const toggleRef = useEditor((s) => s.toggleRef);
  const showingGuides = useEditor((s) => s.showingGuides);
  const toggleGuides = useEditor((s) => s.toggleGuides);
  const selectedEids = useEditor((s) => s.selectedEids);
  const { undo, redo, pastStates, futureStates } = useTemporalStore((s) => s);
  const hasUndo = pastStates.length > 0;
  const hasRedo = futureStates.length > 0;
  const multi = selectedEids.length >= 2;
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [importingExcel, setImportingExcel] = useState(false);

  const importExcel = async (file?: File) => {
    if (!file) return;
    setImportingExcel(true);
    try {
      await onExcelFile(file);
    } catch {
      // 错误信息由页面状态栏统一展示。
    } finally {
      setImportingExcel(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

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
        ↶
      </button>
      <button
        onClick={() => redo()}
        disabled={!hasRedo}
        className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30"
        title="Ctrl+Y"
      >
        ↷
      </button>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => void importExcel(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => excelInputRef.current?.click()}
        disabled={importingExcel}
        className="px-3 py-1.5 text-sm rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
        title="导入 T1_KeyEvents Excel，用表格内容替换编辑器文字"
      >
        {importingExcel ? '正在读取…' : '📊 导入 Excel'}
      </button>

      <button
        type="button"
        onClick={() => void onSyncEnglishStyle()}
        disabled={lang !== 'en' || syncingEnglishStyle}
        className="px-3 py-1.5 text-sm rounded-md border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
        title={lang === 'en' ? '将 EN 的位置、尺寸和文字样式同步到所有非阿拉伯语模板' : '请先切换到 EN 模板'}
      >
        {syncingEnglishStyle ? '正在同步…' : '🔄 同步英文样式'}
      </button>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <div
        className="flex items-center rounded-lg border border-gray-300 bg-gray-100 p-0.5"
        role="group"
        aria-label="预览模式"
      >
        <button
          type="button"
          aria-pressed={!showingRef}
          onClick={() => showingRef && toggleRef()}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            !showingRef
              ? 'bg-white text-gray-900 shadow-sm font-medium'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          🎬 视频预览
        </button>
        <button
          type="button"
          aria-pressed={showingRef}
          onClick={() => !showingRef && toggleRef()}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            showingRef
              ? 'bg-white text-blue-700 shadow-sm font-medium'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          🖼️ 原版对比
        </button>
      </div>

      <button
        type="button"
        aria-pressed={showingGuides}
        onClick={toggleGuides}
        className={`px-3 py-1.5 text-sm rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-red-300 ${
          showingGuides
            ? 'border-red-500 bg-red-50 text-red-700 font-medium'
            : 'border-gray-300 bg-white text-gray-600 hover:border-red-300 hover:text-red-600'
        }`}
        title="显示固定的红色横向、竖向参考线，并启用吸附"
      >
        📐 参考线
      </button>

      <div className="ml-auto flex items-center gap-3">
        {multi && (
          <span className="text-xs text-blue-600 font-medium">
            已选 {selectedEids.length} 项
          </span>
        )}
        <span className="text-xs text-gray-500">
          {savingState === 'saving' && '⏳ 保存中…'}
          {savingState === 'saved' && '✓ 已保存'}
          {savingState === 'error' && '✗ 保存失败'}
        </span>
      </div>
    </div>
  );
}
