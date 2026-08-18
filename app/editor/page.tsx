'use client';

import { useEffect, useRef, useState } from 'react';
import Toolbar from '@/components/editor/Toolbar';
import Canvas from '@/components/editor/Canvas';
import PropertyPanel from '@/components/editor/PropertyPanel';
import { useEditor } from '@/lib/store';

const LANGS = ['sp', 'ar', 'ja', 'en', 'vi', 'hi', 'kr', 'th', 'cn'];

export default function EditorPage() {
  const lang = useEditor((s) => s.lang);
  const layout = useEditor((s) => s.layout);
  const sha = useEditor((s) => s.sha);
  const status = useEditor((s) => s.status);
  const setLang = useEditor((s) => s.setLang);
  const loadLayout = useEditor((s) => s.loadLayout);
  const setSha = useEditor((s) => s.setSha);
  const setStatus = useEditor((s) => s.setStatus);
  const frameConfigs = useEditor((s) => s.frameConfigs);

  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>('');

  // 加载布局
  useEffect(() => {
    let abort = false;
    setStatus(`加载 ${lang}…`);
    fetch(`/api/layouts/${lang}`)
      .then((r) => r.ok ? r.json().then((d) => ({ d, etag: r.headers.get('etag') || '' })) : Promise.reject(r.status))
      .then(({ d, etag }) => {
        if (abort) return;
        loadLayout(d, etag.replace(/^"|"$/g, ''));
        setStatus(`✅ 已加载 ${d.name || lang}`);
      })
      .catch((e) => !abort && setStatus(`❌ 加载失败: HTTP ${e}`));
    return () => { abort = true; };
  }, [lang, loadLayout, setStatus]);

  // 自动保存:frameConfigs 变化后 2 秒触发 PUT
  useEffect(() => {
    if (!layout) return;
    // 计算当前 frameConfigs 的 hash(用 JSON.stringify 简化)
    const cur = JSON.stringify(frameConfigs);
    if (cur === lastSaved.current) return;  // 没变化

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSavingState('saving');
      try {
        const body = JSON.parse(JSON.stringify(layout));
        body.frames = Object.fromEntries(
          Object.entries(useEditor.getState().frameConfigs).map(([fid, fc]) => [fid, { ...layout.frames[fid], elements: fc.elements }]),
        );
        const r = await fetch(`/api/layouts/${lang}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'If-Match': sha ? `"${sha}"` : '',
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
        setSha(newSha);
        lastSaved.current = cur;
        setStatus(`✅ 已保存 ${new Date().toLocaleTimeString()}`);
        setSavingState('saved');
      } catch (e: any) {
        setStatus(`❌ ${e.message}`);
        setSavingState('error');
      }
    }, 2000);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [frameConfigs, lang, layout, sha, setSha, setStatus]);

  // 键盘快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
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
      <Toolbar lang={lang} langs={LANGS} onLangChange={setLang} savingState={savingState} />
      {status && (
        <div className="px-5 py-1.5 text-xs bg-gray-100 border-b border-gray-200 text-gray-600">
          {status}
        </div>
      )}
      <div className="flex-1 flex overflow-hidden">
        <Canvas />
        <PropertyPanel />
      </div>
    </div>
  );
}