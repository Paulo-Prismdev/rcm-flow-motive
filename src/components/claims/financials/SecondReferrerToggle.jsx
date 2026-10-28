import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import ReferrerCombobox from '@/components/shared/ReferrerCombobox';
import {
  buildTrackerMetaPatch,
  secondReferrerFixedFee,
  secondReferrerPercent,
} from '@/components/shared/invoiceChecklist';
import { NO_FEE_DISPLAY, NO_FEE_LABEL, feeState } from '@/components/shared/feeState';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import FigureRow from '@/components/financials/FigureRow';
import { MacButton, MacPrimaryButton } from '@/components/financials/MacButtons';
import { MacGroup, MacRow } from '@/components/financials/MacGroup';
import { normalise } from './invoiceReview';

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
const FIELD = 'h-8 rounded-md border border-mac-line bg-mac-group px-2 text-[13px] tabular-nums text-foreground';

/** The main referrer picked again as the second one: by record where there is one, otherwise by name. */
function sameAsMain(claim, id, name) {
  if (id && claim?.referrer_id && id === claim.referrer_id) return true;
  const main = normalise(claim?.referrer || '');
  return !!main && !!name && normalise(name) === main;
}

/**
 * "Second referrer" — the second referrer who invoices us their own share of the job,
 * under a group of its own: who they are in the heading, their fee in the row, and a
 * small link to add one where the job has none. The referrer is picked from the
 * referrers list with the same searchable picker the main referrer uses, and their
 * default fee loads into the row. Everything is saved together, on one Save.
 */
