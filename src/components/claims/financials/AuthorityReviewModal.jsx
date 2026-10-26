import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, Loader2, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import HighlightableDocumentViewer from '@/components/shared/HighlightableDocumentViewer';
import TopLevelReviewWindow from '@/components/shared/TopLevelReviewWindow';
import ExtractedFigureRow from './ExtractedFigureRow';
import { AckRow } from './InvoiceReviewChecks';
import AuthorityExcessChoice from './AuthorityExcessChoice';
import AuthorityVatChoice from './AuthorityVatChoice';
import InvoiceVsAuthority from './InvoiceVsAuthority';
import {
  AUTHORITY_EXTRACTION_SCHEMA,
  AUTHORITY_FIGURES,
  AUTHORITY_REQUIRED,
  authorityCorrections,
  authorityExpectationFromReview,
  authorityFiguresForReview,
  authorityNeedsReview,
  authorityVatCheck,
  buildAuthorityPrompt,
  checkAuthorityReg,
  emptyAuthorityFigures,
  excessCheck,
} from './authorityReview';
import { fetchSourceSnippets, snippetsFromExtraction } from './invoiceReview';
import { authorityWorkings, compareToAuthority, finalInvoiceTotal } from './invoiceAuthorityCheck';
import { finalInvoiceLabel } from '@/components/shared/invoiceChecklist';

/**
 * The check before an authority is recorded: the document on the left, the figures
 * read off it on the right — the amount and the registration it covers, and the
 * customer's own position from its "customer is responsible for" section. The amount
 * lands on the claim's authorised cost, its registration has to be this vehicle's,
 * and its excess and the customer's VAT status are filled in or put to the user.
 *
 * From those figures the repair is split the way it is actually billed: the insurer's
 * share of it, and what the customer pays the repairer themselves. The insurer's
 * share is then set against the Final Insurer Invoice already on file, whichever of
 * the two documents was uploaded second. Nothing is saved until the user confirms
 * here.
 */
