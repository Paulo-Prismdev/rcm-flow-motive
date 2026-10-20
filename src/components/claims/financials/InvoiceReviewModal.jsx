import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, Loader2, Sparkles, X } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import HighlightableDocumentViewer from '@/components/shared/HighlightableDocumentViewer';
import ExtractedFigureRow from './ExtractedFigureRow';
import InvoiceReviewChecks from './InvoiceReviewChecks';
import {
  EXTRACTION_SCHEMA,
  INVOICE_FIGURES,
  REQUIRED_FIGURES,
  buildExtractionPrompt,
  checkArithmetic,
  checkRightInvoice,
  correctionsFromReview,
  emptyFigures,
  expectedInvoice,
  figuresForReview,
  findInvoiceNumberElsewhere,
  figuresNeedingReview,
  fetchSourceSnippets,
  snippetsFromExtraction,
  toNum,
} from './invoiceReview';
import { isInvoiceDocument } from '@/components/shared/invoiceChecklist';
import RepairCostFromInvoice, { repairCostOffer } from './RepairCostFromInvoice';
import InvoiceVsAuthority from './InvoiceVsAuthority';
import { authorityAmount, authorityWorkings, compareToAuthority } from './invoiceAuthorityCheck';

/**
 * The check before an invoice is recorded: the document on the left, the figures
 * the AI read off it on the right, each one highlighted where it was found.
 * Nothing is saved to the claim until the user confirms here.
 */
