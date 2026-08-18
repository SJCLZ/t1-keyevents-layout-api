'use client';

import { useState, useEffect, useCallback } from 'react';
import Toolbar from '@/components/editor/Toolbar';
import Canvas from '@/components/editor/Canvas';
import PropertyPanel from '@/components/editor/PropertyPanel';
import { useLayout } from '@/hooks/useLayout';
import styles from './editor.module.css';

export default function EditorPage() {
  const langs = ['sp', 'ar', 'ja', 'en', 'vi', 'hi', 'kr', 'th', 'cn'];
  const [lang, setLang] = useState('ar');
  const [status, setStatus] = useState('');
  const [selectedEid, setSelectedEid] = useState<string | null>(null);
  const [selectedFid, setSelectedFid] = useState<string | null>(null);
  const [showingRef, setShowingRef] = useState(false);

  const { layout, sha, frames, frameConfigs, updateElementPos, updateElementProp, save, loading, error } =
    useLayout(lang, setStatus);

  const onSelect = useCallback((fid: string, eid: string) => {
    setSelectedFid(fid);
    setSelectedEid(eid);
  }, []);

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(''), 3000);
  };

  return (
    <div className={styles.editor}>
      <Toolbar
        lang={lang}
        langs={langs}
        onLangChange={setLang}
        onSave={() => save().then((ok) => flash(ok ? '✅ 已写回 GitHub' : '❌ 保存失败'))}
        onToggleRef={() => setShowingRef(!showingRef)}
        showingRef={showingRef}
        loading={loading}
      />
      {error && <div className={styles.errorBar}>⚠️ {error}</div>}
      <div className={styles.body}>
        <Canvas
          frames={frames}
          layout={layout}
          lang={lang}
          showingRef={showingRef}
          selectedFid={selectedFid}
          selectedEid={selectedEid}
          onSelect={onSelect}
          frameConfigs={frameConfigs}
          updateElementProp={updateElementProp}
          updateElementPos={updateElementPos}
        />
        <PropertyPanel
          lang={lang}
          fid={selectedFid}
          eid={selectedEid}
          element={selectedFid && selectedEid ? (frameConfigs as any)[selectedFid]?.elements?.[selectedEid] : null}
          onChange={updateElementProp}
        />
      </div>
      <div className={styles.status}>{status}</div>
    </div>
  );
}