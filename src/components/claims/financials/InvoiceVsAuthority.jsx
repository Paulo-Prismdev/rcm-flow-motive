import React from 'react';
import { AlertTriangle, Check, Hourglass, Mail, X } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { authorityWorkings } from './invoiceAuthorityCheck';
import CustomerShareLines from './CustomerShareLines';

/**
 * The repairer's Final Insurer Invoice set against the part of the authorised repair
 * the insurer is actually billed: the authorised amount ex VAT, plus VAT only where
 * the customer is not VAT registered, less the customer's excess and any contribution
 * they are responsible for. The rest — the customer's own VAT, excess and
 * contributions — is what the customer pays the repairer themselves, and the two
 * together are the whole repair, which is what the claim's final repair cost has to
 * be: every fee and invoice worked out from it is worked out from the whole repair,
 * not the insurer's share of it.
 *
 * One verdict is shown, the most serious of the checks, with each check beneath it
 * carrying a tick or a cross. On an invoice that splits the repair between its payers
 * that is the insurer's share, the customer's share, the full total against the
 * authorised amount, and the two shares against the invoice's own total — so the
 * screen can never say the invoice agrees and that it can't be saved at the same
 * time. Where the invoice prints one amount only there is one check, as there always
 * was, and the customer's share of the repair is shown underneath it.
 *
 * Within the rounding tolerance the two agree; under the expected figure the user
 * chooses whether the invoice stands or the repairer is asked to re-invoice; over it
 * — or over the authorised total on a split invoice — the invoice can never be saved,
 * because a repairer can't invoice more than was authorised.
 *
 * The same comparison is shown whichever of the documents was uploaded second —
 * `mode` only says which one this screen is about.
 */
export default function InvoiceVsAuthority({
  comparison, mode = 'invoice', choice, onChoice, onReinvoiceEmail, emptyNote,
  label = 'Final Insurer Invoice',
}) {
  if (!comparison) {
    return emptyNote ? (
      <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2">
        <p className="text-[11px] text-muted-foreground">{emptyNote}</p>
      </div>
    ) : null;
  }

  const { status, expected, insurerPart, difference, checks = [], headline, split } = comparison;

  // The customer's excess is still TBC, so their share of the repair — and so the
  // insurer's share — can't be worked out yet.
  if (status === 'waiting') {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
        <Hourglass className="mt-px h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        <p className="text-[11px] leading-snug text-muted-foreground">{headline?.text}</p>
      </div>
    );
  }

  const tone = headline?.tone || (status === 'match' ? 'ok' : status === 'over' ? 'block' : 'warn');
  const BOX = {
    ok: 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
    warn: 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/25',
    block: 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
  };
  const TEXT = {
    ok: 'text-green-700 dark:text-green-400',
    warn: 'text-amber-800 dark:text-amber-300',
    block: 'text-red-700 dark:text-red-400',
  };
  const boxClass = BOX[tone] || BOX.warn;
  const textClass = TEXT[tone] || TEXT.warn;
  const ok = tone === 'ok';

  // An invoice over the authorised total is refused for a different reason from one
  // that has billed the insurer too much, and it is not put right by re-invoicing to
  // the insurer's share.
  const overReason = comparison.overReason;
  const modeLine = status === 'over'
    ? mode === 'invoice'
      ? `This can't be saved as the ${label}. Reject it and ask the repairer for a corrected invoice.`
      : `The ${label} already on file is flagged on this claim until a corrected copy at the expected amount arrives.`
    : '';

  const optionClass = (selected) => `w-full flex items-start gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] font-semibold transition-colors ${selected
    ? 'border-amber-500 bg-amber-100/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200'
    : 'border-amber-300 dark:border-amber-700 bg-white/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 hover:border-amber-400'}`;

  return (
    <div className={`space-y-2 rounded-lg border px-2.5 py-2 ${boxClass}`}>
      <p className={`flex items-start gap-2 text-[11px] font-semibold ${textClass}`}>
        <span className={`mt-px flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${ok ? 'bg-green-500' : ''}`}>
          {ok
            ? <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            : <AlertTriangle className="w-3.5 h-3.5" />}
        </span>
        <span>
          {split ? headline.text : (status === 'match'
            ? <>{authorityWorkings(comparison)} — the invoice total of {fmtGBP(insurerPart)} matches.</>
            : <>{authorityWorkings(comparison)}. The invoice total of {fmtGBP(insurerPart)} is {fmtGBP(Math.abs(difference))} {status === 'over' ? 'over' : 'under'} that.</>)}
        </span>
      </p>

      {checks.length > 0 && (
        <ul className="space-y-1 pl-6">
          {checks.map((c) => (
            <li key={c.key} className="flex items-start gap-1.5 text-[11px] leading-snug">
              <span className={`mt-px flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full ${c.ok ? 'bg-green-500' : 'bg-red-500'}`}>
                {c.ok
                  ? <Check className="w-2 h-2 text-white" strokeWidth={3} />
                  : <X className="w-2 h-2 text-white" strokeWidth={3} />}
              </span>
              <span className={c.ok ? 'text-muted-foreground' : textClass}>
                <span className="font-semibold">{c.label}</span> — {c.detail}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!split && (
        <CustomerShareLines
          comparison={comparison}
          tone={ok ? 'match' : status === 'over' ? 'over' : 'under'}
          className="pl-6"
        />
      )}

      {status === 'over' && (
        <div className="space-y-1.5 pl-6">
          <p className={`text-[11px] leading-snug ${textClass}`}>{modeLine}</p>
          {onReinvoiceEmail && overReason !== 'total' && (
            <button
              type="button"
              onClick={() => onReinvoiceEmail(comparison)}
              className={`inline-flex items-center gap-1 text-[10px] font-semibold hover:underline ${textClass}`}
            >
              <Mail className="w-3 h-3" />
              {mode === 'invoice' ? 'Reject it and email the repairer for a corrected invoice' : 'Email the repairer for a corrected invoice'}
            </button>
          )}
        </div>
      )}

      {/* Under the expected figure: the invoice stands as it is, or the repairer is
          asked to invoice the insurer's full share of what was authorised. */}
      {status === 'under' && (
        <div className="space-y-1.5 pl-6">
          <button type="button" onClick={() => onChoice('accept')} className={optionClass(choice === 'accept')}>
            <Check className="w-3 h-3 flex-shrink-0 mt-px" />
            <span>
              {split ? 'Accept the invoice as it stands' : "Accept the invoice total and the customer's share"}
              <span className="block font-normal">
                {split
                  ? `The invoice's own full total of ${fmtGBP(comparison.fullCost)} — its two halves together — becomes the claim's final repair cost.`
                  : `${fmtGBP(comparison.fullCost)} becomes the claim's final repair cost — the whole repair, not the insurer's part of it.`}
              </span>
            </span>
          </button>

          <button type="button" onClick={() => onChoice('reinvoice')} className={optionClass(choice === 'reinvoice')}>
            <Mail className="w-3 h-3 flex-shrink-0 mt-px" />
            <span>
              Ask the repairer to re-invoice to the expected {fmtGBP(expected)}
              <span className="block font-normal">
                The {label} is left amber until a corrected invoice at {fmtGBP(expected)} is uploaded, with a pre-filled
                email to the repairer.
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}