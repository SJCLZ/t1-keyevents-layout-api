'use client';

import { useEffect, useRef, useState } from 'react';
import Toolbar from '@/components/editor/Toolbar';
import Canvas from '@/components/editor/Canvas';
import AlignToolbar from '@/components/editor/AlignToolbar';
import PropertyPanel from '@/components/editor/PropertyPanel';
import { useEditor } from '@/lib/store';
import { parseKeyEventsExcel, parseKeyEventsJson, type ExcelInputContent } from '@/lib/excelImport';
import { getOfficialPictureRiskWarning } from '@/lib/riskWarnings';

function containsTbdPlaceholder(layout: any): boolean {
  return Object.values(layout?.frames || {}).some((frame: any) =>
    Object.values(frame?.elements || {}).some((element: any) =>
      typeof element?.text === 'string' && /\btbd\b/i.test(element.text),
    ),
  );
}

function inputContentSignature(input: ExcelInputContent): string {
  // Bump this version whenever derived fields (for example locale date labels) change.
  const source = JSON.stringify({ mappingVersion: 2, input });
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `t1-${(hash >>> 0).toString(16)}`;
}

function ensureDisclaimerElements(layout: any, language: string): any {
  const text = getOfficialPictureRiskWarning(language);
  if (!text) return layout;
  const textAlign = language === 'ar' ? 'right' : 'left';
  Object.values(layout?.frames || {}).forEach((frame: any) => {
    const elements = frame?.elements;
    if (!elements) return;
    const existingL1 = elements.disclaimer_l1 || elements.disclaimer || elements.disclaimer1;
    const existingL2 = elements.disclaimer_l2 || elements.disclaimer2;
    elements.disclaimer_l1 = {
      x: 152, y: 1588, w: 776, h: 26, type: 'disclaimer',
      fontSize: 18, fontWeight: 300, line_pitch: 22, textAlign,
      ...(existingL1 || {}),
      text: existingL1?.text || text,
    };
    elements.disclaimer_l2 = {
      x: 152, y: 1610, w: 776, h: 26, type: 'disclaimer',
      fontSize: 18, fontWeight: 300, line_pitch: 22, textAlign,
      ...(existingL2 || {}),
      text: existingL2?.text || '',
    };
    delete elements.disclaimer;
    delete elements.disclaimer1;
    delete elements.disclaimer2;
  });
  return layout;
}

