import React, { useRef, useState } from 'react';
import {
  Check, X, Ban, Clock, Hourglass, MoreVertical, Upload, Pencil, Trash2,
  AlertTriangle, Undo2, Unlock, SlidersHorizontal,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import InvoiceItemDetails from './InvoiceItemDetails';

// One line of the invoicing tracker, shown as a solid status button: red until it
// has been raised or received, amber while it waits to be paid, green once it is
// paid, and neutral grey while a credit repair amount cannot be worked out yet.
// The button carries the invoice name, its amount and the date that matters;
// everything else lives behind the ⋮ menu and the details panel.
const TONES = {
  green: {
    btn: 'bg-green-600 text-white ring-1 ring-green-500/40 shadow-[0_0_18px_-4px_rgba(34,197,94,0.75)] hover:bg-green-700',
    iconWrap: 'bg-white/20 text-white',
    icon: <Check className="w-3.5 h-3.5" strokeWidth={3} />,
    menu: 'text-white/70 hover:text-white hover:bg-white/15',
    marker: 'bg-white/25 text-white',
  },
  amber: {
    btn: 'bg-amber-500 text-white ring-1 ring-amber-400/40 shadow-[0_0_18px_-4px_rgba(245,158,11,0.75)] hover:bg-amber-600',
    iconWrap: 'bg-white/20 text-white',
    icon: <Clock className="w-3.5 h-3.5" strokeWidth={3} />,
    menu: 'text-white/70 hover:text-white hover:bg-white/15',
    marker: 'bg-white/25 text-white',
  },
  red: {
    btn: 'bg-red-500 text-white ring-1 ring-red-400/40 shadow-[0_0_18px_-4px_rgba(239,68,68,0.7)] hover:bg-red-600',
    iconWrap: 'bg-white/20 text-white',
    icon: <X className="w-3.5 h-3.5" strokeWidth={3} />,
    menu: 'text-white/70 hover:text-white hover:bg-white/15',
    marker: 'bg-white/25 text-white',
  },
  waiting: {
    btn: 'bg-muted/40 text-muted-foreground border border-dashed border-border hover:bg-muted/70',
    iconWrap: 'bg-muted-foreground/15 text-muted-foreground',
    icon: <Hourglass className="w-3.5 h-3.5" />,
    menu: 'text-muted-foreground hover:text-foreground hover:bg-muted',
    marker: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  },
  na: {
    btn: 'bg-muted/30 text-muted-foreground/70 border border-border opacity-70 hover:opacity-90',
    iconWrap: 'bg-muted-foreground/15 text-muted-foreground',
    icon: <Ban className="w-3.5 h-3.5" />,
    menu: 'text-muted-foreground hover:text-foreground hover:bg-muted',
    marker: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  },
};

const formatDay = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function InvoiceItemCard({
  item, state, files, isUploading,
  onChange, onUpload, onDeleteFile, onRenameFile, onViewFile,
}) {
  const fileInputRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const isDocument = item.kind === 'document';
  const isDerived = !!item.amountSource;
  const dateLabel = item.dateLabel || (item.direction === 'in' ? 'Received' : 'Sent');
  const variance = state.variance;
  // Credit repair invoices sit neutral until the rates or the final repair cost
  // let us work the amount out — there is nothing to pay or chase yet.
  const isAwaiting = !isDocument && !state.notApplicable && state.awaiting === true;
  const raised = state.amount > 0 || !!state.date;

  const toneKey = state.notApplicable ? 'na'
    : isAwaiting ? 'waiting'
      : isDocument ? (state.received ? 'green' : 'red')
        : state.paid ? 'green'
          : raised ? 'amber'
            : 'red';
  const tone = TONES[toneKey];
  const canTogglePaid = !isDocument && !state.notApplicable && !isAwaiting;

  const subline = state.notApplicable ? 'Not applicable'
    : isAwaiting
      ? [state.date ? `${dateLabel} ${formatDay(state.date)}` : '', state.hint || 'Awaiting amount'].filter(Boolean).join(' · ')
      : isDocument
        ? (state.received ? (state.date ? `${dateLabel} ${formatDay(state.date)}` : 'Received') : 'Click to upload')
        : state.paid ? `Paid${state.paidDate ? ` ${formatDay(state.paidDate)}` : ''}`
          : raised ? (state.date ? `${dateLabel} ${formatDay(state.date)}` : 'Awaiting payment')
            : 'Click to upload';

  const hint = state.notApplicable
    ? 'Not applicable — use ⋮ to change'
    : isAwaiting ? 'No invoice can be raised yet'
      : toneKey === 'red' ? `Click to upload this ${isDocument ? 'document' : 'invoice'}`
        : files.length === 0 ? 'Click to add the amount and dates'
          : files.length === 1 ? 'Click to open the document' : 'Click to choose a document';

  const handleCardClick = () => {
    if (isUploading) return;
    if (state.notApplicable) { setMenuOpen(true); return; }
    if (toneKey === 'red') { fileInputRef.current?.click(); return; }
    if (files.length === 1) { onViewFile(files[0].file_url); return; }
    if (files.length > 1) { setMenuOpen(true); return; }
    setDetailsOpen(true);
  };

  const submitRename = (doc) => {
    const name = renameValue.trim();
    setRenamingId(null);
    if (name && name !== doc.file_name) onRenameFile(doc, name);
  };

  const togglePaid = (paid) => onChange(
    { paid },
    `${item.label} marked as ${paid ? 'paid' : 'unpaid'}`
  );

  return (
    <div className="group">
      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleCardClick}
              className={`w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left transition-all ${canTogglePaid ? 'pr-16' : 'pr-10'} ${isUploading ? 'opacity-60' : ''} ${tone.btn}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${tone.iconWrap}`}>
                {tone.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold truncate">{item.label}</span>
                  {state.amount > 0 && (
                    <span className="text-sm font-bold tabular-nums flex-shrink-0">{fmtGBP(state.amount)}</span>
                  )}
                  {variance && (
                    <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0 ${tone.marker}`}>
                      <AlertTriangle className="w-2.5 h-2.5" />
                    </span>
                  )}
                </span>
                <span className="block text-[10px] leading-tight opacity-85 truncate">{subline}</span>
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" align="start" className="max-w-[300px] p-2.5">
            <p className="text-[11px] font-semibold mb-1">
              {item.label}{state.amount > 0 ? ` · ${fmtGBP(state.amount)}` : ''}
            </p>
            {state.date && <p className="text-[10px] opacity-80">{dateLabel} {formatDay(state.date)}</p>}
            {state.paid && state.paidDate && <p className="text-[10px] opacity-80">Paid {formatDay(state.paidDate)}</p>}
            {variance && (
              <p className="text-[10px] opacity-90 pt-1 mt-1 border-t border-white/20">
                {variance.reason}: calculated {fmtGBP(variance.calculated)}, invoiced {fmtGBP(variance.invoiced)}
              </p>
            )}
            {files.length > 0 ? (
              <div className="space-y-1 pt-1 mt-1 border-t border-white/20">
                {files.map((doc) => (
                  <div key={doc.id}>
                    <p className="text-[11px] break-all leading-snug">{doc.file_name || doc.file_url.split('/').pop()}</p>
                    {doc.uploaded_at && <p className="text-[10px] opacity-70">Uploaded {formatDay(doc.uploaded_at)}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] opacity-80 pt-1 mt-1 border-t border-white/20">{hint}</p>
            )}
          </TooltipContent>
        </Tooltip>

        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {canTogglePaid && (
            <button
              type="button"
              onClick={() => togglePaid(!state.paid)}
              title={state.paid ? 'Mark unpaid' : 'Mark paid'}
              className={`p-1.5 rounded-md ${tone.menu}`}
            >
              {state.paid ? <Undo2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" strokeWidth={3} />}
            </button>
          )}

          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="More actions"
                className={`p-1.5 rounded-md transition-opacity ${tone.menu} ${menuOpen ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'}`}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {files.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {files.length} file{files.length === 1 ? '' : 's'}
                  </DropdownMenuLabel>
                  {files.map((doc) => (
                    <div key={doc.id} className="rounded-md hover:bg-muted">
                      {renamingId === doc.id ? (
                        <div className="flex items-center gap-1 px-1.5 py-1">
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') submitRename(doc);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            autoFocus
                            className="h-7 text-xs"
                          />
                          <button onClick={() => submitRename(doc)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Save">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setRenamingId(null)} className="p-1 text-gray-400 hover:bg-muted rounded" title="Cancel">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 pl-2">
                          <button
                            onClick={() => { setMenuOpen(false); onViewFile(doc.file_url); }}
                            title={doc.file_name || doc.file_url.split('/').pop()}
                            className="flex-1 min-w-0 text-left text-xs py-1.5 truncate hover:text-primary"
                          >
                            {doc.file_name || doc.file_url.split('/').pop()}
                          </button>
                          <button
                            onClick={() => { setRenamingId(doc.id); setRenameValue(doc.file_name || ''); }}
                            className="p-1 text-gray-400 hover:text-primary rounded flex-shrink-0"
                            title="Rename"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => { setMenuOpen(false); onDeleteFile(doc); }}
                            className="p-1 text-gray-400 hover:text-red-500 rounded flex-shrink-0"
                            title="Remove"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem onSelect={() => fileInputRef.current?.click()} className="text-xs">
                <Upload className="w-3.5 h-3.5" /> Add file
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDetailsOpen((v) => !v)} className="text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5" /> {detailsOpen ? 'Hide details' : 'Edit details'}
              </DropdownMenuItem>

              {!isDocument && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => togglePaid(!state.paid)} className="text-xs">
                    {state.paid ? <Undo2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    {state.paid ? 'Mark unpaid' : 'Mark paid'}
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => onChange(
                  { not_applicable: !state.notApplicable },
                  `${item.label} marked as ${state.notApplicable ? 'applicable again' : 'not applicable'}`
                )}
                className="text-xs"
              >
                {state.notApplicable ? <Check className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                {state.notApplicable ? 'Mark as applicable' : 'Mark not applicable'}
              </DropdownMenuItem>

              {isDerived && state.invoicedLocked && (
                <DropdownMenuItem
                  onSelect={() => onChange(
                    { amount: null },
                    `${item.label} amount unlocked — follows the calculated figure again`
                  )}
                  className="text-xs"
                >
                  <Unlock className="w-3.5 h-3.5" /> Unlock amount
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) onUpload(item, e.target.files); e.target.value = ''; }}
        />
      </div>

      {detailsOpen && <InvoiceItemDetails item={item} state={state} onChange={onChange} />}
    </div>
  );
}