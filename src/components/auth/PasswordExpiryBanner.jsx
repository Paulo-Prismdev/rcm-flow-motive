import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ChangePasswordForm from '@/components/auth/ChangePasswordForm';

const DISMISS_KEY = 'pw_expiry_banner_dismissed';

function wasDismissed() {
  try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}

// A slim reminder in the last week before the password expires, with the change form
// one click away. Hidden for the rest of the session once dismissed.
export default function PasswordExpiryBanner({ daysLeft, onChanged }) {
  const [hidden, setHidden] = useState(wasDismissed);
  const [open, setOpen] = useState(false);
  if (hidden) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* storage unavailable */ }
    setHidden(true);
  };
  const when = daysLeft <= 1 ? 'tomorrow' : `in ${daysLeft} days`;

  return (
    <>
      <div role="status" className="fixed top-0 inset-x-0 z-[60] flex items-center gap-3 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100 border-b border-amber-200 dark:border-amber-900 px-4 py-2 text-sm">
        <KeyRound className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1">Your password expires {when}.</p>
        <Button type="button" size="sm" variant="outline" className="h-9" onClick={() => setOpen(true)}>Change it now</Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hide this reminder"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change your password</DialogTitle>
            <DialogDescription>Choose a new password now and the 90 days start again.</DialogDescription>
          </DialogHeader>
          <ChangePasswordForm idPrefix="early" onDone={() => { setOpen(false); setHidden(true); onChanged?.(); }} />
        </DialogContent>
      </Dialog>
    </>
  );
}