export default function EditorPage() {
  const lang = useEditor((s) => s.lang);
  const langs = useEditor((s) => s.langs);  // v52+:从 API 拉,不硬编码
  const layout = useEditor((s) => s.layout);
  const sha = useEditor((s) => s.sha);
  const status = useEditor((s) => s.status);
  const setLang = useEditor((s) => s.setLang);
  const setLangs = useEditor((s) => s.setLangs);
  const loadLayout = useEditor((s) => s.loadLayout);
  const setSha = useEditor((s) => s.setSha);
  const setInputSignature = useEditor((s) => s.setInputSignature);
  const setStatus = useEditor((s) => s.setStatus);
  const frameConfigs = useEditor((s) => s.frameConfigs);
  const applyInputContent = useEditor((s) => s.applyInputContent);

  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [syncingEnglishStyle, setSyncingEnglishStyle] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>('');
  const pendingExcel = useRef<{ fileName: string; input: ExcelInputContent } | null>(null);

  // 加载布局
  useEffect(() => {
    let abort = false;
    setStatus(`加载 ${lang}…`);
    // v52+:同时拉语言列表(替代硬编码 LANGS)
    fetch('/api/layouts').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.langs) setLangs(d.langs);
    }).catch(() => {});
    Promise.all([
      fetch(`/api/layouts/${lang}`)
        .then((r) => r.ok ? r.json().then((d) => ({ d, etag: r.headers.get('etag') || '' })) : Promise.reject(r.status)),
      fetch(`/inputs/T1_key_events/sample_${lang}.json`, { cache: 'no-store' })
        .then(async (r) => r.ok ? parseKeyEventsJson(await r.json()) : null)
        .catch(() => null),
    ])
      .then(([{ d, etag }, bundledInput]) => {
        if (abort) return;
        const bundledSignature = bundledInput ? inputContentSignature(bundledInput) : '';
        const shouldApplyBundled = Boolean(
          bundledInput
          && bundledInput.language === lang
          && (containsTbdPlaceholder(d) || d._input_signature !== bundledSignature),
        );
        // Keep the pre-hydration snapshot so newly added disclaimer elements are auto-saved.
        const loadedFrameConfigs = Object.fromEntries(
          Object.entries(d.frames || {}).map(([fid, frame]: [string, any]) => [
            fid,
            { elements: JSON.parse(JSON.stringify(frame.elements || {})) },
          ]),
        );
        lastSaved.current = JSON.stringify({ frames: loadedFrameConfigs, inputSignature: d._input_signature || '' });
        const hydratedLayout = ensureDisclaimerElements(d, lang);
        if (shouldApplyBundled) {
          hydratedLayout._input_signature = bundledSignature;
          hydratedLayout._placeholder = false;
          delete hydratedLayout._note;
        }
        loadLayout(hydratedLayout, etag.replace(/^"|"$/g, ''));
        const pending = pendingExcel.current;
        if (pending && pending.input.language === lang) {
          setInputSignature(inputContentSignature(pending.input));
          applyInputContent(pending.input);
          pendingExcel.current = null;
          setStatus(`✅ 已导入 ${pending.fileName}，编辑器已显示 Excel 内容`);
        } else if (bundledInput && shouldApplyBundled) {
          applyInputContent(bundledInput);
          setStatus(`✅ 已将 ${lang.toUpperCase()} 输入内容完整映射到模板`);
        } else {
          setStatus(`✅ 已加载 ${d.name || lang}`);
        }
      })
      .catch((e) => !abort && setStatus(`❌ 加载失败: HTTP ${e}`));
    return () => { abort = true; };
  }, [applyInputContent, lang, loadLayout, setInputSignature, setStatus]);

  const importExcel = async (file: File) => {
    try {
      setStatus(`正在读取 ${file.name}…`);
      const input = await parseKeyEventsExcel(file);
      if (!langs.includes(input.language)) {
        throw new Error(`Excel 语言 ${input.language} 不在当前模板列表中`);
      }
      if (input.language !== lang) {
        pendingExcel.current = { fileName: file.name, input };
        setStatus(`Excel 语言为 ${input.language}，正在切换模板…`);
        setLang(input.language);
        return;
      }
      setInputSignature(inputContentSignature(input));
      applyInputContent(input);
      setStatus(`✅ 已导入 ${file.name}，编辑器已显示 Excel 内容`);
    } catch (error: any) {
      pendingExcel.current = null;
      setStatus(`❌ Excel 导入失败: ${error?.message || String(error)}`);
      throw error;
    }
  };

  const syncEnglishStyle = async () => {
    if (lang !== 'en' || !layout || syncingEnglishStyle) return;
    if (!window.confirm('将用当前 EN 的位置、尺寸和字体样式覆盖其他非阿拉伯语模板。各语言文字内容会保留，是否继续？')) return;

    setSyncingEnglishStyle(true);
    setSavingState('saving');
    setStatus('正在保存 EN 并同步样式…');
    if (saveTimer.current) clearTimeout(saveTimer.current);

    try {
      const body = JSON.parse(JSON.stringify(layout));
      body.frames = Object.fromEntries(
        Object.entries(frameConfigs).map(([fid, fc]) => [fid, { ...layout.frames[fid], elements: fc.elements }]),
      );
      const currentHash = JSON.stringify({ frames: frameConfigs, inputSignature: layout._input_signature || '' });
      const saveResponse = await fetch('/api/layouts/en', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Layout-Sha': sha || '',
        },
        body: JSON.stringify({ message: 'Save EN before style sync', data: body }),
      });
      if (!saveResponse.ok) {
        const error = await saveResponse.json();
        throw new Error(error.error || `保存 EN 失败 (${saveResponse.status})`);
      }
      const saved = await saveResponse.json();
      setSha(saved.sha);
      lastSaved.current = currentHash;

      const syncResponse = await fetch('/api/layouts/sync-en-style', { method: 'POST' });
      const result = await syncResponse.json();
      if (!syncResponse.ok) throw new Error(result.error || `同步失败 (${syncResponse.status})`);

      const updated = result.updated || [];
      const failed = result.failed || [];
      if (failed.length > 0) {
        setSavingState('error');
        setStatus(`⚠️ 已同步 ${updated.join(', ').toUpperCase()}；失败: ${failed.map((item: any) => item.lang.toUpperCase()).join(', ')}`);
      } else {
        setSavingState('saved');
        setStatus(`✅ 英文样式已同步到 ${updated.map((item: string) => item.toUpperCase()).join(', ')}（AR 保持独立）`);
      }
    } catch (error: any) {
      setSavingState('error');
      setStatus(`❌ 同步英文样式失败: ${error?.message || String(error)}`);
    } finally {
      setSyncingEnglishStyle(false);
    }
  };

  // 自动保存:frameConfigs 变化后 2 秒触发 PUT
  useEffect(() => {
    if (!layout) return;
    // 计算当前 frameConfigs 的 hash(用 JSON.stringify 简化)
    const cur = JSON.stringify({ frames: frameConfigs, inputSignature: layout._input_signature || '' });
    if (cur === lastSaved.current) return;  // 没变化

    if (saveTimer.current) clearTimeout(saveTimer.current);
    const controller = new AbortController();
    saveTimer.current = setTimeout(async () => {
      setSavingState('saving');
      try {
        const body = JSON.parse(JSON.stringify(layout));
        body.frames = Object.fromEntries(
          // 使用当前 effect 捕获的快照，不读取切换语言后的全局 store。
          Object.entries(frameConfigs).map(([fid, fc]) => [fid, { ...layout.frames[fid], elements: fc.elements }]),
        );
        const r = await fetch(`/api/layouts/${lang}`, {
          method: 'PUT',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'X-Layout-Sha': sha || '',
          },
          body: JSON.stringify({ message: `Update ${lang} via editor`, data: body }),
        });
        if (!r.ok) {
          const e = await r.json();
          setStatus(`❌ 保存失败: ${e.error || r.status}`);
          setSavingState('error');
          return;
        }
        const { sha: newSha } = await r.json();
        setSha(newSha);  // v52+:更新 store 里的 sha,避免下次 auto-save 用 stale 值 → 409
        lastSaved.current = cur;
        setStatus(`✅ 已保存 ${new Date().toLocaleTimeString()}`);
        setSavingState('saved');
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setStatus(`❌ ${e.message}`);
        setSavingState('error');
      }
    }, 2000);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      controller.abort();
    };
    // v52+:从 deps 移除 sha(避免 sha 更新后再触发 useEffect → 死循环)
  }, [frameConfigs, lang, layout, setSha, setStatus]);

  // 键盘快捷键(Ctrl+Z 撤销,Esc 取消选择)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
      // Esc 键 → 取消选中(任何时候都生效,即使在输入框)
      if (e.key === 'Escape') {
        useEditor.getState().cancelFormatPainter();
        useEditor.getState().setSelected(null, null);
        return;
      }
      // 编辑相关快捷键只在非输入框生效
      if (isInput) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        const step = e.shiftKey ? 10 : 1;
        const delta = {
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
        }[e.key] as [number, number];
        if (useEditor.getState().selectedEids.length > 0) {
          e.preventDefault();
          useEditor.getState().nudgeSelected(delta[0], delta[1]);
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useEditor.temporal.getState().undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        useEditor.temporal.getState().redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Toolbar
        lang={lang}
        langs={langs}
        onLangChange={setLang}
        onExcelFile={importExcel}
        onSyncEnglishStyle={syncEnglishStyle}
        syncingEnglishStyle={syncingEnglishStyle}
        savingState={savingState}
      />
      {status && (
        <div className="px-5 py-1.5 text-xs bg-gray-100 border-b border-gray-200 text-gray-600">
          {status}
        </div>
      )}
      <div className="flex-1 flex overflow-hidden">
        <Canvas />
        <AlignToolbar />
        <PropertyPanel />
      </div>
    </div>
  );
}
