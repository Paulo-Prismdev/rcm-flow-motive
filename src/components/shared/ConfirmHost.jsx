import React, { useEffect, useRef, useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { registerConfirmHost } from '@/lib/dialogs';

/**
 * Shows the confirm boxes asked for with askConfirm() (src/lib/dialogs.js), one at a
 * time, in the app's own style. Mounted once in App.jsx.
 */
export default function ConfirmHost() {
  const [current, setCurrent] = useState(null);
  const queue = useRef([]);

  useEffect(() => registerConfirmHost((opts, resolve) => {
    queue.current.push({ opts, resolve });
    setCurrent((c) => c || queue.current.shift());
  }), []);

  const finish = (answer) => {
    if (!current) return;
    current.resolve(answer);
    setCurrent(queue.current.shift() || null);
  };

  const opts = current?.opts || {};
  const lines = String(opts.message || '').split('\n');

  return (
    <AlertDialog open={!!current} onOpenChange={(open) => { if (!open) finish(false); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[15px]">{opts.title || 'Are you sure?'}</AlertDialogTitle>
          {opts.message ? (
            <AlertDialogDescription asChild>
              <div className="space-y-1 text-[13px] text-muted-foreground max-h-[50vh] overflow-y-auto">
                {lines.map((line, i) => (line ? <p key={i}>{line}</p> : <div key={i} className="h-1" />))}
              </div>
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => finish(false)}>{opts.cancelLabel || 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => finish(true)}
            className={opts.destructive ? 'bg-red-600 hover:bg-red-700 text-white' : undefined}
          >
            {opts.confirmLabel || 'OK'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
