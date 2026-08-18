import { useState, useEffect, useCallback } from 'react';

const API = '';  // 同源

export function useLayout(lang: string, setStatus: (s: string) => void) {
  const [layout, setLayout] = useState<any>(null);
  const [sha, setSha] = useState('');
  const [frameConfigs, setFrameConfigs] = useState<Record<string, { elements: Record<string, any> }>>({});
  const [frames, setFrames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载 layouts
  useEffect(() => {
    let abort = false;
    setLoading(true);
    setError(null);
    fetch(`${API}/api/layouts/${lang}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const etag = r.headers.get('etag') || '';
        setSha(etag.replace(/^"|"$/g, ''));
        return r.json();
      })
      .then((data) => {
        if (abort) return;
        setLayout(data);
        const fids = Object.keys(data.frames || {});
        setFrames(fids);
        // 转为 frameConfigs
        const fc: Record<string, { elements: Record<string, any> }> = {};
        fids.forEach((fid) => {
          const fr = data.frames[fid];
          fc[fid] = {
            elements: JSON.parse(JSON.stringify(fr.elements || {})),
          };
        });
        setFrameConfigs(fc);
        setStatus(`✅ 已加载 ${data.name || lang}(${fids.length} 帧)`);
      })
      .catch((e) => {
        if (abort) return;
        setError(e.message);
      })
      .finally(() => setLoading(false));
    return () => { abort = true; };
  }, [lang, setStatus]);

  const updateElementPos = useCallback((fid: string, eid: string, x: number, y: number) => {
    setFrameConfigs((prev) => {
      const next = { ...prev };
      if (next[fid]?.elements?.[eid]) {
        next[fid] = {
          ...next[fid],
          elements: {
            ...next[fid].elements,
            [eid]: { ...next[fid].elements[eid], x, y },
          },
        };
      }
      return next;
    });
  }, []);

  const updateElementProp = useCallback((fid: string, eid: string, prop: string, value: any) => {
    setFrameConfigs((prev) => {
      const next = { ...prev };
      if (next[fid]?.elements?.[eid]) {
        next[fid] = {
          ...next[fid],
          elements: {
            ...next[fid].elements,
            [eid]: { ...next[fid].elements[eid], [prop]: value },
          },
        };
      }
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    if (!layout) return false;
    setStatus('🔄 正在写回 GitHub...');
    try {
      const r = await fetch(`${API}/api/layouts/${lang}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': sha ? `"${sha}"` : '',
        },
        body: JSON.stringify({
          message: `Update ${lang} via React editor`,
          data: {
            ...layout,
            frames: Object.fromEntries(
              frames.map((fid) => [
                fid,
                {
                  ...layout.frames[fid],
                  elements: frameConfigs[fid]?.elements || {},
                },
              ]),
            ),
          },
        }),
      });
      if (!r.ok) {
        const e = await r.json();
        setStatus(`❌ ${e.error || r.status}`);
        return false;
      }
      const result = await r.json();
      setSha(result.sha);
      setStatus(`✅ 已写回 GitHub(sha: ${result.sha.slice(0, 7)}...)`);
      return true;
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
      return false;
    }
  }, [layout, lang, sha, frames, frameConfigs, setStatus]);

  return {
    layout, sha, frames, frameConfigs,
    loading, error,
    updateElementPos, updateElementProp,
    save,
  };
}