/**
 * Approved row (row 4) from the official "Updated risk warning" Google Sheet,
 * worksheet: "on picture risk warning".
 */
export const OFFICIAL_PICTURE_RISK_WARNINGS: Record<string, string> = {
  en: 'Trading CFDs carries',
  cn: '差价合约（CFDs）交易',
  ar: 'ينطوي تداول عقود الفروقات (CFDs)',
  sp: 'La negociación de Contratos por Diferencia (CFDs)',
  ja: 'CFD（差金決済取引）の取引は',
  kr: 'CFD(차액결제거래) 거래는',
  vi: 'Giao dịch CFD tiềm ẩn',
  hi: 'CFD (कॉन्ट्रैक्ट फ़ॉर डिफरेंस) का व्यापार',
  th: 'การซื้อขายอนุพันธ์มีความเสี่ยงสูง',
};

export const OFFICIAL_PICTURE_RISK_WARNING_L2: Record<string, string> = {
  en: 'a high level of risk',
  cn: '具有高风险。',
  ar: 'على مخاطر عالية.',
  sp: 'conlleva un alto nivel de riesgo.',
  ja: '高いリスクを伴います。',
  kr: '높은 수준의 위험을 수반합니다.',
  vi: 'mức độ rủi ro cao.',
  hi: 'उच्च स्तर के जोखिम से जुड़ा होता है।',
  th: 'และอาจไม่เหมาะสำหรับทุกคน',
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

  // Normalize only the approved sentence (whether stored in one field or
  // already split). Preserve genuinely custom disclaimer copy unchanged.
  if (!currentCombined || currentCombined === officialCombined) {
    return { line1: officialLine1, line2: officialLine2 };
  }
  return { line1: currentLine1, line2: currentLine2 };
}
