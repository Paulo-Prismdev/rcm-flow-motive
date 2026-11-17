import React, { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronLeft, ChevronRight, MoreHorizontal, MessageSquare, Phone, Image, FileText, Clock,
  Mail, ListTodo, Timer, History, Package, Download, Archive, Trash2, Calculator, Copy, NotebookPen, Eye,
} from 'lucide-react';
import { clientJourney } from '../shared/clientJourney';
import { getClaimOutcome, isExceptionOutcome } from '../shared/claimOutcome';
import StatusBadge from '../shared/StatusBadge';
import UpdateStatusBadge from '../shared/UpdateStatusBadge';
import { computeUpdateStatusFlag, computeClientCommStatusFlag } from '../shared/claimStatusUpdate';
import { AUTHORISING_PARTY_LABELS, authorisingPartyClaimRef } from '../shared/authorisingParty';
import { telHref, whatsappHref } from '@/lib/contactLinks';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Phone claim screens (desktop keeps its own layout in ClaimDetail).
// ClaimMobileSummary: the claim opens here: where it's at, people, paperwork,
//   and every section as a list. Update and Quick view sit at the bottom.
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
    case 'thirdParty': return join(c.tp_name, c.tp_reg);
    case 'bodyshop': return c.bodyshop;
    case 'referrer': return c.referrer;
    case 'insurance': return join(c.insurer, c.claim_ref);
    case 'hire': return join(c.courtesy_car_required === true ? 'Courtesy car' : (c.courtesy_car_required && c.courtesy_car_required !== 'No' ? `Courtesy car: ${c.courtesy_car_required}` : ''), c.credit_repair_company_name);
    default: return '';
  }
};

const Card = ({ title, children }) => (
  <section className="mx-3 mb-3 rounded-[18px] bg-card shadow-card p-4" aria-label={title}>
    <h2 className="text-[12.5px] font-semibold text-muted-foreground mb-2.5 capitalize">{title}</h2>
    {children}
  </section>
);

// The sections, grouped under headings so the list reads as a few short lists.
// Shared with the desktop section list so both read the same.
export const DETAIL_GROUPS = [
  ['The job', ['status', 'dates', 'estimate', 'financials', 'insurance']],
  ['People', ['client', 'driver', 'thirdParty', 'referrer']],
  ['The vehicle', ['vehicle', 'hire']],
  ['The repair', ['bodyshop', 'instructionDefaults', 'backorderedParts']],
  ['Recovery and legal', ['thirdpartyPursuit', 'indemnity', 'signedForms']],
];

// Sections in their groups; anything not listed goes under "Other".
export function groupSections(sections) {
  const grouped = DETAIL_GROUPS
    .map(([title, ids]) => [title, ids.map((id) => sections.find((s) => s.id === id)).filter(Boolean)])
    .filter(([, list]) => list.length);
  const placed = new Set(DETAIL_GROUPS.flatMap(([, ids]) => ids));
  const others = sections.filter((s) => !placed.has(s.id));
  if (others.length) grouped.push(['Other', others]);
  return grouped;
}

