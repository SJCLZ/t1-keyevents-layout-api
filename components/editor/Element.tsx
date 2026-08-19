'use client';

import { useLayoutEffect, useRef } from 'react';
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
// 12 个模板坐标约等于画布上 4px，手感接近 PPT 的磁性吸附。
const SNAP_THRESHOLD = 12;

// official logo 素材是 2000×751，可见白色墨迹只占中间这一块。
// 用该 bbox 做 viewBox，使编辑器预览与 Remotion 成片的裁切/缩放逻辑一致。
const LOGO_WHITE_INK_VIEWBOX = '232 261 1536 226';

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
  const resizeElement = useEditor((s) => s.resizeElement);
  const fitElementBox = useEditor((s) => s.fitElementBox);
  const selectedEids = useEditor((s) => s.selectedEids);
  const formatPainter = useEditor((s) => s.formatPainter);
  const applyFormatPainter = useEditor((s) => s.applyFormatPainter);
  const showingRef = useEditor((s) => s.showingRef);
  const showingGuides = useEditor((s) => s.showingGuides);
  const referenceElements = useEditor((s) => s.layout?.frames?.[fid]?.elements || {});
  const setSnapGuides = useEditor((s) => s.setSnapGuides);
  // v52+:多选 — isPrimary(主选,有 handles)/ isMultiOnly(辅选,只蓝边)
  const isPrimary = selectedFid === fid && selectedEid === eid;
  const isMultiSelected = selectedEids.some((s) => s.fid === fid && s.eid === eid);
  const isSelected = isPrimary;  // 主选才有 handles
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  // 选中时让框高贴合实际文字；缩放框体时保持文字底边位置不变。
  useLayoutEffect(() => {
    if (!isSelected || element.type === 'logo' || !boxRef.current || !textRef.current) return;
    const frame = requestAnimationFrame(() => {
      const box = boxRef.current;
      const text = textRef.current;
      if (!box || !text) return;
      const horizontalPadding = box.offsetWidth - box.clientWidth + 12;
      const requiredW = (text.scrollWidth + horizontalPadding) / SCALE;
      const requiredH = text.scrollHeight / SCALE;
      fitElementBox(fid, eid, requiredW, requiredH);
    });
    return () => cancelAnimationFrame(frame);
  }, [eid, element.fontSize, element.h, element.line_pitch, element.text, element.type, element.w, fid, fitElementBox, isSelected]);

  // v52+:用 useRef 保存拖动起始位置,避免 React closure 在 store 更新时重建 startX 导致"飞走"
  const dragRef = useRef({ startX: 0, startY: 0, startMx: 0, startMy: 0, active: false });

  // mousedown 已经处理单选/多选，click 只阻止冒泡。
  // 不要在这里再切换一次 Shift 多选，否则元素会被立即取消。
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (formatPainter) {
      applyFormatPainter(fid, eid);
      return;
    }
    // Shift / Cmd / Ctrl + click → 多选切换。
    setSelected(fid, eid, e.shiftKey || e.metaKey || e.ctrlKey);
    dragRef.current = {
      startX: element.x,
      startY: element.y,
      startMx: e.clientX,
      startMy: e.clientY,
      active: true,
    };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current.active) return;
      const dx = (ev.clientX - dragRef.current.startMx) / SCALE;
      const dy = (ev.clientY - dragRef.current.startMy) / SCALE;
      let nextX = dragRef.current.startX + dx;
      let nextY = dragRef.current.startY + dy;

      if (showingRef || showingGuides) {
        const xTargets: number[] = [];
        const yTargets: number[] = [];
        Object.values(referenceElements).forEach((ref: any) => {
          if (![ref?.x, ref?.y, ref?.w, ref?.h].every(Number.isFinite)) return;
          xTargets.push(ref.x);
          yTargets.push(ref.y);
        });

        const nearestSnap = (anchors: number[], targets: number[]) => {
          let best: { delta: number; guide: number } | null = null;
          for (const anchor of anchors) {
            for (const target of targets) {
              const delta = target - anchor;
              if (Math.abs(delta) <= SNAP_THRESHOLD && (!best || Math.abs(delta) < Math.abs(best.delta))) {
                best = { delta, guide: target };
              }
            }
          }
          return best;
        };

        const snapX = nearestSnap([nextX, nextX + element.w / 2, nextX + element.w], xTargets);
        const snapY = nearestSnap([nextY, nextY + element.h / 2, nextY + element.h], yTargets);
        if (snapX) nextX += snapX.delta;
        if (snapY) nextY += snapY.delta;
        setSnapGuides({ fid, x: snapX?.guide ?? null, y: snapY?.guide ?? null });
      } else {
        setSnapGuides(null);
      }

      moveElement(fid, eid, nextX, nextY);
    };
    const onUp = () => {
      dragRef.current.active = false;
      setSnapGuides(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // v52+:拖拽控制点 resize 元素(PPT 交互 + 字号按比例缩放)
  // direction: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  const onResizeStart = (direction: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = element.x, startY = element.y, startW = element.w, startH = element.h;
    const startFont = element.fontSize ?? 50;
    const startMx = e.clientX, startMy = e.clientY;
    const aspectRatio = startW / startH;
    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startMx) / SCALE;
      const dy = (ev.clientY - startMy) / SCALE;
      let { x, y, w, h } = { x: startX, y: startY, w: startW, h: startH };
      const shift = ev.shiftKey;
      // 1. 计算新 w/h
      if (direction.includes('e')) w = Math.max(20, startW + dx);
      if (direction.includes('w')) { w = Math.max(20, startW - dx); x = startX + (startW - w); }
      if (direction.includes('s')) h = Math.max(20, startH + dy);
      if (direction.includes('n')) { h = Math.max(20, startH - dy); y = startY + (startH - h); }
      // 2. Shift 保持原比例
      if (shift) {
        if (direction.length === 1) {
          if (direction === 'e' || direction === 'w') h = w / aspectRatio;
          else w = h * aspectRatio;
        } else {
          h = w / aspectRatio;
        }
        if (direction.includes('w')) x = startX + (startW - w);
        if (direction.includes('n')) y = startY + (startH - h);
      }
      // 3. v52+:PPT 行为 — 角拖动时字号按比例缩放(边拖动不变)
      let newFont = startFont;
      if (direction.length === 2) {
        // 角:取 w/h 较大比例
        const ratio = Math.max(w / startW, h / startH);
        newFont = Math.max(6, Math.round(startFont * ratio));
      } else if (shift) {
        // 边 + Shift:统一按一个比例
        const ratio = w / startW;  // 或 h/startH
        newFont = Math.max(6, Math.round(startFont * ratio));
      }
      // 几何和字号一次写入，避免自动适应选择框时二次缩放。
      const geometry: { x: number; y: number; w: number; h: number; fontSize?: number; line_pitch?: number } = { x, y, w, h };
      if (newFont !== startFont && element.fontSize !== undefined) {
        geometry.fontSize = newFont;
        if (element.line_pitch !== undefined) {
          geometry.line_pitch = element.line_pitch * (newFont / startFont);
        }
      }
      resizeElement(fid, eid, geometry);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Logo 类型(图片) — 没有字号,只显示移动把手
  if (element.type === 'logo') {
    return (
      <div
        onMouseDown={onMouseDown}
        onClick={onClick}
        className={`absolute ${formatPainter ? 'cursor-not-allowed' : 'cursor-move'}`}
        style={{
          left: element.x * SCALE,
          top: element.y * SCALE,
          width: element.w * SCALE,
          height: element.h * SCALE,
        }}
      >
        <svg
          viewBox={LOGO_WHITE_INK_VIEWBOX}
          preserveAspectRatio="none"
          role="img"
          aria-label="logo"
          className="absolute inset-0 w-full h-full overflow-visible pointer-events-none select-none"
        >
          <image
            href={`/api/assets/logo/${lang}/startrader_logo_official.png`}
            x="0"
            y="0"
            width="2000"
            height="751"
            preserveAspectRatio="none"
          />
        </svg>
        {isSelected && <SelectionHandles onResize={onResizeStart} />}
      </div>
    );
  }

  const color = element.type === 'date' || element.type === 'subtitle' ? '#6590D7' : '#fff';
  const fontSize = (element.fontSize || 50) * SCALE;
  const textAlign = element.textAlign ?? (lang === 'ar' ? 'right' : 'left');
  const lineHeight = element.line_pitch && element.fontSize
    ? element.line_pitch / element.fontSize
    : 1.2;

  return (
    <div
      ref={boxRef}
      onMouseDown={onMouseDown}
      onClick={onClick}
      className={`absolute ${formatPainter ? 'cursor-copy' : 'cursor-move'} select-none flex items-end px-1.5 box-border ${
        isSelected
          ? 'border border-blue-500'
          : isMultiSelected
            ? 'border border-blue-400 border-dashed'
            : 'border border-transparent hover:border-blue-300 hover:border-dashed'
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
      }}
    >
      <span ref={textRef} className="block w-full" style={{ textAlign }}>
        {element.text || ''}
      </span>
      {isSelected && <SelectionHandles onResize={onResizeStart} />}
    </div>
  );
}

// v52+:PPT 风格 — 8 个白色控制点 + 字号调整把手
function SelectionHandles({
  onResize,
}: {
  onResize?: (dir: string) => (e: React.MouseEvent) => void;
}) {
  const HANDLES: { dir: string; pos: string }[] = [
    { dir: 'nw', pos: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize' },
    { dir: 'n',  pos: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-n-resize' },
    { dir: 'ne', pos: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize' },
    { dir: 'e',  pos: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-e-resize' },
    { dir: 'se', pos: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-se-resize' },
    { dir: 's',  pos: 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-s-resize' },
    { dir: 'sw', pos: 'left-0 bottom-0 -translate-x-1/2 -translate-y-1/2 cursor-sw-resize' },
    { dir: 'w',  pos: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-w-resize' },
  ];
  return (
    <>
      {HANDLES.map((h) => (
        <div
          key={`h-${h.dir}`}
          onMouseDown={onResize ? onResize(h.dir) : undefined}
          className={`absolute w-2.5 h-2.5 bg-white border border-blue-500 hover:bg-blue-100 ${h.pos}`}
          title={`拖动 resize 元素(${h.dir.toUpperCase()})`}
        />
      ))}
    </>
  );
}
