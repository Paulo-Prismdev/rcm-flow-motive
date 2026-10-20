import React, { useState } from 'react';
import { Shield, Pencil, AlertTriangle, Check, X, Lock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AUTHORISING_PARTY_LABELS,
  AUTHORISING_PARTY_STYLES,
  deriveAuthorisingParty,
  isAuthorisingPartyUnresolved,
  authorisingPartyClaimRef,
} from '../shared/authorisingParty';

const ROLE_OPTIONS = [
  { value: 'Client Insurer', label: 'Client Insurer' },
  { value: 'Third Party Insurer', label: 'Third Party Insurer' },
  { value: 'Credit Repair', label: 'Credit Repair' },
  { value: 'Third Party', label: 'Third Party (Private)' },
  { value: 'Uninsured', label: 'Client (Private)' },
];

export default function AuthorisingPartyBanner({ claim, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(claim?.authorised_by || '');
  const [name, setName] = useState(claim?.authorising_party_name || '');

  const currentRole = claim?.authorised_by || '';
  const currentName = claim?.authorising_party_name || '';
  const overridden = claim?.authorising_party_overridden === true;
  const unresolved = isAuthorisingPartyUnresolved(claim);
  const partyClaimRef = authorisingPartyClaimRef(currentRole, claim);
  const missingClaimRef = !partyClaimRef;
  const style = AUTHORISING_PARTY_STYLES[currentRole] || AUTHORISING_PARTY_STYLES['Uninsured'];
  const label = AUTHORISING_PARTY_LABELS[currentRole] || currentRole || 'Not set';

  const startEdit = () => {
    setRole(currentRole);
    setName(currentName);
    setEditing(true);
  };

  const save = () => {
    const isCustom =
      role !== currentRole ||
      name !== currentName;
    // If the manual values differ from what auto-derivation would produce, mark as overridden
    const derived = deriveAuthorisingParty({ ...claim, authorised_by: role, authorising_party_name: name });
    const wouldDerive = derived.authorised_by === role && derived.authorising_party_name === name;
    onUpdate({
      authorised_by: role,
      authorising_party_name: name,
      authorising_party_overridden: isCustom && !wouldDerive,
    });
    setEditing(false);
  };

  const resetToAuto = () => {
    const derived = deriveAuthorisingParty(claim);
    onUpdate({
      authorised_by: derived.authorised_by,
      authorising_party_name: derived.authorising_party_name,
      authorising_party_overridden: false,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={`rounded-[10px] border p-3 flex-shrink-0 ${style.bg} ${style.border}`}>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Authorising Party — Override</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full input"
            >
              <option value="">—</option>
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Organisation / Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Admiral, ABC Credit Repair, John Smith"
              className="w-full input"
            />
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <Button size="sm" onClick={save} className="gap-1.5"><Check className="w-3.5 h-3.5" /> Save</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}><X className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
        {overridden && (
          <button onClick={resetToAuto} className="mt-2 text-[11px] text-blue-600 hover:underline">
            Reset to auto-derived value
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-1.5 rounded-[10px] border p-2.5 flex-shrink-0 md:flex-nowrap md:items-center md:gap-3 md:p-3 ${style.bg} ${style.border}`}>
      {/* Phones: label on its own line, pencil at the right. Desktop: one row. */}
      <div className="flex items-center gap-2 min-w-0 md:flex-shrink-0">
        <Shield className={`w-4 h-4 flex-shrink-0 ${style.text}`} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Authorising Party</span>
      </div>
      <button
        onClick={startEdit}
        className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors ml-auto order-2 md:order-3 md:ml-0"
        title="Override authorising party"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      {/* Second line on phones: claim reference, then the role and name */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0 w-full order-3 md:order-2 md:w-auto md:flex-1 md:flex-nowrap">
        <div className={`flex items-center gap-1.5 flex-shrink-0 px-2 py-0.5 rounded-md ${missingClaimRef ? 'bg-red-100 dark:bg-red-900/30' : ''}`}>
          <FileText className={`w-3.5 h-3.5 ${missingClaimRef ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`} />
          <span className={`text-xs font-semibold ${missingClaimRef ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
            {partyClaimRef || 'No Claim Ref'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 md:flex-1 md:flex-nowrap">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
          <span className={`text-sm font-semibold min-w-0 md:truncate ${style.text}`}>
            {label}
            {currentName && <span className="font-normal text-muted-foreground">: {currentName}</span>}
          </span>
          {overridden && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-semibold flex-shrink-0">
              <Lock className="w-2.5 h-2.5" /> Override
            </span>
          )}
          {unresolved && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[10px] font-semibold flex-shrink-0">
              <AlertTriangle className="w-2.5 h-2.5" /> {!currentRole ? 'No claim type' : 'Name missing'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}