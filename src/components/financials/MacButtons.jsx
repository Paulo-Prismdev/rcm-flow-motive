import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** The one blue action of a view or a sheet. */
export function MacPrimaryButton({ className, ...props }) {
  return (
    <Button
      size="sm"
      className={cn('h-7 rounded-md bg-mac-accent px-3 text-[12px] font-medium text-white hover:brightness-110 disabled:opacity-40', className)}
      {...props}
    />
  );
}

/** A plain secondary action: no fill, no border. */
export function MacButton({ className, ...props }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-7 rounded-md px-3 text-[12px] font-normal text-foreground hover:bg-mac-window', className)}
      {...props}
    />
  );
}

/** A destructive action, in red text and nothing more. */
export function MacDangerButton({ className, ...props }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-7 rounded-md px-3 text-[12px] font-normal text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30', className)}
      {...props}
    />
  );
}