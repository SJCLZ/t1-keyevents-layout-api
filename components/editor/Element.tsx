'use client';

import { useDrag } from '@use-gesture/react';
import { useEditor } from '@/lib/store';

const FONT: Record<string, string> = {
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

const SCALE = 360 / 1080;

interface Props {
  fid: string;
  eid: string;
  element: any;
  lang: string;
}

export default function Element({ fid, eid, element, lang }: Props) {
  const selectedFid = useEditor((s) => s.selectedFid);
  const selectedEid = useEditor((s) => s.selectedEid);
  const setSelected = useEditor((s) => s.setSelected);
  const moveElement = useEditor((s) => s.moveElement);
  const isSelected = selectedFid === fid && selectedEid === eid;

  const bind = useDrag(
    ({ down, movement: [mx, my], event }) => {
      event?.stopPropagation();
      // pointer down 时选中
      if (down) setSelected(fid, eid);
      // 实时更新位置
      moveElement(fid, eid, element.x + mx / SCALE, element.y + my / SCALE);
    },
    { pointer: { keys: false } },
  );

  // 单独 onClick:在拖动不会触发(useDrag 内部 stopPropagation,只触发 mouseup 算 click)
  // 这里做一个轻量 click handler:确保点元素能选中
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(fid, eid);
  };

  // Logo 类型(图片)
  if (element.type === 'logo') {
    return (
      <img
        src={`/api/assets/logo/${lang}/startrader_logo_official.png`}
        alt="logo"
        {...(bind() as any)}
        onClick={onClick}
        className={`absolute cursor-move select-none border-2 ${
          isSelected ? 'border-red-500 ring-2 ring-red-300' : 'border-transparent hover:border-blue-300 hover:border-dashed'
        }`}
        style={{
          left: element.x * SCALE,
          top: element.y * SCALE,
          width: element.w * SCALE,
          height: element.h * SCALE,
          objectFit: 'fill',
        }}
      />
    );
  }

  const color = element.type === 'date' || element.type === 'subtitle' ? '#6590D7' : '#fff';
  const fontSize = (element.fontSize || 50) * SCALE;
  const textAlign = lang === 'ar' ? 'right' : 'left';
  const lineHeight = element.line_pitch && element.fontSize
    ? element.line_pitch / element.fontSize
    : 1.2;

  return (
    <div
      {...(bind() as any)}
      onClick={onClick}
      className={`absolute cursor-move select-none flex items-end px-1.5 box-border border-2 ${
        isSelected ? 'border-red-500 ring-2 ring-red-300' : 'border-transparent hover:border-blue-300 hover:border-dashed'
      }`}
      style={{
        left: element.x * SCALE,
        top: element.y * SCALE,
        width: element.w * SCALE,
        minHeight: element.h * SCALE,
        color,
        fontFamily: FONT[lang] || 'sans-serif',
        fontSize,
        fontWeight: element.fontWeight || 300,
        lineHeight,
        textAlign,
      }}
    >
      {element.text || ''}
    </div>
  );
}