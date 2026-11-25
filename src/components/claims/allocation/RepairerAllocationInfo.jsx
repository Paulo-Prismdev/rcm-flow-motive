import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Check, AlertTriangle, HelpCircle, Car, Phone, Mail, Send, Briefcase, Wrench, Info } from 'lucide-react';
import { isClaimClosedForLists } from '@/components/shared/claimOutcome';
import { COUNT_LABEL, REPAIRER_FILTERS, missingDetailsCount, repairerFit } from './repairerFit';

// What a handler needs to see to place a job with a repairer, shared by the
// "Find repairer on map" window and the allocation wizard.

const STATE = {
  good: { icon: Check, cls: 'text-success-fg', chip: 'bg-success-bg text-success-fg' },
  warn: { icon: AlertTriangle, cls: 'text-warning-fg', chip: 'bg-warning-bg text-warning-fg' },
  unknown: { icon: HelpCircle, cls: 'text-muted-foreground', chip: 'bg-muted text-muted-foreground' },
  info: { icon: Info, cls: 'text-muted-foreground', chip: 'bg-muted text-muted-foreground' },
};

const tel = (v) => `tel:${String(v).replace(/\s+/g, '')}`;

export function RepairerFilterChips({ active, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show only">
      {REPAIRER_FILTERS.map((f) => {
        const on = !!active[f.key];
        return (
          <button
            key={f.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange({ ...active, [f.key]: !on })}
            className={`h-8 px-3 rounded-full border text-xs font-medium transition-colors ${on ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:bg-muted'}`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

/** A few small tags on each repairer in the list: network, courtesy cars, and any red flags for this job. */
export function RepairerRowTags({ bodyshop: b, claim, distanceMiles }) {
  const fit = repairerFit(b, claim, { distanceMiles });
  const warns = fit.filter((c) => c.state === 'warn');
  const goods = fit.filter((c) => c.state === 'good' && (c.key === 'make' || c.key === 'insurer'));
  const tags = [];
  if (b.tier) tags.push({ t: b.tier.replace(/^tier\s*/i, 'Tier '), cls: /1/.test(b.tier) ? 'bg-success-bg text-success-fg' : 'bg-muted text-foreground' });
  if (b.acg_signed_up === 'Yes') tags.push({ t: 'ACG', cls: 'bg-success-bg text-success-fg' });
  if (b.courtesy_cars_offered === 'Yes') tags.push({ t: `Courtesy ${COUNT_LABEL[b.courtesy_car_count] || ''}`.trim(), icon: Car, cls: 'bg-info-bg text-info-fg' });
  goods.forEach((c) => tags.push({ t: c.label, icon: Check, cls: 'bg-success-bg text-success-fg' }));
  warns.forEach((c) => tags.push({ t: c.key === 'courtesy' ? 'No courtesy car' : c.key === 'radius' ? 'Outside radius' : c.key === 'vehicle' ? 'Vehicle size?' : c.label, icon: AlertTriangle, cls: 'bg-warning-bg text-warning-fg' }));
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {tags.map((x, i) => (
        <span key={i} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${x.cls}`}>
          {x.icon && <x.icon className="w-3 h-3" aria-hidden="true" />}{x.t}
        </span>
      ))}
    </div>
  );
}

function useRepairerWorkload(bodyshopId) {
  return useQuery({
    queryKey: ['repairer-workload', bodyshopId],
    queryFn: async () => {
      const claims = await base44.entities.Claim.filter({ bodyshop_id: bodyshopId }, '-created_date', 300);
      const live = claims.filter((c) => !c.archived);
      const open = live.filter((c) => !isClaimClosedForLists(c));
      const last = live[0]?.bs_instructed || live[0]?.created_date || null;
      return { open: open.length, total: live.length, last };
    },
    enabled: !!bodyshopId,
    staleTime: 60 * 1000,
  });
}

function Row({ label, children }) {
  return (
    <div className="flex gap-2 py-1">
      <span className="w-28 flex-shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words font-medium">{children || <span className="font-normal text-muted-foreground">Not known</span>}</span>
    </div>
  );
}

/** Everything about the selected repairer that matters for placing this job. */
export function RepairerFitPanel({ bodyshop: b, claim, distanceMiles }) {
  const { data: work } = useRepairerWorkload(b?.id);
  if (!b) return null;
  const fit = repairerFit(b, claim, { distanceMiles });
  const missing = missingDetailsCount(b);
  const cap = (v) => (v === 'In House' ? 'In house' : v === 'Outsourced' ? 'Outsourced' : '');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
      {/* For this job */}
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="font-semibold text-sm mb-1.5">For this job</p>
        <ul className="space-y-1.5">
          {fit.map((c) => {
            const S = STATE[c.state];
            return (
              <li key={c.key} className="flex items-start gap-2">
                <S.icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${S.cls}`} aria-hidden="true" />
                <span className="min-w-0"><span className="font-medium">{c.label}: </span><span className={c.state === 'warn' ? 'text-warning-fg' : 'text-muted-foreground'}>{c.text}</span></span>
              </li>
            );
          })}
        </ul>
        {missing >= 3 && (
          <p className="mt-2 flex items-start gap-1.5 text-muted-foreground">
            <Send className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            We're missing {missing} of their key details — send them the details form from the repairer directory.
          </p>
        )}
      </div>

      {/* Capabilities & network */}
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="font-semibold text-sm mb-1 flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" aria-hidden="true" /> Capabilities</p>
        <Row label="Network">{[b.tier, b.acg_signed_up === 'Yes' ? 'ACG' : '', b.bs10125_certified === 'Yes' ? 'BS 10125' : ''].filter(Boolean).join(' · ')}</Row>
        <Row label="ADAS">{cap(b.adas)}</Row>
        <Row label="Jig">{cap(b.jig)}</Row>
        <Row label="Wheel alignment">{cap(b.wheel_alignment)}</Row>
        <Row label="Largest vehicle">{b.largest_vehicle_repairable}</Row>
        <Row label="Approvals">{[b.manufacturer_approvals, b.insurer_approvals].filter(Boolean).join(' · ')}</Row>
        <Row label="Audatex code">{b.audatex_code}</Row>
        {b.courtesy_car_notes && <Row label="Courtesy notes">{b.courtesy_car_notes}</Row>}
      </div>

      {/* Contacts & our work with them */}
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="font-semibold text-sm mb-1">Contacts</p>
        <Row label="Main contact">{b.contact_name}</Row>
        <Row label="Phone">
          {[b.phone, b.mobile_phone].filter(Boolean).map((p) => (
            <a key={p} href={tel(p)} className="text-link hover:underline inline-flex items-center gap-1 mr-2"><Phone className="w-3 h-3" />{p}</a>
          ))}
        </Row>
        <Row label="New work to">
          {(b.referral_email || b.email) && <a href={`mailto:${b.referral_email || b.email}`} className="text-link hover:underline inline-flex items-center gap-1 break-all"><Mail className="w-3 h-3 flex-shrink-0" />{b.referral_email || b.email}</a>}
        </Row>
        {b.bodyshop_manager && <Row label="Manager">{b.bodyshop_manager}</Row>}
        <div className="mt-2 pt-2 border-t border-border">
          <p className="font-semibold text-sm mb-1 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" aria-hidden="true" /> Our work with them</p>
          {work ? (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{work.open}</span> open job{work.open === 1 ? '' : 's'} now · {work.total} in total
              {work.last && <> · last placed {new Date(work.last).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
            </p>
          ) : <p className="text-muted-foreground">Loading…</p>}
        </div>
      </div>
    </div>
  );
}
