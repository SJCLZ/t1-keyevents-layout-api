'use client';

import { useState } from 'react';
import Element from './Element';
import styles from './editor.module.css';

interface Props {
  fid: string;
  label: string;
  index: number;
  lang: string;
  showingRef: boolean;
  isSelected: boolean;
  selectedEid: string | null;
  elements: Record<string, any>;
  videoSrc?: string;
  refFramePath?: string;
  onSelect: (fid: string, eid: string) => void;
  onMove: (fid: string, eid: string, x: number, y: number) => void;
  onPropChange: (fid: string, eid: string, prop: string, value: any) => void;
}

export default function Frame({
  fid, label, index, lang, showingRef, isSelected, selectedEid,
  elements, videoSrc, refFramePath, onSelect, onMove, onPropChange,
}: Props) {
  const SCALE = 360 / 1080;  // 1080 → 360 缩放 1/3
  return (
    <div
      className={`${styles.frame} ${isSelected ? styles.frameSelected : ''}`}
      style={{
        left: `${(index % 3) * (360 + 20) + 20}px`,
        top: `${Math.floor(index / 3) * (640 + 60) + 20}px`,
      }}
      onClick={() => onSelect(fid, '')}
    >
      <div className={styles.frameLabel}>{label}</div>
      {showingRef && refFramePath ? (
        <img src={refFramePath} className={styles.frameBg} alt="GT" loading="lazy" />
      ) : (
        <video
          src={videoSrc}
          className={styles.frameBg}
          muted autoPlay loop playsInline
        />
      )}
      {Object.entries(elements).map(([eid, el]) => (
        <Element
          key={eid}
          fid={fid}
          eid={eid}
          element={el}
          scale={SCALE}
          lang={lang}
          isSelected={selectedEid === eid}
          onSelect={() => onSelect(fid, eid)}
          onMove={(x, y) => onMove(fid, eid, x, y)}
          onPropChange={(prop, val) => onPropChange(fid, eid, prop, val)}
        />
      ))}
    </div>
  );
}