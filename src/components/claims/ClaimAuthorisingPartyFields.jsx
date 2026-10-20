import React from 'react';
import { Lock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deriveAuthorisingParty } from '../shared/authorisingParty';

const ROLE_OPTIONS = [
  { value: 'Client Insurer', label: 'Client Insurer' },
  { value: 'Third Party Insurer', label: 'Third Party Insurer' },
  { value: 'Credit Repair', label: 'Credit Repair' },
  { value: 'Third Party', label: 'Third Party (Private)' },
  { value: 'Uninsured', label: 'Client (Private)' },
];

/**
 * Authorising party override — edited on the claim edit screen.
 * Normally the role and name follow the claim type; these fields exist for
 * unusual cases and carry the same "reset to automatic" escape hatch.
 */
export default function ClaimAuthorisingPartyFields({ formData, handleChange }) {
  const role = formData.authorised_by || '';
  const name = formData.authorising_party_name || '';
  const overridden = formData.authorising_party_overridden === true;
  const derived = deriveAuthorisingParty(formData);

  // Keep the override flag in step with what's on screen: the claim is only
  // flagged as manually set when it really differs from the automatic values.
  React.useEffect(() => {
    if (!role && !overridden) return;
    const shouldOverride = !(derived.authorised_by === role && derived.authorising_party_name === name);
    if (shouldOverride !== overridden) handleChange('authorising_party_overridden', shouldOverride);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, name, derived.authorised_by, derived.authorising_party_name, overridden]);

  const resetToAuto = () => {
    handleChange('authorised_by', derived.authorised_by);
    handleChange('authorising_party_name', derived.authorising_party_name);
    handleChange('authorising_party_overridden', false);
  };

  return (
    <div className="neomorph-inset p-4 space-y-3 rounded-xl">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-200">Authorising Party</h4>
        {overridden && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-semibold">
            <Lock className="w-3 h-3" /> Manually set
          </span>
        )}
        {overridden && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); resetToAuto(); }}
            className="ml-auto gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to automatic
          </Button>
        )}
      </div>
      <p className="text-xs text-gray-500">
        Follows the claim type automatically. Change these only for unusual cases.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-2">Role</label>
          <select
            value={role}
            onChange={(e) => handleChange('authorised_by', e.target.value)}
            className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
          >
            <option value="">Not set</option>
            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Organisation / Name</label>
          <Input
            value={name}
            onChange={(e) => handleChange('authorising_party_name', e.target.value)}
            placeholder="e.g. Admiral, ABC Credit Repair, John Smith"
            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
          />
        </div>
      </div>
    </div>
  );
}