export default function InvoiceReviewModal({
  isOpen, onClose, claim, vatExcess, item, party, fileUrl, fileName, onConfirm, onReinvoiceEmail,
}) {
  const [status, setStatus] = useState('reading');
  const [figures, setFigures] = useState(emptyFigures);
  const [raw, setRaw] = useState({});
  const [confidence, setConfidence] = useState({});
  const [snippets, setSnippets] = useState({});
  const [derived, setDerived] = useState([]);
  const [touched, setTouched] = useState({});
  const [reviewed, setReviewed] = useState({});
  const [focused, setFocused] = useState('invoice_number');
  const [acked, setAcked] = useState({});
  const [acceptedMismatch, setAcceptedMismatch] = useState(false);
  const [reason, setReason] = useState('');
  const [duplicate, setDuplicate] = useState(null);
  const [repairCostChoice, setRepairCostChoice] = useState(null);
  const [authorityChoice, setAuthorityChoice] = useState(null);

  // Read the document once each time the screen opens.
  useEffect(() => {
    if (!isOpen || !fileUrl) return undefined;
    let cancelled = false;
    setStatus('reading');
    setFigures(emptyFigures());
    setRaw({});
    setConfidence({});
    setSnippets({});
    setDerived([]);
    setTouched({});
    setReviewed({});
    setAcked({});
    setAcceptedMismatch(false);
    setReason('');
    setDuplicate(null);
    setRepairCostChoice(null);
    setAuthorityChoice(null);
    setFocused('invoice_number');

    (async () => {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: buildExtractionPrompt({ item, claim, party }),
          file_urls: [fileUrl],
          response_json_schema: EXTRACTION_SCHEMA,
        });
        if (cancelled) return;
        const readable = result?.readable !== false;
        const extracted = readable ? result : {};
        const read = figuresForReview(extracted);

        // Where each figure sits on the document. If the reading pass didn't say,
        // ask once more — the review is only useful with those pointers.
        let found = snippetsFromExtraction(extracted);
        if (readable && !Object.values(found).some(Boolean)) {
          try {
            found = await fetchSourceSnippets(base44, fileUrl, read.figures);
          } catch (e) {
            console.error('Snippet lookup failed', e);
          }
        }
        if (cancelled) return;

        setFigures(read.figures);
        setRaw(read.raw);
        setConfidence(read.confidence);
        setDerived(read.derived);
        setSnippets(found);
        setStatus(readable ? 'ready' : 'failed');
      } catch (e) {
        console.error('Invoice reading failed', e);
        if (!cancelled) setStatus('failed');
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, fileUrl]);

  // Has this invoice number already been recorded on another claim?
  useEffect(() => {
    if (!isOpen || status === 'reading') return undefined;
    const number = String(figures.invoice_number || '').trim();
    if (number.length < 3) { setDuplicate(null); return undefined; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const others = await findInvoiceNumberElsewhere(base44, number, claim?.id);
      if (cancelled || !others) return;
      setDuplicate(others.map((c) => ({ ...c, number })));
    }, 600);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isOpen, status, figures.invoice_number, claim?.id]);

  const setFigure = (key, value) => {
    setFigures((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  // A close-out document is filed for the date printed on it: the figures on it
  // are read and logged, but only the Final Insurer Invoice's total is needed,
  // because the claim's final repair cost comes from it.
  const requiredKeys = isInvoiceDocument(item) && !item?.setsRepairCost
    ? ['invoice_date']
    : Object.keys(REQUIRED_FIGURES);
  const missingRequired = requiredKeys
    .filter((key) => !String(figures[key] ?? '').trim())
    .map((key) => REQUIRED_FIGURES[key]);

  const needsReviewKeys = useMemo(() => figuresNeedingReview(figures, confidence), [figures, confidence]);
  const unreviewed = needsReviewKeys.filter((key) => !reviewed[key] && !touched[key]);
  const unreviewedLabels = unreviewed.map((key) => INVOICE_FIGURES.find((f) => f.key === key)?.label || key);

  const arithmetic = checkArithmetic(figures);
  const matchIssues = checkRightInvoice(figures, claim, item);
  const expected = expectedInvoice(item, claim);
  const invoiceTotal = toNum(figures.amount_total);
  const mismatch = expected.amount && invoiceTotal !== null && Math.abs(invoiceTotal - expected.amount) >= 0.01
    ? { invoiceTotal, expected }
    : null;

  const mismatchAccepted = !mismatch || (acceptedMismatch && reason.trim().length > 0);

  // The Final Insurer Invoice's total — the repairer's two invoices added up where
  // the VAT and excess are on their own invoice — set against the repair cost
  // already on the claim: it fills the figure in where there is none, and is
  // flagged where it differs.
  const costOffer = repairCostOffer(item, claim, figures, vatExcess);
  const useRepairCost = repairCostChoice ?? costOffer?.defaultUse ?? false;

  // The repairer's invoices are set against the amount the job was authorised at,
  // and a total over it can never be saved as the Final Insurer Invoice at all.
  // Where the VAT and excess are on their own invoice the two are added up — and
  // until that invoice is on file the check waits for it rather than reading the
  // insurer's invoice as short.
  const authority = item?.setsRepairCost ? authorityAmount(claim) : null;
  const comparison = item?.setsRepairCost
    ? compareToAuthority(invoiceTotal, authority, vatExcess)
    : null;
  const overAuthority = comparison?.status === 'over';
  const reinvoiceRequested = authorityChoice === 'reinvoice';
  const choiceNeeded = comparison?.status === 'under' && !authorityChoice;

  const softBlockers = [
    ...arithmetic.map((text, i) => ({ id: `arith-${i}`, text })),
    ...matchIssues.map((text, i) => ({ id: `match-${i}`, text })),
    ...(duplicate?.length ? [{ id: 'duplicate', text: `Invoice ${figures.invoice_number} is already recorded on ${duplicate.map((d) => d.job_number || 'another claim').join(', ')}` }] : []),
  ];
  const canConfirm = status !== 'reading'
    && missingRequired.length === 0
    && unreviewed.length === 0
    && mismatchAccepted
    && !overAuthority
    && !choiceNeeded;

  const handleConfirm = () => {
    const accepted = [];
    if (mismatch && acceptedMismatch) {
      accepted.push(`the invoice total ${fmtGBP(mismatch.invoiceTotal)} differs from our calculated ${fmtGBP(mismatch.expected.amount)}${mismatch.expected.note ? ` (${mismatch.expected.note})` : ''} — accepted with the reason: ${reason.trim()}`);
    }
    if (comparison?.status === 'under') {
      accepted.push(`${authorityWorkings(comparison)} is ${fmtGBP(Math.abs(comparison.difference))} under the authorised ${fmtGBP(comparison.authority)} — ${reinvoiceRequested ? 'a corrected invoice requested from the repairer' : "accepted as the claim's final repair cost"}`);
    }
    if (comparison?.status === 'match') {
      accepted.push(`${authorityWorkings(comparison)} matches the authorised ${fmtGBP(comparison.authority)}`);
    }
    softBlockers.filter((b) => acked[b.id]).forEach((b) => accepted.push(`${b.text} — accepted`));
    onConfirm({
      figures,
      corrections: correctionsFromReview(figures, raw, derived),
      accepted,
      // An invoice waiting on a corrected copy doesn't set the repair cost: the
      // final repair cost comes from an invoice that is within the authority and
      // accepted.
      useAsRepairCost: !!costOffer && useRepairCost && !reinvoiceRequested,
      acceptInvoiceTotal: authorityChoice === 'accept',
      requestReinvoice: reinvoiceRequested,
    });
  };

  if (!isOpen) return null;

  // The text to highlight on the document is the figure as it is printed there:
  // money carries separators that the bare stored number doesn't, so for amounts
  // the snippet is asked for the amount as written on the invoice.
  const focusedField = INVOICE_FIGURES.find((f) => f.key === focused);
  const highlightText = (() => {
    const value = String(figures[focused] ?? '');
    if (!value) return '';
    if (focusedField?.type === 'number') {
      const printed = String(snippets[focused] || '').match(/[£$]?\s?\d[\d,]*(?:\.\d{1,2})?/);
      if (printed) return printed[0].trim();
    }
    return raw[focused] || value;
  })();

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3" data-mobile-full-modal="true">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground">Check this invoice before it's saved</h3>
            <p className="text-[11px] text-muted-foreground truncate">
              {item?.label} · {fileName}
            </p>
          </div>
          <button type="button" onClick={onClose} title="Reject the upload" className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          <div className="md:w-1/2 h-52 md:h-full border-b md:border-b-0 md:border-r border-border flex flex-col min-h-0">
            <div className="px-3 py-1.5 bg-muted/40 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex-shrink-0">
              The document
            </div>
            <div className="flex-1 min-h-0">
              <HighlightableDocumentViewer fileUrl={fileUrl} highlightText={highlightText} />
            </div>
          </div>

          <div className="md:w-1/2 flex-1 overflow-y-auto p-3 space-y-2.5">
            {status === 'reading' && (
              <div className="flex items-center gap-2 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400 flex-shrink-0" />
                <p className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">Reading the invoice — the figures will appear here.</p>
              </div>
            )}

            {status === 'failed' && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-px" />
                <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  We couldn't read this document. Enter the figures from the invoice yourself — everything else on this screen still applies.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              {INVOICE_FIGURES.map((field) => (
                <ExtractedFigureRow
                  key={field.key}
                  field={field}
                  value={figures[field.key]}
                  confidence={status === 'reading' ? 'missing' : (confidence[field.key] || 'missing')}
                  snippet={snippets[field.key]}
                  focused={focused === field.key}
                  needsReview={needsReviewKeys.includes(field.key)}
                  reviewed={!!reviewed[field.key]}
                  onChange={setFigure}
                  onFocus={() => setFocused(field.key)}
                  onReview={(key, on) => setReviewed((prev) => ({ ...prev, [key]: on }))}
                />
              ))}
            </div>

            <RepairCostFromInvoice offer={costOffer} useIt={useRepairCost} onUse={setRepairCostChoice} />

            {item?.setsRepairCost && (
              <InvoiceVsAuthority
                comparison={comparison}
                mode="invoice"
                choice={authorityChoice}
                onChoice={setAuthorityChoice}
                onReinvoiceEmail={onReinvoiceEmail}
                emptyNote={authority === null
                  ? 'No final authority is on the claim yet — the invoice total is set against it as soon as one arrives.'
                  : 'Enter the invoice total and it is set against the authorised amount.'}
              />
            )}

            <InvoiceReviewChecks
              arithmetic={arithmetic}
              matchIssues={matchIssues}
              duplicate={duplicate}
              mismatch={mismatch}
              requiredMissing={missingRequired}
              unreviewed={unreviewedLabels}
              accepted={acceptedMismatch}
              reason={reason}
              acked={acked}
              onAck={(id, value) => setAcked((prev) => ({ ...prev, [id]: value }))}
              onReason={setReason}
              onAcceptMismatch={() => setAcceptedMismatch(true)}
              onReject={onClose}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="gap-1.5">
            <X className="w-3.5 h-3.5" /> Reject the upload
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Check className="w-3.5 h-3.5" /> Save the invoice to the claim
          </Button>
        </div>
      </div>
    </div>
  );
}