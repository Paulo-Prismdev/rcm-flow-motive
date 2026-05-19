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

  // Helper: get first non-empty value from a list of possible column names
  const get = (...keys) => {
    for (const k of keys) {
      if (row[k] !== null && row[k] !== undefined && row[k] !== '') return row[k];
    }
    return undefined;
  };

  const claim = {};

  const regVal = get('Name', 'Reg', 'Registration', 'REG', 'Vehicle Reg');
  if (regVal) claim.reg = regVal.toString().trim().toUpperCase();

  const clientVal = get('Client', 'Client Name', 'Customer');
  if (clientVal) claim.referrer = clientVal.toString().trim();

  const makeModelVal = get('Make/Model', 'Make Model', 'Vehicle', 'Make & Model');
  if (makeModelVal) claim.make_model = makeModelVal.toString().trim();
  const jobStatusVal = get('Job Status', 'Status', 'Job Status ');
  if (jobStatusVal) claim.job_status = mapJobStatus(jobStatusVal);

  const dateReceivedVal = get('Date Received', 'Date Rec', 'Received Date');
  if (dateReceivedVal) claim.date_received = parseDate(dateReceivedVal);

  const claimTypeVal = get('Claim Type', 'Type', 'Job Type');
  if (claimTypeVal) claim.claim_type = mapClaimType(claimTypeVal);

  const phoneVal = get('Client Phone No', 'Client Phone', 'Phone', 'Tel', 'Phone No');
  if (phoneVal) claim.client_phone = phoneVal.toString().trim();

  const addrVal = get('Client Address', 'Address', 'Client Addr');
  if (addrVal) claim.vehicle_location = addrVal.toString().trim();

  const claimRefVal = get('Claim Ref', 'Claim Reference', 'Ref');
  if (claimRefVal) claim.claim_ref = claimRefVal.toString().trim();

  const insurerVal = get('Broker', 'Insurer', 'Broker/Insurer', 'Insurance');
  if (insurerVal) claim.insurer = insurerVal.toString().trim();

  const contactVal = get('Contact Name', 'Driver', 'Driver Name', 'Driver Contact');
  if (contactVal) claim.driver_contact_name = contactVal.toString().trim();

  const emailVal = get('Client Email', 'Email', 'Client Email Email', 'Email Address');
  if (emailVal) claim.client_email = emailVal.toString().trim();

  const lossDateVal = get('Loss Date', 'Date of Loss', 'Incident Date');
  if (lossDateVal) claim.loss_date = parseDate(lossDateVal);

  const damageVal = get('Vehicle Damage', 'Damage', 'Damage Description');
  if (damageVal) claim.vehicle_damage = damageVal.toString().trim();

  const ccVal = get('C/Car Req', 'Courtesy Car', 'C/Car Required', 'Courtesy Car Required');
  const courtesyCar = parseBool(ccVal);
  if (courtesyCar !== undefined) claim.courtesy_car_required = courtesyCar;

  const unroadVal = get('Unroadworthy?', 'Unroadworthy', 'Un-roadworthy');
  const unroadworthy = parseBool(unroadVal);
  if (unroadworthy !== undefined) claim.unroadworthy = unroadworthy;

  const recoveryVal = get('Recovery Required', 'Recovery', 'Recovery Req');
  const recovery = parseBool(recoveryVal);
  if (recovery !== undefined) claim.recovery_required = recovery;

  const bodyshopVal = get('Bodyshop', 'Repairer', 'Body Shop', 'Garage');
  if (bodyshopVal) claim.bodyshop = bodyshopVal.toString().trim();

  const bsEmailVal = get('Bodyshop Email', 'Repairer Email', 'Body Shop Email');
  if (bsEmailVal) claim.bodyshop_email = bsEmailVal.toString().trim();

  const bsInstructedVal = get('BS Instructed', 'BS Inst', 'Bodyshop Instructed');
  if (bsInstructedVal) claim.bs_instructed = parseDate(bsInstructedVal);

  const estCompVal = get('Estimate Completed', 'Est Completed', 'Estimate Complete');
  if (estCompVal) claim.estimate_completed = parseDate(estCompVal);

  const estNetVal = get('Estimate cost NET', 'Estimate NET', 'Est Net', 'Estimate Net');
  if (estNetVal) claim.estimate_cost_net = parseNumber(estNetVal);

  const estGrossVal = get('Estimate cost GROSS', 'Estimate GROSS', 'Est Gross', 'Estimate Gross');
  if (estGrossVal) claim.estimate_cost_gross = parseNumber(estGrossVal);

  const authRecVal = get('Authority Received', 'Auth Received', 'Authority Rec');
  if (authRecVal) claim.authority_received = parseDate(authRecVal);

  const authNetVal = get('Authorised Costs NET', 'Authorised NET', 'Auth Net', 'Auth Cost Net');
  if (authNetVal) claim.authority_cost_net = parseNumber(authNetVal);

  const authGrossVal = get('Authorised cost GROSS', 'Authorised GROSS', 'Auth Gross', 'Auth Cost Gross');
  if (authGrossVal) claim.authority_cost_gross = parseNumber(authGrossVal);

  const onSiteVal = get('On-Site', 'On Site', 'Onsite', 'On-site Date');
  if (onSiteVal) claim.on_site_date = parseDate(onSiteVal);

  const ecdVal = get('ECD', 'Expected Completion', 'Expected Completion Date');
  if (ecdVal) claim.ecd = parseDate(ecdVal);

  const authPartyVal = get('Authorising Party', 'Auth Party', 'Authorising party');
  if (authPartyVal) claim.authorising_party = authPartyVal.toString().trim();

  const refRefVal = get('Claim Ref for Authorising Party', 'Referrer Ref', 'Auth Party Ref');
  if (refRefVal) claim.referrer_ref = refRefVal.toString().trim();

  const policyNumVal = get('Policy Number', 'Policy No', 'Policy #');
  if (policyNumVal) claim.policy_number = policyNumVal.toString().trim();

  const policyExcessVal = get('Policy Excess', 'Excess', 'Policy Exc');
  if (policyExcessVal) claim.policy_excess = parseNumber(policyExcessVal);

  const compDateVal = get('Completion Date', 'Completed Date', 'Comp Date', 'Date Completed');
  if (compDateVal) claim.completion_date = parseDate(compDateVal);

  const factoredVal = get('Factored', 'Factored?');
  const factored = parseBool(factoredVal);
  if (factored !== undefined) claim.factored = factored;

  const tlDateVal = get('Total loss Date', 'Total Loss Date', 'TL Date');
  if (tlDateVal) claim.total_loss_date = parseDate(tlDateVal);

  const cancelDateVal = get('Cancellation Date', 'Cancel Date', 'Cancelled Date');
  if (cancelDateVal) claim.cancellation_date = parseDate(cancelDateVal);

  const cancelReasonVal = get('Reason for Cancellation', 'Cancellation Reason', 'Cancel Reason');
  if (cancelReasonVal) claim.cancellation_reason = cancelReasonVal.toString().trim();

  const bldVal = get('% BLD on Instruction', '% BLD', 'BLD %', 'BLD Instruction');
  if (bldVal) claim.percent_bld_instruction = parseNumber(bldVal);

  const finalRepairVal = get('Final Repair Cost (excl VAT)', 'Final Repair Cost', 'Final Cost', 'Final Repair');
  if (finalRepairVal) claim.final_repair_cost = parseNumber(finalRepairVal);

  const paymentDateVal = get('Date Payment in', 'Date Payment In', 'Payment Date');
  if (paymentDateVal) claim.date_payment_in = parseDate(paymentDateVal);

  const storageNetVal = get('Storage Amount Net', 'Storage Net', 'Storage Amount (Net)');
  if (storageNetVal) claim.storage_amount_net = parseNumber(storageNetVal);

  const storageVatVal = get('Storage Amount Inc VAT', 'Storage Inc VAT', 'Storage Amount (Inc VAT)');
  if (storageVatVal) claim.storage_amount_vat = parseNumber(storageVatVal);

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
  // Skip completely empty rows
  const values = Object.values(row);
  const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonEmpty.length === 0) return false;

  // Skip obvious header/summary rows by checking if the first cell is a known header label
  const firstVal = (values[0] || '').toString().trim().toLowerCase();
  const headerKeywords = ['name', 'item id', 'new claims', 'section', 'ref', 'header'];
  if (headerKeywords.some(k => firstVal === k)) return false;

  return true;
};

