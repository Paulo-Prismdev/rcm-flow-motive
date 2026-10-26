import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { figuresCheckedLine } from './figuresCheck';

/** How one figure reads: money, a percentage, or the value as it stands. */
const valueText = (row) => {
  if (row.display) return row.display;
  if (row.value === null || row.value === undefined || row.value === '') return 'not set';
  if (row.money) return fmtGBP(row.value);
  if (row.percent) return `${row.value}%`;
  return String(row.value);
};

/**
 * The job figures as a deliberate check: everything the invoices are worked out
 * from in one list, with the figures that were read automatically off a document
 * marked as such, and the ones that have moved since the last check highlighted.
 * Nothing is invoiced off these figures until someone says they are right.
 */
export default function JobFiguresCheck({ check, onConfirm, focus }) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (focus?.n) cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focus?.n]);

  if (!check) return null;

  const { rows, changed, settled, legacy, canConfirm } = check;
  const changedKeys = changed.map((row) => row.key);
  const missingCount = Math.max(rows.length - rows.filter((row) => row.value !== null && row.value !== '').length, 0);

  const tone = settled ? 'border-green-300 dark:border-green-800 bg-green-50/60 dark:bg-green-900/10'
    : changedKeys.length > 0 ? 'border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/10'
      : 'border-border bg-card';

  return (
    <div ref={cardRef} className={`rounded-[10px] border p-2.5 space-y-2 ${tone}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job figures check</h4>
        {settled ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-semibold">
            <Check className="w-2.5 h-2.5" strokeWidth={3} /> Checked
          </span>
        ) : changedKeys.length > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
            <AlertTriangle className="w-2.5 h-2.5" strokeWidth={3} />
            {changedKeys.length === 1 ? '1 figure changed' : `${changedKeys.length} figures changed`}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
            <AlertTriangle className="w-2.5 h-2.5" strokeWidth={3} /> {legacy ? 'Not checked' : 'To check'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
        {rows.map((row) => {
          const moved = changedKeys.includes(row.key);
          return (
            <div
              key={row.key}
              className={`flex items-baseline justify-between gap-2 rounded-md px-1.5 py-1 ${moved ? 'bg-amber-100/70 dark:bg-amber-900/20' : ''}`}
            >
              <span className="text-[11px] text-muted-foreground">
                {row.label}
                {row.source && <span className="ml-1 italic text-muted-foreground/80">({row.source})</span>}
                {row.note && <span className="ml-1 text-muted-foreground/80">{row.note}</span>}
              </span>
              <span className={`flex items-baseline gap-1.5 text-xs font-semibold ${moved ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'}`}>
                {valueText(row)}
                {moved && <span className="text-[9px] font-semibold uppercase tracking-wider">changed</span>}
              </span>
            </div>
          );
        })}
      </div>

      {legacy ? (
        <p className="text-[11px] text-muted-foreground">
          Invoices have already been raised on this job, so its figures are left exactly as they are.
        </p>
      ) : settled ? (
        <p className="flex items-center gap-1.5 text-[11px] text-green-700 dark:text-green-300">
          <Check className="w-3 h-3" strokeWidth={3} /> {figuresCheckedLine(check.record)}
        </p>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground">
            {changedKeys.length > 0
              ? `Checked by ${check.checkedBy || 'someone'} before these figures moved — check the highlighted ones against the paperwork and confirm again.`
              : 'Read through each figure against the documents behind it, then confirm them. No invoice is asked for until they are confirmed.'}
          </p>
          {missingCount > 0 && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              {missingCount === 1 ? '1 figure has not been set yet.' : `${missingCount} figures have not been set yet.`}
            </p>
          )}
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="h-8 gap-1.5 text-xs"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Figures checked and correct
          </Button>
        </>
      )}
    </div>
  );
}