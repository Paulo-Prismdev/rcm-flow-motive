import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, Loader2, Sparkles, X } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import HighlightableDocumentViewer from '@/components/shared/HighlightableDocumentViewer';
import TopLevelReviewWindow from '@/components/shared/TopLevelReviewWindow';
import ExtractedFigureRow from './ExtractedFigureRow';
import InvoiceReviewChecks from './InvoiceReviewChecks';
import {
  REQUIRED_FIGURES,
  buildExtractionPrompt,
  checkArithmetic,
  checkRightInvoice,
  correctionsFromReview,
  emptyFigures,
  expectedInvoice,
  extractionSchema,
  figuresForReview,
  findInvoiceNumberElsewhere,
  figuresNeedingReview,
  fetchSourceSnippets,
  invoiceFigures,
  snippetsFromExtraction,
  toNum,
} from './invoiceReview';
import { isInvoiceDocument, isPrivatePayingClaim } from '@/components/shared/invoiceChecklist';
import RepairCostFromInvoice, { repairCostOffer } from './RepairCostFromInvoice';
import InvoiceVsAuthority from './InvoiceVsAuthority';
import {
  authorityWorkings,
  claimAuthorityExpectation,
  compareToAuthority,
  hasSplit,
  splitFromFigures,
} from './invoiceAuthorityCheck';

/**
 * The check before an invoice is recorded: the document on the left, the figures
 * the AI read off it on the right, each one highlighted where it was found.
 * Nothing is saved to the claim until the user confirms here.
 */
