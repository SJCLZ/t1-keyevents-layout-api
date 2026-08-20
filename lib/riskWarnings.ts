/**
 * Approved row (row 4) from the official "Updated risk warning" Google Sheet,
 * worksheet: "on picture risk warning".
 */
export const OFFICIAL_PICTURE_RISK_WARNINGS: Record<string, string> = {
  en: 'Trading CFDs carries a high level of risk',
  cn: '差价合约（CFDs）交易具有高风险。',
  ar: 'ينطوي تداول عقود الفروقات (CFDs) على مخاطر عالية.',
  sp: 'La negociación de Contratos por Diferencia (CFDs) conlleva un alto nivel de riesgo.',
  ja: 'CFD（差金決済取引）の取引は高いリスクを伴います。',
  kr: 'CFD(차액결제거래) 거래는 높은 수준의 위험을 수반합니다.',
  vi: 'Giao dịch CFD tiềm ẩn mức độ rủi ro cao.',
  hi: 'CFD (कॉन्ट्रैक्ट फ़ॉर डिफरेंस) का व्यापार उच्च स्तर के जोखिम से जुड़ा होता है।',
  th: 'การซื้อขายอนุพันธ์มีความเสี่ยงสูงและอาจไม่เหมาะสำหรับทุกคน',
};

export const OFFICIAL_PICTURE_RISK_WARNING_L2: Record<string, string> = {
  en: '', cn: '', ar: '', sp: '', ja: '', kr: '', vi: '', hi: '', th: '',
};

export function getOfficialPictureRiskWarning(language: string): string {
  return OFFICIAL_PICTURE_RISK_WARNINGS[language] || '';
}

export function getOfficialPictureRiskWarningL2(language: string): string {
  return OFFICIAL_PICTURE_RISK_WARNING_L2[language] || '';
}

export function normalizeOfficialPictureRiskWarningLines(
  language: string,
  line1?: string,
  line2?: string,
): { line1: string; line2: string } {
  const officialLine1 = getOfficialPictureRiskWarning(language);
  const officialLine2 = getOfficialPictureRiskWarningL2(language);
  if (!officialLine1) return { line1: line1 || '', line2: line2 || '' };

  const currentLine1 = line1 || '';
  const currentLine2 = line2 || '';
  const compact = (value: string) => value.replace(/\s+/g, '');
  const currentCombined = compact(`${currentLine1}${currentLine2}`);
  const officialCombined = compact(`${officialLine1}${officialLine2}`);

  // The approved picture warning is one sentence, so keep it in one editor
  // item even when an older template stored it as two arbitrary fragments.
  if (!currentCombined || currentCombined === officialCombined) {
    return { line1: officialLine1, line2: officialLine2 };
  }

  const joiner = ['cn', 'ja', 'th'].includes(language) ? '' : ' ';
  const combined = [currentLine1.trim(), currentLine2.trim()].filter(Boolean).join(joiner);
  const sentences = combined.match(/[^.!?。！？؟।]+(?:[.!?。！？؟।]+|$)/gu)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [];
  if (sentences.length <= 1) return { line1: combined, line2: '' };
  return { line1: sentences[0], line2: sentences.slice(1).join(joiner) };
}
