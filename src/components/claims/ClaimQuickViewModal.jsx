import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { FileText, User, Shield, Wrench, Users, Car, Calendar, Building2, Copy, Check, Phone, Mail, Star } from 'lucide-react';
import { format } from 'date-fns';
import { formatUKRegistration } from '../shared/formatRegistration';
import StatusBadge from '../shared/StatusBadge';
import ClaimStatusBadges from '../shared/ClaimStatusBadges';
import { excessLabel } from '../shared/excessState';
import { useIsMobile } from '@/hooks/use-mobile';

const formatDate = (val) => {
  if (!val) return '—';
  try { return format(new Date(val), 'dd/MM/yyyy'); } catch { return val; }
};

const formatCurrency = (val) => {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'string') return val;
  const num = Number(val);
  return isNaN(num) ? '—' : `£${num.toLocaleString()}`;
};

// Quick view: every key fact on one sheet, each with its own copy button.
// Phones: slides up from the bottom. Desktop: a panel on the right.
const InfoRow = ({ label, value, href, fullWidth }) => {
  const isEmpty = !value || value === '—';
  const [copied, setCopied] = useState(false);
  const valueRef = useRef(null);

  const handleCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const text = valueRef.current?.textContent || '';
    if (!text) return;
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => selectText(valueRef.current));
    } else {
      selectText(valueRef.current);
    }
  };

  return (
    <div data-qv-row data-qv-label={label} className={`flex items-start gap-2 py-2.5 px-3.5 border-t border-border first:border-t-0 ${fullWidth ? 'sm:col-span-2' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        {href && !isEmpty ? (
          <a href={href} ref={valueRef} data-qv-value className="block text-[15px] font-medium text-link break-words">{value}</a>
        ) : (
          <div ref={valueRef} data-qv-value className={`text-[15px] font-medium break-words ${isEmpty ? 'text-muted-foreground/60 font-normal' : 'text-foreground'} ${fullWidth ? 'whitespace-pre-wrap' : ''}`}>{value || '—'}</div>
        )}
      </div>
      {!isEmpty && (
        <button
          type="button"
          onClick={handleCopy}
          className={`shrink-0 h-8 px-2 -mr-1.5 rounded-lg flex items-center gap-1 text-xs font-medium transition-colors ${copied ? 'text-success-fg' : 'text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted'}`}
          title="Copy"
          aria-label={copied ? `${label} copied` : `Copy ${label}`}
        >
          {copied ? <><Check className="w-4 h-4" />Copied</> : <Copy className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};

// When the browser won't copy, select the text so a long-press copies it.
function selectText(el) {
  if (!el || !window.getSelection) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

const Section = ({ icon: Icon, title, children }) => (
  <section className="rounded-2xl bg-card shadow-card overflow-hidden" aria-label={title}>
    <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2">
      <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-foreground" aria-hidden="true" />
      </span>
      <h3 className="text-[15px] font-semibold">{title}</h3>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2">
      {children}
    </div>
  </section>
);

export default function ClaimQuickViewModal({ claim, isOpen, onClose }) {
  const isPhone = useIsMobile();
  const bodyRef = useRef(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const { data: bodyshop } = useQuery({
    queryKey: ['bodyshop', claim?.bodyshop_id],
    queryFn: () => base44.entities.Bodyshop.get(claim.bodyshop_id),
    enabled: isOpen && !!claim?.bodyshop_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: linkedClient } = useQuery({
    queryKey: ['client', claim?.client_id || claim?.client_name],
    queryFn: async () => {
      if (claim?.client_id) return base44.entities.Client.get(claim.client_id);
      if (claim?.client_name) {
        const results = await base44.entities.Client.filter({ name: claim.client_name });
        return results?.[0] || null;
      }
      return null;
    },
    enabled: isOpen && !!(claim?.client_id || claim?.client_name),
    staleTime: 5 * 60 * 1000,
  });

  if (!claim) return null;

  // Every filled-in field as "Label: value" lines, ready to paste.
  const copyAll = () => {
    const lines = [];
    bodyRef.current?.querySelectorAll('section').forEach((sec) => {
      const rows = [...sec.querySelectorAll('[data-qv-row]')]
        .map((r) => [r.dataset.qvLabel, r.querySelector('[data-qv-value]')?.textContent?.trim()])
        .filter(([, v]) => v && v !== '—');
      if (!rows.length) return;
      lines.push(sec.getAttribute('aria-label').toUpperCase());
      rows.forEach(([l, v]) => lines.push(`${l}: ${v}`));
      lines.push('');
    });
    const text = [`${claim.reg || ''} ${claim.job_number || ''}`.trim(), '', ...lines].join('\n').trim();
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    }).catch(() => {});
  };

  const bodyshopPhone = bodyshop?.phone || bodyshop?.mobile_phone || '';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side={isPhone ? 'bottom' : 'right'}
        className={`p-0 flex flex-col gap-0 bg-background ${isPhone ? 'h-[90dvh] rounded-t-2xl' : 'w-full sm:max-w-lg'}`}
      >
        {isPhone && <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-border flex-shrink-0" aria-hidden="true" />}
        <SheetHeader className="px-4 pt-3 pb-3 flex-shrink-0 text-left space-y-1.5 pr-14">
          <SheetTitle className="flex items-center gap-2.5 flex-wrap">
            <span className="rounded-md bg-primary text-primary-foreground px-2 py-0.5 text-[15px] font-bold tracking-wider tabular-nums">
              {claim.reg ? formatUKRegistration(claim.reg) : claim.job_number || 'Claim'}
            </span>
            <span className="text-lg font-semibold">Quick view</span>
          </SheetTitle>
          <div className="flex items-center gap-3">
            <p className="flex-1 min-w-0 text-[13px] text-muted-foreground">
              {[claim.client_name, claim.job_number, claim.journey_status || claim.job_status].filter(Boolean).join(' · ')}
            </p>
            <button
              type="button"
              onClick={copyAll}
              className={`flex-shrink-0 h-8 px-3 rounded-lg border border-border bg-card text-xs font-medium flex items-center gap-1.5 ${copiedAll ? 'text-success-fg' : ''}`}
            >
              {copiedAll ? <><Check className="w-3.5 h-3.5" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy all</>}
            </button>
          </div>
        </SheetHeader>

        <div ref={bodyRef} className="flex-1 overflow-y-auto px-3 space-y-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)' }}>
          {/* Overview */}
          <Section icon={FileText} title="Claim Overview" color="bg-primary/10 text-primary">
            <InfoRow label="Job Number" value={claim.job_number} />
            <InfoRow label="Registration" value={claim.reg ? formatUKRegistration(claim.reg) : '—'} />
            <InfoRow label="Status" value={<ClaimStatusBadges claim={claim} journeyOnly />} />
            <InfoRow label="Claim Type" value={claim.claim_type} />
            <InfoRow label="Date of Loss" value={formatDate(claim.loss_date)} />
            <InfoRow label="Time of Loss" value={claim.loss_time} />
            {claim.incident_location && <InfoRow label="Incident Location" value={claim.incident_location} fullWidth />}
            {claim.circumstances && <InfoRow label="Circumstances" value={claim.circumstances} fullWidth />}
          </Section>

          {/* Client */}
          <Section icon={User} title="Client" color="bg-info-bg text-info-fg">
            <InfoRow label="Name" value={claim.client_name} />
            <InfoRow label="Phone" value={claim.client_phone} href={claim.client_phone ? `tel:${claim.client_phone}` : null} />
            <InfoRow label="Email" value={claim.client_email} href={claim.client_email ? `mailto:${claim.client_email}` : null} />
            <InfoRow label="Business Division" value={claim.business_division} />
            {(claim.client_address_line_1 || claim.client_town || claim.client_postcode) && (
              <InfoRow label="Address" value={[claim.client_address_line_1, claim.client_address_line_2, claim.client_town, claim.client_county, claim.client_postcode].filter(Boolean).join(', ')} fullWidth />
            )}
            {(() => {
              const contacts = linkedClient?.contacts || [];
              if (contacts.length === 0) {
                const legacyName = linkedClient?.company_contact_name;
                const legacyPhone = linkedClient?.company_contact_phone;
                const legacyEmail = linkedClient?.company_contact_email;
                if (!legacyName && !legacyPhone && !legacyEmail) return null;
                return (
                  <div className="sm:col-span-2 mx-3.5 mb-3 mt-1 rounded-xl border border-border bg-muted/40 p-2.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Users className="w-3 h-3" /> Contacts at this business
                    </div>
                    <div className="rounded-md border border-border bg-card p-2">
                      {legacyName && <div className="text-sm font-medium">{legacyName}</div>}
                      <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-muted-foreground">
                        {legacyPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {legacyPhone}</span>}
                        {legacyEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {legacyEmail}</span>}
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div className="sm:col-span-2 mx-3.5 mb-3 mt-1 rounded-xl border border-border bg-muted/40 p-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Users className="w-3 h-3" /> Contacts at this business
                  </div>
                  <div className="space-y-1.5">
                    {contacts.map((c, i) => {
                      const primary = c.is_primary || (i === 0 && !contacts.some(x => x.is_primary));
                      return (
                        <div key={i} className="rounded-md border border-border bg-card p-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{c.name || '—'}</span>
                            {c.position && <span className="text-xs text-muted-foreground">· {c.position}</span>}
                            {primary && <span className="inline-flex items-center gap-0.5 text-xs text-warning-fg font-medium"><Star className="w-3 h-3 fill-amber-500 text-warning-fg" /> Primary</span>}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-muted-foreground">
                            {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                            {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </Section>

          {/* Driver */}
          {(!claim.driver_same_as_client || claim.driver_name || claim.driver_phone || claim.driver_email || claim.driver_contact_name || claim.driver_contact_phone || claim.driver_contact_email) && (
            <Section icon={User} title="Driver" color="bg-info-bg text-info-fg">
              <InfoRow label="Same as Client" value={claim.driver_same_as_client === false ? 'No' : 'Yes'} />
              <InfoRow label="Driver Name" value={claim.driver_name} />
              <InfoRow label="Driver Phone" value={claim.driver_phone} href={claim.driver_phone ? `tel:${claim.driver_phone}` : null} />
              <InfoRow label="Driver Email" value={claim.driver_email} href={claim.driver_email ? `mailto:${claim.driver_email}` : null} />
              <InfoRow label="Contact Name" value={claim.driver_contact_name} />
              <InfoRow label="Contact Phone" value={claim.driver_contact_phone} href={claim.driver_contact_phone ? `tel:${claim.driver_contact_phone}` : null} />
              <InfoRow label="Contact Email" value={claim.driver_contact_email} href={claim.driver_contact_email ? `mailto:${claim.driver_contact_email}` : null} />
              {(claim.driver_contact_address_line_1 || claim.driver_contact_town || claim.driver_contact_postcode) && (
                <InfoRow label="Contact Address" value={[claim.driver_contact_address_line_1, claim.driver_contact_address_line_2, claim.driver_contact_town, claim.driver_contact_county, claim.driver_contact_postcode].filter(Boolean).join(', ')} fullWidth />
              )}
            </Section>
          )}

          {/* Referrer */}
          {(claim.referrer || claim.referrer_ref || claim.referrer_email || claim.percent_to_referrer || claim.file_handler) && (
            <Section icon={Building2} title="Referrer" color="bg-success-bg text-link">
              <InfoRow label="Referrer" value={claim.referrer} />
              <InfoRow label="Referrer Ref" value={claim.referrer_ref} />
              <InfoRow label="Referrer Email" value={claim.referrer_email} href={claim.referrer_email ? `mailto:${claim.referrer_email}` : null} />
              <InfoRow label="% to Referrer" value={claim.percent_to_referrer != null ? `${claim.percent_to_referrer}%` : '—'} />
              <InfoRow label="File Handler" value={claim.file_handler} />
            </Section>
          )}

          {/* Insurance */}
          <Section icon={Shield} title="Client's Insurance" color="bg-warning-bg text-warning-fg">
            <InfoRow label="Insurer" value={claim.insurer} />
            <InfoRow label="Claim Reference" value={claim.claim_ref} />
            <InfoRow label="Policy Number" value={claim.policy_number} />
            <InfoRow label="Policy Excess" value={excessLabel(claim, formatCurrency) || '—'} />
            <InfoRow label="Broker" value={claim.broker_name} />
          </Section>

          {/* Repairer */}
          <Section icon={Wrench} title="Repairer / Bodyshop" color="bg-success-bg text-success-fg">
            <InfoRow label="Bodyshop" value={claim.bodyshop} />
            <InfoRow label="Bodyshop Phone" value={bodyshopPhone} href={bodyshopPhone ? `tel:${bodyshopPhone}` : null} />
            <InfoRow label="Bodyshop Email" value={claim.bodyshop_email} href={claim.bodyshop_email ? `mailto:${claim.bodyshop_email}` : null} />
            <InfoRow label="Repairer Accepted" value={claim.repairer_accepted ? `Yes (${formatDate(claim.repairer_accepted_date)})` : claim.bodyshop_id ? 'Pending' : '—'} />
            <InfoRow label="Vehicle Location" value={claim.vehicle_location} />
            <InfoRow label="Booking In Date" value={formatDate(claim.booking_in_date)} />
            <InfoRow label="ECD" value={formatDate(claim.ecd)} />
            <InfoRow label="Completion Date" value={formatDate(claim.completion_date)} />
          </Section>

          {/* Third Party */}
          {(claim.tp_name || claim.tp_reg || claim.tp_insurer || claim.tp_phone) && (
            <Section icon={Users} title="Third Party" color="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              <InfoRow label="TP Name" value={claim.tp_name} />
              <InfoRow label="TP Phone" value={claim.tp_phone} href={claim.tp_phone ? `tel:${claim.tp_phone}` : null} />
              <InfoRow label="TP Email" value={claim.tp_email} href={claim.tp_email ? `mailto:${claim.tp_email}` : null} />
              <InfoRow label="TP Driver / Contact" value={claim.tp_driver_contact} />
              <InfoRow label="TP Registration" value={claim.tp_reg} />
              <InfoRow label="TP Make / Model" value={claim.tp_make_model} />
              {(claim.tp_address_line_1 || claim.tp_town || claim.tp_postcode) && (
                <InfoRow label="TP Address" value={[claim.tp_address_line_1, claim.tp_address_line_2, claim.tp_town, claim.tp_county, claim.tp_postcode].filter(Boolean).join(', ')} fullWidth />
              )}
            </Section>
          )}

          {/* Third Party Insurance */}
          {(claim.tp_insurer || claim.tp_policy_number || claim.tp_claim_ref || claim.tp_broker_name) && (
            <Section icon={Shield} title="Third Party Insurance" color="bg-danger-bg text-danger-fg">
              <InfoRow label="TP Insurer" value={claim.tp_insurer} />
              <InfoRow label="TP Claim Reference" value={claim.tp_claim_ref} />
              <InfoRow label="TP Policy Number" value={claim.tp_policy_number} />
              <InfoRow label="TP Broker" value={claim.tp_broker_name} />
            </Section>
          )}

          {/* Vehicle */}
          <Section icon={Car} title="Vehicle" color="bg-info-bg text-info-fg">
            <InfoRow label="Make / Model" value={claim.make_model} />
            <InfoRow label="Colour" value={claim.vehicle_colour} />
            <InfoRow label="Fuel Type" value={claim.vehicle_fuel_type} />
            <InfoRow label="MOT Status" value={claim.vehicle_mot_status} />
            <InfoRow label="MOT Expiry" value={formatDate(claim.vehicle_mot_expiry_date)} />
            <InfoRow label="Tax Status" value={claim.vehicle_tax_status} />
          </Section>

          {/* Key Dates */}
          <Section icon={Calendar} title="Key Dates" color="bg-muted text-foreground">
            <InfoRow label="Date Received" value={formatDate(claim.date_received)} />
            <InfoRow label="Loss Date" value={formatDate(claim.loss_date)} />
            <InfoRow label="Authority Received" value={formatDate(claim.authority_received)} />
            <InfoRow label="BS Instructed" value={formatDate(claim.bs_instructed)} />
            <InfoRow label="Booking In" value={formatDate(claim.booking_in_date)} />
            <InfoRow label="ECD" value={formatDate(claim.ecd)} />
            <InfoRow label="Completion" value={formatDate(claim.completion_date)} />
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}