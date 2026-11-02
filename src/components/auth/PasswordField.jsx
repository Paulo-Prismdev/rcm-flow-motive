import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// A password box with a show/hide button, its own label and an error shown beneath it.
// `aside` sits on the label's right, for a "Forgot password?" link.
export default function PasswordField({ id, label, value, onChange, autoComplete, autoFocus, error, aside, hint, placeholder = '••••••••', disabled }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {aside}
      </div>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <Input
          id={id}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          autoCapitalize="none"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn('h-12 pl-10 pr-12 bg-white text-gray-900 dark:bg-[#2c2c2e] dark:text-gray-100', error && 'border-red-500 focus-visible:ring-red-500')}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {shown ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1.5 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />{error}
        </p>
      )}
    </div>
  );
}
