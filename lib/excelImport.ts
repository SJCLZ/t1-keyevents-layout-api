export interface ExcelEvent {
  date: string;
  body: string;
  currency?: string;
  impact?: string;
}

export interface ExcelInputContent {
  language: string;
  periodStart: string;
  periodEnd: string;
  headerTitle: string;
  introTitleL1: string;
  introTitleL2: string;
  introTitleL3: string;
  outroHeadlineL1: string;
  outroHeadlineL2: string;
  outroSublineL1: string;
  outroSublineL2: string;
  outroUrl: string;
  disclaimerL1: string;
  disclaimerL2: string;
  events: ExcelEvent[];
}

interface KeyEventsJson {
  language?: string;
  languages?: string[];
  period?: { start?: string; end?: string };
  header_title?: string;
  intro_title_l1?: string;
  intro_title_l2?: string;
  intro_title_l3?: string;
  outro_headline_l1?: string;
  outro_headline_l2?: string;
  outro_subline_l1?: string;
  outro_subline_l2?: string;
  outro_url?: string;
  disclaimer_l1?: string;
  disclaimer_l2?: string;
  events?: ExcelEvent[];
}

const LANGUAGE_ALIASES: Record<string, string> = { vn: 'vi', jp: 'ja' };

function normalizeLanguage(value: string): string {
  const language = value.trim().toLowerCase();
  return LANGUAGE_ALIASES[language] || language;
}

/** Convert the JSON emitted by the video input workflow to the same editor model as Excel. */
export function parseKeyEventsJson(value: unknown): ExcelInputContent {
  const data = value as KeyEventsJson;
  const languageValue = data?.language || data?.languages?.[0] || '';
  const fields = {
    language: normalizeLanguage(languageValue),
    periodStart: normalizeDate(data?.period?.start),
    periodEnd: normalizeDate(data?.period?.end),
    headerTitle: cellText(data?.header_title),
    introTitleL1: cellText(data?.intro_title_l1),
    introTitleL2: cellText(data?.intro_title_l2),
    introTitleL3: cellText(data?.intro_title_l3),
    outroHeadlineL1: cellText(data?.outro_headline_l1),
    outroHeadlineL2: cellText(data?.outro_headline_l2),
    outroSublineL1: cellText(data?.outro_subline_l1),
    outroSublineL2: cellText(data?.outro_subline_l2),
    outroUrl: cellText(data?.outro_url),
    disclaimerL1: cellText(data?.disclaimer_l1),
    disclaimerL2: cellText(data?.disclaimer_l2),
  };
  // CN/HI use one complete disclaimer line, so the second line may be empty.
  const missing = Object.entries(fields)
    .filter(([name, field]) => !['disclaimerL1', 'disclaimerL2'].includes(name) && !field)
    .map(([name]) => name);
  if (missing.length) throw new Error(`输入 JSON 缺少必填字段: ${missing.join(', ')}`);
  if (!Array.isArray(data?.events) || data.events.length < 5) {
    throw new Error(`输入 JSON 只有 ${data?.events?.length || 0} 条事件，T1 模板需要 5 条`);
  }
  const events = data.events.slice(0, 5).map((event, index) => ({
    date: normalizeDate(event?.date),
    body: cellText(event?.body),
    ...(event?.currency ? { currency: cellText(event.currency) } : {}),
    ...(event?.impact ? { impact: cellText(event.impact) } : {}),
  }));
  const invalidEvent = events.findIndex((event) => !event.date || !event.body);
  if (invalidEvent >= 0) throw new Error(`输入 JSON 第 ${invalidEvent + 1} 条事件的 date 或 body 为空`);
  return { ...fields, events };
}

const META_KEYS = new Set([
  'header_title', 'language', 'period_start', 'period_end', 'bgm_id',
  'intro_title_l1', 'intro_title_l2', 'intro_title_l3',
  'outro_headline_l1', 'outro_headline_l2',
  'outro_subline_l1', 'outro_subline_l2', 'outro_url',
  'disclaimer_l1', 'disclaimer_l2',
]);

