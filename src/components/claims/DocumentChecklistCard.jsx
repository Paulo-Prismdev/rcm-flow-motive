import React, { useRef, useState } from 'react';
import { Check, X, Ban, MoreVertical, Upload, Pencil, Trash2, CalendarDays } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { TRACKER_TONES } from './trackerTones';

// One checklist item, shown as a light card edged in its status colour. Every
// action the item carries lives behind the discreet menu, so the card itself
// only ever shows the document name.
const TONE_KEYS = {
  received: 'positive',
  outstanding: 'negative',
  not_required: 'neutral',
  not_applicable: 'faded',
};

const GLYPHS = {
  received: <Check className="w-3 h-3" strokeWidth={3} />,
  outstanding: <X className="w-3 h-3" strokeWidth={3} />,
  not_required: null,
  not_applicable: <Ban className="w-3 h-3" />,
};

const formatDay = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function DocumentChecklistCard({
  item, status, files, uploading,
  keyDateLabel, keyDateValue, autoFocusKeyDate, onKeyDateChange,
  menuOpen, onMenuOpenChange,
  dragActive, isDropTarget, onDropTargetEnter, onDropTargetLeave, onDrop,
  onUpload, onView, onRename, onRemove, onStatusChange,
}) {
  const fileInputRef = useRef(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const tone = TRACKER_TONES[TONE_KEYS[status]] || TRACKER_TONES.neutral;
  const statusOptions = item.required
    ? [
        { key: 'outstanding', label: 'Expected (missing)' },
        { key: 'not_applicable', label: 'Not applicable' },
      ]
    : [
        { key: 'not_required', label: 'Optional (default)' },
        { key: 'outstanding', label: 'Expected' },
        { key: 'not_applicable', label: 'Not applicable' },
      ];

  const handleCardClick = () => {
    if (uploading) return;
    if (status === 'received') {
      if (files.length === 1) onView(files[0].file_url);
      else onMenuOpenChange(true);
      return;
    }
    if (status === 'not_applicable') {
      onMenuOpenChange(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const submitRename = (doc) => {
    const name = renameValue.trim();
    setRenamingId(null);
    if (name && name !== doc.file_name) onRename(doc, name);
  };

  const hint = status === 'received'
    ? (files.length === 1 ? 'Click to open the document' : 'Click to choose a document')
    : status === 'not_applicable'
      ? 'Not applicable — use ⋮ to change'
      : 'Click to upload this document';

  return (
    <div
      className={`group relative rounded-[10px] ${dragActive && !isDropTarget ? 'border-2 border-dashed border-amber-400/60' : 'border-2 border-transparent'}`}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
      onDragEnter={(e) => { e.preventDefault(); onDropTargetEnter(); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) onDropTargetLeave(); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleCardClick}
            className={`w-full flex items-center gap-2 rounded-[10px] border border-l-4 px-2.5 py-2 pr-9 text-left transition-all ${uploading ? 'opacity-60' : ''} ${tone.card}`}
          >
            {GLYPHS[status] && (
              <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${tone.iconWrap}`}>
                {GLYPHS[status]}
              </span>
            )}
            <span className="truncate min-w-0 flex-1 text-xs font-semibold text-foreground">{item.label}</span>
            {status === 'not_required' && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex-shrink-0">optional</span>
            )}
            {status === 'not_applicable' && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex-shrink-0">n/a</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-[280px] p-2.5">
          <p className="text-[11px] font-semibold mb-1">{item.label}</p>
          {files.length > 0 ? (
            <div className="space-y-1">
              {files.map((doc) => (
                <div key={doc.id}>
                  <p className="text-[11px] break-all leading-snug">{doc.file_name || doc.file_url.split('/').pop()}</p>
                  {doc.uploaded_at && <p className="text-[10px] opacity-70">Uploaded {formatDay(doc.uploaded_at)}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] opacity-80">{hint}</p>
          )}
          {keyDateLabel && keyDateValue && (
            <p className="text-[10px] opacity-80 pt-1 mt-1 border-t border-white/20">
              {keyDateLabel}: {formatDay(keyDateValue)}
            </p>
          )}
        </TooltipContent>
      </Tooltip>

      <DropdownMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="More actions"
            className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-opacity ${tone.menu} ${menuOpen ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'}`}
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
                        onClick={() => { onMenuOpenChange(false); onView(doc.file_url); }}
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
                        onClick={() => { onMenuOpenChange(false); onRemove(doc); }}
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

          <DropdownMenuSeparator />
          {statusOptions.map((opt) => (
            <DropdownMenuItem key={opt.key} onSelect={() => onStatusChange(opt.key)} className="text-xs">
              {status === opt.key ? <Check className="w-3.5 h-3.5" /> : <span className="w-3.5" />}
              {opt.label}
            </DropdownMenuItem>
          ))}

          {keyDateLabel && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <CalendarDays className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{keyDateLabel}</span>
                </div>
                <Input
                  type="date"
                  value={keyDateValue}
                  onChange={(e) => onKeyDateChange(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  autoFocus={autoFocusKeyDate}
                  className="h-7 text-xs"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Sets this date on the Key Dates screen.</p>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) onUpload(e.target.files); e.target.value = ''; }}
      />

      {isDropTarget && (
        <div className="pointer-events-none absolute inset-0 rounded-[10px] ring-2 ring-amber-400 bg-background/85 flex items-center justify-center">
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Drop to file here</span>
        </div>
      )}
    </div>
  );
}