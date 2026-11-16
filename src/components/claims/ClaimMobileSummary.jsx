import React from 'react';
import { format } from 'date-fns';
import {
  ChevronLeft, ChevronRight, MoreHorizontal, MessageSquare, Phone, Image, FileText, Clock,
  Mail, ListTodo, Timer, History, Package, Download, Archive, Trash2, Calculator, Copy, NotebookPen,
} from 'lucide-react';
import { clientJourney } from '../shared/clientJourney';
import { getClaimOutcome } from '../shared/claimOutcome';
import { computeUpdateStatusFlag, computeClientCommStatusFlag } from '../shared/claimStatusUpdate';
import { AUTHORISING_PARTY_LABELS, authorisingPartyClaimRef } from '../shared/authorisingParty';
import { telHref, whatsappHref } from '@/lib/contactLinks';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Phone claim screens (desktop keeps its own layout in ClaimDetail).
// ClaimMobileSummary: the claim opens here: where it's at, people, paperwork,
//   and every section as a list. Update / Call / WhatsApp sit at the bottom.
// ClaimMobileSectionBar: the bar over one section, with Back to the summary.

const WhatsAppIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z" />
    <path d="M9.5 9c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8A4 4 0 0 1 11 10.8l.8-1-1-2z" />
  </svg>
);

const day = (d) => {
  if (!d) return '';
  const t = new Date(d);
  return isNaN(t) ? '' : format(t, 'd MMM yyyy');
};

// "overdue by 6h" / "due in 4h", from a due time.
const dueWords = (dueAt) => {
  if (!dueAt) return '';
  const hrs = Math.round((new Date(dueAt).getTime() - Date.now()) / 3600000);
  if (isNaN(hrs)) return '';
  const span = (h) => (Math.abs(h) >= 48 ? `${Math.round(Math.abs(h) / 24)} days` : `${Math.abs(h)}h`);
  return hrs < 0 ? `overdue by ${span(hrs)}` : `due in ${span(hrs)}`;
};

// One line under each section name, so you can see what's in it before opening it.
const sectionPreview = (id, c) => {
  const join = (...parts) => parts.filter(Boolean).join(' · ');
  switch (id) {
    case 'status': return join(c.claim_type, c.loss_date && `loss ${day(c.loss_date)}`);
    case 'dates': return join(c.on_site_date && `on site ${day(c.on_site_date)}`, c.ecd && `back ${day(c.ecd)}`) || join(c.date_received && `received ${day(c.date_received)}`);
    case 'client': return join(c.client_name, c.client_phone);
    case 'driver': return c.driver_same_as_client ? 'Same as client' : join(c.driver_contact_name, c.driver_contact_phone);
    case 'vehicle': return join(c.make_model, c.vehicle_colour);
    case 'vehicleDamage': return c.vehicle_damage;
    case 'vehicleLocation': return c.vehicle_location;
    case 'thirdParty': return join(c.tp_name, c.tp_reg);
    case 'bodyshop': return c.bodyshop;
    case 'referrer': return c.referrer;
    case 'creditRepair': return c.credit_repair_company_name;
    default: return '';
  }
};

const Card = ({ title, children }) => (
  <section className="mx-3 mb-3 rounded-[18px] bg-card shadow-card p-4" aria-label={title}>
    <h2 className="text-[12.5px] font-semibold text-muted-foreground mb-2.5">{title}</h2>
    {children}
  </section>
);

const Row = ({ onClick, icon: Icon, label, sub, right, dot }) => (
  <button
    type="button"
    onClick={onClick}
    className="relative w-full flex items-center gap-3 px-3.5 py-3 text-left active:bg-muted [&+&]:before:absolute [&+&]:before:top-0 [&+&]:before:left-3.5 [&+&]:before:right-0 [&+&]:before:h-px [&+&]:before:bg-border"
  >
    {Icon && <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />}
    <span className="flex-1 min-w-0">
      <span className="block text-[15px] font-medium truncate">{label}</span>
      {sub && <span className="block text-[13px] text-muted-foreground truncate mt-px">{sub}</span>}
    </span>
    {dot && <span className="w-[7px] h-[7px] rounded-full bg-warning flex-shrink-0" aria-label="Has details still to fill in" />}
    {right}
    <ChevronRight className="w-4 h-4 text-muted-foreground/70 flex-shrink-0" aria-hidden="true" />
  </button>
);

// Web links (wa.me) open in a new tab; tel: and Android app links open in place.
const newTab = (href) => (href && href.startsWith('https:') ? { target: '_blank', rel: 'noopener noreferrer' } : {});

