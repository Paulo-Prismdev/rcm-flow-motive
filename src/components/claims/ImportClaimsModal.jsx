import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, X, CheckCircle, AlertCircle, Loader2, FileSpreadsheet, Download } from 'lucide-react';

// Map AH Claims columns to Claim entity fields
const mapRowToClaim = (row) => {
  const parseDate = (val) => {
    if (!val) return undefined;
    // Handle "2026-03-05 00:00:00" format
    const d = new Date(val);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
    return undefined;
  };

  const parseNumber = (val) => {
    if (!val && val !== 0) return undefined;
    const n = parseFloat(String(val).replace(/[£,]/g, ''));
    return isNaN(n) ? undefined : n;
  };

  const mapClaimType = (val) => {
    if (!val) return undefined;
    const v = val.toString().toUpperCase();
    if (v.includes('CREDIT REPAIR') || v.includes('CREDIT')) return 'Credit Repair';
    if (v.includes('FAULT') && !v.includes('NON')) return 'Fault Claim';
    if (v.includes('NON FAULT') || v.includes('NON-FAULT') || v.includes('3RD PARTY') || v.includes('THIRD PARTY')) return 'Non-Fault Claim';
    if (v.includes('TOTAL LOSS') || v.includes('TOTAL')) return 'Total Loss';
    if (v.includes('GLASS')) return 'Glass Claim';
    if (v.includes('INTERVENTION')) return 'Non-Fault Claim';
    if (v.includes('50/50')) return 'Non-Fault Claim';
    return 'Non-Fault Claim';
  };

  const mapJobStatus = (val) => {
    if (!val) return 'New';
    const v = val.toString();
    const knownStatuses = [
      'New', 'In Progress', 'Completed', 'Cancelled', 'Total Loss',
      'Awaiting Authority', 'Authorised', 'On Site', 'Awaiting Payment'
    ];
    // Return as-is if it looks like a status (non-null string)
    return v || 'New';
  };

  const parseBool = (val) => {
    if (!val) return undefined;
    const v = String(val).toUpperCase();
    if (v === 'YES' || v === 'TRUE' || v === '1') return true;
    if (v === 'NO' || v === 'FALSE' || v === '0') return false;
    return undefined;
  };

  // The columns in order from the spreadsheet header:
  // Name, Client, Make/Model, Job Status, Date Received, Claim Type, 
  // Client Email Email, Client Phone No, Client Address, Claim Ref, Broker, Contact Name, 
  // Client Email, Loss Date, Vehicle Location, Vehicle Damage, Vehicle Type, 
  // C/Car Req, Unroadworthy?, Recovery Required, Bodyshop, Bodyshop Email,
  // Last File Update, BS Instructed, Linked File, Estimate Completed,
  // Estimate cost NET, Estimate cost GROSS, Authority Received, Authorised Costs NET,
  // Authorised cost GROSS, BID, On-Site, ECD, Authorising Party, Insurer,
  // Claim Ref for Authorising Party, Policy Number, Policy Excess, Completion Date,
  // Factored, Total loss Date, Cancellation Date, Reason for Cancellation,
  // % BLD on Instruction, Excess Contribution, Final Repair Cost (excl VAT),
  // Date Sent to ACG, Date Payment in, Storage Amount Net, Storage Amount Inc VAT,
  // Item ID (auto generated)

  const claim = {};

  if (row['Name'] || row[0]) claim.reg = (row['Name'] || row[0])?.toString().trim().toUpperCase();
  if (row['Client'] || row[1]) claim.referrer = (row['Client'] || row[1])?.toString().trim();
  if (row['Make/Model'] || row[2]) claim.make_model = (row['Make/Model'] || row[2])?.toString().trim();
  if (row['Job Status'] || row[3]) claim.job_status = mapJobStatus(row['Job Status'] || row[3]);
  if (row['Date Received'] || row[4]) claim.date_received = parseDate(row['Date Received'] || row[4]);
  if (row['Claim Type'] || row[5]) claim.claim_type = mapClaimType(row['Claim Type'] || row[5]);
  if (row['Client Phone No'] || row[7]) claim.client_phone = (row['Client Phone No'] || row[7])?.toString().trim();
  if (row['Client Address'] || row[8]) {
    // Use as vehicle_location and client_address
    const addr = (row['Client Address'] || row[8])?.toString().trim();
    claim.vehicle_location = addr;
  }
  if (row['Claim Ref'] || row[9]) claim.claim_ref = (row['Claim Ref'] || row[9])?.toString().trim();
  if (row['Broker'] || row[10]) claim.insurer = (row['Broker'] || row[10])?.toString().trim();
  if (row['Contact Name'] || row[11]) claim.driver_contact_name = (row['Contact Name'] || row[11])?.toString().trim();
  if (row['Client Email'] || row[12] || row['Client Email Email'] || row[6]) {
    claim.client_email = (row['Client Email'] || row[12] || row['Client Email Email'] || row[6])?.toString().trim();
  }
  if (row['Loss Date'] || row[13]) claim.loss_date = parseDate(row['Loss Date'] || row[13]);
  if (row['Vehicle Damage'] || row[15]) claim.vehicle_damage = (row['Vehicle Damage'] || row[15])?.toString().trim();
  
  const courtesyCar = parseBool(row['C/Car Req'] || row[17]);
  if (courtesyCar !== undefined) claim.courtesy_car_required = courtesyCar;
  
  const unroadworthy = parseBool(row['Unroadworthy?'] || row[18]);
  if (unroadworthy !== undefined) claim.unroadworthy = unroadworthy;
  
  const recovery = parseBool(row['Recovery Required'] || row[19]);
  if (recovery !== undefined) claim.recovery_required = recovery;
  
  if (row['Bodyshop'] || row[20]) claim.bodyshop = (row['Bodyshop'] || row[20])?.toString().trim();
  if (row['Bodyshop Email'] || row[21]) claim.bodyshop_email = (row['Bodyshop Email'] || row[21])?.toString().trim();
  
  if (row['BS Instructed'] || row[23]) claim.bs_instructed = parseDate(row['BS Instructed'] || row[23]);
  if (row['Estimate Completed'] || row[25]) claim.estimate_completed = parseDate(row['Estimate Completed'] || row[25]);
  if (row['Estimate cost NET'] || row[26]) claim.estimate_cost_net = parseNumber(row['Estimate cost NET'] || row[26]);
  if (row['Estimate cost GROSS'] || row[27]) claim.estimate_cost_gross = parseNumber(row['Estimate cost GROSS'] || row[27]);
  if (row['Authority Received'] || row[28]) claim.authority_received = parseDate(row['Authority Received'] || row[28]);
  if (row['Authorised Costs NET'] || row[29]) claim.authority_cost_net = parseNumber(row['Authorised Costs NET'] || row[29]);
  if (row['Authorised cost GROSS'] || row[30]) claim.authority_cost_gross = parseNumber(row['Authorised cost GROSS'] || row[30]);
  if (row['On-Site'] || row[32]) claim.on_site_date = parseDate(row['On-Site'] || row[32]);
  if (row['ECD'] || row[33]) claim.ecd = parseDate(row['ECD'] || row[33]);
  if (row['Authorising Party'] || row[34]) claim.authorising_party = (row['Authorising Party'] || row[34])?.toString().trim();
  if (row['Claim Ref for Authorising Party'] || row[36]) claim.referrer_ref = (row['Claim Ref for Authorising Party'] || row[36])?.toString().trim();
  if (row['Policy Number'] || row[37]) claim.policy_number = (row['Policy Number'] || row[37])?.toString().trim();
  if (row['Policy Excess'] || row[38]) claim.policy_excess = parseNumber(row['Policy Excess'] || row[38]);
  if (row['Completion Date'] || row[39]) claim.completion_date = parseDate(row['Completion Date'] || row[39]);
  
  const factored = parseBool(row['Factored'] || row[40]);
  if (factored !== undefined) claim.factored = factored;
  
  if (row['Total loss Date'] || row[41]) claim.total_loss_date = parseDate(row['Total loss Date'] || row[41]);
  if (row['Cancellation Date'] || row[42]) claim.cancellation_date = parseDate(row['Cancellation Date'] || row[42]);
  if (row['Reason for Cancellation'] || row[43]) claim.cancellation_reason = (row['Reason for Cancellation'] || row[43])?.toString().trim();
  if (row['% BLD on Instruction'] || row[44]) claim.percent_bld_instruction = parseNumber(row['% BLD on Instruction'] || row[44]);
  if (row['Final Repair Cost (excl VAT)'] || row[46]) claim.final_repair_cost = parseNumber(row['Final Repair Cost (excl VAT)'] || row[46]);
  if (row['Date Payment in'] || row[48]) claim.date_payment_in = parseDate(row['Date Payment in'] || row[48]);
  if (row['Storage Amount Net'] || row[49]) claim.storage_amount_net = parseNumber(row['Storage Amount Net'] || row[49]);
  if (row['Storage Amount Inc VAT'] || row[50]) claim.storage_amount_vat = parseNumber(row['Storage Amount Inc VAT'] || row[50]);

  // Split make_model into vehicle_make and vehicle_model if possible
  if (claim.make_model) {
    const parts = claim.make_model.split(' ');
    if (parts.length >= 2) {
      claim.vehicle_make = parts[0];
      claim.vehicle_model = parts.slice(1).join(' ');
    }
  }

  // Set client_name from referrer (the "Client" column in AH Claims is actually the referrer/client company)
  // The "Name" column is the vehicle reg, so client_name needs to be derived or left empty
  // Use contact_name if available
  if (claim.driver_contact_name && !claim.client_name) {
    claim.client_name = claim.driver_contact_name;
  }

  return claim;
};

