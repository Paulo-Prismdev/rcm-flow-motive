import React from 'react';
import { AlertTriangle, Check, Info, X, ShieldAlert } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';

export function AckRow({ title, detail, acked, onAck, onReject }) {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning-bg p-2.5">
      <p className="flex items-start gap-1.5 text-xs font-semibold text-warning-fg">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> {title}
      </p>
      <p className="mt-1 pl-5 text-xs leading-snug text-warning-fg">{detail}</p>
      <div className="mt-1.5 pl-5 flex items-center gap-3 flex-wrap">
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-warning-fg cursor-pointer">
          <input
            type="checkbox"
            checked={!!acked}
            onChange={(e) => onAck(e.target.checked)}
            className="w-3 h-3 rounded border-border"
          />
          Accept and continue
        </label>
        {onReject && (
          <button type="button" onClick={onReject} className="inline-flex items-center gap-1 text-xs font-semibold text-danger-fg hover:underline">
            <X className="w-3 h-3" /> Reject the upload
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The fail-safes, shown beside the figures: do they add up, is the invoice the
 * one we expected, is it the right invoice, and has its number been recorded
 * somewhere else. Nothing is saved until everything here is either fixed or
 * deliberately accepted.
 */
export default function InvoiceReviewChecks({
  arithmetic, workings, matchIssues, duplicate, mismatch, requiredMissing, unreviewed,
  accepted, reason, acked, onAck, onReason, onAcceptMismatch, onReject,
  nameVariations = [], remembered = [], onAcceptVariation = null,
}) {
  // Only what needs attention is shown here. The screen's verdict on the invoice is
  // the one the authority check carries, with its own checks ticked off under it —
  // this box never repeats it.
  return (
    <div className="space-y-2">
      {(requiredMissing.length > 0 || unreviewed.length > 0) && (
        <div className="rounded-lg border border-danger/30 bg-danger-bg p-2.5">
          <p className="flex items-start gap-1.5 text-xs font-semibold text-danger-fg">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> Before this can be saved
          </p>
          <ul className="mt-1 pl-5 space-y-0.5 list-disc text-xs leading-snug text-danger-fg">
            {requiredMissing.map((msg) => <li key={msg}>{msg}</li>)}
            {unreviewed.length > 0 && (
              <li>
                {unreviewed.length} figure{unreviewed.length === 1 ? '' : 's'} the AI wasn't sure about must be checked or corrected: {unreviewed.join(', ')}.
              </li>
            )}
          </ul>
        </div>
      )}

      {mismatch && (
        <div className="rounded-lg border border-warning bg-warning-bg p-2.5">
          <p className="flex items-start gap-1.5 text-xs font-semibold text-warning-fg">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> The invoice total isn't what we calculated
          </p>
          <p className="mt-1 pl-5 text-xs leading-snug text-warning-fg">
            Invoice total <span className="font-semibold">{fmtGBP(mismatch.invoiceTotal)}</span>, expected{' '}
            <span className="font-semibold">{fmtGBP(mismatch.expected.amount)}</span>
            {mismatch.expected.note ? ` (${mismatch.expected.note})` : ''} — a difference of{' '}
            {fmtGBP(Math.abs(mismatch.invoiceTotal - mismatch.expected.amount))}.
          </p>

          {accepted ? (
            <div className="mt-1.5 pl-5 space-y-1.5">
              <p className="text-xs font-semibold text-success-fg">
                Accepting the invoice figure — give a reason for the record:
              </p>
              <textarea
                value={reason}
                onChange={(e) => onReason(e.target.value)}
                rows={2}
                placeholder="e.g. invoice includes a storage charge we agreed"
                className="w-full px-2 py-1.5 rounded-md border border-border bg-card text-xs"
              />
              {!reason.trim() && <p className="text-xs text-warning-fg">A reason is needed before this can be saved.</p>}
            </div>
          ) : (
            <div className="mt-1.5 pl-5 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={onAcceptMismatch}
                className="inline-flex items-center gap-1 text-xs font-semibold text-warning-fg hover:underline"
              >
                <Check className="w-3 h-3" /> Accept the invoice figure (with a reason)
              </button>
              <button
                type="button"
                onClick={onReject}
                className="inline-flex items-center gap-1 text-xs font-semibold text-danger-fg hover:underline"
              >
                <X className="w-3 h-3" /> Reject the upload
              </button>
            </div>
          )}
        </div>
      )}

      {workings && (
        <div className="rounded-lg border border-success/30 bg-success-bg p-2.5">
          <p className="flex items-start gap-1.5 text-xs font-semibold text-success-fg">
            <Check className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> Excess and VAT checked against the claim
          </p>
          <p className="mt-1 pl-5 text-xs leading-snug text-success-fg">{workings}</p>
        </div>
      )}

      {arithmetic.map((text, i) => (
        <AckRow
          key={`arith-${i}`}
          title="The figures don't add up"
          detail={text}
          acked={acked[`arith-${i}`]}
          onAck={(v) => onAck(`arith-${i}`, v)}
        />
      ))}

      {/* A name that only differs by its branch or trading name is the same firm, not
          a wrong invoice: noted softly, and remembered on the party's own record once
          accepted so it is recognised next time without a word. */}
      {nameVariations.map((v) => (
        <div key={`${v.printed}|${v.expected}`} className="rounded-lg border border-border bg-muted/40 p-2.5">
          <p className="flex items-start gap-1.5 text-xs font-semibold text-foreground">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px text-muted-foreground" />
            Probably the same company, under another name
          </p>
          <p className="mt-1 pl-5 text-xs leading-snug text-muted-foreground">
            This invoice reads “{v.printed}”, which looks like the same firm as “{v.expected}” — a branch or
            trading name rather than a different company. Nothing needs correcting if it is.
          </p>
          {onAcceptVariation && (
            <button
              type="button"
              onClick={() => onAcceptVariation(v)}
              className="mt-1.5 ml-5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Check className="w-3 h-3" /> Yes, same company — remember “{v.printed}”
            </button>
          )}
        </div>
      ))}

      {remembered.length > 0 && (
        <div className="rounded-lg border border-success/30 bg-success-bg p-2.5">
          <p className="flex items-start gap-1.5 text-xs font-semibold text-success-fg">
            <Check className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> Name remembered
          </p>
          <p className="mt-1 pl-5 text-xs leading-snug text-success-fg">
            {remembered.join(', ')} {remembered.length === 1 ? 'is' : 'are'} now recognised as the same company on
            every invoice, without being questioned again.
          </p>
        </div>
      )}

      {matchIssues.map((text, i) => (
        <AckRow
          key={`match-${i}`}
          title="This may not be the right invoice"
          detail={text}
          acked={acked[`match-${i}`]}
          onAck={(v) => onAck(`match-${i}`, v)}
        />
      ))}

      {duplicate?.length > 0 && (
        <AckRow
          title={`Invoice ${duplicate[0].number} is already recorded on another claim`}
          detail={duplicate.map((d) => `${d.job_number || 'a claim'}${d.reg ? ` (${d.reg})` : ''}`).join(', ')}
          acked={acked.duplicate}
          onAck={(v) => onAck('duplicate', v)}
        />
      )}
    </div>
  );
}