const RoundLink = ({ href, label, children }) => (
  <a
    href={href}
    aria-label={label}
    {...newTab(href)}
    className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground active:scale-95 transition-transform flex-shrink-0"
  >
    {children}
  </a>
);

function MoreMenu({ claim, onAction, isInternalUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="More actions" className="tap-44 w-10 h-10 rounded-xl flex items-center justify-center active:bg-muted">
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 max-h-80 overflow-y-auto">
        {isInternalUser && <DropdownMenuItem onSelect={() => onAction('notes')}><NotebookPen className="w-4 h-4 mr-2" />Internal updates</DropdownMenuItem>}
        <DropdownMenuItem onSelect={() => onAction('activity')}><History className="w-4 h-4 mr-2" />Activity log</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction('timelogs')}><Timer className="w-4 h-4 mr-2" />Time logs</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction('email')}><Mail className="w-4 h-4 mr-2" />Send email</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction('tasks')}><ListTodo className="w-4 h-4 mr-2" />Manage tasks</DropdownMenuItem>
        {claim.instruction_pdf_url && <DropdownMenuItem onSelect={() => onAction('download_pdf')}><Download className="w-4 h-4 mr-2" />Download instruction PDF</DropdownMenuItem>}
        <DropdownMenuItem onSelect={() => onAction('download_overview')}><FileText className="w-4 h-4 mr-2" />Download file overview</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction('estimate')}><Calculator className="w-4 h-4 mr-2" />Request estimate</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction('parts')}><Package className="w-4 h-4 mr-2" />Log parts issue</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction('backorders')}><Package className="w-4 h-4 mr-2" />Backordered parts</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction('duplicate')}><Copy className="w-4 h-4 mr-2" />Duplicate claim</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction('archive')}><Archive className="w-4 h-4 mr-2" />{claim.archived ? 'Unarchive' : 'Archive'}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction('delete')} className="text-danger-fg"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const Plate = ({ reg }) => (
  <span className="rounded-md bg-primary text-primary-foreground px-2 py-0.5 text-[13px] font-bold tracking-wider tabular-nums whitespace-nowrap">
    {reg || 'No reg'}
  </span>
);

export function ClaimMobileSectionBar({ claim, title, onBack, onAction, isInternalUser }) {
  return (
    <div data-claim-header className="lg:hidden sticky top-0 flex-shrink-0 bg-card/90 backdrop-blur-md">
      <div className="flex flex-nowrap items-center gap-1 px-2 min-h-[52px]">
        <button type="button" onClick={onBack} aria-label={`Back to ${claim.reg || 'the claim'}`} className="flex-1 min-w-0 flex flex-nowrap items-center gap-1 py-1.5 text-left">
          <ChevronLeft className="w-6 h-6 flex-shrink-0 text-link" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-xs font-medium text-link leading-tight">{claim.reg || 'Claim'}</span>
            <span className="block text-base font-semibold leading-tight truncate">{title}</span>
          </span>
        </button>
        <MoreMenu claim={claim} onAction={onAction} isInternalUser={isInternalUser} />
      </div>
    </div>
  );
}

