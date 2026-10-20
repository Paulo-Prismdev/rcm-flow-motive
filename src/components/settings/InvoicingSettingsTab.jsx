import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { ACCOUNTS_EMAIL_CONFIG_KEY, DEFAULT_ACCOUNTS_EMAIL, formatInvoiceDay } from '@/components/shared/invoiceChecklist';
import {
  DEFAULT_QUEUE_DAYS,
  QUEUE_DAYS_CONFIG_KEY,
  TRACKING_START_CONFIG_KEY,
  countBeforeTracking,
  queueDaysConfigValue,
  readQueueDays,
  readTrackingStart,
} from '@/components/shared/invoicingQueue';

/**
 * The accounts address every "Request from accounts" email defaults to, how long
 * the Invoicing page waits before it flags an invoice as needing attention, and the
 * date tracking started — jobs older than it were invoiced in the old system and
 * are left out of the Invoicing page. All three are held in AppConfig so they can
 * be changed without touching the app's code.
 */
export default function InvoicingSettingsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: configs = [] } = useQuery({
    queryKey: ['AppConfig'],
    queryFn: () => base44.entities.AppConfig.list(),
  });

  const { data: claims = [] } = useQuery({
    queryKey: ['invoicing-claims'],
    queryFn: () => base44.entities.Claim.list('-updated_date', 2000),
  });

  const existing = configs.find((c) => c.config_key === ACCOUNTS_EMAIL_CONFIG_KEY);
  const [email, setEmail] = useState(DEFAULT_ACCOUNTS_EMAIL);
  const [isSaving, setIsSaving] = useState(false);

  const existingDays = configs.find((c) => c.config_key === QUEUE_DAYS_CONFIG_KEY);
  const [days, setDays] = useState(DEFAULT_QUEUE_DAYS);
  const [isSavingDays, setIsSavingDays] = useState(false);

  const existingStart = configs.find((c) => c.config_key === TRACKING_START_CONFIG_KEY);
  const [start, setStart] = useState('');
  const [isSavingStart, setIsSavingStart] = useState(false);

  useEffect(() => {
    setEmail(existing?.config_value || DEFAULT_ACCOUNTS_EMAIL);
  }, [existing?.config_value]);

  useEffect(() => {
    setDays(readQueueDays(configs));
  }, [existingDays?.config_value]);

  useEffect(() => {
    setStart(readTrackingStart(configs));
  }, [existingStart?.config_value]);

  // Counted from the date in the box rather than the saved one, so the figure can
  // be checked before it is committed to.
  const tracking = useMemo(() => countBeforeTracking(claims, start), [claims, start]);

  const handleSave = async () => {
    const value = email.trim();
    if (!value) {
      toast({ title: 'Enter an accounts email address', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      if (existing) {
        await base44.entities.AppConfig.update(existing.id, { config_value: value });
      } else {
        await base44.entities.AppConfig.create({ config_key: ACCOUNTS_EMAIL_CONFIG_KEY, config_value: value });
      }
      queryClient.invalidateQueries({ queryKey: ['AppConfig'] });
      toast({ title: 'Accounts email saved', description: value });
    } catch (e) {
      toast({ title: 'Could not save the accounts email', description: e?.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDays = async () => {
    const value = queueDaysConfigValue(days);
    setIsSavingDays(true);
    try {
      if (existingDays) {
        await base44.entities.AppConfig.update(existingDays.id, { config_value: value });
      } else {
        await base44.entities.AppConfig.create({ config_key: QUEUE_DAYS_CONFIG_KEY, config_value: value });
      }
      queryClient.invalidateQueries({ queryKey: ['AppConfig'] });
      toast({ title: 'Invoicing timings saved' });
    } catch (e) {
      toast({ title: 'Could not save the invoicing timings', description: e?.message, variant: 'destructive' });
    } finally {
      setIsSavingDays(false);
    }
  };

  const handleSaveStart = async () => {
    setIsSavingStart(true);
    try {
      if (!start) {
        if (existingStart) await base44.entities.AppConfig.delete(existingStart.id);
      } else if (existingStart) {
        await base44.entities.AppConfig.update(existingStart.id, { config_value: start });
      } else {
        await base44.entities.AppConfig.create({ config_key: TRACKING_START_CONFIG_KEY, config_value: start });
      }
      queryClient.invalidateQueries({ queryKey: ['AppConfig'] });
      toast({
        title: start ? 'Tracking start date saved' : 'Tracking start date cleared',
        description: start
          ? `${tracking.before} claim${tracking.before === 1 ? '' : 's'} left out of the Invoicing page`
          : 'Every claim is tracked again',
      });
    } catch (e) {
      toast({ title: 'Could not save the tracking start date', description: e?.message, variant: 'destructive' });
    } finally {
      setIsSavingStart(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Accounts Email</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            The address "Request from accounts" emails by default when you ask accounts to raise an invoice. You can still change the recipient on any single request before sending it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            type="email"
            placeholder={DEFAULT_ACCOUNTS_EMAIL}
            className="h-9 text-sm max-w-sm"
          />
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Invoicing Timings</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            How long the Invoicing page waits before it flags an invoice on today's actions list. Working days count Monday to Friday only.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Accounts request — working days</span>
            <Input
              type="number"
              min="0"
              value={days.accountsWorkingDays}
              onChange={(e) => setDays((d) => ({ ...d, accountsWorkingDays: e.target.value }))}
              className="h-9 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Close-out paperwork — days</span>
            <Input
              type="number"
              min="0"
              value={days.closeoutDays}
              onChange={(e) => setDays((d) => ({ ...d, closeoutDays: e.target.value }))}
              className="h-9 text-sm"
            />
          </label>
        </div>
        <Button onClick={handleSaveDays} disabled={isSavingDays}>
          {isSavingDays ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Invoicing Tracking Start Date</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Jobs whose vehicle went back to the customer before this date were invoiced in the old system, so they are left out of Today's actions and the aged invoices instead of swamping them. Their own Financials still work, and any single claim can be pulled back in from its Financials if money is still owed on it. A job still with us is never left out, and neither is a job with no hand-over date recorded.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="h-9 text-sm w-44"
          />
          <Button onClick={handleSaveStart} disabled={isSavingStart}>
            {isSavingStart ? 'Saving...' : 'Save'}
          </Button>
          {start && (
            <button
              type="button"
              onClick={() => setStart('')}
              className="h-9 px-3 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Clear date
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {start
            ? `${tracking.before} claim${tracking.before === 1 ? '' : 's'} fall before ${formatInvoiceDay(start)} and ${tracking.before === 1 ? 'is' : 'are'} left out of the Invoicing page.${tracking.pulledIn > 0 ? ` ${tracking.pulledIn} more ${tracking.pulledIn === 1 ? 'has' : 'have'} been pulled back in from their claim.` : ''}`
            : 'No start date set — every claim is tracked.'}
        </p>
      </div>
    </div>
  );
}