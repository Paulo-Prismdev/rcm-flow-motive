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

export default function AuthorisingPartyBanner({ claim, onUpdate, compact = false }) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(claim?.authorised_by || '');
  const [name, setName] = useState(claim?.authorising_party_name || '');

  const currentRole = claim?.authorised_by || '';
  const currentName = claim?.authorising_party_name || '';
  const claimType = claim?.claim_type || '';
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

  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        {/* Line 1 — claim type, pencil to override at the right */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-foreground">{claimType || 'No claim type'}</span>
          <button
            onClick={startEdit}
            className="-mr-1 ml-auto flex-shrink-0 p-1 rounded text-muted-foreground hover:text-foreground active:bg-foreground/5 transition-colors"
            title="Override authorising party"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Line 2 — role and name, wrapping in whole words */}
        <p className="text-[11px] leading-snug break-words">
          <span className={`font-semibold ${style.text}`}>{label}</span>
          {currentName && <span className="text-muted-foreground">: {currentName}</span>}
          {overridden && (
            <span className="ml-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[9px] font-semibold align-middle">
              <Lock className="w-2 h-2" /> Override
            </span>
          )}
          {unresolved && (
            <span className="ml-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[9px] font-semibold align-middle">
              <AlertTriangle className="w-2 h-2" /> {!currentRole ? 'No claim type' : 'Name missing'}
            </span>
          )}
        </p>

        {/* Line 3 — claim number, highlighted red when missing */}
        <p className="text-[11px] font-semibold">
          <span className={missingClaimRef ? 'inline-block px-1 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'text-foreground'}>
            {partyClaimRef ? `Claim no. ${partyClaimRef}` : 'Claim no. missing'}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-1.5 rounded-[10px] border p-2.5 flex-shrink-0 md:flex-nowrap md:items-center md:gap-3 md:p-3 ${style.bg} ${style.border}`}>
      {/* Phones: claim type on the first line, pencil at the right. Desktop: one row. */}
      <div className="flex items-center gap-2 min-w-0 md:flex-shrink-0">
        <Shield className={`w-4 h-4 flex-shrink-0 ${style.text}`} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap flex-shrink-0">Claim type</span>
        <span className="text-sm font-semibold text-foreground min-w-0">{claimType || 'Not set'}</span>
      </div>
      <span className="hidden md:inline-block w-px h-4 flex-shrink-0 bg-border order-1" />
      <button
        onClick={startEdit}
        className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors ml-auto order-2 md:order-3 md:ml-0"
        title="Override authorising party"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      {/* Second line on phones: authorising party, then its claim number */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0 w-full order-3 md:order-2 md:w-auto md:flex-1 md:flex-nowrap">
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
        <span className="hidden md:inline-block w-px h-4 flex-shrink-0 bg-border" />
        <div className={`flex items-center gap-1.5 flex-shrink-0 px-2 py-0.5 rounded-md ${missingClaimRef ? 'bg-red-100 dark:bg-red-900/30' : ''}`}>
          <FileText className={`w-3.5 h-3.5 ${missingClaimRef ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`} />
          <span className={`text-xs font-semibold whitespace-nowrap ${missingClaimRef ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
            {partyClaimRef ? `Claim no. ${partyClaimRef}` : 'Claim no. missing'}
          </span>
        </div>
      </div>
    </div>
  );
}