export default function ClaimMobileSummary({
  claim,
  sections = [],
  isClosedStatus,
  isInternalUser = true,
  onClose,
  onOpenSection,
  onUpdates,
  onUpdateTracking,
  onAction,
  updatesCount = 0,
  imagesCount = 0,
  docsCount = 0,
  notesCount = 0,
  starredCount = 0,
}) {
  const journey = clientJourney(claim);
  const outcome = getClaimOutcome(claim);
  const vehicle = claim.make_model || [claim.vehicle_make, claim.vehicle_model].filter(Boolean).join(' ');
  const partyLabel = AUTHORISING_PARTY_LABELS[claim.authorised_by] || claim.authorised_by || '';
  const partyName = claim.authorising_party_name || '';
  const claimRef = authorisingPartyClaimRef(claim.authorised_by, claim);

  // Who the Call / WhatsApp buttons ring: the driver, or the client when the
  // driver is the client or has no number.
  const useClient = claim.driver_same_as_client === true || !claim.driver_contact_phone;
  const mainPhone = useClient ? claim.client_phone : claim.driver_contact_phone;
  const mainWho = useClient ? 'client' : 'driver';

  // Only what needs doing today gets colour.
  const caseFlag = isClosedStatus ? null : computeUpdateStatusFlag(claim);
  const clientFlag = isClosedStatus ? null : computeClientCommStatusFlag(claim);
  const alerts = [];
  if (caseFlag === 'Red' || caseFlag === 'Amber') alerts.push({ tone: caseFlag, text: `Case update ${dueWords(claim.next_update_due_at) || (caseFlag === 'Red' ? 'overdue' : 'due soon')}` });
  if (clientFlag === 'Red' || clientFlag === 'Amber') alerts.push({ tone: clientFlag, text: `Client update ${dueWords(claim.next_client_comm_due_at) || (clientFlag === 'Red' ? 'overdue' : 'due soon')}` });
  if (starredCount > 0) alerts.push({ tone: 'Amber', text: `${starredCount} flagged update${starredCount === 1 ? '' : 's'} to resolve` });

  const missing = sections.filter((s) => s.empty);

  const people = [
    { role: 'Client', name: claim.client_name, phone: claim.client_phone, section: 'client' },
    claim.driver_same_as_client
      ? { role: 'Driver', name: 'Same as client', phone: null, section: 'driver' }
      : { role: 'Driver', name: claim.driver_contact_name, phone: claim.driver_contact_phone, section: 'driver' },
    { role: 'Repairer', name: claim.bodyshop, phone: null, section: 'bodyshop' },
  ];

  const fact = (k, v, warn) => (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className={`text-sm font-medium break-words ${warn ? 'text-warning-fg' : ''}`}>{v}</div>
    </div>
  );

  return (
    <div className="lg:hidden flex flex-col min-h-full">
      {/* Bar: back to the list, the reg, more actions */}
      <div data-claim-header className="sticky top-0 bg-card/90 backdrop-blur-md">
        <div className="flex items-center gap-1 px-2 min-h-[48px]">
          <button type="button" onClick={onClose} className="flex items-center gap-0.5 pr-2 py-2 text-link text-[15px] font-medium">
            <ChevronLeft className="w-6 h-6" aria-hidden="true" />Repairs
          </button>
          <span className="flex-1 flex justify-center min-w-0"><Plate reg={claim.reg} /></span>
          <MoreMenu claim={claim} onAction={onAction} isInternalUser={isInternalUser} />
        </div>
      </div>

      <div className="flex-1 pb-4">
        <div className="px-4 pt-3 pb-4">
          <p className="text-[22px] font-bold tracking-tight leading-tight break-words">{claim.client_name || 'No client name'}</p>
          <p className="text-[13.5px] text-muted-foreground mt-1">
            {[vehicle, claim.job_number, partyName].filter(Boolean).join(' · ')}
          </p>
        </div>

        <Card title="Where it's at">
          {journey.exception ? (
            <p className="text-xl font-bold">{journey.label}</p>
          ) : (
            <>
              <p className="text-xl font-bold tracking-tight">
                {journey.label}
                {outcome === 'Potential Total Loss' && <span className="ml-2 align-middle text-xs font-semibold text-warning-fg">Potential total loss</span>}
              </p>
              <div className="grid gap-1 my-3" style={{ gridTemplateColumns: `repeat(${journey.stages.length}, minmax(0, 1fr))` }} aria-hidden="true">
                {journey.stages.map((s, i) => (
                  <span key={s} className={`h-[5px] rounded-full ${i < journey.index ? 'bg-success' : i === journey.index ? (journey.held || journey.rectification ? 'bg-warning' : 'bg-primary') : 'bg-border'}`} />
                ))}
              </div>
            </>
          )}

          {alerts.map((a) => (
            <div key={a.text} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-2 text-[13.5px] font-medium ${a.tone === 'Red' ? 'bg-danger-bg text-danger-fg' : 'bg-warning-bg text-warning-fg'}`}>
              <Clock className="w-[18px] h-[18px] flex-shrink-0" aria-hidden="true" />
              <span className="flex-1 min-w-0">{a.text}</span>
              <button type="button" onClick={onUpdates} className="font-bold flex-shrink-0">
                {a.text.includes('flagged') ? 'View' : 'Log update'}
              </button>
            </div>
          ))}

          <div className="grid grid-cols-2 m-keep-2 gap-x-4 gap-y-3 mt-2">
            {fact('Internal status', claim.secondary_status || 'Not set', !claim.secondary_status)}
            {fact('Expected back', claim.ecd ? day(claim.ecd) : 'Not set', !claim.ecd)}
            {fact('Authorising party', [partyLabel, partyName].filter(Boolean).join(' · ') || 'Not set', !partyLabel)}
            {fact('Their claim no.', claimRef || 'Missing', !claimRef)}
            {claim.tertiary_status && fact('Additional status', claim.tertiary_status)}
            {claim.archived && fact('Archived', 'Yes')}
          </div>
          {!isClosedStatus && (claim.update_status_flag || claim.client_comm_status_flag) && (
            <button type="button" onClick={onUpdateTracking} className="mt-3 text-[13px] font-medium text-link">Update timers</button>
          )}
        </Card>

        <Card title="People">
          {people.map((p, i) => (
            <div key={p.role} className={`flex items-center gap-3 py-2.5 ${i ? 'border-t border-border' : ''}`}>
              <button type="button" onClick={() => onOpenSection(p.section)} className="flex-1 min-w-0 text-left">
                <span className="block text-xs text-muted-foreground">{p.role}</span>
                <span className={`block text-[14.5px] font-semibold truncate ${p.name ? '' : 'text-warning-fg font-medium'}`}>{p.name || 'Not set'}</span>
              </button>
              {p.phone && (
                <>
                  <RoundLink href={telHref(p.phone)} label={`Call ${p.role.toLowerCase()} on ${p.phone}`}><Phone className="w-[18px] h-[18px]" /></RoundLink>
                  <RoundLink href={whatsappHref(p.phone)} label={`WhatsApp the ${p.role.toLowerCase()}`}><WhatsAppIcon className="w-[18px] h-[18px]" /></RoundLink>
                </>
              )}
            </div>
          ))}
        </Card>

        <Card title="Paperwork">
          <div className="rounded-xl border border-border overflow-hidden">
            <Row icon={Image} label="Photos" onClick={() => onAction('images')} right={<span className="text-[13px] text-muted-foreground">{imagesCount}</span>} />
            <Row icon={FileText} label="Documents" onClick={() => onAction('docs')} right={<span className="text-[13px] text-muted-foreground">{docsCount}</span>} />
            {isInternalUser && <Row icon={NotebookPen} label="Internal updates" onClick={() => onAction('notes')} right={<span className="text-[13px] text-muted-foreground">{notesCount}</span>} />}
            {missing.length > 0 && (
              <Row
                label={`${missing.length} section${missing.length === 1 ? '' : 's'} with details to fill in`}
                sub={missing.slice(0, 3).map((s) => s.label).join(', ') + (missing.length > 3 ? '…' : '')}
                dot
                onClick={() => onOpenSection(missing[0].id)}
              />
            )}
          </div>
        </Card>

        <h2 className="px-5 pt-2 pb-1.5 text-[12.5px] font-medium text-muted-foreground">All details</h2>
        <div className="mx-3 rounded-[16px] bg-card shadow-card overflow-hidden">
          {sections.map((s) => (
            <Row key={s.id} label={s.label} sub={sectionPreview(s.id, claim)} dot={s.empty} onClick={() => onOpenSection(s.id)} />
          ))}
        </div>
      </div>

      {/* Main actions, under your thumb */}
      <div className="sticky bottom-0 z-20 flex gap-2 px-3.5 pt-2.5 bg-card/90 backdrop-blur-md border-t border-border" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}>
        <button type="button" onClick={onUpdates} className="relative flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.99]">
          <MessageSquare className="w-5 h-5" aria-hidden="true" />Update
          {updatesCount > 0 && <span className="text-xs font-medium opacity-75">{updatesCount}</span>}
          {claim.unread_bodyshop_update && <span className="absolute top-2 right-3 w-2 h-2 rounded-full bg-info ring-2 ring-primary" aria-label="New update from the repairer" />}
        </button>
        <a
          href={telHref(mainPhone)}
          aria-disabled={!mainPhone}
          aria-label={mainPhone ? `Call ${mainWho} on ${mainPhone}` : `No ${mainWho} phone number`}
          className={`w-[52px] h-12 rounded-2xl border border-border bg-card flex items-center justify-center ${mainPhone ? '' : 'opacity-40 pointer-events-none'}`}
        >
          <Phone className="w-5 h-5" />
        </a>
        <a
          href={whatsappHref(mainPhone)}
          {...newTab(whatsappHref(mainPhone))}
          aria-disabled={!mainPhone}
          aria-label={mainPhone ? `WhatsApp the ${mainWho}` : `No ${mainWho} phone number`}
          className={`w-[52px] h-12 rounded-2xl border border-border bg-card flex items-center justify-center ${mainPhone ? '' : 'opacity-40 pointer-events-none'}`}
        >
          <WhatsAppIcon className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
}
