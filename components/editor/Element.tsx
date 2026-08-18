'use client';

import { useRef, useState } from 'react';
import styles from './editor.module.css';

interface Props {
  fid: string;
  eid: string;
  element: any;
  scale: number;
  lang: string;  // 决定 fontFamily / textAlign
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onPropChange: (prop: string, value: any) => void;
}

const FONT_FAMILY: Record<string, string> = {
  sp: "'Plus Jakarta Sans', sans-serif",
  ar: "'Tajawal', sans-serif",
  ja: "'Noto Sans JP', sans-serif",
  en: "'Plus Jakarta Sans', sans-serif",
  vi: "'Plus Jakarta Sans', sans-serif",
  hi: "'Mukta', sans-serif",
  kr: "'Noto Sans KR', sans-serif",
  th: "'Prompt', sans-serif",
  cn: "'Noto Sans SC', sans-serif",
};

export default function Element({ eid, element, scale, lang, isSelected, onSelect, onMove, onPropChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    if (!ref.current) return;
    dragging.current = {
      x: e.clientX,
      y: e.clientY,
    };
    const onMove2 = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dx = (ev.clientX - dragging.current.x) / scale;
      const dy = (ev.clientY - dragging.current.y) / scale;
      dragging.current = { x: ev.clientX, y: ev.clientY };
      onMove(element.x + dx, element.y + dy);
    };
    const onUp = () => {
      dragging.current = null;
      document.removeEventListener('mousemove', onMove2);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove2);
    document.addEventListener('mouseup', onUp);
  };

  // logo 类型特殊处理
  if (element.type === 'logo') {
    return (
      <img
        ref={ref as any}
        src={`/assets/${lang}/logo.png`}
        className={`${styles.element} ${styles.logo} ${isSelected ? styles.selected : ''}`}
        style={{
          left: element.x * scale,
          top: element.y * scale,
          width: element.w * scale,
          height: element.h * scale,
        }}
        onMouseDown={handleMouseDown}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        alt="logo"
      />
    );
  }

  const color = element.type === 'date' || element.type === 'subtitle' ? '#6590D7' : '#fff';
  const fontSize = (element.fontSize || 50) * scale;
  const fontWeight = element.fontWeight || 300;
  const fontFamily = FONT_FAMILY[lang] || 'sans-serif';
  const textAlign = lang === 'ar' ? 'right' : 'left';
  const lineHeight = element.line_pitch && element.fontSize
    ? element.line_pitch / element.fontSize
    : 1.2;

  return (
    <div
      ref={ref}
      className={`${styles.element} ${isSelected ? styles.selected : ''}`}
      style={{
        left: element.x * scale,
        top: element.y * scale,
        width: element.w * scale,
        minHeight: element.h * scale,
        color,
        fontFamily,
        fontSize,
        fontWeight,
        lineHeight,
        textAlign,
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <div className={styles.elementLabel}>{eid}: {(element.text || '').slice(0, 20)}</div>
      {element.text || ''}
    </div>
  );
}