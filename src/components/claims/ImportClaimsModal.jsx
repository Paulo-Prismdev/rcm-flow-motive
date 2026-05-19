import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, X, CheckCircle, AlertCircle, Loader2, FileSpreadsheet, Sparkles } from 'lucide-react';

// Claim fields the AI can map to
const CLAIM_FIELDS = [
  { key: 'reg', label: 'Vehicle Registration' },
  { key: 'client_name', label: 'Client Name' },
  { key: 'driver_contact_name', label: 'Driver/Contact Name' },
  { key: 'client_phone', label: 'Client Phone' },
  { key: 'client_email', label: 'Client Email' },
  { key: 'client_address_line_1', label: 'Client Address' },
  { key: 'client_postcode', label: 'Client Postcode' },
  { key: 'make_model', label: 'Vehicle Make/Model' },
  { key: 'vehicle_colour', label: 'Vehicle Colour' },
  { key: 'job_status', label: 'Job Status' },
  { key: 'claim_type', label: 'Claim Type' },
  { key: 'date_received', label: 'Date Received' },
  { key: 'loss_date', label: 'Date of Loss' },
  { key: 'claim_ref', label: 'Claim Reference' },
  { key: 'policy_number', label: 'Policy Number' },
  { key: 'policy_excess', label: 'Policy Excess' },
  { key: 'insurer', label: 'Insurer/Broker' },
  { key: 'referrer', label: 'Referrer/Client Company' },
  { key: 'referrer_ref', label: 'Referrer Reference' },
  { key: 'authorising_party', label: 'Authorising Party' },
  { key: 'vehicle_damage', label: 'Vehicle Damage Description' },
  { key: 'vehicle_location', label: 'Vehicle Location' },
  { key: 'courtesy_car_required', label: 'Courtesy Car Required (yes/no)' },
  { key: 'unroadworthy', label: 'Unroadworthy (yes/no)' },
  { key: 'recovery_required', label: 'Recovery Required (yes/no)' },
  { key: 'bodyshop', label: 'Bodyshop/Repairer Name' },
  { key: 'bodyshop_email', label: 'Bodyshop Email' },
  { key: 'bs_instructed', label: 'Bodyshop Instructed Date' },
  { key: 'estimate_completed', label: 'Estimate Completed Date' },
  { key: 'estimate_cost_net', label: 'Estimate Cost (Net)' },
  { key: 'estimate_cost_gross', label: 'Estimate Cost (Gross)' },
  { key: 'authority_received', label: 'Authority Received Date' },
  { key: 'authority_cost_net', label: 'Authorised Cost (Net)' },
  { key: 'authority_cost_gross', label: 'Authorised Cost (Gross)' },
  { key: 'on_site_date', label: 'On Site Date' },
  { key: 'ecd', label: 'Expected Completion Date' },
  { key: 'completion_date', label: 'Completion Date' },
  { key: 'final_repair_cost', label: 'Final Repair Cost' },
  { key: 'total_loss_date', label: 'Total Loss Date' },
  { key: 'cancellation_date', label: 'Cancellation Date' },
  { key: 'cancellation_reason', label: 'Cancellation Reason' },
  { key: 'factored', label: 'Factored (yes/no)' },
  { key: 'date_payment_in', label: 'Date Payment Received' },
  { key: 'storage_amount_net', label: 'Storage Amount (Net)' },
  { key: 'storage_amount_vat', label: 'Storage Amount (Inc VAT)' },
  { key: 'percent_bld_instruction', label: '% BLD on Instruction' },
  { key: 'circumstances', label: 'Circumstances/Description' },
];

const parseDate = (val) => {
  if (!val) return undefined;
  const d = new Date(val);
  if (!isNaN(d)) return d.toISOString().split('T')[0];
  return undefined;
};

const parseNumber = (val) => {
  if (!val && val !== 0) return undefined;
  const n = parseFloat(String(val).replace(/[£,$,]/g, ''));
  return isNaN(n) ? undefined : n;
};

const parseBool = (val) => {
  if (val === null || val === undefined || val === '') return undefined;
  const v = String(val).toLowerCase().trim();
  if (v === 'yes' || v === 'true' || v === '1' || v === 'y') return true;
  if (v === 'no' || v === 'false' || v === '0' || v === 'n') return false;
  return undefined;
};

const DATE_FIELDS = new Set(['date_received','loss_date','bs_instructed','estimate_completed',
  'authority_received','on_site_date','ecd','completion_date','total_loss_date',
  'cancellation_date','date_payment_in','booking_in_date']);
const NUMBER_FIELDS = new Set(['policy_excess','estimate_cost_net','estimate_cost_gross',
  'authority_cost_net','authority_cost_gross','final_repair_cost','storage_amount_net',
  'storage_amount_vat','percent_bld_instruction','percent_to_referrer']);
const BOOL_FIELDS = new Set(['courtesy_car_required','unroadworthy','recovery_required','factored']);

