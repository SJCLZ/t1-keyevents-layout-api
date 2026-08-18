'use client';

import styles from './editor.module.css';

interface Props {
  lang: string;
  langs: string[];
  onLangChange: (l: string) => void;
  onSave: () => void;
  onToggleRef: () => void;
  showingRef: boolean;
  loading: boolean;
}

const LANG_LABELS: Record<string, string> = {
  sp: 'SP 西班牙语 (LTR)',
  ar: 'AR 阿拉伯语 (RTL)',
  ja: 'JA 日语',
  en: 'EN 英语',
  vi: 'VI 越南语',
  hi: 'HI 印地语',
  kr: 'KR 韩语',
  th: 'TH 泰语',
  cn: 'CN 简体中文',
};

export default function Toolbar({ lang, langs, onLangChange, onSave, onToggleRef, showingRef, loading }: Props) {
  return (
    <div className={styles.toolbar}>
      <span className={styles.title}>T1_KeyEvents 编辑器</span>
      <label className={styles.langLabel}>
        语言:
        <select
          value={lang}
          onChange={(e) => onLangChange(e.target.value)}
          className={styles.select}
        >
          {langs.map((l) => (
            <option key={l} value={l}>{LANG_LABELS[l] || l}</option>
          ))}
        </select>
      </label>
      <button onClick={onToggleRef} className={styles.btnSecondary}>
        {showingRef ? '🎬 显示模板' : '🖼️ 显示原版参考'}
      </button>
      <button onClick={onSave} className={styles.btnPrimary} disabled={loading}>
        {loading ? '保存中...' : '💾 写回 GitHub'}
      </button>
      <span className={styles.hint}>
        操作:元素拖动 =移动 / 拉角 =改大小 / 点击 =选中
      </span>
    </div>
  );
}