const isValidClaimRow = (row) => {
  // Must have a registration number (Name column) and it should look like a UK reg
  const reg = row['Name'] || row[0];
  if (!reg || typeof reg !== 'string') return false;
  const trimmed = reg.toString().trim();
  // Skip header rows, summary rows, section headers
  if (trimmed.length < 3) return false;
  if (trimmed.toLowerCase().includes('name') || trimmed.toLowerCase().includes('new claim') ||
      trimmed.toLowerCase().includes('placed') || trimmed.toLowerCase().includes('completed') ||
      trimmed.toLowerCase() === 'item id') return false;
  // Must look like a vehicle reg (alphanumeric, 5-8 chars)
  if (!/^[A-Z0-9]{2,4}\s?[A-Z0-9]{2,4}$/i.test(trimmed.replace(/\s/g, ''))) {
    // Allow if it has at least some letters and numbers
    if (!/[A-Z]/i.test(trimmed) || !/[0-9]/.test(trimmed)) return false;
  }
  return true;
};

export default function ImportClaimsModal({ isOpen, onClose, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [step, setStep] = useState('upload'); // upload | preview | done
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResults(null);

    try {
      // Upload file then extract
      const uploaded = await base44.integrations.Core.UploadFile({ file: f });
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploaded.file_url,
        json_schema: {
          type: 'object',
          properties: {
            rows: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: true
              }
            }
          }
        }
      });

      let rows = [];
      if (extracted.status === 'success') {
        const output = extracted.output;
        if (Array.isArray(output)) {
          rows = output;
        } else if (output?.rows) {
          rows = output.rows;
        }
      }

      const validRows = rows.filter(isValidClaimRow);
      const mappedRows = validRows.map(row => ({ raw: row, mapped: mapRowToClaim(row) }));
      setPreview(mappedRows);
      setStep('preview');
    } catch (err) {
      alert('Failed to parse file: ' + err.message);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    let succeeded = 0;
    let failed = 0;
    const errors = [];

    for (const { mapped } of preview) {
      try {
        // Generate job number
        let jobNumber;
        try {
          const res = await base44.functions.invoke('generateJobNumber', { type: 'CLM' });
          jobNumber = res?.data?.job_number || res?.job_number;
        } catch {}

        await base44.entities.Claim.create({
          ...mapped,
          ...(jobNumber ? { job_number: jobNumber } : {}),
        });
        succeeded++;
      } catch (err) {
        failed++;
        errors.push(`${mapped.reg}: ${err.message}`);
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
    setResults(null);
    setStep('upload');
    onClose();
  };

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
              <p className="text-sm text-foreground-muted">Import from AH Claims spreadsheet (.xlsx)</p>
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
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-accent transition-colors"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-foreground-muted" />
                <p className="text-lg font-medium mb-1">Click to upload spreadsheet</p>
                <p className="text-sm text-foreground-muted">Supports .xlsx files exported from AH Claims</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <div className="glass-flat p-4 rounded-xl text-sm space-y-1">
                <p className="font-semibold mb-2">Expected columns (AH Claims format):</p>
                <p className="text-foreground-muted">Name (Reg), Client, Make/Model, Job Status, Date Received, Claim Type, Client Phone, Client Address, Claim Ref, Broker/Insurer, Contact Name, Client Email, Loss Date, Vehicle Damage, C/Car Req, Bodyshop, Estimate costs, Authority dates, etc.</p>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{preview.length} valid claim{preview.length !== 1 ? 's' : ''} found</p>
                <button onClick={() => setStep('upload')} className="text-sm text-foreground-muted underline">
                  Re-upload
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {preview.map(({ mapped }, i) => (
                  <div key={i} className="glass-flat p-3 rounded-xl flex items-center gap-3">
                    <div className="w-24 font-mono font-bold text-sm shrink-0">{mapped.reg || '—'}</div>
                    <div className="flex-1 text-sm text-foreground-muted min-w-0">
                      <span className="font-medium text-foreground">{mapped.make_model || '—'}</span>
                      {mapped.referrer && <span className="ml-2">· {mapped.referrer}</span>}
                      {mapped.job_status && <span className="ml-2">· {mapped.job_status}</span>}
                      {mapped.claim_type && <span className="ml-2">· {mapped.claim_type}</span>}
                    </div>
                  </div>
                ))}
              </div>
              {preview.length === 0 && (
                <div className="text-center py-8 text-foreground-muted">
                  No valid claim rows detected. Please check the file format.
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