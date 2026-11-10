'use client';

import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useCallback, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  LEAD_IMPORT_COLUMNS,
  LEAD_IMPORT_MAX_BYTES,
  LEAD_IMPORT_MAX_ROWS,
  downloadLeadImportTemplate,
  formatLeadImportErrors,
  parseLeadImportCsv,
  type LeadImportParseResult,
} from '@/domain/leads/lead-import-csv';
import { dashboardImportLeadsAction } from '@/server/actions/dashboard-setup';
import { cn } from '@/lib/utils';

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > LEAD_IMPORT_MAX_BYTES) {
      reject(new Error(`File must be under ${Math.round(LEAD_IMPORT_MAX_BYTES / 1024)} KB.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsText(file);
  });
}

function LeadImportPreview({ result }: { result: LeadImportParseResult }) {
  if (result.totalDataRows === 0 && result.fileErrors.length === 0) {
    return (
      <p className="text-[12.5px] font-medium text-ink-500">
        Upload a CSV or paste content — we will validate every row before import.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {result.unknownHeaders.length > 0 ? (
        <p className="text-[12px] font-medium leading-relaxed text-amber-800">
          Ignored unknown columns: {result.unknownHeaders.join(', ')}.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-semibold">
        <span className="inline-flex items-center gap-1.5 text-mint-800">
          <CheckCircle2 className="size-3.5" aria-hidden />
          {result.rows.length} ready to import
        </span>
        {result.rowErrors.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-rose-700">
            <AlertCircle className="size-3.5" aria-hidden />
            {result.rowErrors.length} row
            {result.rowErrors.length === 1 ? '' : 's'} with errors
          </span>
        ) : null}
        <span className="text-ink-400">{result.totalDataRows} data rows</span>
      </div>

      {(result.rows.length > 0 || result.rowErrors.length > 0) && (
        <div className="max-h-56 overflow-auto rounded-xl2 border border-line/60">
          <table className="w-full min-w-[520px] text-left text-[11.5px]">
            <thead className="sticky top-0 bg-soft/90 text-[10px] font-bold tracking-wide text-ink-500 uppercase">
              <tr>
                <th className="px-3 py-2.5">Line</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Contact</th>
                <th className="px-3 py-2.5">Opportunity</th>
                <th className="px-3 py-2.5">Email</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={`ok-${row.lineNumber}`} className="border-t border-line/40 bg-white">
                  <td className="px-3 py-2.5 font-mono text-ink-500">{row.lineNumber}</td>
                  <td className="px-3 py-2.5 font-semibold text-mint-700">OK</td>
                  <td className="px-3 py-2.5 font-medium text-ink-900">{row.payload.displayName}</td>
                  <td className="px-3 py-2.5 text-ink-700">{row.payload.title}</td>
                  <td className="px-3 py-2.5 text-ink-600">{row.payload.email ?? '—'}</td>
                </tr>
              ))}
              {result.rowErrors.map((err) => (
                <tr key={`err-${err.lineNumber}`} className="border-t border-line/40 bg-rose-50/40">
                  <td className="px-3 py-2.5 font-mono text-ink-500">{err.lineNumber}</td>
                  <td className="px-3 py-2.5 font-semibold text-rose-700">Error</td>
                  <td className="px-3 py-2.5 text-ink-800" colSpan={3}>
                    {err.contactName ? `${err.contactName} — ` : null}
                    {err.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function LeadCsvImportPanel({
  onComplete,
  error,
  setError,
}: {
  onComplete: () => void;
  error: string | null;
  setError: (message: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [parseResult, setParseResult] = useState<LeadImportParseResult | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyText = useCallback(
    (text: string, sourceLabel?: string) => {
      setError(null);
      const result = parseLeadImportCsv(text);
      setParseResult(result);
      setFileName(sourceLabel ?? null);
      if (result.fileErrors.length > 0) {
        setError(result.fileErrors.join(' '));
      } else if (result.rowErrors.length > 0 && result.rows.length === 0) {
        setError(formatLeadImportErrors(result));
      } else {
        setError(null);
      }
    },
    [setError],
  );

  async function onFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setError('Upload a .csv file or paste CSV text below.');
      return;
    }
    try {
      const text = await readFileAsText(file);
      applyText(text, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read file.');
    }
  }

  function importReadyRows() {
    if (!parseResult || parseResult.rows.length === 0) {
      setError('Fix row errors or add valid data before importing.');
      return;
    }
    if (parseResult.rowErrors.length > 0) {
      setError('Fix all row errors before importing, or remove invalid lines from your file.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const payloads = parseResult.rows.map((row) => row.payload);
      const result = await dashboardImportLeadsAction(payloads);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onComplete();
    });
  }

  const canImport =
    parseResult &&
    parseResult.fileErrors.length === 0 &&
    parseResult.rows.length > 0 &&
    parseResult.rowErrors.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl2 border border-line/60 bg-soft/30 p-5 sm:p-6">
        <p className="text-[13px] font-bold text-ink-900">CSV columns</p>
        <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-ink-500">
          Use these headers in your file. Required fields must be filled on every row.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {LEAD_IMPORT_COLUMNS.map((col) => (
            <li
              key={col.header}
              className="border-b border-line/40 pb-3 text-[12px] leading-relaxed text-ink-600 last:border-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-800">
                  {col.header}
                </code>
                {col.required ? (
                  <span className="text-[10px] font-bold text-rose-600 uppercase">Required</span>
                ) : (
                  <span className="text-[10px] font-bold text-ink-400 uppercase">Optional</span>
                )}
              </div>
              <span className="mt-1.5 block text-ink-500">{col.help}</span>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-5"
          onClick={() => downloadLeadImportTemplate()}
        >
          <Download className="size-3.5" aria-hidden />
          Download CSV template
        </Button>
      </div>

      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl2 border-2 border-dashed px-6 py-10 text-center transition-colors sm:py-12',
          dragOver ? 'border-brand-400 bg-brand-50/50' : 'border-line/70 bg-white',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void onFile(file);
        }}
      >
        <FileSpreadsheet className="size-9 text-brand-500" strokeWidth={1.8} aria-hidden />
        <p className="mt-4 text-[14px] font-extrabold text-ink-900">Drop your CSV here</p>
        <p className="mt-2 max-w-sm text-[12.5px] font-medium leading-relaxed text-ink-500">
          UTF-8 CSV with a header row. Max {LEAD_IMPORT_MAX_ROWS} leads per file.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          className="mt-5"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" aria-hidden />
          Choose file
        </Button>
        {fileName ? (
          <p className="mt-3 text-[11.5px] font-semibold text-brand-700">{fileName}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="self-start text-[12.5px] font-semibold text-brand-600 underline-offset-4 hover:underline"
          onClick={() => setPasteOpen((open) => !open)}
        >
          {pasteOpen ? 'Hide paste area' : 'Paste CSV instead'}
        </button>

        {pasteOpen ? (
          <div className="flex flex-col gap-3 rounded-xl2 border border-line/60 bg-white p-4 sm:p-5">
          <textarea
            className="min-h-[120px] w-full rounded-2xl border border-line bg-white p-4 text-[12px] font-medium leading-relaxed text-ink-900"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste CSV including the header row…"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => applyText(pasteText, 'Pasted CSV')}
          >
            Validate pasted CSV
          </Button>
          </div>
        ) : null}
      </div>

      {parseResult ? (
        <div className="rounded-xl2 border border-line/60 bg-white p-4 sm:p-5">
          <LeadImportPreview result={parseResult} />
        </div>
      ) : null}

      {error ? (
        <div className="whitespace-pre-wrap rounded-xl2 border border-rose-200 bg-rose-50/90 px-4 py-3.5 text-[12.5px] font-medium leading-relaxed text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="border-t border-line/50 pt-5">
      <Button type="button" className="w-full sm:w-auto" disabled={pending || !canImport} onClick={importReadyRows}>
        {pending
          ? 'Importing…'
          : parseResult?.rows.length
            ? `Import ${parseResult.rows.length} lead${parseResult.rows.length === 1 ? '' : 's'}`
            : 'Import leads'}
      </Button>
      </div>
    </div>
  );
}
