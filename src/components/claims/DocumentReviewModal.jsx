import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, FileCheck2, Loader2, ShieldAlert, X } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import HighlightableDocumentViewer from '@/components/shared/HighlightableDocumentViewer';
import TopLevelReviewWindow from '@/components/shared/TopLevelReviewWindow';
import ExtractedFigureRow from '@/components/claims/financials/ExtractedFigureRow';
import { AckRow } from '@/components/claims/financials/InvoiceReviewChecks';
import AuthorityExcessChoice from '@/components/claims/financials/AuthorityExcessChoice';
import AuthorityVatChoice from '@/components/claims/financials/AuthorityVatChoice';
import EstimateAuthorityTotals from '@/components/claims/EstimateAuthorityTotals';
import {
  buildDocumentPatch,
  buildDocumentPrompt,
  checkDocumentReg,
  chosenValue,
  displayValue,
  documentArithmetic,
  documentCorrections,
  documentCustomerChecks,
  documentExtractionSchema,
  documentFields,
  documentFiguresForReview,
  documentNeedsReview,
  documentRequired,
  documentRows,
  documentTarget,
  emptyDocumentFigures,
  excessForDocument,
  purchaseOrderFound,
  readTotals,
} from '@/components/claims/documentFigures';
import PurchaseOrderUploadNotice from '@/components/claims/PurchaseOrderUploadNotice';
import { fetchSourceSnippets } from '@/components/claims/financials/invoiceReview';

const isAuthority = (itemKey) => String(itemKey || '').includes('authority');

/**
 * The check before an estimate or an authority is recorded: the document on the left,
 * the figures read off it on the right. It is the same review the Financials documents
 * get — the date printed on the document (never the upload date), the totals, and, on
 * an authority, what the customer is responsible for.
 *
 * A figure the claim already holds a different value for is shown both ways and the
 * user chooses, so nothing already on the claim is overwritten on the AI's word; and
 * nothing at all is written to the claim until this is confirmed.
 */
