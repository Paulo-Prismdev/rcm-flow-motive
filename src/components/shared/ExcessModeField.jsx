import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { excessMode, excessPatch } from '@/components/shared/excessState';

const CHOICES = [
  { key: 'amount', label: 'Amount' },
  { key: 'waived', label: 'Waived' },
  { key: 'tbc', label: 'TBC on authority' },
];

/**
 * The policy excess as a three-way choice: a figure, Waived (nothing payable), or
 * TBC on authority. The amount box only appears under Amount. Waived is held as
 * £0 — what £0 has always meant — and TBC holds no figure at all, so it can never
 * be read as £0. Every change is passed straight up as a claim patch.
 */
export default function ExcessModeField({ claim, onChange, compact = false }) {
  const mode = excessMode(claim);
  const value = claim?.policy_excess;
  const blank = value === null || value === undefined || value === '';
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);

  // Each time the amount box opens it starts from the saved figure.
  useEffect(() => { if (editing) setDraft(blank ? '' : String(value)); }, [editing]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const zeroTyped = editing && String(draft).trim() !== '' && Number(draft) === 0;

  const saveAmount = () => {
    const text = String(draft).trim();
    const next = text === '' ? null : Number(text);
    // £0 is the Waived choice, not a figure — it is chosen, never typed.
    if (next !== null && (!Number.isFinite(next) || next <= 0)) return;
    setEditing(false);
    if (String(next ?? '') !== String(blank ? '' : value)) onChange({ policy_excess: next });
  };

  const chip = (choice) => (
    <button
      key={choice.key}
      type="button"
      onClick={() => { setEditing(false); onChange(excessPatch(choice.key, claim)); }}
      className={`rounded-full border font-semibold transition-colors ${compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[11px]'} ${
        mode === choice.key
          ? 'border-accent bg-accent/15 text-accent'
          : 'border-border bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground'}`}
    >
      {choice.label}
    </button>
  );

  const note = zeroTyped
    ? { tone: 'text-amber-600 dark:text-amber-400', text: '£0 means Waived — choose Waived.' }
    : mode === 'waived'
      ? { tone: 'text-muted-foreground', text: 'No excess payable — treated as £0.' }
      : mode === 'tbc'
        ? { tone: 'text-muted-foreground', text: 'Not known yet — the excess invoices wait for the Final Authority.' }
        : blank
          ? { tone: 'text-amber-600 dark:text-amber-400', text: 'Enter an amount, or choose Waived.' }
          : null;

  const valueLine = mode === 'amount' ? (
    editing ? (
      <Input
        ref={inputRef}
        type="number"
        step="0.01"
        inputMode="decimal"
        placeholder="0.00"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={saveAmount}
        onKeyDown={(e) => {
          if (e.key === 'Enter') saveAmount();
          if (e.key === 'Escape') setEditing(false);
        }}
        className={compact ? 'h-7 w-32 text-sm' : 'h-9 text-sm'}
      />
    ) : (
      <span className="flex items-center gap-1.5">
        <span className={`font-medium ${compact ? 'text-xs' : 'text-sm'} ${blank ? 'text-amber-500' : 'text-foreground'}`}>
          {blank ? 'Not set' : fmtGBP(Number(value))}
        </span>
        <button type="button" onClick={() => setEditing(true)} title="Edit the excess" className="p-0.5 rounded text-muted-foreground hover:text-accent">
          <Pencil className="w-3 h-3" />
        </button>
      </span>
    )
  ) : (
    <span className={`font-medium text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
      {mode === 'waived' ? 'Waived' : 'TBC on authority'}
    </span>
  );

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <div className="flex items-center gap-1 flex-wrap">{CHOICES.map(chip)}</div>
      <div className={`flex items-center gap-1.5 rounded-md border px-2 ${editing ? 'border-transparent px-0' : mode === 'amount' && blank ? 'border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/10' : 'border-border bg-muted/30'} ${compact ? 'min-h-7 py-0.5' : 'min-h-9 py-1'}`}>
        {valueLine}
        {mode === 'amount' && blank && !editing && <AlertTriangle className="w-3 h-3 flex-shrink-0 text-amber-500" />}
      </div>
      {note && <p className={`text-[10px] ${note.tone}`}>{note.text}</p>}
    </div>
  );
}