// The stage in the client's words as a labelled track (desktop header).
export function ClaimStageTrack({ claim }) {
  const journey = clientJourney(claim);
  if (journey.exception) {
    return <p className="text-sm font-semibold text-danger-fg">{journey.label}</p>;
  }
  const n = journey.stages.length;
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-xs text-muted-foreground">Stage {journey.index + 1} of {n}</span>
        <span className="text-[15px] font-semibold">{journey.label}</span>
      </div>
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {journey.stages.map((s, i) => {
          const done = i < journey.index;
          const now = i === journey.index;
          return (
            <li key={s} className="min-w-0" aria-current={now ? 'step' : undefined}>
              <span className={`block h-[5px] rounded-full ${done ? 'bg-success' : now ? (journey.held || journey.rectification ? 'bg-warning' : 'bg-primary') : 'bg-border'}`} />
              <span className={`block mt-1.5 text-xs leading-tight truncate ${now ? 'font-semibold text-foreground' : done ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>{s}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const Row = ({ onClick, icon: Icon, tile: Tile, label, sub, right, dot }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative w-full flex items-center gap-3 px-3.5 text-left active:bg-muted [&+&]:before:absolute [&+&]:before:top-0 [&+&]:before:right-0 [&+&]:before:h-px [&+&]:before:bg-border ${Tile ? 'py-2.5 [&+&]:before:left-[62px]' : 'py-3 [&+&]:before:left-3.5'}`}
  >
    {Icon && <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />}
    {Tile && (
      <span className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
        <Tile className="w-[18px] h-[18px] text-foreground" aria-hidden="true" />
      </span>
    )}
    <span className="flex-1 min-w-0">
      <span className={`block truncate m-ellipsis ${Tile ? 'text-[15.5px] font-semibold capitalize' : 'text-[15px] font-medium'}`}>{label}</span>
      {sub && <span className="block text-[13px] text-muted-foreground truncate m-ellipsis mt-px">{sub}</span>}
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
            <span className="block text-base font-semibold leading-tight truncate m-ellipsis capitalize">{title}</span>
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
  onQuickView,
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

  // Only what needs doing today gets colour.
  const caseFlag = isClosedStatus ? null : computeUpdateStatusFlag(claim);
  const clientFlag = isClosedStatus ? null : computeClientCommStatusFlag(claim);
  const alerts = [];
  if (caseFlag === 'Red' || caseFlag === 'Amber') alerts.push({ tone: caseFlag, text: `Case update ${dueWords(claim.next_update_due_at) || (caseFlag === 'Red' ? 'overdue' : 'due soon')}` });
  if (clientFlag === 'Red' || clientFlag === 'Amber') alerts.push({ tone: clientFlag, text: `Client update ${dueWords(claim.next_client_comm_due_at) || (clientFlag === 'Red' ? 'overdue' : 'due soon')}` });
  if (starredCount > 0) alerts.push({ tone: 'Amber', text: `${starredCount} flagged update${starredCount === 1 ? '' : 's'} to resolve` });

  const missing = sections.filter((s) => s.empty);

  // The big plate sits at the top of the page; once it scrolls away a small one
  // appears in the bar so you always know which claim you're on.
  const plateRef = useRef(null);
  const [plateInBar, setPlateInBar] = useState(false);
  useEffect(() => {
    const el = plateRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setPlateInBar(!e.isIntersecting), { rootMargin: '-56px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const grouped = groupSections(sections);

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
          <span className={`flex-1 flex justify-center min-w-0 transition-opacity duration-200 ${plateInBar ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!plateInBar}>
            <Plate reg={claim.reg} />
          </span>
          <MoreMenu claim={claim} onAction={onAction} isInternalUser={isInternalUser} />
        </div>
      </div>

      <div className="flex-1 pb-4">
        <div className="px-4 pt-2 pb-4">
          {/* The plate, with the claim's statuses beside it (as on the computer) */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div ref={plateRef} className="flex-shrink-0">
              <span className="inline-block rounded-lg bg-primary text-primary-foreground px-3 py-1 text-[22px] font-bold tracking-[0.08em] tabular-nums leading-tight shadow-card">
                {claim.reg || 'No reg'}
              </span>
            </div>
            <div className="flex flex-wrap justify-end items-center gap-1.5 min-w-0 pt-0.5">
              {isExceptionOutcome(outcome) && <StatusBadge status={outcome} />}
              {claim.secondary_status && <StatusBadge status={claim.secondary_status} />}
              {claim.tertiary_status && <StatusBadge status={claim.tertiary_status} variant="secondary" />}
              {!isClosedStatus && claim.update_status_flag && (
                <button type="button" onClick={onUpdateTracking} className="rounded-md active:opacity-70">
                  <UpdateStatusBadge status={caseFlag} small labelPrefix="Updates" />
                </button>
              )}
              {!isClosedStatus && claim.client_comm_status_flag && (
                <button type="button" onClick={onUpdateTracking} className="rounded-md active:opacity-70">
                  <UpdateStatusBadge status={clientFlag} small labelPrefix="Client" />
                </button>
              )}
              {claim.archived && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">Archived</span>}
            </div>
          </div>
          <p className="text-[22px] font-bold tracking-tight leading-tight break-words">{claim.client_name || 'No client name'}</p>
          <p className="text-[13.5px] text-muted-foreground mt-1">
            {[vehicle, claim.job_number, partyName].filter(Boolean).join(' · ')}
          </p>
          {/* Photos and documents, one tap from the top of the claim (Quick view sits at the bottom) */}
          <div className="flex flex-nowrap gap-2 mt-3.5">
            {[
              { key: 'images', icon: Image, label: 'Photos', count: imagesCount, onClick: () => onAction('images') },
              { key: 'docs', icon: FileText, label: 'Docs', count: docsCount, onClick: () => onAction('docs') },
            ].filter((b) => b.onClick).map(({ key, icon: BIcon, label, count, onClick }) => (
              <button key={key} type="button" onClick={onClick} className="relative flex-1 min-w-0 h-12 rounded-2xl bg-card shadow-card flex items-center justify-center gap-2 text-[14.5px] font-semibold active:scale-[0.98] transition-transform">
                <BIcon className="w-5 h-5" aria-hidden="true" />
                {label}
                {count > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-info text-on-solid text-[11.5px] font-bold flex items-center justify-center">{count}</span>}
              </button>
            ))}
          </div>
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
            {fact('Expected back', claim.ecd ? day(claim.ecd) : 'Not set', !claim.ecd)}
            {fact('Authorising party', [partyLabel, partyName].filter(Boolean).join(' · ') || 'Not set', !partyLabel)}
            {fact('Their claim no.', claimRef || 'Missing', !claimRef)}
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
                <span className={`block text-[14.5px] font-semibold truncate m-ellipsis ${p.name ? '' : 'text-warning-fg font-medium'}`}>{p.name || 'Not set'}</span>
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


        <h2 className="px-4 pt-3 pb-1 text-[19px] font-bold tracking-tight">All Details</h2>
        {grouped.map(([title, list]) => (
          <div key={title} className="mb-3">
            <h3 className="flex items-center justify-between px-4 pt-3 pb-2 text-base font-bold tracking-tight text-foreground">
              <span className="capitalize">{title}</span>
              {list.some((s) => s.empty) && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-warning-fg">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning" aria-hidden="true" />
                  {list.filter((s) => s.empty).length} to fill in
                </span>
              )}
            </h3>
            <div className="mx-3 rounded-[16px] bg-card shadow-card overflow-hidden">
              {list.map((s) => (
                <Row key={s.id} tile={s.icon} label={s.label} sub={sectionPreview(s.id, claim)} dot={s.empty} onClick={() => onOpenSection(s.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Main actions, under your thumb */}
      <div className="sticky bottom-0 z-20 flex gap-2 px-3.5 pt-2.5 bg-card/90 backdrop-blur-md border-t border-border" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}>
        <button type="button" onClick={onUpdates} className="relative flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.99]">
          <MessageSquare className="w-5 h-5" aria-hidden="true" />Update
          {updatesCount > 0 && <span className="text-xs font-medium opacity-75">{updatesCount}</span>}
          {claim.unread_bodyshop_update && <span className="absolute top-2 right-3 w-2 h-2 rounded-full bg-info ring-2 ring-primary" aria-label="New update from the repairer" />}
        </button>
        {/* Quick view in the logo's green (calls and WhatsApp are on each person in People) */}
        {onQuickView && (
          <button
            type="button"
            onClick={onQuickView}
            className="flex-1 h-12 rounded-2xl bg-[#00E600] text-[#131D47] font-semibold text-[15px] flex items-center justify-center gap-2 shadow-card active:scale-[0.99]"
          >
            <Eye className="w-5 h-5" aria-hidden="true" />Quick view
          </button>
        )}
      </div>
    </div>
  );
}
