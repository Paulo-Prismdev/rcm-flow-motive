import React from 'react';
import { Lightbulb, Check, X } from 'lucide-react';

const CLAIM_TYPES = [
  'Fault Claim',
  'Non-Fault - Own Insurer',
  '3rd Party Insurer Direct',
  '3rd Party Paying Privately',
  'Credit Repair',
  'Glass Claim',
  'Paying Privately',
];

/**
 * What the reader suggests rather than states: the claim type it would give the
 * job (with the reason), and a draft damage description written from the photos.
 * Both wait to be accepted or changed — neither is a value read off the paper.
 */
export default function IntakeSuggestions({ suggestions = {}, claimType, onClaimType, damageDraft, onUseDamage, damageReplaces }) {
  const suggested = String(suggestions.claim_type || '').trim();
  const reason = String(suggestions.claim_type_reason || '').trim();
  const draft = String(damageDraft || '').trim();

  if (!suggested && !draft) return null;

  return (
    <div className="rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-900/10 p-2.5 space-y-2">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
        <Lightbulb className="w-3.5 h-3.5" /> Suggestions — not read off the instruction
      </p>

      {suggested && (
        <div className="rounded-md border border-border bg-card p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Claim type we suggest</p>
              <p className="text-sm font-semibold text-foreground">
                {suggested}
                {claimType === suggested && <span className="ml-1.5 text-[10px] font-medium text-green-600 dark:text-green-400">using this</span>}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => onClaimType(suggested)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold ${claimType === suggested ? 'bg-green-600 text-white' : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700'}`}
              >
                <Check className="w-3 h-3" /> {claimType === suggested ? 'Accepted' : 'Use this'}
              </button>
              {claimType === suggested && (
                <button type="button" onClick={() => onClaimType('')} title="Don't set a claim type" className="p-1 rounded text-muted-foreground hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          {reason && <p className="text-[11px] text-muted-foreground mt-1">{reason}</p>}
          <select
            value={claimType || ''}
            onChange={(e) => onClaimType(e.target.value)}
            className="mt-1.5 w-full h-7 text-xs rounded-md border border-input bg-card text-foreground px-2"
          >
            <option value="">No claim type set</option>
            {CLAIM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      )}

      {draft && (
        <div className="rounded-md border border-border bg-card p-2">
          <p className="text-[10px] text-muted-foreground">Draft damage description, written from the photos</p>
          <p className="text-xs text-foreground mt-0.5">{draft}</p>
          <button
            type="button"
            onClick={() => onUseDamage(draft)}
            className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Check className="w-3 h-3" /> Use this as the damage description
          </button>
          {damageReplaces && <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">This will replace the damage already written above.</p>}
        </div>
      )}
    </div>
  );
}