export default function AuthorityReviewModal({
  isOpen, onClose, claim, vatExcess, item, fileUrl, fileName, onConfirm,
}) {
  const [status, setStatus] = useState('reading');
  const [figures, setFigures] = useState(emptyAuthorityFigures);
  const [raw, setRaw] = useState({});
  const [confidence, setConfidence] = useState({});
  const [snippets, setSnippets] = useState({});
  const [touched, setTouched] = useState({});
  const [reviewed, setReviewed] = useState({});
  const [focused, setFocused] = useState('amount_total');
  const [acked, setAcked] = useState({});
  const [excessChoice, setExcessChoice] = useState('claim');
  const [vatChoice, setVatChoice] = useState('claim');
  const [authorityChoice, setAuthorityChoice] = useState(null);

  // Read the document once each time the screen opens.
  useEffect(() => {
    if (!isOpen || !fileUrl) return undefined;
    let cancelled = false;
    setStatus('reading');
    setFigures(emptyAuthorityFigures());
    setRaw({});
    setConfidence({});
    setSnippets({});
    setTouched({});
    setReviewed({});
    setAcked({});
    setExcessChoice('claim');
    setVatChoice('claim');
    setAuthorityChoice(null);
    setFocused('amount_total');

    (async () => {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: buildAuthorityPrompt({ item, claim }),
          file_urls: [fileUrl],
          response_json_schema: AUTHORITY_EXTRACTION_SCHEMA,
        });
        if (cancelled) return;
        const readable = result?.readable !== false;
        const extracted = readable ? result : {};
        const read = authorityFiguresForReview(extracted);

        // Where each figure sits on the document. If the reading pass didn't say,
        // ask once more — the review is only useful with those pointers.
        let found = snippetsFromExtraction(extracted);
        if (readable && !Object.values(found).some(Boolean)) {
          try {
            found = await fetchSourceSnippets(base44, fileUrl, read.figures, AUTHORITY_FIGURES);
          } catch (e) {
            console.error('Snippet lookup failed', e);
          }
        }
        if (cancelled) return;

        setFigures(read.figures);
        setRaw(read.raw);
        setConfidence(read.confidence);
        setSnippets(found);
        setStatus(readable ? 'ready' : 'failed');
      } catch (e) {
        console.error('Authority reading failed', e);
        if (!cancelled) setStatus('failed');
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, fileUrl]);

  const setFigure = (key, value) => {
    setFigures((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const missingRequired = Object.keys(AUTHORITY_REQUIRED)
    .filter((key) => !String(figures[key] ?? '').trim())
    .map((key) => AUTHORITY_REQUIRED[key]);

  const needsReviewKeys = useMemo(() => authorityNeedsReview(figures, confidence), [figures, confidence]);
  const unreviewed = needsReviewKeys.filter((key) => !reviewed[key] && !touched[key]);
  const unreviewedLabels = unreviewed.map((key) => AUTHORITY_FIGURES.find((f) => f.key === key)?.label || key);

  const regIssue = checkAuthorityReg(figures, claim);
  const regAcked = !regIssue || !!acked.reg;

  const excess = excessCheck(figures, claim);
  const vat = authorityVatCheck(figures, claim);

  // The authority read as the two halves of the repair: what the insurer's invoice
  // should come to, and what the customer pays the repairer themselves. The figures
  // the user has settled on here are the ones the check is made of.
  const expectation = useMemo(
    () => authorityExpectationFromReview({ figures, claim, excessChoice, vatChoice }),
    [figures, claim, excessChoice, vatChoice]
  );

  const comparison = compareToAuthority(finalInvoiceTotal(claim), expectation, vatExcess);
  const choiceNeeded = comparison?.status === 'under' && !authorityChoice;

  const canConfirm = status !== 'reading'
    && missingRequired.length === 0
    && unreviewed.length === 0
    && regAcked
    && !choiceNeeded;

  const handleConfirm = () => {
    const accepted = [];
    if (regIssue) accepted.push(`${regIssue.text} — accepted`);
    if (comparison?.status === 'under') {
      accepted.push(`${authorityWorkings(comparison)} — the ${finalInvoiceLabel(claim)} of ${fmtGBP(comparison.insurerPart)} is ${fmtGBP(Math.abs(comparison.difference))} under that; ${authorityChoice === 'reinvoice' ? 'a corrected invoice requested from the repairer' : `accepted, the whole repair of ${fmtGBP(comparison.fullCost)} becoming the claim's final repair cost`}`);
    }
    if (comparison?.status === 'over') {
      accepted.push(`${authorityWorkings(comparison)} — the ${finalInvoiceLabel(claim)} of ${fmtGBP(comparison.insurerPart)} is ${fmtGBP(Math.abs(comparison.difference))} over that: a repairer can't invoice more than the insurer's share of the authority, so the ${finalInvoiceLabel(claim)} is flagged on the claim`);
    }
    if (excess.tbc && excessChoice === 'waived') {
      accepted.push('the policy excess was TBC on authority and this authority shows no excess, so it was marked as Waived');
    } else if (excess.fills) {
      accepted.push(!excess.tbc
        ? `the claim had no policy excess — the ${fmtGBP(excess.shown)} this authority shows filled in as the policy excess`
        : excess.shown === 0
          ? 'the policy excess was TBC on authority — the authority shows no excess, so it was marked as Waived'
          : `the policy excess was TBC on authority — the ${fmtGBP(excess.shown)} this authority shows was filled in and the TBC cleared`);
    }
    if (excess.differs) {
      accepted.push(excessChoice === 'authority'
        ? `the policy excess replaced with the authority's ${fmtGBP(excess.shown)} (the claim held ${excess.storedLabel})`
        : `the claim's policy excess of ${excess.storedLabel} kept against the authority's ${fmtGBP(excess.shown)}`);
    }
    if (vat.fills) {
      accepted.push(`the customer VAT status filled in from the authority as ${vat.shown === 'VAT Registered' ? 'VAT registered' : 'not VAT registered'}, which the claim didn't hold`);
    } else if (vat.differs) {
      accepted.push(vatChoice === 'authority'
        ? `the customer VAT status replaced with the authority's — ${vat.shown === 'VAT Registered' ? 'VAT registered' : 'not VAT registered'} (the claim held ${vat.stored === 'VAT Registered' ? 'VAT registered' : 'not VAT registered'})`
        : `the claim's customer VAT status of ${vat.stored === 'VAT Registered' ? 'VAT registered' : 'not VAT registered'} kept against the authority's`);
    }

    onConfirm({
      figures,
      corrections: authorityCorrections(figures, raw),
      accepted,
      excessChoice: excess.differs || (excess.tbc && excessChoice === 'waived') ? excessChoice : null,
      vatChoice: vat.differs ? vatChoice : null,
      acceptInvoiceTotal: authorityChoice === 'accept',
      requestReinvoice: authorityChoice === 'reinvoice',
    });
  };

  if (!isOpen) return null;

  // The text to highlight on the document is the figure as it is printed there:
  // money carries separators that the bare stored number doesn't.
  const focusedField = AUTHORITY_FIGURES.find((f) => f.key === focused);
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
      label="Check this authority before it's saved"
      className="!overflow-hidden"
    >
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground">Check this authority before it's saved</h3>
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
              The authority
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
                  Reading the authority — the three figures will appear here.
                </p>
              </div>
            )}

            {status === 'failed' && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-px" />
                <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  We couldn't read this document. Enter the authorised amount and the vehicle registration yourself —
                  everything else on this screen still applies.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              {AUTHORITY_FIGURES.map((field) => (
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

            {status !== 'reading' && regIssue && (
              <AckRow
                title={regIssue.kind === 'mismatch' ? 'This authority is for a different vehicle' : 'No registration found'}
                detail={regIssue.text}
                acked={acked.reg}
                onAck={(value) => setAcked((prev) => ({ ...prev, reg: value }))}
              />
            )}

            {status !== 'reading' && (
              <AuthorityExcessChoice check={excess} choice={excessChoice} onChoice={setExcessChoice} />
            )}

            {status !== 'reading' && (
              <AuthorityVatChoice check={vat} choice={vatChoice} onChoice={setVatChoice} />
            )}

            {status !== 'reading' && (
              <InvoiceVsAuthority
                label={finalInvoiceLabel(claim)}
                comparison={comparison}
                mode="authority"
                choice={authorityChoice}
                onChoice={setAuthorityChoice}
                emptyNote={comparison ? undefined : `No ${finalInvoiceLabel(claim)} has been read off a copy yet — the two are set against each other as soon as one arrives.`}
              />
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
            <Check className="w-3.5 h-3.5" /> Save the authority
          </Button>
        </div>
    </TopLevelReviewWindow>
  );
}