const CLAIM_TYPE_MAP = {
  'credit repair': 'Credit Repair', 'credit': 'Credit Repair',
  'fault': 'Fault Claim',
  'non fault': 'Non-Fault Claim', 'non-fault': 'Non-Fault Claim',
  'third party': 'Non-Fault Claim', '3rd party': 'Non-Fault Claim',
  'total loss': 'Total Loss',
  'glass': 'Glass Claim',
};

const mapClaimType = (val) => {
  if (!val) return undefined;
  const v = val.toString().toLowerCase().trim();
  for (const [k, mapped] of Object.entries(CLAIM_TYPE_MAP)) {
    if (v.includes(k)) return mapped;
  }
  return 'Non-Fault Claim';
};

// Apply AI-generated column mapping to a raw row
const applyMapping = (row, mapping) => {
  const claim = {};
  for (const [spreadsheetCol, claimField] of Object.entries(mapping)) {
    if (!claimField || claimField === 'SKIP') continue;
    const rawVal = row[spreadsheetCol];
    if (rawVal === null || rawVal === undefined || rawVal === '') continue;

    if (DATE_FIELDS.has(claimField)) {
      const d = parseDate(rawVal);
      if (d) claim[claimField] = d;
    } else if (NUMBER_FIELDS.has(claimField)) {
      const n = parseNumber(rawVal);
      if (n !== undefined) claim[claimField] = n;
    } else if (BOOL_FIELDS.has(claimField)) {
      const b = parseBool(rawVal);
      if (b !== undefined) claim[claimField] = b;
    } else if (claimField === 'claim_type') {
      claim[claimField] = mapClaimType(rawVal);
    } else if (claimField === 'reg') {
      claim[claimField] = rawVal.toString().trim().toUpperCase();
    } else {
      claim[claimField] = rawVal.toString().trim();
    }
  }

  // Derive vehicle_make/model from make_model
  if (claim.make_model && !claim.vehicle_make) {
    const parts = claim.make_model.split(' ');
    if (parts.length >= 2) {
      claim.vehicle_make = parts[0];
      claim.vehicle_model = parts.slice(1).join(' ');
    }
  }

  // Default job_status
  if (!claim.job_status) claim.job_status = 'New';

  return claim;
};

const isEmptyRow = (row) => {
  const values = Object.values(row);
  return values.every(v => v === null || v === undefined || v === '');
};

