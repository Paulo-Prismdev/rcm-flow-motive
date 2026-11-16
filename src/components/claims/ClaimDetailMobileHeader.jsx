import React, { useState } from 'react';
import { ArrowLeft, FileText, Image, MessageSquare, MoreHorizontal, Mail, ListTodo, Timer, History, Package, Download, Archive, Trash2, Calculator, Copy, Phone, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import StatusBadge from '../shared/StatusBadge';
import UpdateStatusBadge from '../shared/UpdateStatusBadge';
import AuthorisingPartyBanner from './AuthorisingPartyBanner';
import { computeUpdateStatusFlag, computeClientCommStatusFlag } from '../shared/claimStatusUpdate';
import { clientJourney } from '../shared/clientJourney';
import { getClaimOutcome } from '../shared/claimOutcome';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

// Phone header for a claim (desktop has its own bar in ClaimDetail).
// Compact identity row, the stage in the client's words as a step bar, five
// one-tap actions, and a section picker (dropdown + previous / next).

// UK numbers for tel: and WhatsApp links: digits only, 07… becomes 447….
const digitsOnly = (n) => String(n || '').replace(/[^\d+]/g, '');
const telHref = (n) => `tel:${digitsOnly(n)}`;
const waHref = (n) => {
  let d = String(n || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = `44${d.slice(1)}`;
  return `https://wa.me/${d}`;
};

const CountBadge = ({ count, className }) => {
  if (!count) return null;
  return (
    <span className={`absolute top-1 right-1.5 min-w-[17px] h-[17px] px-1 rounded-full text-[10.5px] font-bold flex items-center justify-center leading-none ${className}`}>
      {count}
    </span>
  );
};

export default function ClaimDetailMobileHeader({
  claim,
  isClosedStatus,
  onClose,
  onUpdates,
  onUpdateTracking,
  onAction,
  sections = [],
  selectedSection,
  onSelectSection,
  updatesCount = 0,
  imagesCount = 0,
  docsCount = 0,
  collapsed = false,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const idx = Math.max(0, sections.findIndex((s) => s.id === selectedSection));
  const current = sections[idx];
  const step = (d) => {
    const next = sections[idx + d];
    if (next) onSelectSection(next.id);
  };

  // Who to ring: the driver, or the client when the driver is the client or has no number.
  const useClient = claim.driver_same_as_client === true || !claim.driver_contact_phone;
  const contactPhone = useClient ? claim.client_phone : claim.driver_contact_phone;
  const contactWho = useClient ? 'client' : 'driver';

  const journey = clientJourney(claim);
  const outcome = getClaimOutcome(claim);
  const vehicle = claim.make_model || [claim.vehicle_make, claim.vehicle_model].filter(Boolean).join(' ');

  const actionBase = 'relative flex-1 min-w-0 flex flex-col items-center justify-center gap-1 rounded-xl text-[11.5px] font-medium leading-none transition-colors active:scale-[0.98]';
  const actionSize = collapsed ? 'h-10' : 'h-[54px]';
  const quiet = 'border border-border bg-card text-foreground';
  const off = 'opacity-45 pointer-events-none';

  return (
    <div
      data-claim-header
      className="lg:hidden sticky top-0 flex-shrink-0 bg-card/95 backdrop-blur border-b border-border"
      style={{ isolation: 'isolate' }}
    >
      {/* Identity: back, reg plate, job number and vehicle, client, more actions */}
      <div className="flex items-center gap-2.5 px-3 pt-1 pb-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="tap-44 flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-card transition-all active:scale-95 active:bg-accent"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-shrink-0 rounded-md bg-primary text-primary-foreground px-2 py-0.5 text-[13px] font-bold tracking-wider tabular-nums">
              {claim.reg || 'No reg'}
            </span>
            <span className="text-xs text-muted-foreground truncate tabular-nums">
              {[claim.job_number, vehicle].filter(Boolean).join(' · ')}
            </span>
          </div>
          {claim.client_name && (
            <p className="text-[13px] text-muted-foreground truncate mt-0.5">{claim.client_name}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="More actions" className="tap-44 flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-card active:bg-accent">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 max-h-80 overflow-y-auto">
            <DropdownMenuItem onSelect={() => onAction('notes')}><FileText className="w-4 h-4 mr-2" />Internal updates</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAction('timelogs')}><Timer className="w-4 h-4 mr-2" />Time logs</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAction('activity')}><History className="w-4 h-4 mr-2" />Activity log</DropdownMenuItem>
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
      </div>

      {!collapsed && (
        <div className="px-3 pb-2 space-y-2">
          {/* Who authorises and their claim number, on one line */}
          <AuthorisingPartyBanner claim={claim} caption />

          {/* Stage in the client's words, as a step bar */}
          {journey.exception ? (
            <StatusBadge status={journey.exception} />
          ) : (
            <div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-1.5">
                <span className="truncate">
                  Stage {journey.index + 1} of {journey.stages.length} · <b className="font-semibold text-foreground">{journey.label}</b>
                </span>
                {outcome === 'Potential Total Loss' && <StatusBadge status={outcome} />}
              </div>
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${journey.stages.length}, minmax(0, 1fr))` }} aria-hidden="true">
                {journey.stages.map((s, i) => (
                  <span
                    key={s}
                    title={s}
                    className={`h-[5px] rounded-full ${i < journey.index ? 'bg-success' : i === journey.index ? (journey.rectification || journey.held ? 'bg-warning' : 'bg-primary') : 'bg-border'}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Internal statuses and the update timers */}
          {(claim.secondary_status || claim.tertiary_status || claim.archived || (!isClosedStatus && (claim.update_status_flag || claim.client_comm_status_flag))) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {claim.secondary_status && <StatusBadge status={claim.secondary_status} />}
              {claim.tertiary_status && <StatusBadge status={claim.tertiary_status} variant="secondary" />}
              {claim.archived && <span className="px-2 py-0.5 rounded bg-muted text-xs text-muted-foreground">Archived</span>}
              {!isClosedStatus && claim.update_status_flag && (
                <button type="button" onClick={onUpdateTracking} className="tap-44-up">
                  <UpdateStatusBadge status={computeUpdateStatusFlag(claim)} small labelPrefix="Updates" />
                </button>
              )}
              {!isClosedStatus && claim.client_comm_status_flag && (
                <button type="button" onClick={onUpdateTracking} className="tap-44-up">
                  <UpdateStatusBadge status={computeClientCommStatusFlag(claim)} small labelPrefix="Client" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Five one-tap actions */}
      <div className="flex items-stretch gap-1.5 px-3 pb-2">
        <button type="button" onClick={onUpdates} className={`${actionBase} ${actionSize} bg-primary text-primary-foreground`}>
          <MessageSquare className="w-[18px] h-[18px]" />
          {!collapsed && <span>Update</span>}
          <CountBadge count={updatesCount} className="bg-card text-foreground ring-1 ring-border" />
        </button>
        <a
          href={contactPhone ? telHref(contactPhone) : undefined}
          aria-disabled={!contactPhone}
          aria-label={contactPhone ? `Call ${contactWho} on ${contactPhone}` : `No ${contactWho} phone number`}
          className={`${actionBase} ${actionSize} ${quiet} ${contactPhone ? '' : off}`}
        >
          <Phone className="w-[18px] h-[18px]" />
          {!collapsed && <span className="truncate max-w-full px-0.5">Call {contactWho}</span>}
        </a>
        <a
          href={contactPhone ? waHref(contactPhone) : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!contactPhone}
          aria-label={contactPhone ? `WhatsApp the ${contactWho}` : `No ${contactWho} phone number`}
          className={`${actionBase} ${actionSize} ${quiet} ${contactPhone ? '' : off}`}
        >
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true"><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z" /><path d="M9.5 9c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8A4 4 0 0 1 11 10.8l.8-1-1-2z" /></svg>
          {!collapsed && <span>WhatsApp</span>}
        </a>
        <button type="button" onClick={() => onAction('images')} className={`${actionBase} ${actionSize} ${quiet}`}>
          <Image className="w-[18px] h-[18px]" />
          {!collapsed && <span>Photos</span>}
          <CountBadge count={imagesCount} className="bg-info text-on-solid" />
        </button>
        <button type="button" onClick={() => onAction('docs')} className={`${actionBase} ${actionSize} ${quiet}`}>
          <FileText className="w-[18px] h-[18px]" />
          {!collapsed && <span>Docs</span>}
          <CountBadge count={docsCount} className="bg-info text-on-solid" />
        </button>
      </div>

      {/* Section picker: dropdown with previous / next */}
      {current && (
        <div className="flex items-stretch gap-2 px-3 pb-2.5">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={idx === 0}
            aria-label="Previous section"
            className="flex-shrink-0 w-11 h-11 rounded-xl border border-border bg-card flex items-center justify-center disabled:opacity-40 active:bg-accent"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-haspopup="dialog"
            className="flex-1 min-w-0 h-11 rounded-xl border border-border bg-card flex items-center gap-2 px-3 text-left active:bg-accent"
          >
            <span className="flex-1 min-w-0">
              <span className="block text-[10.5px] leading-tight text-muted-foreground">Section {idx + 1} of {sections.length}</span>
              <span className="flex items-center gap-1.5 text-[14.5px] font-semibold leading-tight truncate">
                <span className="truncate">{current.label}</span>
                {current.empty && <span className="w-1.5 h-1.5 rounded-full bg-warning flex-shrink-0" aria-label="Has details still to fill in" />}
              </span>
            </span>
            <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={idx === sections.length - 1}
            aria-label="Next section"
            className="flex-shrink-0 w-11 h-11 rounded-xl border border-border bg-card flex items-center justify-center disabled:opacity-40 active:bg-accent"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)] max-h-[82vh] flex flex-col gap-0">
          <SheetHeader className="px-4 pt-4 pb-2 text-left">
            <SheetTitle className="text-lg">Sections</SheetTitle>
            <SheetDescription className="sr-only">Choose which part of the claim to show</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto px-2 pb-3">
            {sections.map((s) => {
              const on = s.id === selectedSection;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onSelectSection(s.id); setPickerOpen(false); }}
                  aria-current={on ? 'true' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-[15px] ${on ? 'bg-accent font-semibold' : 'active:bg-muted'}`}
                >
                  {Icon && <Icon className="w-[18px] h-[18px] text-muted-foreground flex-shrink-0" aria-hidden="true" />}
                  <span className="flex-1 min-w-0 truncate">{s.label}</span>
                  {s.empty && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning" />Missing details
                    </span>
                  )}
                  {on && <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
