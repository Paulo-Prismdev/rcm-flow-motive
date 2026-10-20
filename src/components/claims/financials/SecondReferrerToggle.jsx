import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { buildTrackerMetaPatch } from '@/components/shared/invoiceChecklist';

/**
 * "Second referrer to pay" as a small toggle that sits with the referrer fee
 * rather than on a row of its own, with the second referrer's name beside it
 * once it is switched on.
 */
export default function SecondReferrerToggle({ claim, onTrackerChange }) {
  const tracker = claim.invoice_tracker || {};
  const enabled = tracker.second_referrer_enabled === true;
  const [name, setName] = useState(tracker.second_referrer_name || '');

  useEffect(() => { setName(tracker.second_referrer_name || ''); }, [tracker.second_referrer_name]);

  const toggle = (on) => onTrackerChange(
    buildTrackerMetaPatch(claim, {
      second_referrer_enabled: on,
      second_referrer_name: on ? (tracker.second_referrer_name || '') : '',
    }),
    on ? 'Second referrer added to the invoicing' : 'Second referrer removed from the invoicing'
  );

  const save = () => {
    if (name === (tracker.second_referrer_name || '')) return;
    onTrackerChange(
      buildTrackerMetaPatch(claim, { second_referrer_name: name }),
      `Second referrer set to ${name || 'none'}`
    );
  };

  return (
    <div className="pt-0.5">
      <label className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => toggle(e.target.checked)}
          className="w-3 h-3 rounded border-border"
        />
        Second referrer to pay
      </label>
      {enabled && (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          placeholder="Second referrer name / company"
          className="h-7 text-xs mt-1"
        />
      )}
    </div>
  );
}