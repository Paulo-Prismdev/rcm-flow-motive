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
  confidenceFromExtraction,
  correctionsFromReview,
  emptyFigures,
  expectedInvoice,
  figuresFromExtraction,
  findInvoiceNumberElsewhere,
  figuresNeedingReview,
  fetchSourceSnippets,
  rawFromExtraction,
  snippetsFromExtraction,
  toNum,
} from './invoiceReview';

/**
 * The check before an invoice is recorded: the document on the left, the figures
 * the AI read off it on the right, each one highlighted where it was found.
 * Nothing is saved to the claim until the user confirms here.
 */
export default function InvoiceReviewModal({
  isOpen, onClose, claim, item, party, fileUrl, fileName, onConfirm,
}) {
  const [status, setStatus] = useState('reading');
  const [figures, setFigures] = useState(emptyFigures);
  const [raw, setRaw] = useState({});
  const [confidence, setConfidence] = useState({});
  const [snippets, setSnippets] = useState({});
  const [touched, setTouched] = useState({});
  const [reviewed, setReviewed] = useState({});
  const [focused, setFocused] = useState('invoice_number');
  const [acked, setAcked] = useState({});
  const [acceptedMismatch, setAcceptedMismatch] = useState(false);
  const [reason, setReason] = useState('');
  const [duplicate, setDuplicate] = useState(null);

  // Read the document once each time the screen opens.
  useEffect(() => {
    if (!isOpen || !fileUrl) return undefined;
    let cancelled = false;
    setStatus('reading');
    setFigures(emptyFigures());
    setRaw({});
    setConfidence({});
    setSnippets({});
    setTouched({});
    setReviewed({});
    setAcked({});
    setAcceptedMismatch(false);
    setReason('');
    setDuplicate(null);
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
        const readFigures = figuresFromExtraction(extracted);

        // Where each figure sits on the document. If the reading pass didn't say,
        // ask once more — the review is only useful with those pointers.
        let found = snippetsFromExtraction(extracted);
        if (readable && !Object.values(found).some(Boolean)) {
          try {
            found = await fetchSourceSnippets(base44, fileUrl, readFigures);
          } catch (e) {
            console.error('Snippet lookup failed', e);
          }
        }
        if (cancelled) return;

        setFigures(readFigures);
        setRaw(rawFromExtraction(extracted));
        setConfidence(confidenceFromExtraction(extracted));
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

  const missingRequired = Object.entries(REQUIRED_FIGURES)
    .filter(([key]) => !String(figures[key] ?? '').trim())
    .map(([, message]) => message);

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
  const softBlockers = [
    ...arithmetic.map((text, i) => ({ id: `arith-${i}`, text })),
    ...matchIssues.map((text, i) => ({ id: `match-${i}`, text })),
    ...(duplicate?.length ? [{ id: 'duplicate', text: `Invoice ${figures.invoice_number} is already recorded on ${duplicate.map((d) => d.job_number || 'another claim').join(', ')}` }] : []),
  ];
  const canConfirm = status !== 'reading' && missingRequired.length === 0 && unreviewed.length === 0 && mismatchAccepted;

  const handleConfirm = () => {
    const accepted = [];
    if (mismatch && acceptedMismatch) {
      accepted.push(`the invoice total ${fmtGBP(mismatch.invoiceTotal)} differs from our calculated ${fmtGBP(mismatch.expected.amount)}${mismatch.expected.note ? ` (${mismatch.expected.note})` : ''} — accepted with the reason: ${reason.trim()}`);
    }
    softBlockers.filter((b) => acked[b.id]).forEach((b) => accepted.push(`${b.text} — accepted`));
    onConfirm({ figures, corrections: correctionsFromReview(figures, raw), accepted });
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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3">
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