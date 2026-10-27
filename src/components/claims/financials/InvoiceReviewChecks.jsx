import React from 'react';
import { AlertTriangle, Check, X, ShieldAlert } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';

export function AckRow({ title, detail, acked, onAck, onReject }) {
  return (
    <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-2.5">
      <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> {title}
      </p>
      <p className="mt-1 pl-5 text-[11px] leading-snug text-amber-800/90 dark:text-amber-300/90">{detail}</p>
      <div className="mt-1.5 pl-5 flex items-center gap-3 flex-wrap">
        <label className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300 cursor-pointer">
          <input
            type="checkbox"
            checked={!!acked}
            onChange={(e) => onAck(e.target.checked)}
            className="w-3 h-3 rounded border-border"
          />
          Accept and continue
        </label>
        {onReject && (
          <button type="button" onClick={onReject} className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 hover:underline">
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
}) {
  // Only what needs attention is shown here. The screen's verdict on the invoice is
  // the one the authority check carries, with its own checks ticked off under it —
  // this box never repeats it.
  return (
    <div className="space-y-2">
      {(requiredMissing.length > 0 || unreviewed.length > 0) && (
        <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-2.5">
          <p className="flex items-start gap-1.5 text-[11px] font-semibold text-red-700 dark:text-red-400">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> Before this can be saved
          </p>
          <ul className="mt-1 pl-5 space-y-0.5 list-disc text-[11px] leading-snug text-red-700/90 dark:text-red-400/90">
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
        <div className="rounded-lg border border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/25 p-2.5">
          <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> The invoice total isn't what we calculated
          </p>
          <p className="mt-1 pl-5 text-[11px] leading-snug text-amber-800/90 dark:text-amber-300/90">
            Invoice total <span className="font-semibold">{fmtGBP(mismatch.invoiceTotal)}</span>, expected{' '}
            <span className="font-semibold">{fmtGBP(mismatch.expected.amount)}</span>
            {mismatch.expected.note ? ` (${mismatch.expected.note})` : ''} — a difference of{' '}
            {fmtGBP(Math.abs(mismatch.invoiceTotal - mismatch.expected.amount))}.
          </p>

          {accepted ? (
            <div className="mt-1.5 pl-5 space-y-1.5">
              <p className="text-[10px] font-semibold text-green-700 dark:text-green-400">
                Accepting the invoice figure — give a reason for the record:
              </p>
              <textarea
                value={reason}
                onChange={(e) => onReason(e.target.value)}
                rows={2}
                placeholder="e.g. invoice includes a storage charge we agreed"
                className="w-full px-2 py-1.5 rounded-md border border-border bg-card text-[11px]"
              />
              {!reason.trim() && <p className="text-[10px] text-amber-700 dark:text-amber-400">A reason is needed before this can be saved.</p>}
            </div>
          ) : (
            <div className="mt-1.5 pl-5 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={onAcceptMismatch}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 dark:text-amber-300 hover:underline"
              >
                <Check className="w-3 h-3" /> Accept the invoice figure (with a reason)
              </button>
              <button
                type="button"
                onClick={onReject}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 hover:underline"
              >
                <X className="w-3 h-3" /> Reject the upload
              </button>
            </div>
          )}
        </div>
      )}

      {workings && (
        <div className="rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-2.5">
          <p className="flex items-start gap-1.5 text-[11px] font-semibold text-green-700 dark:text-green-400">
            <Check className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> Excess and VAT checked against the claim
          </p>
          <p className="mt-1 pl-5 text-[11px] leading-snug text-green-800/90 dark:text-green-300/90">{workings}</p>
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