export default function DocumentReviewModal({
  isOpen, onClose, claim, item, fileUrl, fileName, onConfirm,
}) {
  const itemKey = item?.key;
  const authority = isAuthority(itemKey);
  const fields = useMemo(() => documentFields(itemKey || ''), [itemKey]);

  const [status, setStatus] = useState('reading');
  const [figures, setFigures] = useState({});
  const [raw, setRaw] = useState({});
  const [confidence, setConfidence] = useState({});
  const [snippets, setSnippets] = useState({});
  const [derived, setDerived] = useState([]);
  const [touched, setTouched] = useState({});
  const [reviewed, setReviewed] = useState({});
  const [focused, setFocused] = useState('amount_total');
  const [acked, setAcked] = useState({});
  const [choices, setChoices] = useState({});
  const [excessChoice, setExcessChoice] = useState('claim');
  const [vatChoice, setVatChoice] = useState('claim');
  // A purchase order filed here by mistake: its own number and total, shown instead of
  // being read as this document.
  const [poFound, setPoFound] = useState(null);

  // Read the document once each time the screen opens.
  useEffect(() => {
    if (!isOpen || !fileUrl) return undefined;
    let cancelled = false;
    setStatus('reading');
    setFigures(emptyDocumentFigures(itemKey));
    setRaw({});
    setConfidence({});
    setSnippets({});
    setDerived([]);
    setTouched({});
    setReviewed({});
    setAcked({});
    setChoices({});
    setExcessChoice('claim');
    setVatChoice('claim');
    setFocused('amount_total');
    setPoFound(null);

    (async () => {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: buildDocumentPrompt({ itemKey, item, claim }),
          file_urls: [fileUrl],
          response_json_schema: documentExtractionSchema(itemKey),
        });
        if (cancelled) return;

        // A purchase order is not an estimate or an authority: it is the order issued
        // from Financials, so it is recognised here and nothing is read off it as this
        // document. Nothing is filed and nothing is saved.
        const asOrder = purchaseOrderFound(result);
        if (asOrder) {
          setPoFound(asOrder);
          setStatus('purchase_order');
          return;
        }

        const readable = result?.readable !== false;
        const extracted = readable ? result : {};
        const read = documentFiguresForReview(extracted, itemKey);

        // Where each figure sits on the document. If the reading pass didn't say, ask
        // once more — the review is only useful with those pointers.
        let found = read.snippets;
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
        setDerived(read.derived || []);
        setSnippets(found || {});
        setStatus(readable ? 'ready' : 'failed');
      } catch (e) {
        console.error('Document reading failed', e);
        if (!cancelled) setStatus('failed');
      }
    })();

    return () => { cancelled = true; };
    // Read once per opened document: the claim's own updates must not re-read it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fileUrl, itemKey]);

  const setFigure = (key, value) => {
    setFigures((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const required = documentRequired(itemKey);
  const missingRequired = Object.keys(required)
    .filter((key) => !String(figures[key] ?? '').trim())
    .map((key) => required[key]);

  const needsReviewKeys = useMemo(
    () => documentNeedsReview(itemKey, figures, confidence),
    [itemKey, figures, confidence]
  );
  const unreviewed = needsReviewKeys.filter((key) => !reviewed[key] && !touched[key]);
  const unreviewedLabels = unreviewed.map((key) => fields.find((f) => f.key === key)?.label || key);

  const regIssue = checkDocumentReg({ itemKey, item, figures, claim });
  const regAcked = !regIssue || !!acked.reg;
  const arithmetic = useMemo(() => documentArithmetic(figures), [figures]);

  const rows = useMemo(() => documentRows({ claim, itemKey, figures }), [claim, itemKey, figures]);
  const conflicts = rows.filter((row) => row.differs);
  const { vat, excess: excessCheckResult } = documentCustomerChecks({ itemKey, figures, claim });
  const excess = excessForDocument(excessCheckResult);
  const totals = readTotals(figures);
  const noDateRead = !figures.document_date && !!documentTarget(itemKey)?.date;

  // Exactly what confirming saves, shown before it is saved.
  const preview = useMemo(
    () => buildDocumentPatch({
      claim, itemKey, figures, choices, excessChoice, vatChoice,
      file: { file_url: fileUrl, file_name: fileName },
    }),
    [claim, itemKey, figures, choices, excessChoice, vatChoice, fileUrl, fileName]
  );

  const canConfirm = status !== 'reading'
    && missingRequired.length === 0
    && unreviewed.length === 0
    && regAcked;

  const handleConfirm = () => {
    onConfirm({
      figures,
      corrections: documentCorrections(itemKey, figures, raw, derived),
      choices,
      excessChoice,
      vatChoice,
    });
  };

  if (!isOpen) return null;

  // The file read as a purchase order: it is the order issued from Financials, so it is
  // never saved as an estimate or an authority — the user is pointed at the order instead.
  if (status === 'purchase_order') {
    return (
      <TopLevelReviewWindow
        isOpen={isOpen}
        onClose={onClose}
        label="This file is a purchase order"
        className="!overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <FileCheck2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground">This file is a purchase order</h3>
            <p className="text-[11px] text-muted-foreground truncate">
              {item?.label} · {fileName}
            </p>
          </div>
          <button type="button" onClick={onClose} title="Close" className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <PurchaseOrderUploadNotice claim={claim} item={item} found={poFound} onClose={onClose} />
        </div>
      </TopLevelReviewWindow>
    );
  }

  // The text to highlight on the document is the figure as it is printed there: money
  // carries separators that the bare stored number doesn't.
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

  const what = authority ? 'authority' : 'estimate';

  return (
    <TopLevelReviewWindow
      isOpen={isOpen}
      onClose={onClose}
      label={`Check this ${what} before it's saved`}
      className="!overflow-hidden"
    >
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground">Check this {what} before it's saved</h3>
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
              The {what}
            </div>
            <div className="flex-1 min-h-0">
              <HighlightableDocumentViewer fileUrl={fileUrl} highlightText={highlightText} fitWidth allowFullscreen />
            </div>
          </div>

          <div className="md:w-[45%] flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
            {status === 'reading' && (
              <div className="flex items-center gap-2 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400 flex-shrink-0" />
                <p className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                  Reading the {what} — its date and figures will appear here.
                </p>
              </div>
            )}

            {status === 'failed' && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-px" />
                <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  We couldn't read this document. Enter the date and the figures yourself — everything else on this
                  screen still applies.
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

            {status !== 'reading' && (missingRequired.length > 0 || unreviewed.length > 0) && (
              <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-2.5">
                <p className="flex items-start gap-1.5 text-[11px] font-semibold text-red-700 dark:text-red-400">
                  <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> Before this can be saved
                </p>
                <ul className="mt-1 pl-5 space-y-0.5 list-disc text-[11px] leading-snug text-red-700/90 dark:text-red-400/90">
                  {missingRequired.map((msg) => <li key={msg}>{msg}</li>)}
                  {unreviewed.length > 0 && (
                    <li>
                      {unreviewed.length} figure{unreviewed.length === 1 ? '' : 's'} the AI wasn't sure about must be
                      checked or corrected: {unreviewedLabels.join(', ')}.
                    </li>
                  )}
                </ul>
              </div>
            )}

            {status !== 'reading' && arithmetic.length > 0 && (
              <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-2.5">
                <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> Check the figures as printed
                </p>
                <ul className="mt-1 pl-5 space-y-0.5 list-disc text-[11px] leading-snug text-amber-800/90 dark:text-amber-300/90">
                  {arithmetic.map((issue) => <li key={issue}>{issue}</li>)}
                </ul>
              </div>
            )}

            {status !== 'reading' && regIssue && (
              <AckRow
                title={regIssue.kind === 'mismatch' ? `This ${what} is for a different vehicle` : 'No registration found'}
                detail={regIssue.text}
                acked={acked.reg}
                onAck={(value) => setAcked((prev) => ({ ...prev, reg: value }))}
              />
            )}

            {status !== 'reading' && noDateRead && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">
                  No date was read off this {what}, so <span className="font-semibold text-foreground">{documentTarget(itemKey).date.label}</span> is
                  left as it is. Type the date above if it is printed somewhere we've missed.
                </p>
              </div>
            )}

            {status !== 'reading' && excessCheckResult?.tbc && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">
                  The policy excess is still <span className="font-semibold text-foreground">TBC on authority</span> on this
                  claim. This {what} doesn't settle it — the Final Authority does.
                </p>
              </div>
            )}

            {status !== 'reading' && <AuthorityVatChoice check={vat} choice={vatChoice} onChoice={setVatChoice} />}
            {status !== 'reading' && <AuthorityExcessChoice check={excess} choice={excessChoice} onChoice={setExcessChoice} />}

            {status !== 'reading' && conflicts.length > 0 && (
              <div className="space-y-1.5">
                {conflicts.map((row) => (
                  <div key={row.id} className="rounded-lg border border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/25 p-2.5">
                    <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                      {row.label} already on the claim
                    </p>
                    <p className="mt-1 pl-5 text-[11px] leading-snug text-amber-800/90 dark:text-amber-300/90">
                      The claim holds <span className="font-semibold">{displayValue(row, row.stored)}</span>; this {what} shows{' '}
                      <span className="font-semibold">{displayValue(row, row.shown)}</span>. {row.preferDocument
                        ? 'The date printed on the document is used unless you keep the claim\u2019s.'
                        : 'Neither is changed unless you choose it.'}
                    </p>
                    <div className="mt-1.5 pl-5 flex items-center gap-2 flex-wrap">
                      {[['claim', `Keep ${displayValue(row, row.stored)}`], ['document', `Use ${displayValue(row, row.shown)}`]].map(([value, label]) => {
                        const selected = chosenValue(row, choices) === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setChoices((prev) => ({ ...prev, [row.id]: value }))}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-semibold transition-colors ${selected
                              ? 'border-amber-500 bg-amber-100/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200'
                              : 'border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:border-amber-400'}`}
                          >
                            {selected && <Check className="w-3 h-3" />} {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {status !== 'reading' && (
              <div className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  What saving this records
                </p>
                <ul className="space-y-0.5">
                  {preview.applied.length === 0 && (
                    <li className="text-[11px] text-muted-foreground">Nothing new — the claim already holds these figures.</li>
                  )}
                  {preview.applied.map((row) => (
                    <li key={row.id} className="flex items-baseline justify-between gap-3 text-[11px]">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-semibold tabular-nums text-foreground">{displayValue(row)}</span>
                    </li>
                  ))}
                  {preview.kept.map((row) => (
                    <li key={`kept-${row.id}`} className="text-[11px] text-muted-foreground">
                      {row.label} left at {displayValue(row, row.stored)} — the claim's figure, not this {what}'s.
                    </li>
                  ))}
                  {isAuthority(itemKey) && excess?.tbc === false && preview.applied.every((row) => row.id !== 'policy_excess') && excessCheckResult?.shown !== null && (
                    <li className="text-[11px] text-muted-foreground">
                      Policy excess left as the claim holds it ({excessCheckResult.storedLabel}).
                    </li>
                  )}
                </ul>
                {totals.netDerived && totals.gross !== null && (
                  <p className="text-[10px] text-muted-foreground">
                    The {what} prints only a total including VAT, so the amount ex VAT of {fmtGBP(totals.net)} is worked back
                    out of it the way the claim's own figures are.
                  </p>
                )}
                <EstimateAuthorityTotals claim={{ ...claim, ...preview.patch }} className="bg-card" />
              </div>
            )}
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
            <Check className="w-3.5 h-3.5" /> Save the {what}
          </Button>
        </div>
    </TopLevelReviewWindow>
  );
}