import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapPin, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

// Standalone On Site marker — sits at the top of the Official Updates modal.
// Tick = vehicle on site (sets on_site_date). Untick = mark off site, prompting
// a Hand Over date (hand_over_date) which is stored in Key Dates.
export default function OnSiteMarker({ claim }) {
  const queryClient = useQueryClient();
  const isOnSite = !!claim?.on_site_date && !claim?.hand_over_date;
  const handedOver = !!claim?.hand_over_date;
  const [showHandOver, setShowHandOver] = useState(false);
  const [showOnSite, setShowOnSite] = useState(false);
  const [handOverDate, setHandOverDate] = useState(claim?.hand_over_date || new Date().toISOString().split('T')[0]);
  const [onSiteDate, setOnSiteDate] = useState(claim?.on_site_date || new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['claim', claim?.id] });
    queryClient.invalidateQueries({ queryKey: ['claims'] });
  };

  const markOnSite = async () => {
    setSaving(true);
    try {
      await base44.entities.Claim.update(claim.id, {
        on_site_date: onSiteDate || today,
        hand_over_date: null,
      });
      setShowOnSite(false);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const confirmHandOver = async () => {
    setSaving(true);
    try {
      await base44.entities.Claim.update(claim.id, {
        hand_over_date: handOverDate || today,
      });
      setShowHandOver(false);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = () => {
    if (saving) return;
    if (isOnSite) {
      // Unticking a ticked (on site) marker prompts for the hand-over date.
      setShowHandOver(true);
    } else {
      // Ticking prompts for the on-site date.
      setOnSiteDate(claim?.on_site_date || new Date().toISOString().split('T')[0]);
      setShowOnSite(true);
    }
  };

  const fmtDate = (d) => {
    try { return format(new Date(d), 'dd/MM/yy'); } catch { return ''; }
  };

  const statusText = isOnSite
    ? `Marked on site${claim?.on_site_date ? ` · ${fmtDate(claim.on_site_date)}` : ''}`
    : handedOver
      ? `Handed over to customer${claim?.hand_over_date ? ` · ${fmtDate(claim.hand_over_date)}` : ''}`
      : 'Mark vehicle as on site';

  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggle}
          disabled={saving}
          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isOnSite ? 'bg-cyan-500 border-cyan-500 text-white' : 'bg-background border-border hover:border-cyan-400'
          }`}
          title={isOnSite ? 'Mark off site (hand over)' : 'Mark on site'}
        >
          {isOnSite && <Check className="w-4 h-4 stroke-[3]" />}
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className={`w-4 h-4 flex-shrink-0 ${isOnSite ? 'text-cyan-600' : 'text-muted-foreground'}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">On Site</p>
            <p className="text-xs text-muted-foreground truncate">{statusText}</p>
          </div>
        </div>
      </div>

      {showOnSite && (
        <div className="mt-3 pl-9 space-y-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">On-Site Date (Key Dates)</label>
            <Input
              type="date"
              value={onSiteDate}
              onChange={(e) => setOnSiteDate(e.target.value)}
              className="px-3 py-2 text-sm bg-background border border-border"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowOnSite(false)} disabled={saving}>Cancel</Button>
            <Button type="button" size="sm" onClick={markOnSite} disabled={saving}>{saving ? 'Saving...' : 'Mark On Site'}</Button>
          </div>
        </div>
      )}

      {showHandOver && (
        <div className="mt-3 pl-9 space-y-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Hand Over Date (Key Dates)</label>
            <Input
              type="date"
              value={handOverDate}
              onChange={(e) => setHandOverDate(e.target.value)}
              className="px-3 py-2 text-sm bg-background border border-border"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowHandOver(false)} disabled={saving}>Cancel</Button>
            <Button type="button" size="sm" onClick={confirmHandOver} disabled={saving}>{saving ? 'Saving...' : 'Confirm Hand Over'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}