export default function SecondReferrerToggle({ claim, missing = [], onTrackerChange, editingKey, setEditingKey }) {
  const tracker = claim.invoice_tracker || {};
  const enabled = tracker.second_referrer_enabled === true;
  const storedId = tracker.second_referrer_id || '';
  const storedName = tracker.second_referrer_name || '';
  const storedPercent = tracker.second_referrer_percent ?? null;
  const storedFixed = tracker.second_referrer_fee_gbp ?? null;
  // Their VAT status comes from their own record every time the step is saved, so a
  // referrer's VAT setting can be corrected in the directory and picked up here.
  const storedVat = tracker.second_referrer_vat_registered ?? null;
  const percent = secondReferrerPercent(claim);
  const fixedFee = secondReferrerFixedFee(claim);
  const editing = editingKey === 'second_referrer';
  const feeMissing = missing.some((m) => m.key === 'second_referrer_percent');
  // No fee on this job: their invoice is not applicable, exactly as the main
  // referrer's is when their fee is waived.
  const waived = feeState(claim, 'second_referrer') === 'none';

  const [draftOn, setDraftOn] = useState(enabled);
  const [draftRef, setDraftRef] = useState(null);
  const [draftPercent, setDraftPercent] = useState(null);
  const [draftFixed, setDraftFixed] = useState(null);
  const [draftNoFee, setDraftNoFee] = useState(false);
  const [feeForm, setFeeForm] = useState(null);

  // Each time the edit step opens it starts from the saved referrer, so a discarded
  // draft can never be saved later by accident.
  useEffect(() => {
    if (!editing) return;
    setDraftOn(enabled);
    setDraftRef(storedId || storedName ? { id: storedId, name: storedName } : null);
    setDraftPercent(storedPercent);
    setDraftFixed(storedFixed);
    setDraftNoFee(waived);
  }, [editing]);

  const referrerChanged = (draftRef?.id || '') !== storedId || (draftRef?.name || '') !== storedName;

  // Picking a referrer brings their own default fee with them; a fee agreed with the
  // referrer being replaced clears with them.
  const pickReferrer = (ref) => {
    setDraftRef(ref);
    const changed = (ref?.id || '') !== storedId || (ref?.name || '') !== storedName;
    if (changed) {
      setDraftPercent(num(ref?.default_percent_to_referrer));
      setDraftFixed(null);
    }
  };

  const save = () => {
    setEditingKey(null);
    const nextPercent = draftOn ? (draftNoFee ? 0 : num(draftPercent)) : null;
    const nextFixed = draftOn ? (draftNoFee ? null : num(draftFixed)) : null;
    const nextVat = draftOn ? (draftRef?.vat_registered !== false) : null;
    const nextId = draftOn ? (draftRef?.id || '') : '';
    const nextName = draftOn ? (draftRef?.name || '') : '';
    if (draftOn === enabled && !referrerChanged && nextPercent === storedPercent
      && nextFixed === storedFixed && nextVat === storedVat) return;

    const before = enabled ? `On (${storedName || 'no referrer'})` : 'Off';
    const after = draftOn ? `On (${nextName || 'no referrer'})` : 'Off';
    const feeText = draftOn && draftNoFee
      ? (nextPercent === storedPercent && nextFixed === storedFixed ? '' : '; no fee on this job')
      : nextPercent !== storedPercent
        ? nextPercent === null ? '; second referrer fee cleared' : `; second referrer fee set to ${nextPercent}%`
        : nextFixed !== storedFixed
          ? nextFixed === null ? '; their fixed fee cleared' : `; their fixed fee set to ${fmtGBP(nextFixed)}`
          : '';

    onTrackerChange(
      buildTrackerMetaPatch(claim, {
        second_referrer_enabled: draftOn,
        second_referrer_id: nextId,
        second_referrer_name: nextName,
        second_referrer_percent: nextPercent,
        second_referrer_vat_registered: nextVat,
        second_referrer_fee_gbp: nextFixed,
      }),
      `Second referrer to pay changed from ${before} to ${after}${feeText}`
    );
  };

  const warns = (id, name) => sameAsMain(claim, id, name) && (
    <p className="flex items-start gap-1.5 px-1 text-[11px] text-amber-600 dark:text-amber-400">
      <AlertTriangle className="mt-px h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.8} />
      <span>This is the same referrer as the main referrer on this claim.</span>
    </p>
  );

  const showsFixed = (feeForm ?? (fixedFee > 0 ? 'fixed' : 'percent')) === 'fixed';
  const feeRow = waived ? {
    key: 'second_referrer_percent',
    label: 'Fee',
    editable: false,
    display: NO_FEE_DISPLAY,
    caption: 'No fee on this job — no invoice to collect from them',
    link: { label: 'Add a fee', onClick: () => { setFeeForm('percent'); setEditingKey('second_referrer'); } },
  } : showsFixed ? {
    key: 'second_referrer_fee_gbp',
    label: 'Fee',
    editable: false,
    display: fixedFee > 0 ? fmtGBP(fixedFee) : undefined,
    caption: percent > 0 ? `Fixed fee, used instead of the agreed ${percent}%` : 'A fixed fee agreed with them for this job',
    missing: feeMissing && percent <= 0,
    link: { label: 'Use the % instead', onClick: () => { setFeeForm('percent'); setEditingKey('second_referrer'); } },
  } : {
    key: 'second_referrer_percent',
    label: 'Fee',
    editable: false,
    display: percent > 0 ? `${percent}%` : undefined,
    caption: "Charged on the repair cost ex VAT, as the main referrer's is",
    missing: feeMissing && fixedFee <= 0,
    link: { label: 'Add a fixed fee', onClick: () => { setFeeForm('fixed'); setEditingKey('second_referrer'); } },
  };

  return (
    <div onKeyDown={(event) => { if (editing && event.key === 'Escape') setEditingKey(null); }}>
      <MacGroup
        title={enabled ? `Second referrer – ${storedName || 'not linked'}` : 'Second referrer'}
        action={editing ? (
          <span className="flex items-center gap-1">
            <MacButton onClick={() => setEditingKey(null)} className="h-6 px-2 text-[11px]">Cancel</MacButton>
            <MacPrimaryButton onClick={save} className="h-6 px-2 text-[11px]">Save</MacPrimaryButton>
          </span>
        ) : (
          <MacButton onClick={() => setEditingKey('second_referrer')} className="h-6 px-2 text-[11px]">Edit</MacButton>
        )}
        footer={!editing && enabled && (!storedId || sameAsMain(claim, storedId, storedName))
          ? (
            <>
              {!storedId && (
                <p className="flex items-start gap-1.5 px-1 text-[11px] text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.8} />
                  <span>
                    {storedName
                      ? `"${storedName}" isn't linked to a referrer — pick the right one from the list.`
                      : 'Pick this referrer from the referrers list.'}
                  </span>
                </p>
              )}
              {warns(storedId, storedName)}
            </>
          )
          : null}
      >
        {editing ? (
          <MacRow className="flex-col items-stretch gap-2.5 py-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-foreground">
              <input
                type="checkbox"
                checked={draftOn}
                onChange={(e) => setDraftOn(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-mac-line"
              />
              A second referrer is paid on this job
            </label>

            {draftOn && (
              <>
                <ReferrerCombobox value={draftRef?.name || ''} onChange={pickReferrer} compact />
                {warns(draftRef?.id, draftRef?.name)}
                <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-foreground">
                  <input
                    type="checkbox"
                    checked={draftNoFee}
                    onChange={(e) => setDraftNoFee(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-mac-line"
                  />
                  {NO_FEE_LABEL}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-[13px] text-foreground">
                    Fee %
                    <input
                      value={draftNoFee ? '' : (draftPercent ?? '')}
                      onChange={(e) => { setDraftNoFee(false); setDraftPercent(e.target.value); }}
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      className={`${FIELD} w-24 text-right`}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-[13px] text-foreground">
                    or a fixed fee
                    <input
                      value={draftNoFee ? '' : (draftFixed ?? '')}
                      onChange={(e) => { setDraftNoFee(false); setDraftFixed(e.target.value); }}
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      className={`${FIELD} w-28 text-right`}
                    />
                  </label>
                </div>
              </>
            )}
          </MacRow>
        ) : enabled ? (
          <FigureRow {...feeRow} />
        ) : (
          <FigureRow
            label="A second referrer is paid on this job"
            editable={false}
            display="No"
            link={{ label: 'Add a second referrer', onClick: () => setEditingKey('second_referrer') }}
          />
        )}
      </MacGroup>
    </div>
  );
}