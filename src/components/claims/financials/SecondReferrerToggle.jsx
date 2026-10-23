import React, { useEffect, useState } from 'react';
import { AlertTriangle, Pencil } from 'lucide-react';
import ReferrerCombobox from '@/components/shared/ReferrerCombobox';
import {
  buildTrackerMetaPatch,
  secondReferrerFixedFee,
  secondReferrerPercent,
} from '@/components/shared/invoiceChecklist';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { normalise } from './invoiceReview';
import FigureField from './FigureField';
import FieldEditActions from './FieldEditActions';

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

/** The main referrer picked again as the second one: by record where there is one, otherwise by name. */
function sameAsMain(claim, id, name) {
  if (id && claim?.referrer_id && id === claim.referrer_id) return true;
  const main = normalise(claim?.referrer || '');
  return !!main && !!name && normalise(name) === main;
}

/**
 * "Second referrer to pay" — the second referrer who invoices us their own share
 * of the job. The referrer is picked from the referrers list with the same
 * searchable picker the main referrer on the claim uses, and their default fee
 * loads into the figure underneath it, editable here where this job's deal
 * differs. It reads off until its pencil is clicked, and only saves on Save.
 */
export default function SecondReferrerToggle({ claim, missing = [], onTrackerChange, editingKey, setEditingKey }) {
  const tracker = claim.invoice_tracker || {};
  const enabled = tracker.second_referrer_enabled === true;
  const storedId = tracker.second_referrer_id || '';
  const storedName = tracker.second_referrer_name || '';
  const storedPercent = tracker.second_referrer_percent ?? null;
  const percent = secondReferrerPercent(claim);
  // A fixed fee agreed with them stands in for the percentage while it is set.
  const fixedFee = secondReferrerFixedFee(claim);
  const editing = editingKey === 'second_referrer';
  const feeMissing = missing.some((m) => m.key === 'second_referrer_percent');

  const [draftOn, setDraftOn] = useState(enabled);
  const [draftRef, setDraftRef] = useState(null);

  // Each time the edit step opens it starts from the saved referrer, so a
  // discarded draft can never be saved later by accident.
  useEffect(() => {
    if (!editing) return;
    setDraftOn(enabled);
    setDraftRef(storedId || storedName ? { id: storedId, name: storedName } : null);
  }, [editing]);

  const nextId = draftOn ? (draftRef?.id || '') : '';
  const nextName = draftOn ? (draftRef?.name || '') : '';
  const referrerChanged = nextId !== storedId || nextName !== storedName;
  // Picking a referrer brings their own default fee with them; a referrer with
  // none leaves the fee unset, to be asked for with the other missing figures.
  const nextPercent = !draftOn ? null
    : (referrerChanged || percent <= 0) ? num(draftRef?.default_percent_to_referrer)
      : storedPercent;
  // Their VAT status comes from their own record every time the step is saved, so
  // a referrer's VAT setting can be corrected in the directory and picked up here.
  const storedVat = tracker.second_referrer_vat_registered ?? null;
  const nextVat = draftOn ? (draftRef?.vat_registered !== false) : null;
  // A fee agreed with the referrer being replaced is not the new one's: it clears
  // with the referrer, and the card asks for theirs.
  const storedFixed = tracker.second_referrer_fee_gbp ?? null;
  const nextFixed = referrerChanged ? null : storedFixed;

  const save = () => {
    setEditingKey(null);
    if (draftOn === enabled && !referrerChanged && nextPercent === storedPercent && nextVat === storedVat) return;
    const before = enabled ? `On (${storedName || 'no referrer'})` : 'Off';
    const after = draftOn ? `On (${nextName || 'no referrer'})` : 'Off';
    const feeText = nextPercent === storedPercent ? ''
      : nextPercent === null
        ? '; second referrer fee cleared'
        : `; second referrer fee set to ${nextPercent}% from their record`;
    onTrackerChange(
      buildTrackerMetaPatch(claim, {
        second_referrer_enabled: draftOn,
        second_referrer_id: nextId,
        second_referrer_name: nextName,
        second_referrer_percent: nextPercent,
        second_referrer_vat_registered: nextVat,
        second_referrer_fee_gbp: nextFixed,
      }),
      `Second referrer to pay changed from ${before} to ${after}${feeText}${storedFixed && nextFixed === null ? '; their fixed fee cleared with the referrer change' : ''}`
    );
  };

  const conflict = (id, name) => sameAsMain(claim, id, name) && (
    <p className="flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
      <span>This is the same referrer as the main referrer on this claim.</span>
    </p>
  );

  if (editing) {
    return (
      <div className="space-y-1 rounded-md border border-border bg-muted/20 p-1.5">
        <label className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={draftOn}
            onChange={(e) => setDraftOn(e.target.checked)}
            className="w-3 h-3 rounded border-border"
          />
          Second referrer to pay
        </label>
        {draftOn && (
          <>
            <ReferrerCombobox
              value={draftRef?.name || ''}
              onChange={(ref) => setDraftRef(ref)}
              compact
            />
            {conflict(draftRef?.id, draftRef?.name)}
          </>
        )}
        <div className="flex items-center gap-1">
          <FieldEditActions onSave={save} onCancel={() => setEditingKey(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 h-6">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Second referrer to pay
        </span>
        {enabled ? (
          <span className="text-[11px] font-medium text-foreground truncate">{storedName || 'Yes'}</span>
        ) : (
          <span className="text-[11px] text-muted-foreground">No</span>
        )}
        <button
          type="button"
          onClick={() => setEditingKey('second_referrer')}
          title="Edit the second referrer"
          className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors flex-shrink-0"
        >
          <Pencil className="w-3 h-3" />
        </button>
      </div>

      {enabled && !storedId && (
        <p className="flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
          <span>
            {storedName
              ? `"${storedName}" isn't linked to a referrer — pick the right one from the list.`
              : 'Pick this referrer from the referrers list.'}
          </span>
        </p>
      )}

      {enabled && conflict(storedId, storedName)}

      {enabled && (
        <>
          <FigureField
            label={`Second Referrer Fee % — ${storedName || 'second referrer'}`}
            type="number"
            value={percent > 0 ? percent : null}
            missing={feeMissing && fixedFee <= 0}
            editing={editingKey === 'second_referrer_percent'}
            onEdit={() => setEditingKey('second_referrer_percent')}
            onDone={() => setEditingKey(null)}
            hint={fixedFee > 0
              ? `Overridden by the fixed fee of ${fmtGBP(fixedFee)}`
              : "Charged on the repair cost ex VAT, as the main referrer's is"}
            onCommit={(v) => onTrackerChange(
              buildTrackerMetaPatch(claim, { second_referrer_percent: num(v) }),
              `Second referrer fee set to ${num(v) || 0}%`
            )}
          />
          <FigureField
            label="Second Referrer Fee (£ fixed)"
            type="number"
            value={fixedFee || null}
            missing={feeMissing && percent <= 0}
            editing={editingKey === 'second_referrer_fee_gbp'}
            onEdit={() => setEditingKey('second_referrer_fee_gbp')}
            onDone={() => setEditingKey(null)}
            hint={fixedFee > 0
              ? `Fixed fee ${fmtGBP(fixedFee)} — overrides ${percent > 0 ? `${percent}%` : 'the %'}`
              : 'Optional — set instead of a %'}
            onCommit={(v) => {
              const n = num(v);
              onTrackerChange(
                buildTrackerMetaPatch(claim, { second_referrer_fee_gbp: n }),
                n === null || n === 0
                  ? 'Fixed second referrer fee cleared — the agreed % is used again'
                  : `Fixed second referrer fee set to ${fmtGBP(n)} — used ahead of the %`
              );
            }}
          />
        </>
      )}
    </div>
  );
}