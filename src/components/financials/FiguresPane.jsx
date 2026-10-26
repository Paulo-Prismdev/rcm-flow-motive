import React, { useEffect, useRef } from 'react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import JobFiguresCard from '@/components/claims/financials/JobFiguresCard';
import RepairCostCheckNote from '@/components/claims/financials/RepairCostCheckNote';
import { figuresCheckedLine } from '@/components/claims/financials/figuresCheck';
import { MacPrimaryButton } from './MacButtons';
import { MacGroup, MacRow, MacValueRow } from './MacGroup';
import StatusBadge from './StatusBadge';

const valueText = (row) => {
  if (row.display) return row.display;
  if (row.value === null || row.value === undefined || row.value === '') return 'Not set';
  if (row.money) return fmtGBP(row.value);
  if (row.percent) return `${row.value}%`;
  return String(row.value);
};

const capitalise = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

/**
 * Step 2, opened: the claim's own figures as titled groups, each changed as a whole,
 * then the figures that came off a document shown against the paperwork they were
 * read from and anything that has moved since it was last checked — and the
 * confirmation at the foot of the step, which is what finishes it.
 */
export default function FiguresPane({
  claim, ctx, step, missing, storagePercentDefault, jobFiguresFocus, checkFocus,
  onChange, onTrackerChange, onConfirm, repairCostCheck, onRepairCostChecked,
  editingKey, setEditingKey,
}) {
  const confirmRef = useRef(null);
  const check = step.check;
  const changedKeys = check.changed.map((row) => row.key);
  const fromDocuments = check.rows.filter((row) => row.source || changedKeys.includes(row.key));

  // "Check the job figures" in the toolbar brings the confirmation into view.
  useEffect(() => {
    if (checkFocus?.n) confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [checkFocus?.n]);

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-6">
      <header className="space-y-1">
        <h2 className="text-[17px] font-semibold text-foreground">Step 2 · Job figures</h2>
        <p className="text-[11px] text-mac-muted">{step.hint}</p>
      </header>

      <JobFiguresCard
        claim={claim}
        ctx={ctx}
        missing={missing}
        focus={jobFiguresFocus}
        storagePercentDefault={storagePercentDefault}
        onChange={onChange}
        onTrackerChange={onTrackerChange}
        editingKey={editingKey}
        setEditingKey={setEditingKey}
      />

      <RepairCostCheckNote check={repairCostCheck} onChecked={onRepairCostChecked} />

      {fromDocuments.length > 0 && (
        <MacGroup title="Read from your documents">
          {fromDocuments.map((row) => (
            <MacValueRow
              key={row.key}
              label={row.label}
              value={valueText(row)}
              caption={row.source ? capitalise(row.source) : undefined}
              sub={changedKeys.includes(row.key) ? 'Changed since it was checked' : undefined}
            />
          ))}
        </MacGroup>
      )}

      <MacGroup title="Confirmation">
        <MacRow className="flex-wrap justify-between gap-3">
          <StatusBadge tone={check.settled ? 'done' : 'waiting'}>
            {check.settled ? figuresCheckedLine(check.record)
              : changedKeys.length > 0 ? 'Check again — a figure has moved'
                : 'The figures on this job have not been confirmed yet'}
          </StatusBadge>
          <span ref={confirmRef} className="flex items-center gap-2">
            {!check.canConfirm && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400">
                {missing.length === 1 ? '1 figure' : `${missing.length} figures`} still to set
              </span>
            )}
            <MacPrimaryButton
              onClick={onConfirm}
              disabled={!check.canConfirm}
              title={check.canConfirm ? undefined : 'Every figure has to be set before they can be confirmed'}
            >
              {check.settled ? 'Check again' : 'Confirm figures'}
            </MacPrimaryButton>
          </span>
        </MacRow>
      </MacGroup>

      {check.legacy && !check.settled && (
        <p className="px-1 text-[11px] text-mac-muted">
          This job's invoices were already on their way before the figures check existed — you are welcome to confirm
          them anyway, and nothing is held back by doing so.
        </p>
      )}
    </div>
  );
}