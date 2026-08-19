import { create } from 'zustand';
import { temporal } from 'zundo';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import type { ExcelInputContent } from './excelImport';
import { getOfficialPictureRiskWarning, getOfficialPictureRiskWarningL2 } from './riskWarnings';

export interface EditorElement {
  x: number; y: number; w: number; h: number; type: string;
  text?: string; fontSize?: number; fontWeight?: number; line_pitch?: number;
  // v52+:文字对齐(text-align — PPT 段落右对齐)
  textAlign?: 'left' | 'center' | 'right';
}

export type FrameId = string;
export interface Selection { fid: FrameId; eid: string; }
interface TextFormat {
  fontSize: number;
  fontWeight: number;
  line_pitch: number;
  textAlign: 'left' | 'center' | 'right';
}
interface FormatPainterState {
  source: Selection;
  format: TextFormat;
}
export interface SnapGuides {
  fid: FrameId;
  x: number | null;
  y: number | null;
}

type ElementGeometry = Pick<EditorElement, 'x' | 'y' | 'w' | 'h'> &
  Partial<Pick<EditorElement, 'fontSize' | 'line_pitch'>>;

function resizeTextBox(
  element: EditorElement,
  lang: string,
  fontSize: number,
  linePitch: number,
  textAlign: 'left' | 'center' | 'right',
): EditorElement {
  const oldFontSize = element.fontSize ?? 50;
  const oldLinePitch = element.line_pitch ?? oldFontSize * 1.2;
  if (oldFontSize <= 0 || oldLinePitch <= 0 || fontSize <= 0 || linePitch <= 0) return element;

  const nextW = element.w * (fontSize / oldFontSize);
  const nextH = element.h * (linePitch / oldLinePitch);
  let nextX = element.x;
  if (textAlign === 'right') nextX = element.x + element.w - nextW;
  if (textAlign === 'center') nextX = element.x + (element.w - nextW) / 2;

  return {
    ...element,
    x: nextX,
    // 文字在框内底部对齐，缩放时保持底边不跳动。
    y: element.y + element.h - nextH,
    w: nextW,
    h: nextH,
    fontSize,
    line_pitch: linePitch,
    textAlign: textAlign ?? (lang === 'ar' ? 'right' : 'left'),
  };
}

const INPUT_LOCALES: Record<string, { weekdays: string[]; months: string[]; periodSep: string }> = {
  sp: { weekdays: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'], months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'], periodSep: ' – ' },
  en: { weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], periodSep: ' – ' },
  ja: { weekdays: ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'], months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], periodSep: '～' },
  kr: { weekdays: ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'], months: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'], periodSep: ' ~ ' },
  th: { weekdays: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'], months: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'], periodSep: ' – ' },
  vi: { weekdays: ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'], months: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'], periodSep: ' – ' },
  ar: { weekdays: ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'], months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'], periodSep: ' – ' },
  cn: { weekdays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'], months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], periodSep: ' – ' },
  hi: { weekdays: ['सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार'], months: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'], periodSep: ' – ' },
};

function inputDateParts(iso: string, lang: string) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const locale = INPUT_LOCALES[lang] || INPUT_LOCALES.en;
  return { day: String(day), month: locale.months[month - 1], weekday: locale.weekdays[(date.getUTCDay() + 6) % 7] };
}

function inputPeriod(start: string, end: string, lang: string): string {
  const s = inputDateParts(start, lang);
  const e = inputDateParts(end, lang);
  const locale = INPUT_LOCALES[lang] || INPUT_LOCALES.en;
  const sameMonth = s.month === e.month;
  if (lang === 'sp') return `${s.day} de ${s.month}${locale.periodSep}${e.day} de ${e.month}`;
  if (lang === 'en') return sameMonth ? `${s.day}${locale.periodSep}${e.day} ${e.month}` : `${s.day} ${s.month}${locale.periodSep}${e.day} ${e.month}`;
  if (lang === 'ja') return `${s.month}${s.day}日${locale.periodSep}${e.month}${e.day}日`;
  if (lang === 'kr') return `${s.month} ${s.day}일${locale.periodSep}${e.month} ${e.day}일`;
  if (lang === 'th') return sameMonth ? `${s.day}${locale.periodSep}${e.day} ${e.month}` : `${s.day} ${s.month}${locale.periodSep}${e.day} ${e.month}`;
  if (lang === 'vi') return `${s.day}/${start.slice(5, 7)}${locale.periodSep}${e.day}/${end.slice(5, 7)}/${end.slice(0, 4)}`;
  if (lang === 'ar') return sameMonth ? `${s.day}${locale.periodSep}${e.day} ${e.month}` : `${s.day} ${s.month}${locale.periodSep}${e.day} ${e.month}`;
  if (lang === 'cn') return `${s.month}${s.day}日${locale.periodSep}${e.month}${e.day}日`;
  if (lang === 'hi') return sameMonth ? `${s.day}${locale.periodSep}${e.day} ${e.month}` : `${s.day} ${s.month}${locale.periodSep}${e.day} ${e.month}`;
  return `${s.day}${locale.periodSep}${e.day}`;
}

