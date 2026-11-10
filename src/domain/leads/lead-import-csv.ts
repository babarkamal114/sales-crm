import { z } from 'zod';

export const LEAD_IMPORT_MAX_ROWS = 200;
export const LEAD_IMPORT_MAX_BYTES = 512_000;

export interface LeadImportColumn {
  key: keyof LeadImportPayload;
  header: string;
  required: boolean;
  help: string;
}

export const LEAD_IMPORT_COLUMNS: readonly LeadImportColumn[] = [
  {
    key: 'displayName',
    header: 'contact_name',
    required: true,
    help: 'Full name of the sponsor or prospect contact.',
  },
  {
    key: 'title',
    header: 'opportunity_title',
    required: true,
    help: 'Deal name shown on your pipeline (e.g. 2026 shirt sponsorship).',
  },
  {
    key: 'email',
    header: 'email',
    required: false,
    help: 'Work email for the contact. Leave blank if unknown.',
  },
  {
    key: 'phoneE164',
    header: 'phone_e164',
    required: false,
    help: 'Phone in E.164 format when possible (e.g. +447700900123).',
  },
  {
    key: 'valuePence',
    header: 'value_pence',
    required: false,
    help: 'Deal value in pence (500000 = £5,000). Whole numbers only.',
  },
  {
    key: 'marketingConsent',
    header: 'marketing_consent',
    required: false,
    help: 'yes/no — whether they agreed to marketing contact (GDPR). Defaults to no.',
  },
] as const;

const REQUIRED_HEADERS = LEAD_IMPORT_COLUMNS.filter((c) => c.required).map((c) => c.header);

const HEADER_ALIASES: Record<string, keyof LeadImportPayload> = {
  contact_name: 'displayName',
  name: 'displayName',
  display_name: 'displayName',
  full_name: 'displayName',
  opportunity_title: 'title',
  title: 'title',
  deal_title: 'title',
  opportunity: 'title',
  email: 'email',
  contact_email: 'email',
  phone_e164: 'phoneE164',
  phone: 'phoneE164',
  contact_phone: 'phoneE164',
  value_pence: 'valuePence',
  deal_value_pence: 'valuePence',
  value: 'valuePence',
  marketing_consent: 'marketingConsent',
  gdpr_consent: 'marketingConsent',
  marketing: 'marketingConsent',
};

export type LeadImportPayload = {
  displayName: string;
  title: string;
  email?: string;
  phoneE164?: string;
  valuePence?: number;
  marketingConsent: boolean;
};

export interface LeadImportParsedRow {
  lineNumber: number;
  payload: LeadImportPayload;
}

export interface LeadImportRowError {
  lineNumber: number;
  contactName: string | null;
  message: string;
}

export interface LeadImportParseResult {
  rows: LeadImportParsedRow[];
  rowErrors: LeadImportRowError[];
  fileErrors: string[];
  unknownHeaders: string[];
  totalDataRows: number;
}

export function buildLeadImportTemplateCsv(): string {
  const headers = LEAD_IMPORT_COLUMNS.map((c) => c.header).join(',');
  const example =
    'Jane Doe,2026 kit sponsor,jane@example.com,+447700900123,500000,yes';
  const example2 = 'John Smith,Stadium naming rights,,,2500000,no';
  return `${headers}\n${example}\n${example2}\n`;
}

export function downloadLeadImportTemplate(): void {
  const blob = new Blob([buildLeadImportTemplateCsv()], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'crm-leads-template.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let index = 0;

  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  function endCell() {
    row.push(cell);
    cell = '';
  }

  function endRow() {
    endCell();
    rows.push(row);
    row = [];
  }

  while (index < input.length) {
    const char = input[index]!;

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          cell += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      cell += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }

    if (char === ',') {
      endCell();
      index += 1;
      continue;
    }

    if (char === '\r') {
      if (input[index + 1] === '\n') index += 1;
      endRow();
      index += 1;
      continue;
    }

    if (char === '\n') {
      endRow();
      index += 1;
      continue;
    }

    cell += char;
    index += 1;
  }

  if (cell.length > 0 || row.length > 0) {
    endRow();
  }

  return rows.filter((entry) => entry.some((value) => value.trim() !== ''));
}

export function normaliseCsvHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function parseMarketingConsent(raw: string | undefined): boolean {
  if (!raw || raw.trim() === '') return false;
  const v = raw.trim().toLowerCase();
  if (['yes', 'y', 'true', '1'].includes(v)) return true;
  if (['no', 'n', 'false', '0'].includes(v)) return false;
  throw new Error('marketing_consent must be yes or no.');
}

function parseValuePence(raw: string | undefined): number | undefined {
  if (!raw || raw.trim() === '') return undefined;
  const cleaned = raw.trim().replace(/,/g, '');
  if (!/^\d+$/.test(cleaned)) {
    throw new Error('value_pence must be a whole number of pence.');
  }
  const n = Number(cleaned);
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new Error('value_pence must be zero or a positive integer.');
  }
  return n;
}