function cellText(value: any): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return formatDate(value);
  if (typeof value === 'object') {
    if ('result' in value) return cellText(value.result);
    if ('text' in value) return String(value.text).trim();
    if (Array.isArray(value.richText)) return value.richText.map((part: any) => part.text || '').join('').trim();
  }
  return String(value).trim();
}

function formatDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDate(value: any): string {
  if (value instanceof Date) return formatDate(value);
  const text = cellText(value);
  const match = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  return text;
}

export async function parseKeyEventsExcel(file: File): Promise<ExcelInputContent> {
  const ExcelJSModule = await import('exceljs');
  const ExcelJS = (ExcelJSModule.default ?? ExcelJSModule) as typeof import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('Excel 中没有工作表');

  const meta: Record<string, string> = {};
  let headerRow = 0;
  for (let row = 1; row <= sheet.rowCount; row += 1) {
    const key = cellText(sheet.getCell(row, 1).value).toLowerCase().replace(/\s+/g, '_');
    if (key === 'date') {
      headerRow = row;
      break;
    }
    if (META_KEYS.has(key)) meta[key] = cellText(sheet.getCell(row, 2).value);
  }
  if (!headerRow) throw new Error("Excel 中找不到事件表头(date / body)");

  const headers = new Map<string, number>();
  for (let column = 1; column <= sheet.columnCount; column += 1) {
    const name = cellText(sheet.getCell(headerRow, column).value).toLowerCase();
    if (name) headers.set(name, column);
  }
  const dateColumn = headers.get('date');
  const bodyColumn = headers.get('body');
  if (!dateColumn || !bodyColumn) throw new Error('Excel 事件表必须包含 date 和 body 列');

  const events: ExcelEvent[] = [];
  for (let row = headerRow + 1; row <= sheet.rowCount; row += 1) {
    const date = normalizeDate(sheet.getCell(row, dateColumn).value);
    const body = cellText(sheet.getCell(row, bodyColumn).value);
    if (!date && !body) continue;
    if (!date || !body) throw new Error(`Excel 第 ${row} 行的 date 或 body 为空`);
    const currencyColumn = headers.get('currency');
    const impactColumn = headers.get('impact');
    events.push({
      date,
      body,
      ...(currencyColumn ? { currency: cellText(sheet.getCell(row, currencyColumn).value) } : {}),
      ...(impactColumn ? { impact: cellText(sheet.getCell(row, impactColumn).value) } : {}),
    });
  }
  if (events.length < 5) throw new Error(`Excel 只有 ${events.length} 条事件，T1 模板需要 5 条`);

  const required = [
    'header_title', 'language', 'period_start', 'period_end',
    'intro_title_l1', 'intro_title_l2', 'intro_title_l3',
    'outro_headline_l1', 'outro_headline_l2',
    'outro_subline_l1', 'outro_subline_l2', 'outro_url',
  ];
  const missing = required.filter((key) => !meta[key]);
  if (missing.length) throw new Error(`Excel 缺少必填字段: ${missing.join(', ')}`);

  const language = normalizeLanguage(meta.language);
  return {
    language,
    periodStart: normalizeDate(meta.period_start),
    periodEnd: normalizeDate(meta.period_end),
    headerTitle: meta.header_title,
    introTitleL1: meta.intro_title_l1,
    introTitleL2: meta.intro_title_l2,
    introTitleL3: meta.intro_title_l3,
    outroHeadlineL1: meta.outro_headline_l1,
    outroHeadlineL2: meta.outro_headline_l2,
    outroSublineL1: meta.outro_subline_l1,
    outroSublineL2: meta.outro_subline_l2,
    outroUrl: meta.outro_url,
    disclaimerL1: meta.disclaimer_l1,
    disclaimerL2: meta.disclaimer_l2 || '',
    events: events.slice(0, 5),
  };
}