function inputEventDate(iso: string, lang: string): string {
  const parts = inputDateParts(iso, lang);
  if (lang === 'sp') return `${parts.day} de ${parts.month}`;
  if (lang === 'ja' || lang === 'cn') return `${parts.month}${parts.day}日`;
  if (lang === 'kr') return `${parts.month} ${parts.day}일`;
  if (lang === 'vi') return `${parts.day}/${iso.slice(5, 7)}`;
  return `${parts.day} ${parts.month}`;
}

interface EditorState {
  lang: string;
  // v52+:从 API /api/layouts 拉的语言列表(不再硬编码)
  langs: string[];
  layout: any | null;
  sha: string;
  frames: FrameId[];
  frameConfigs: Record<FrameId, { elements: Record<string, EditorElement> }>;
  selectedFid: FrameId | null;
  selectedEid: string | null;
  // v52+:多选 — array(单选时 length=1)
  selectedEids: Selection[];
  formatPainter: FormatPainterState | null;
  snapGuides: SnapGuides | null;
  showingRef: boolean;
  showingGuides: boolean;
  status: string;
  setLang: (lang: string) => void;
  setLangs: (langs: string[]) => void;
  loadLayout: (data: any, sha: string) => void;
  setSha: (sha: string) => void;
  setInputSignature: (signature: string) => void;
  setStatus: (s: string) => void;
  setSelected: (fid: FrameId | null, eid: string | null, multi?: boolean) => void;
  toggleRef: () => void;
  toggleGuides: () => void;
  moveElement: (fid: FrameId, eid: string, x: number, y: number) => void;
  nudgeSelected: (dx: number, dy: number) => void;
  updateElement: (fid: FrameId, eid: string, prop: string, value: any) => void;
  resizeElement: (fid: FrameId, eid: string, geometry: ElementGeometry) => void;
  fitElementBox: (fid: FrameId, eid: string, minW: number, minH: number) => void;
  applyInputContent: (input: ExcelInputContent) => void;
  startFormatPainter: () => void;
  cancelFormatPainter: () => void;
  applyFormatPainter: (fid: FrameId, eid: string) => void;
  setSnapGuides: (guides: SnapGuides | null) => void;
  // v52+:对齐 / 等距(PPT 风格)
  alignText: (align: 'left' | 'center' | 'right') => void;
  alignElements: (align: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom') => void;
  distributeElements: (axis: 'h' | 'v') => void;
}

// 撤销 / 重做 hook(订阅 zundo temporal 状态)
export const useTemporalStore = <T,>(selector: (state: any) => T): T =>
  useStoreWithEqualityFn(useEditor.temporal as any, selector, Object.is);


export const useEditor = create<EditorState>()(
  temporal(
    (set, get) => ({
      lang: 'ar',
      langs: [],
      layout: null,
      sha: '',
      frames: [],
      frameConfigs: {},
      selectedFid: null,
      selectedEid: null,
      selectedEids: [],
      formatPainter: null,
      snapGuides: null,
      showingRef: false,
      showingGuides: false,
      status: '',

      setLang: (lang) => set({ lang, layout: null, sha: '', frames: [], frameConfigs: {}, selectedFid: null, selectedEid: null, selectedEids: [], formatPainter: null, snapGuides: null }),
      setLangs: (langs) => set({ langs }),

      loadLayout: (data, sha) => {
        const fids = Object.keys(data.frames || {});
        const fc: Record<string, { elements: Record<string, EditorElement> }> = {};
        fids.forEach((fid) => {
          fc[fid] = { elements: JSON.parse(JSON.stringify(data.frames[fid].elements || {})) };
        });
        set({ layout: data, sha, frames: fids, frameConfigs: fc, selectedFid: null, selectedEid: null, selectedEids: [], formatPainter: null, snapGuides: null });
      },

      setSha: (sha) => set({ sha }),
      setInputSignature: (signature) => set((s) => s.layout ? {
        layout: { ...s.layout, _input_signature: signature, _placeholder: false },
      } : s),
      setStatus: (s) => set({ status: s }),
      toggleRef: () => set((s) => ({ showingRef: !s.showingRef, snapGuides: null })),
      toggleGuides: () => set((s) => ({ showingGuides: !s.showingGuides, snapGuides: null })),
      setSnapGuides: (snapGuides) => set({ snapGuides }),

      setSelected: (fid, eid, multi) => {
        const state = get();
        if (multi && fid && eid) {
          // v52+:Shift + click → 切换多选
          const cur = state.selectedEids;
          const exists = cur.find((s) => s.fid === fid && s.eid === eid);
          const next = exists
            ? cur.filter((s) => !(s.fid === fid && s.eid === eid))
            : [...cur, { fid, eid }];
          set({ selectedEids: next, selectedFid: fid, selectedEid: eid });
        } else {
          set({
            selectedFid: fid,
            selectedEid: eid,
            selectedEids: fid && eid ? [{ fid, eid }] : [],
          });
        }
      },

      moveElement: (fid, eid, x, y) => set((s) => {
        const fc = s.frameConfigs[fid];
        if (!fc?.elements?.[eid]) return s;
        return {
          frameConfigs: {
            ...s.frameConfigs,
            [fid]: { ...fc, elements: { ...fc.elements, [eid]: { ...fc.elements[eid], x, y } } },
          },
        };
      }),

      // 方向键微调：单选和多选都作为一次操作移动，便于一步撤销。
      nudgeSelected: (dx, dy) => set((s) => {
        if (s.selectedEids.length === 0 || (dx === 0 && dy === 0)) return s;
        const frameConfigs = { ...s.frameConfigs };
        const touchedFrames = new Set<string>();
        s.selectedEids.forEach(({ fid, eid }) => {
          const frame = frameConfigs[fid];
          const element = frame?.elements?.[eid];
          if (!element) return;
          const baseFrame = touchedFrames.has(fid) ? frameConfigs[fid] : frame;
          frameConfigs[fid] = {
            ...baseFrame,
            elements: {
              ...baseFrame.elements,
              [eid]: { ...element, x: element.x + dx, y: element.y + dy },
            },
          };
          touchedFrames.add(fid);
        });
        return touchedFrames.size > 0 ? { frameConfigs } : s;
      }),

      updateElement: (fid, eid, prop, value) => set((s) => {
        const fc = s.frameConfigs[fid];
        const element = fc?.elements?.[eid];
        if (!element) return s;
        let updated = { ...element, [prop]: value };
        if (element.type !== 'logo' && prop === 'fontSize' && Number(value) > 0) {
          const oldFontSize = element.fontSize ?? 50;
          const oldLinePitch = element.line_pitch ?? oldFontSize * 1.2;
          const nextLinePitch = oldLinePitch * (Number(value) / oldFontSize);
          const textAlign = element.textAlign ?? (s.lang === 'ar' ? 'right' : 'left');
          updated = resizeTextBox(element, s.lang, Number(value), nextLinePitch, textAlign);
          if (element.line_pitch === undefined) delete updated.line_pitch;
        } else if (element.type !== 'logo' && prop === 'line_pitch' && Number(value) > 0) {
          const fontSize = element.fontSize ?? 50;
          const textAlign = element.textAlign ?? (s.lang === 'ar' ? 'right' : 'left');
          updated = resizeTextBox(element, s.lang, fontSize, Number(value), textAlign);
        }
        return {
          frameConfigs: {
            ...s.frameConfigs,
            [fid]: { ...fc, elements: { ...fc.elements, [eid]: updated } },
          },
        };
      }),

      // resize 把几何和字号作为一次更新，避免字号自动适配导致二次缩放。
      resizeElement: (fid, eid, geometry) => set((s) => {
        const fc = s.frameConfigs[fid];
        const element = fc?.elements?.[eid];
        if (!element) return s;
        return {
          frameConfigs: {
            ...s.frameConfigs,
            [fid]: { ...fc, elements: { ...fc.elements, [eid]: { ...element, ...geometry } } },
          },
        };
      }),

      // 文字框宽度只在溢出时扩展；高度始终贴合实际文字，并保持文字底边不动。
      fitElementBox: (fid, eid, minW, minH) => set((s) => {
        const fc = s.frameConfigs[fid];
        const element = fc?.elements?.[eid];
        if (!element || element.type === 'logo') return s;
        const nextW = Math.max(element.w, minW);
        const nextH = Math.max(1, minH);
        if (Math.abs(nextW - element.w) <= 0.5 && Math.abs(nextH - element.h) <= 0.5) return s;
        const textAlign = element.textAlign ?? (s.lang === 'ar' ? 'right' : 'left');
        let nextX = element.x;
        if (textAlign === 'right') nextX -= nextW - element.w;
        if (textAlign === 'center') nextX -= (nextW - element.w) / 2;
        const updated = {
          ...element,
          x: nextX,
          y: element.y + element.h - nextH,
          w: nextW,
          h: nextH,
        };
        return {
          frameConfigs: {
            ...s.frameConfigs,
            [fid]: { ...fc, elements: { ...fc.elements, [eid]: updated } },
          },
        };
      }),

      // 将 Excel 的内容映射到 7 张编辑画布，保留所有几何与样式。
      applyInputContent: (input) => set((s) => {
        const frameConfigs = { ...s.frameConfigs };
        const updateText = (fid: string, eid: string, text: string) => {
          const frame = frameConfigs[fid];
          const element = frame?.elements?.[eid];
          if (!element) return;
          frameConfigs[fid] = {
            ...frame,
            elements: { ...frame.elements, [eid]: { ...element, text } },
          };
        };
        const period = inputPeriod(input.periodStart, input.periodEnd, s.lang);
        updateText('t002', 'title1', input.introTitleL1);
        updateText('t002', 'title2', input.introTitleL2);
        updateText('t002', 'title3', input.introTitleL3);
        updateText('t002', 'subtitle', period);
        ['t004', 't011', 't018', 't025', 't032'].forEach((fid, index) => {
          const event = input.events[index];
          if (!event) return;
          const parts = inputDateParts(event.date, s.lang);
          updateText(fid, 'header', input.headerTitle);
          updateText(fid, 'period', period);
          updateText(fid, 'weekday', parts.weekday);
          updateText(fid, 'date', inputEventDate(event.date, s.lang));
          updateText(fid, 'body', event.body);
        });
        updateText('t042', 'headline1', input.outroHeadlineL1);
        updateText('t042', 'headline2', input.outroHeadlineL2);
        updateText('t042', 'subline1', input.outroSublineL1);
        updateText('t042', 'subline2', input.outroSublineL2);
        updateText('t042', 'url', input.outroUrl);
        Object.keys(frameConfigs).forEach((fid) => {
          updateText(fid, 'disclaimer_l1', input.disclaimerL1 || getOfficialPictureRiskWarning(s.lang));
          updateText(fid, 'disclaimer_l2', input.disclaimerL2 || getOfficialPictureRiskWarningL2(s.lang));
        });
        return { frameConfigs, selectedFid: null, selectedEid: null, selectedEids: [] };
      }),

      // PPT 风格的一次性格式刷：只复制文字格式，不复制内容、位置和尺寸。
      startFormatPainter: () => {
        const state = get();
        if (state.selectedEids.length !== 1) return;
        const source = state.selectedEids[0];
        const element = state.frameConfigs[source.fid]?.elements?.[source.eid];
        if (!element || element.type === 'logo') return;
        const fontSize = element.fontSize ?? 50;
        set({
          formatPainter: {
            source,
            format: {
              fontSize,
              fontWeight: element.fontWeight ?? 300,
              line_pitch: element.line_pitch ?? fontSize * 1.2,
              textAlign: element.textAlign ?? (state.lang === 'ar' ? 'right' : 'left'),
            },
          },
        });
      },

      cancelFormatPainter: () => set({ formatPainter: null }),

      applyFormatPainter: (fid, eid) => set((state) => {
        const painter = state.formatPainter;
        const frame = state.frameConfigs[fid];
        const target = frame?.elements?.[eid];
        if (!painter || !target || target.type === 'logo') return state;
        const updated = resizeTextBox(
          target,
          state.lang,
          painter.format.fontSize,
          painter.format.line_pitch,
          painter.format.textAlign,
        );
        return {
          frameConfigs: {
            ...state.frameConfigs,
            [fid]: {
              ...frame,
              elements: {
                ...frame.elements,
                [eid]: { ...updated, ...painter.format },
              },
            },
          },
          selectedFid: fid,
          selectedEid: eid,
          selectedEids: [{ fid, eid }],
          formatPainter: null,
        };
      }),

      // v52+:文字水平对齐(PPT 段落右对齐)— 文字在 box 内 text-align,box 位置不动
      alignText: (align: 'left' | 'center' | 'right') => {
        const { selectedEids } = get();
        if (selectedEids.length === 0) return;
        set((s) => {
          const frameConfigs = { ...s.frameConfigs };
          selectedEids.forEach((sel) => {
            const frame = frameConfigs[sel.fid];
            const el = frame?.elements?.[sel.eid];
            if (!el) return;
            frameConfigs[sel.fid] = {
              ...frame,
              elements: {
                ...frame.elements,
                [sel.eid]: { ...el, textAlign: align },
              },
            };
          });
          return { frameConfigs };
        });
      },

      alignElements: (align) => {
        const { selectedEids, frameConfigs } = get();
        const elements = selectedEids
          .map((sel) => ({ sel, el: frameConfigs[sel.fid]?.elements?.[sel.eid] }))
          .filter((item): item is { sel: Selection; el: EditorElement } => Boolean(item.el));
        if (elements.length < 2) return;

        const left = Math.min(...elements.map(({ el }) => el.x));
        const right = Math.max(...elements.map(({ el }) => el.x + el.w));
        const top = Math.min(...elements.map(({ el }) => el.y));
        const bottom = Math.max(...elements.map(({ el }) => el.y + el.h));
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;

        set((s) => {
          const next = { ...s.frameConfigs };
          elements.forEach(({ sel, el }) => {
            const frame = next[sel.fid];
            const updated = { ...el };
            if (align === 'left') updated.x = left;
            if (align === 'centerX') updated.x = centerX - el.w / 2;
            if (align === 'right') updated.x = right - el.w;
            if (align === 'top') updated.y = top;
            if (align === 'centerY') updated.y = centerY - el.h / 2;
            if (align === 'bottom') updated.y = bottom - el.h;
            next[sel.fid] = {
              ...frame,
              elements: { ...frame.elements, [sel.eid]: updated },
            };
          });
          return { frameConfigs: next };
        });
      },

      // v52+:PPT 风格等距(水平 / 垂直)— 3+ 个元素才生效
      distributeElements: (axis) => {
        const { selectedEids, frameConfigs } = get();
        if (selectedEids.length < 3) return;
        // 按位置排序
        const sorted = [...selectedEids].sort((a, b) => {
          const ea = frameConfigs[a.fid]?.elements?.[a.eid];
          const eb = frameConfigs[b.fid]?.elements?.[b.eid];
          if (!ea || !eb) return 0;
          return axis === 'h' ? ea.x - eb.x : ea.y - eb.y;
        });
        // 第一个 / 最后一个固定,中间按等距计算
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const firstEl = frameConfigs[first.fid]?.elements?.[first.eid];
        const lastEl = frameConfigs[last.fid]?.elements?.[last.eid];
        if (!firstEl || !lastEl) return;
        const startPos = axis === 'h' ? firstEl.x : firstEl.y;
        const endPos = axis === 'h' ? lastEl.x : lastEl.y;
        const total = endPos - startPos;
        const step = total / (sorted.length - 1);
        set((s) => {
          const frameConfigs = { ...s.frameConfigs };
          for (let i = 1; i < sorted.length - 1; i++) {
            const sel = sorted[i];
            const frame = frameConfigs[sel.fid];
            const el = frame?.elements?.[sel.eid];
            if (!el) continue;
            const newPos = startPos + step * i;
            frameConfigs[sel.fid] = {
              ...frame,
              elements: {
                ...frame.elements,
                [sel.eid]: {
                  ...el,
                  ...(axis === 'h' ? { x: Math.round(newPos) } : { y: Math.round(newPos) }),
                },
              },
            };
          }
          return { frameConfigs };
        });
      },
    }),
    {
      // 只 track 画布内容，选中状态不进入撤销历史。
      partialize: (state) => ({ frameConfigs: state.frameConfigs } as any),
      equality: (pastState, currentState) => pastState.frameConfigs === currentState.frameConfigs,
      limit: 50,
    },
  ),
);