const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().email('Enter a valid email.').max(320).optional(),
);

const optionalPhone = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().max(40).optional(),
);

export const leadImportRowSchema = z.object({
  displayName: z.string().trim().min(1, 'contact_name is required.').max(160),
  title: z.string().trim().min(1, 'opportunity_title is required.').max(200),
  email: optionalEmail,
  phoneE164: optionalPhone,
  valuePence: z.coerce.number().int().min(0).optional(),
  marketingConsent: z.boolean(),
});

export function parseLeadImportCsv(text: string): LeadImportParseResult {
  const empty: LeadImportParseResult = {
    rows: [],
    rowErrors: [],
    fileErrors: [],
    unknownHeaders: [],
    totalDataRows: 0,
  };

  if (text.length > LEAD_IMPORT_MAX_BYTES) {
    return {
      ...empty,
      fileErrors: [
        `File is too large. Maximum size is ${Math.round(LEAD_IMPORT_MAX_BYTES / 1024)} KB.`,
      ],
    };
  }

  const grid = parseCsvRows(text);
  const headerRow = grid[0];

  if (!headerRow) {
    return { ...empty, fileErrors: ['The file is empty.'] };
  }

  const headers = headerRow.map(normaliseCsvHeader);
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));

  if (missing.length > 0) {
    return {
      ...empty,
      fileErrors: [
        `Missing required column${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}. Download the template for the correct header row.`,
      ],
    };
  }

  const duplicateHeaders = headers.filter(
    (header, index) => headers.indexOf(header) !== index,
  );
  if (duplicateHeaders.length > 0) {
    return {
      ...empty,
      fileErrors: [`Duplicate column headers: ${[...new Set(duplicateHeaders)].join(', ')}.`],
    };
  }

  const unknownHeaders = headers.filter(
    (header) => header !== '' && !HEADER_ALIASES[header] && !REQUIRED_HEADERS.includes(header),
  );

  const columnIndex = new Map<keyof LeadImportPayload, number>();
  headers.forEach((header, index) => {
    const key = HEADER_ALIASES[header];
    if (key) columnIndex.set(key, index);
  });

  const dataRows = grid.slice(1);
  const rows: LeadImportParsedRow[] = [];
  const rowErrors: LeadImportRowError[] = [];

  if (dataRows.length > LEAD_IMPORT_MAX_ROWS) {
    return {
      ...empty,
      unknownHeaders,
      fileErrors: [`Too many rows. Import at most ${LEAD_IMPORT_MAX_ROWS} leads at a time.`],
      totalDataRows: dataRows.length,
    };
  }

  for (let i = 0; i < dataRows.length; i += 1) {
    const lineNumber = i + 2;
    const cells = dataRows[i] ?? [];
    const raw: Record<string, string> = {};

    for (const [key, colIndex] of columnIndex.entries()) {
      raw[key] = (cells[colIndex] ?? '').trim();
    }

    const contactName = raw.displayName || null;

    try {
      const marketingConsent = parseMarketingConsent(raw.marketingConsent);
      const valuePence = parseValuePence(raw.valuePence);

      const parsed = leadImportRowSchema.safeParse({
        displayName: raw.displayName,
        title: raw.title,
        email: raw.email,
        phoneE164: raw.phoneE164,
        valuePence,
        marketingConsent,
      });

      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? 'Invalid row.';
        rowErrors.push({ lineNumber, contactName, message });
        continue;
      }

      const payload: LeadImportPayload = {
        displayName: parsed.data.displayName,
        title: parsed.data.title,
        marketingConsent: parsed.data.marketingConsent,
      };
      if (parsed.data.email !== undefined) payload.email = parsed.data.email;
      if (parsed.data.phoneE164 !== undefined) payload.phoneE164 = parsed.data.phoneE164;
      if (parsed.data.valuePence !== undefined) payload.valuePence = parsed.data.valuePence;
      rows.push({ lineNumber, payload });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid row.';
      rowErrors.push({ lineNumber, contactName, message });
    }
  }

  return {
    rows,
    rowErrors,
    fileErrors: [],
    unknownHeaders,
    totalDataRows: dataRows.length,
  };
}

export function formatLeadImportErrors(result: LeadImportParseResult): string {
  if (result.fileErrors.length > 0) {
    return result.fileErrors.join(' ');
  }
  if (result.rowErrors.length === 0) return '';
  const shown = result.rowErrors.slice(0, 8);
  const lines = shown.map((e) => `Line ${e.lineNumber}: ${e.message}`);
  if (result.rowErrors.length > shown.length) {
    lines.push(`…and ${result.rowErrors.length - shown.length} more row errors.`);
  }
  return lines.join('\n');
}
