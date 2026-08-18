'use client';

import Frame from './Frame';
import styles from './editor.module.css';

interface Props {
  frames: string[];
  layout: any;
  lang: string;
  showingRef: boolean;
  selectedFid: string | null;
  selectedEid: string | null;
  onSelect: (fid: string, eid: string) => void;
  frameConfigs: Record<string, { elements: Record<string, any> }>;
  updateElementProp: (fid: string, eid: string, prop: string, value: any) => void;
  updateElementPos: (fid: string, eid: string, x: number, y: number) => void;
}

const LABELS: Record<string, string> = {
  t002: 't002 - intro (首页)',
  t004: 't004 - card 1',
  t011: 't011 - card 2',
  t018: 't018 - card 3',
  t025: 't025 - card 4',
  t032: 't032 - card 5',
  t042: 't042 - outro',
};

const CARD_W = 360;
const CARD_H = 640;

export default function Canvas(props: Props) {
  const { frames, layout, lang, showingRef, selectedFid, selectedEid, onSelect, frameConfigs, updateElementProp, updateElementPos } = props;

  if (!layout) return <div className={styles.canvas}><div className={styles.placeholder}>加载中...</div></div>;

  return (
    <div className={styles.canvas}>
      {frames.map((fid, i) => (
        <Frame
          key={fid}
          fid={fid}
          label={LABELS[fid] || fid}
          index={i}
          lang={lang}
          showingRef={showingRef}
          isSelected={selectedFid === fid}
          selectedEid={selectedEid}
          elements={frameConfigs[fid]?.elements || {}}
          videoSrc={layout.video_src}
          refFramePath={layout.frames?.[fid]?.gt_frame_path}
          onSelect={onSelect}
          onMove={updateElementPos}
          onPropChange={updateElementProp}
        />
      ))}
    </div>
  );
}