export default function InvoiceReviewModal({
  isOpen, onClose, claim, vatExcess, item, party, fileUrl, fileName, onConfirm, onReinvoiceEmail,
  vatExcessFiled = false,
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
  // Whether this same invoice is to be filed as the customer's own invoice too, where
  // it carries their share of the repair.
  const [fileVatExcess, setFileVatExcess] = useState(false);

  // What this particular invoice carries: the standard set, the few a document
  // names for itself, and any figures read beside them — a salvage invoice's
  // storage charge and admin charges.
  const fields = useMemo(() => invoiceFigures(item), [item]);

  // Read the document once each time the screen opens.
  useEffect(() => {
    if (!isOpen || !fileUrl) return undefined;
    let cancelled = false;
    setStatus('reading');
    setFigures(emptyFigures(fields));
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
    setFileVatExcess(false);
    setFocused('invoice_number');

    (async () => {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: buildExtractionPrompt({ item, claim, party, fields }),
          file_urls: [fileUrl],
          response_json_schema: extractionSchema(fields),
        });
        if (cancelled) return;
        const readable = result?.readable !== false;
        const extracted = readable ? result : {};
        const read = figuresForReview(extracted, fields);

        // Where each figure sits on the document. If the reading pass didn't say,
        // ask once more — the review is only useful with those pointers.
        let found = snippetsFromExtraction(extracted);
        if (readable && !Object.values(found).some(Boolean)) {
          try {
            found = await fetchSourceSnippets(base44, fileUrl, read.figures, fields);
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
  }, [isOpen, fileUrl, fields]);

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
  // A document is filed for the date printed on it. Where it carries figures of its
  // own that our invoices are worked out from — a salvage invoice's storage charge —
  // those have to be read before it can be filed, so nothing is left waiting on a
  // figure that was never recorded.
  const requiredKeys = isInvoiceDocument(item) && !item?.setsRepairCost
    ? ['invoice_date', ...(item?.extraFigures || []).filter((f) => f.required).map((f) => f.key)]
    : Object.keys(REQUIRED_FIGURES);
  const missingRequired = requiredKeys
    .filter((key) => !String(figures[key] ?? '').trim())
    .map((key) => REQUIRED_FIGURES[key]
      || `Enter the ${(fields.find((f) => f.key === key)?.label || key).toLowerCase()}`);

  const needsReviewKeys = useMemo(() => figuresNeedingReview(figures, confidence, fields), [figures, confidence, fields]);
  const unreviewed = needsReviewKeys.filter((key) => !reviewed[key] && !touched[key]);
  const unreviewedLabels = unreviewed.map((key) => fields.find((f) => f.key === key)?.label || key);

  const arithmetic = checkArithmetic(figures);
  const matchIssues = checkRightInvoice(figures, claim, item);
  const expected = expectedInvoice(item, claim);
  const invoiceTotal = toNum(figures.amount_total);
  const mismatch = expected.amount && invoiceTotal !== null && Math.abs(invoiceTotal - expected.amount) >= 0.01
    ? { invoiceTotal, expected }
    : null;

  const mismatchAccepted = !mismatch || (acceptedMismatch && reason.trim().length > 0);

  // What the insurer's share of this repair should come to, and what the customer
  // pays the repairer themselves — the two together are the whole repair, which is
  // what the claim's final repair cost has to be. Nothing to work it out from until
  // a Final Authority is on the claim, or on a job with no insurer on it at all.
  const expectation = item?.setsRepairCost ? claimAuthorityExpectation(claim) : null;

  // The invoice's own split of the repair, where the document prints one: its two
  // shares are checked against their own halves of the authorisation, and the whole
  // repair is the invoice's own total — never that total plus the customer's share a
  // second time.
  const split = useMemo(() => splitFromFigures(figures), [figures]);

  // The whole repair set against the repair cost already on the claim: it fills the
  // figure in where there is none, and is flagged where it differs.
  const costOffer = repairCostOffer(item, claim, figures, expectation);
  const useRepairCost = repairCostChoice ?? costOffer?.defaultUse ?? false;

  // The repairer's invoice against the insurer's own share of the authorised amount,
  // and an invoice over it can never be saved as the Final Insurer Invoice at all.
  const comparison = item?.setsRepairCost
    ? compareToAuthority(invoiceTotal, expectation, vatExcess, split)
    : null;
  const overAuthority = comparison?.status === 'over';
  const reinvoiceRequested = authorityChoice === 'reinvoice';
  const choiceNeeded = comparison?.status === 'under' && !authorityChoice;
  // The verdict on the invoice against the authority is part of this screen's one
  // verdict: while it isn't clear, nothing here announces that everything matches.
  const authorityOk = !comparison || comparison.headline?.tone === 'ok';

  // Where we handle this client's VAT and excess, the invoice often carries their own
  // half of the repair as a payable line of its own — which is exactly what the VAT &
  // Excess Invoice In bills. Filing the one document for both means that invoice is on
  // file at once, and no separate copy has to be chased for it.
  const splitCustomerShare = toNum(split.customer);
  const offerVatExcessFile = !!vatExcess
    && !!item?.setsRepairCost
    && hasSplit(split)
    && splitCustomerShare > 0
    && !vatExcessFiled;
  const fileVatExcessConfirmed = offerVatExcessFile && fileVatExcess;

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
      accepted.push(`${authorityWorkings(comparison)} — the invoice total of ${fmtGBP(comparison.insurerPart)} is ${fmtGBP(Math.abs(comparison.difference))} under that; ${reinvoiceRequested ? 'a corrected invoice requested from the repairer' : `accepted, the whole repair of ${fmtGBP(comparison.fullCost)} becoming the claim's final repair cost`}`);
    }
    if (comparison?.status === 'match') {
      accepted.push(`${authorityWorkings(comparison)} — the invoice total of ${fmtGBP(comparison.insurerPart)} matches, making the whole repair ${fmtGBP(comparison.fullCost)} against the authorised ${fmtGBP(comparison.authority)}`);
    }
    softBlockers.filter((b) => acked[b.id]).forEach((b) => accepted.push(`${b.text} — accepted`));
    onConfirm({
      figures,
      corrections: correctionsFromReview(figures, raw, derived, fields),
      accepted,
      // An invoice waiting on a corrected copy doesn't set the repair cost: the
      // final repair cost comes from an invoice that is within the authority and
      // accepted.
      useAsRepairCost: !!costOffer && useRepairCost && !reinvoiceRequested,
      acceptInvoiceTotal: authorityChoice === 'accept',
      requestReinvoice: reinvoiceRequested,
      fileVatExcess: fileVatExcessConfirmed,
    });
  };

  if (!isOpen) return null;

  // The text to highlight on the document is the figure as it is printed there:
  // money carries separators that the bare stored number doesn't, so for amounts
  // the snippet is asked for the amount as written on the invoice.
  const focusedField = fields.find((f) => f.key === focused);
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
    <TopLevelReviewWindow
      isOpen={isOpen}
      onClose={onClose}
      label="Check this invoice before it's saved"
      className="!overflow-hidden"
    >
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
          <div className="md:w-[55%] h-52 md:h-full border-b md:border-b-0 md:border-r border-border flex flex-col min-h-0">
            <div className="px-3 py-1.5 bg-muted/40 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex-shrink-0">
              The document
            </div>
            <div className="flex-1 min-h-0">
              <HighlightableDocumentViewer fileUrl={fileUrl} highlightText={highlightText} fitWidth allowFullscreen />
            </div>
          </div>

          <div className="md:w-[45%] flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
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
              {fields.map((field) => (
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

            {offerVatExcessFile && (
              <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
                <p className="text-[11px] font-semibold text-foreground">
                  File this invoice as the VAT &amp; Excess Invoice In too
                </p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  It carries {fmtGBP(splitCustomerShare)} payable by {claim?.client_name || 'the customer'}, which is what
                  that invoice bills. Filing it here puts that invoice on file at once, so no separate copy has to be
                  chased for it.
                </p>
                <label className="flex cursor-pointer items-start gap-2 text-[11px]">
                  <input
                    type="checkbox"
                    checked={fileVatExcess}
                    onChange={(e) => setFileVatExcess(e.target.checked)}
                    className="mt-0.5 rounded border-border"
                  />
                  <span>Also file it as the VAT &amp; Excess Invoice In at {fmtGBP(splitCustomerShare)}.</span>
                </label>
              </div>
            )}

            {/* The repairer's invoices are only measured against an authority where the
                job has one: a job the customer is paying for privately has no insurer
                on it, so there is nothing to set the invoice against. */}
            {item?.setsRepairCost && !isPrivatePayingClaim(claim) && (
              <InvoiceVsAuthority
                label={item.label}
                comparison={comparison}
                mode="invoice"
                choice={authorityChoice}
                onChoice={setAuthorityChoice}
                onReinvoiceEmail={onReinvoiceEmail}
                emptyNote={expectation === null
                  ? "No final authority is on the claim yet — the insurer's share of the invoice is set against it as soon as one arrives."
                  : "Enter the invoice total and it is set against the insurer's share of the authorised amount."}
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
              authorityOk={authorityOk}
              withAuthority={!!comparison}
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
    </TopLevelReviewWindow>
  );
}