export default function ImportClaimsModal({ isOpen, onClose, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [results, setResults] = useState(null);
  const [step, setStep] = useState('upload'); // upload | preview | done
  const [rawRows, setRawRows] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResults(null);
    setParseError(null);
    setParsing(true);

    try {
      const uploaded = await base44.integrations.Core.UploadFile({ file: f });
      const parsed = await base44.functions.invoke('parseClaimsSpreadsheet', { file_url: uploaded.file_url });
      if (parsed?.error) throw new Error(parsed.error);

      const rows = parsed?.data?.rows || parsed?.rows || [];
      if (!rows.length) throw new Error('No rows found in spreadsheet. The file may be empty or in an unsupported format.');

      const nonEmptyRows = rows.filter(r => !isEmptyRow(r));
      if (!nonEmptyRows.length) throw new Error('All rows in the spreadsheet appear to be empty.');

      setRawRows(nonEmptyRows);
      setParsing(false);

      // Now use AI to map columns
      setAiProcessing(true);
      await runAiMapping(nonEmptyRows);
    } catch (err) {
      setParseError(err.message || 'Failed to parse file');
      setParsing(false);
      setAiProcessing(false);
    }
  };

  const runAiMapping = async (rows) => {
    try {
      // Get column headers and a few sample rows for the AI
      const headers = Object.keys(rows[0] || {});
      const sampleRows = rows.slice(0, 3).map(r =>
        Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v !== null && v !== undefined ? String(v).substring(0, 50) : '']))
      );

      const fieldDescriptions = CLAIM_FIELDS.map(f => `"${f.key}": ${f.label}`).join('\n');

      const prompt = `You are mapping spreadsheet columns to insurance claim fields.

Spreadsheet column headers: ${JSON.stringify(headers)}

Sample data (first 3 rows):
${JSON.stringify(sampleRows, null, 2)}

Available claim fields:
${fieldDescriptions}

For each spreadsheet column, determine which claim field it maps to. If a column doesn't match any field, use "SKIP".
Return a JSON object where keys are the exact spreadsheet column names and values are the claim field keys (or "SKIP").
Only map columns that clearly correspond to a field. Be conservative - if unsure, use "SKIP".`;

      const mapping = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      });

      setColumnMapping(mapping);

      // Apply mapping to all rows
      const mapped = rows.map(row => ({
        raw: row,
        mapped: applyMapping(row, mapping)
      }));

      // Filter out rows that have no useful data after mapping
      const withData = mapped.filter(({ mapped: m }) => Object.keys(m).length > 1);

      setPreview(withData.length > 0 ? withData : mapped);
      setStep('preview');
    } catch (err) {
      throw new Error('AI mapping failed: ' + (err.message || 'Unknown error'));
    } finally {
      setAiProcessing(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    let succeeded = 0;
    let failed = 0;
    const errors = [];

    for (const { mapped } of preview) {
      try {
        let jobNumber;
        try {
          const res = await base44.functions.invoke('generateJobNumber', { entityType: 'Claim' });
          jobNumber = res?.data?.job_number || res?.job_number;
        } catch {}

        await base44.entities.Claim.create({
          ...mapped,
          ...(jobNumber ? { job_number: jobNumber } : {}),
        });
        succeeded++;
      } catch (err) {
        failed++;
        errors.push(`Row ${succeeded + failed}: ${err.message}`);
      }
    }

    setResults({ succeeded, failed, errors });
    setImporting(false);
    setStep('done');
    if (succeeded > 0) onImportComplete?.();
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setRawRows([]);
    setColumnMapping({});
    setResults(null);
    setParseError(null);
    setParsing(false);
    setAiProcessing(false);
    setStep('upload');
    onClose();
  };

  const isLoading = parsing || aiProcessing;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="glass-elevated rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-accent" />
            <div>
              <h2 className="text-xl font-bold">Import Claims</h2>
              <p className="text-sm text-foreground-muted">AI-powered spreadsheet import</p>
            </div>
          </div>
          <button onClick={handleClose} className="glass-button w-9 h-9 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onClick={() => !isLoading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${isLoading ? 'border-accent cursor-wait' : 'border-border cursor-pointer hover:border-accent'}`}
              >
                {parsing ? (
                  <>
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-accent animate-spin" />
                    <p className="text-lg font-medium mb-1">Reading spreadsheet...</p>
                    <p className="text-sm text-foreground-muted">{file?.name}</p>
                  </>
                ) : aiProcessing ? (
                  <>
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-accent animate-pulse" />
                    <p className="text-lg font-medium mb-1">AI is mapping your columns...</p>
                    <p className="text-sm text-foreground-muted">Analysing column headers and data patterns</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto mb-4 text-foreground-muted" />
                    <p className="text-lg font-medium mb-1">Click to upload spreadsheet</p>
                    <p className="text-sm text-foreground-muted">Supports .xlsx, .xls, .csv — any column layout</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isLoading}
                />
              </div>

              {parseError && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-400 text-sm">Failed to import</p>
                    <p className="text-red-600 dark:text-red-300 text-sm mt-1">{parseError}</p>
                  </div>
                </div>
              )}

              <div className="glass-flat p-4 rounded-xl text-sm flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <p className="text-foreground-muted">
                  The AI will automatically analyse your spreadsheet's column headers and map them to the correct claim fields — no matter what format your file uses.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{preview.length} claim{preview.length !== 1 ? 's' : ''} ready to import</p>
                <button onClick={() => { setStep('upload'); setPreview([]); setRawRows([]); }} className="text-sm text-foreground-muted underline">
                  Re-upload
                </button>
              </div>

              {/* AI Mapping Summary */}
              {Object.keys(columnMapping).length > 0 && (
                <div className="glass-flat p-3 rounded-xl">
                  <p className="text-xs font-semibold text-foreground-muted mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI Column Mapping
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(columnMapping)
                      .filter(([, v]) => v && v !== 'SKIP')
                      .map(([col, field]) => {
                        const fieldDef = CLAIM_FIELDS.find(f => f.key === field);
                        return (
                          <span key={col} className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                            {col} → {fieldDef?.label || field}
                          </span>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {preview.map(({ mapped }, i) => (
                  <div key={i} className="glass-flat p-3 rounded-xl flex items-center gap-3">
                    <div className="w-28 font-mono font-bold text-sm shrink-0">{mapped.reg || `Row ${i + 1}`}</div>
                    <div className="flex-1 text-sm text-foreground-muted min-w-0 flex flex-wrap gap-x-2">
                      {mapped.make_model && <span className="font-medium text-foreground">{mapped.make_model}</span>}
                      {mapped.client_name && <span>· {mapped.client_name}</span>}
                      {mapped.referrer && <span>· {mapped.referrer}</span>}
                      {mapped.job_status && <span>· {mapped.job_status}</span>}
                      {mapped.claim_type && <span>· {mapped.claim_type}</span>}
                      {mapped.insurer && <span>· {mapped.insurer}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {preview.length === 0 && (
                <div className="text-center py-8 text-foreground-muted">
                  No rows could be mapped. Try re-uploading with a different file.
                </div>
              )}
            </div>
          )}

          {/* Step 3: Done */}
          {step === 'done' && results && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-xl font-bold">Import Complete</p>
                  <p className="text-foreground-muted">{results.succeeded} imported successfully{results.failed > 0 ? `, ${results.failed} failed` : ''}</p>
                </div>
              </div>
              {results.errors.length > 0 && (
                <div className="glass-flat p-4 rounded-xl space-y-1 max-h-48 overflow-y-auto">
                  <p className="font-semibold text-sm text-red-500 mb-2">Errors:</p>
                  {results.errors.map((e, i) => (
                    <p key={i} className="text-xs text-foreground-muted">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            {step === 'done' ? 'Close' : 'Cancel'}
          </Button>
          {step === 'preview' && preview.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={importing}
              className="bg-accent text-accent-foreground"
            >
              {importing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Import {preview.length} Claims</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}