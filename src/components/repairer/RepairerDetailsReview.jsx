import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Inbox, Loader2 } from 'lucide-react';
import { updateAndLog } from '@/components/shared/useActivityLogger';
import { geocodeAddress } from '@/functions/geocodeAddress';
import { REPAIRER_DETAILS_FIELDS, displayValue, fieldLabel, fullAddressOf, touchesAddress } from './repairerDetailsFields';

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const order = (key) => { const i = REPAIRER_DETAILS_FIELDS.findIndex((f) => f.key === key); return i < 0 ? 999 : i; };

/**
 * What a repairer sent back through the details form, field by field against what we
 * hold. Everything is ticked; untick anything you don't want, then accept.
 */
export default function RepairerDetailsReview({ bodyshop }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pending = bodyshop?.pending_details_update;
  const changes = useMemo(() => Object.entries(pending?.changes || {}).sort(([a], [b]) => order(a) - order(b)), [pending]);
  // A changed business name may mean the answers came from a different business (a
  // link sent to the wrong repairer), so that one starts unticked.
  const [skip, setSkip] = useState(() => ('name' in (pending?.changes || {}) ? { name: true } : {}));
  const [saving, setSaving] = useState(false);
  if (!pending?.submitted_at) return null;

  const finish = async (accept) => {
    setSaving(true);
    try {
      const patch = accept ? Object.fromEntries(changes.filter(([k]) => !skip[k])) : {};
      if (touchesAddress(patch)) {
        const merged = { ...bodyshop, ...patch };
        patch.full_address = fullAddressOf(merged);
        // Keep the repairer in the right place on the map.
        try {
          const res = await geocodeAddress({ address: patch.full_address });
          const d = res?.data || res;
          if (d?.latitude && d?.longitude) { patch.latitude = d.latitude; patch.longitude = d.longitude; }
        } catch { /* the map catches up on its own */ }
      }
      await updateAndLog('Bodyshop', bodyshop.id, { ...patch, pending_details_update: null }, { before: bodyshop });
      queryClient.invalidateQueries({ queryKey: ['bodyshop-detail', bodyshop.id] });
      queryClient.invalidateQueries({ queryKey: ['repairer-directory'] });
      const n = Object.keys(patch).filter((k) => !['full_address', 'latitude', 'longitude'].includes(k)).length;
      toast({ title: accept ? (n ? `${n} detail${n === 1 ? '' : 's'} updated` : 'Marked as reviewed') : 'Dismissed' });
    } catch (e) {
      toast({ title: 'Could not save', description: e?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const by = [pending.submitted_by_name, pending.submitted_by_role].filter(Boolean).join(', ');
  const chosen = changes.filter(([k]) => !skip[k]).length;

  return (
    <div className="rounded-xl border-2 border-info/40 bg-info-bg/40 p-3 space-y-3">
      <div className="flex items-start gap-2.5">
        <Inbox className="w-5 h-5 text-info-fg flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Details sent by the repairer</p>
          <p className="text-xs text-muted-foreground">
            {by}{pending.submitted_by_email ? ` · ${pending.submitted_by_email}` : ''} · {fmt(pending.submitted_at)}
          </p>
        </div>
      </div>

      {'name' in (pending.changes || {}) && (
        <p className="rounded-lg bg-warning-bg text-warning-fg text-xs p-2.5">
          They changed the business name from <strong>{bodyshop.name}</strong> to <strong>{pending.changes.name}</strong>. Check these answers are really from this repairer before accepting — if the link went to the wrong business, dismiss them.
        </p>
      )}

      {changes.length === 0 ? (
        <p className="text-sm">They confirmed everything we hold is correct.</p>
      ) : (
        <ul className="rounded-lg border border-border bg-card divide-y divide-border">
          {changes.map(([key, value]) => {
            const before = displayValue(key, bodyshop[key]);
            const after = displayValue(key, value);
            return (
              <li key={key}>
                <label className="flex items-start gap-3 p-2.5 cursor-pointer">
                  <input type="checkbox" checked={!skip[key]} onChange={(e) => setSkip((s) => ({ ...s, [key]: !e.target.checked }))} className="mt-1 w-4 h-4 flex-shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-muted-foreground">{fieldLabel(key)}</span>
                    {before ? <span className="block text-xs text-muted-foreground line-through break-words">{before}</span> : <span className="block text-xs text-muted-foreground italic">was empty</span>}
                    <span className="block text-sm font-medium break-words whitespace-pre-line">{after || <em className="font-normal text-muted-foreground">cleared</em>}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {pending.notes && (
        <div className="text-sm"><span className="text-xs text-muted-foreground block">Their note</span><p className="whitespace-pre-line">{pending.notes}</p></div>
      )}

      <div className="flex gap-2">
        <Button type="button" className="flex-1" onClick={() => finish(true)} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {changes.length === 0 ? 'Mark as reviewed' : chosen === changes.length ? 'Accept all' : `Accept ${chosen}`}
        </Button>
        {changes.length > 0 && (
          <Button type="button" variant="outline" onClick={() => finish(false)} disabled={saving}>Dismiss</Button>
        )}
      </div>
    </div>
  );
}
