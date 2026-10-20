import React from 'react';
import { Lock } from 'lucide-react';
import {
  AUTHORISING_PARTY_LABELS,
  AUTHORISING_PARTY_STYLES,
  authorisingPartyClaimRef,
} from '../shared/authorisingParty';

const MISSING_REF_STYLE = 'inline-block px-1 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';

const OverrideBadge = () => (
  <span className="ml-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[9px] font-semibold align-middle">
    <Lock className="w-2 h-2" /> Override
  </span>
);

/**
 * Display-only summary of who the job is for and who pays.
 * The override lives on the claim edit screen (Authorising Party fields).
 *
 * compact → three tight lines for the phone claim header.
 */
export default function AuthorisingPartyBanner({ claim, compact = false }) {
  const claimType = claim?.claim_type || '';
  const currentRole = claim?.authorised_by || '';
  const currentName = claim?.authorising_party_name || '';
  const overridden = claim?.authorising_party_overridden === true;
  const partyClaimRef = authorisingPartyClaimRef(currentRole, claim);
  const style = AUTHORISING_PARTY_STYLES[currentRole] || AUTHORISING_PARTY_STYLES['Uninsured'];
  const label = AUTHORISING_PARTY_LABELS[currentRole] || currentRole;
  const partyLine = [label, currentName].filter(Boolean).join(' · ') || 'Not set';

  const claimTypePart = (
    <>
      <span className="text-muted-foreground">Claim type: </span>
      <span className="text-foreground">{claimType || 'Not set'}</span>
    </>
  );

  const partyPart = (
    <>
      <span className="text-muted-foreground">Authorising party: </span>
      <span className="text-foreground">{partyLine}</span>
      {overridden && <OverrideBadge />}
    </>
  );

  const refPart = (
    <>
      <span className="text-muted-foreground">Claim no.: </span>
      <span className={partyClaimRef ? 'text-foreground' : MISSING_REF_STYLE}>
        {partyClaimRef || 'Missing'}
      </span>
    </>
  );

  // Phones: three uniform lines, one item each.
  if (compact) {
    return (
      <div className="flex flex-col text-[11px] leading-snug">
        <p className="break-words">{claimTypePart}</p>
        <p className="break-words">{partyPart}</p>
        <p className="break-words">{refPart}</p>
      </div>
    );
  }

  // Desktop: the same three items on one row.
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] border p-2.5 flex-shrink-0 text-xs md:flex-nowrap md:p-3 ${style.bg} ${style.border}`}>
      <span className="break-words">{claimTypePart}</span>
      <span className="hidden md:inline-block w-px h-4 flex-shrink-0 bg-border" />
      <span className="break-words">{partyPart}</span>
      <span className="hidden md:inline-block w-px h-4 flex-shrink-0 bg-border" />
      <span className="break-words">{refPart}</span>
    </div>
  );
}