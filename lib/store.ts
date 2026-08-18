import { create } from 'zustand';
import { temporal } from 'zundo';

// 元素类型
export interface EditorElement {
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  line_pitch?: number;
}

// 帧类型(单一 fid)
export type FrameId = string;

// Editor store — 管 layout + 选中 + 显示模式
interface EditorState {
  // 数据
  lang: string;
  layout: any | null;
  sha: string;
  frames: FrameId[];
  frameConfigs: Record<FrameId, { elements: Record<string, EditorElement> }>;

  // UI 状态
  selectedFid: FrameId | null;
  selectedEid: string | null;
  showingRef: boolean;  // 显示原版参考 vs 模板
  status: string;

  // Actions
  setLang: (lang: string) => void;
  loadLayout: (data: any, sha: string) => void;
  setSha: (sha: string) => void;
  setSelected: (fid: FrameId | null, eid: string | null) => void;
  toggleRef: () => void;
  setStatus: (s: string) => void;

  // 元素操作(trackable,支持 undo)
  moveElement: (fid: FrameId, eid: string, x: number, y: number) => void;
  updateElement: (fid: FrameId, eid: string, prop: string, value: any) => void;
}

export const useEditor = create<EditorState>()(
  temporal(
    (set) => ({
      lang: 'ar',
      layout: null,
      sha: '',
      frames: [],
      frameConfigs: {},
      selectedFid: null,
      selectedEid: null,
      showingRef: false,
      status: '',

  setLang: (lang) => set({ lang, layout: null, sha: '', frames: [], frameConfigs: {}, selectedFid: null, selectedEid: null }),
  loadLayout: (data, sha) => {
    const fids = Object.keys(data.frames || {});
    const fc: Record<string, { elements: Record<string, EditorElement> }> = {};
    fids.forEach((fid) => {
      fc[fid] = { elements: JSON.parse(JSON.stringify(data.frames[fid].elements || {})) };
    });
    set({ layout: data, sha, frames: fids, frameConfigs: fc });
  },
  setSha: (sha) => set({ sha }),
  setSelected: (fid, eid) => set({ selectedFid: fid, selectedEid: eid }),
  toggleRef: () => set((s) => ({ showingRef: !s.showingRef })),
  setStatus: (s) => set({ status: s }),

  moveElement: (fid, eid, x, y) =>
    set((s) => {
      const fc = s.frameConfigs[fid];
      if (!fc?.elements?.[eid]) return s;
      return {
        frameConfigs: {
          ...s.frameConfigs,
          [fid]: {
            ...fc,
            elements: { ...fc.elements, [eid]: { ...fc.elements[eid], x, y } },
          },
        },
      };
    }),
  updateElement: (fid, eid, prop, value) =>
    set((s) => {
      const fc = s.frameConfigs[fid];
      if (!fc?.elements?.[eid]) return s;
      return {
        frameConfigs: {
          ...s.frameConfigs,
          [fid]: {
            ...fc,
            elements: { ...fc.elements, [eid]: { ...fc.elements[eid], [prop]: value } },
          },
        },
      };
    }),
    }),
    {
      // 只 track frameConfigs(其他 UI 状态不需要撤销)
      partialize: (state) => ({ frameConfigs: state.frameConfigs } as any),
      limit: 50,
    },
  ),
);

// 撤销 / 重做 hooks — 直接调 useEditor.temporal.getState() / subscribe
// (在 Toolbar 用 useStoreWithEqualityFn 订阅 pastStates/futureStates 触发渲染)
import { useStoreWithEqualityFn } from 'zustand/traditional';

export const useTemporalStore = <T,>(selector: (state: any) => T): T =>
  useStoreWithEqualityFn(useEditor.temporal as any, selector, Object.is);