import React from 'react';
import { Users } from 'lucide-react';

const listNames = (names) => (names.length <= 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

// A one-row notice when a colleague has the same claim open.
export default function ClaimPresenceBanner({ others }) {
  if (!others?.length) return null;
  const names = others.map((o) => o.name);
  const verb = names.length === 1 ? 'is' : 'are';
  return (
    <div role="status" className="flex items-start gap-2.5 rounded-xl bg-warning-bg text-warning-fg px-4 py-2.5 text-sm flex-shrink-0">
      <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0">
        <span className="font-semibold">{listNames(names)} {verb} also in this claim.</span>{' '}
        Your changes are saved field by field, but if you both edit the same field the last save wins, so agree who is updating what.
      </p>
    </div>
  );
}
