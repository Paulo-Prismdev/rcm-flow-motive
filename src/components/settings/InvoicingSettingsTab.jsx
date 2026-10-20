import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { ACCOUNTS_EMAIL_CONFIG_KEY, DEFAULT_ACCOUNTS_EMAIL } from '@/components/shared/invoiceChecklist';

/**
 * The accounts address every "Request from accounts" email defaults to. Held in
 * AppConfig so it can be changed without touching the app's code.
 */
export default function InvoicingSettingsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: configs = [] } = useQuery({
    queryKey: ['AppConfig'],
    queryFn: () => base44.entities.AppConfig.list(),
  });

  const existing = configs.find((c) => c.config_key === ACCOUNTS_EMAIL_CONFIG_KEY);
  const [email, setEmail] = useState(DEFAULT_ACCOUNTS_EMAIL);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEmail(existing?.config_value || DEFAULT_ACCOUNTS_EMAIL);
  }, [existing?.config_value]);

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
    </div>
  );
}