export default function ImportClaimsModal({ isOpen, onClose, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [results, setResults] = useState(null);
  const [step, setStep] = useState('upload'); // upload | preview | done
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResults(null);
    setParseError(null);
    setParsing(true);

    try {
      // Upload file then extract
      const uploaded = await base44.integrations.Core.UploadFile({ file: f });

      // Use backend function to parse the xlsx directly
      const parsed = await base44.functions.invoke('parseClaimsSpreadsheet', { file_url: uploaded.file_url });
      if (parsed?.error) throw new Error(parsed.error);

      const rows = parsed?.data?.rows || parsed?.rows || [];
      if (!rows.length) throw new Error('No rows found in spreadsheet. The file may be empty or in an unsupported format.');

      const validRows = rows.filter(isValidClaimRow);
      const mappedRows = validRows.map(row => ({ raw: row, mapped: mapRowToClaim(row) }));

      // If nothing passed validation, show all rows anyway so user sees something
      if (validRows.length === 0 && rows.length > 0) {
        const allMapped = rows.map(row => ({ raw: row, mapped: mapRowToClaim(row) }));
        setPreview(allMapped);
        setStep('preview');
        return;
      }
      setPreview(mappedRows);
      setStep('preview');
    } catch (err) {
      setParseError(err.message || 'Failed to parse file');
    } finally {
      setParsing(false);
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
    setParseError(null);
    setParsing(false);
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
                onClick={() => !parsing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${parsing ? 'border-accent cursor-wait' : 'border-border cursor-pointer hover:border-accent'}`}
              >
                {parsing ? (
                  <>
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-accent animate-spin" />
                    <p className="text-lg font-medium mb-1">Uploading & parsing file...</p>
                    <p className="text-sm text-foreground-muted">{file?.name}</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto mb-4 text-foreground-muted" />
                    <p className="text-lg font-medium mb-1">Click to upload spreadsheet</p>
                    <p className="text-sm text-foreground-muted">Supports .xlsx files exported from AH Claims</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={parsing}
                />
              </div>
              {parseError && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-400 text-sm">Failed to parse file</p>
                    <p className="text-red-600 dark:text-red-300 text-sm mt-1">{parseError}</p>
                  </div>
                </div>
              )}
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