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
