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

export function getOfficialPictureRiskWarning(language: string): string {
  return OFFICIAL_PICTURE_RISK_WARNINGS[language] || '';
}
