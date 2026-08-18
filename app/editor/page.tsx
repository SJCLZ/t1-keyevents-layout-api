'use client';

import { useEffect } from 'react';
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
  const error = useEditor((s) => s.frames.length === 0 && !layout);
  const setLang = useEditor((s) => s.setLang);
  const loadLayout = useEditor((s) => s.loadLayout);
  const setSha = useEditor((s) => s.setSha);
  const setStatus = useEditor((s) => s.setStatus);

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

  // 键盘快捷键(Ctrl+Z / Ctrl+Y / Delete)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 不在输入框时
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

  // 保存到 GitHub
  const onSave = async () => {
    if (!layout) return;
    setStatus('写回中…');
    const body = JSON.parse(JSON.stringify(layout));
    body.frames = Object.fromEntries(
      Object.entries(useEditor.getState().frameConfigs).map(([fid, fc]) => [fid, { ...layout.frames[fid], elements: fc.elements }]),
    );
    try {
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
        setStatus(`❌ ${e.error || r.status}`);
        return;
      }
      const { sha: newSha } = await r.json();
      setSha(newSha);
      setStatus(`✅ 已写回(${newSha.slice(0, 7)}…)`);
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Toolbar lang={lang} langs={LANGS} onLangChange={setLang} onSave={onSave} />
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