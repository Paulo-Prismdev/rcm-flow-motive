import React from 'react';
import { AlertTriangle, Ban, Check, Clock, Hourglass, Paperclip, PoundSterling } from 'lucide-react';
import { INVOICE_STATUS_META } from '@/components/shared/invoiceChecklist';
import { TRACKER_TONES } from '../trackerTones';

const GLYPHS = {
  positive: <Check className="w-3 h-3" strokeWidth={3} />,
  warning: <AlertTriangle className="w-3 h-3" />,
  negative: <AlertTriangle className="w-3 h-3" />,
  neutral: <Clock className="w-3 h-3" />,
  faded: <Ban className="w-3 h-3" />,
};

/** The first few names, so a long list still reads as one line. */
const shortList = (labels) => (labels.length <= 3
  ? labels.join(', ')
  : `${labels.slice(0, 3).join(', ')} and ${labels.length - 3} more`);

/**
 * Where the job stands, in one line at the top of Financials: the overall status
 * ("Paid" once every applicable invoice is attached and paid) and, while there is
 * still work, the step the job is on — so its position is visible without
 * scrolling. Nothing is worked out here: the status and the step both come from
 * the invoices themselves, and whatever is still missing is named beside them.
 */
export default function FinancialStatusLine({ status, currentStep, stepCount, missing = [], copies = [], payments = [] }) {
  const meta = INVOICE_STATUS_META[status] || INVOICE_STATUS_META['Ready to Invoice'];
  const tone = TRACKER_TONES[meta.tone] || TRACKER_TONES.neutral;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[10px] border border-border bg-card px-3 py-2">
      <div className={`inline-flex items-center gap-1.5 rounded-lg border border-l-4 px-2.5 py-1 ${tone.card}`}>
        <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${tone.iconWrap}`}>
          {GLYPHS[meta.tone] || GLYPHS.neutral}
        </span>
        <span className="text-xs font-semibold text-foreground whitespace-nowrap">{meta.label}</span>
      </div>

      {currentStep && (
        <p className="text-xs text-muted-foreground">
          Step {currentStep.n} of {stepCount} ·{' '}
          <span className="font-semibold text-foreground">{currentStep.title}</span>
        </p>
      )}

      {missing.length > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
          <Hourglass className="w-3.5 h-3.5 flex-shrink-0" />
          Needs {missing.map((m) => m.label).join(', ')} before every invoice can be raised.
        </p>
      )}

      {copies.length > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
          <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
          Copy still needed: {shortList(copies)}
        </p>
      )}

      {payments.length > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
          <PoundSterling className="w-3.5 h-3.5 flex-shrink-0" />
          Still to pay: {shortList(payments)}
        </p>
      )}
    </div>
  );
}