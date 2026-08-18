'use client';

import styles from './editor.module.css';

interface Props {
  lang: string;
  fid: string | null;
  eid: string | null;
  element: any;
  onChange: (fid: string, eid: string, prop: string, value: any) => void;
}

export default function PropertyPanel({ lang, fid, eid, element, onChange }: Props) {
  if (!fid || !eid || !element) {
    return (
      <div className={styles.panel}>
        <h3>属性面板</h3>
        <p className={styles.muted}>点击元素查看属性</p>
      </div>
    );
  }

  const handle = (prop: string, value: any) => onChange(fid, eid, prop, value);

  return (
    <div className={styles.panel}>
      <h3>{eid}</h3>
      <p className={styles.muted}>{element.type} · {fid}</p>

      <div className={styles.field}>
        <label>x</label>
        <input type="number" value={Math.round(element.x)} onChange={(e) => handle('x', Number(e.target.value))} />
      </div>
      <div className={styles.field}>
        <label>y</label>
        <input type="number" value={Math.round(element.y)} onChange={(e) => handle('y', Number(e.target.value))} />
      </div>
      <div className={styles.field}>
        <label>宽 (w)</label>
        <input type="number" value={Math.round(element.w)} onChange={(e) => handle('w', Number(e.target.value))} />
      </div>
      <div className={styles.field}>
        <label>高 (h)</label>
        <input type="number" value={Math.round(element.h)} onChange={(e) => handle('h', Number(e.target.value))} />
      </div>

      {element.fontSize !== undefined && (
        <>
          <div className={styles.field}>
            <label>字号 (px)</label>
            <input type="number" value={element.fontSize} onChange={(e) => handle('fontSize', Number(e.target.value))} />
          </div>
          <div className={styles.field}>
            <label>字重</label>
            <input type="number" value={element.fontWeight || 300} onChange={(e) => handle('fontWeight', Number(e.target.value))} />
          </div>
        </>
      )}

      {element.line_pitch !== undefined && (
        <div className={styles.field}>
          <label>行距 (px)</label>
          <input type="number" value={element.line_pitch} onChange={(e) => handle('line_pitch', Number(e.target.value))} />
        </div>
      )}

      {element.text !== undefined && (
        <div className={styles.field}>
          <label>文字</label>
          <textarea
            value={element.text}
            onChange={(e) => handle('text', e.target.value)}
            rows={3}
          />
        </div>
      )}
    </div>
  );
}