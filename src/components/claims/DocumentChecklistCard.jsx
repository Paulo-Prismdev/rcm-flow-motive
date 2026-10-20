import React, { useRef } from 'react';
import { Check, X, Ban, Clock, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import ItemActionMenu, { ActionRow, ActionDivider } from '@/components/shared/ItemActionMenu';
import { TRACKER_TONES } from './trackerTones';

// One checklist item, shown as a light card edged in its status colour. Clicking
// the card opens its action menu: the copy on file to open at the top, and every
// other action the item carries underneath, so the card itself only ever shows
// the document's name.
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
  item, status, files, uploading, dateRecorded,
  keyDateLabel, keyDateValue, autoFocusKeyDate, onKeyDateChange,
  menuOpen, onMenuOpenChange,
  dragActive, isDropTarget, onDropTargetEnter, onDropTargetLeave, onDrop,
  onUpload, onView, onRename, onRemove, onStatusChange,
}) {
  const fileInputRef = useRef(null);

  // A Key Dates date recorded on its own never marks the document received: with
  // nothing filed it shows amber.
  const dateOnly = status === 'outstanding' && !!dateRecorded;
  const tone = TRACKER_TONES[dateOnly ? 'warning' : TONE_KEYS[status]] || TRACKER_TONES.neutral;
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

  const pickFile = () => fileInputRef.current?.click();
  const fileName = (doc) => doc.file_name || doc.file_url.split('/').pop();

  const menuFiles = files.map((doc) => ({
    id: doc.id,
    name: fileName(doc),
    onOpen: () => onView(doc.file_url),
    onRename: (name) => onRename(doc, name),
    onRemove: () => onRemove(doc),
  }));

  const hint = status === 'not_applicable'
    ? 'Not applicable — open the menu to change it'
    : 'No copy attached yet';

  const button = (
    <button
      type="button"
      className={`w-full flex items-center gap-2 rounded-[10px] border border-l-4 px-2.5 py-2 text-left transition-all ${uploading ? 'opacity-60' : ''} ${tone.card}`}
    >
      {(GLYPHS[status] || dateOnly) && (
        <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${tone.iconWrap}`}>
          {dateOnly ? <Clock className="w-3 h-3" strokeWidth={3} /> : GLYPHS[status]}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-foreground">{item.label}</span>
        {dateOnly && (
          <span className="block truncate text-[10px] font-normal text-amber-700 dark:text-amber-300">
            Date recorded, copy not attached
          </span>
        )}
      </span>
      {status === 'not_required' && (
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex-shrink-0">optional</span>
      )}
      {status === 'not_applicable' && (
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex-shrink-0">n/a</span>
      )}
      {dateRecorded && (
        <span className="text-[10px] tabular-nums text-muted-foreground flex-shrink-0">{formatDay(dateRecorded)}</span>
      )}
    </button>
  );

  const tooltip = (
    <>
      <p className="text-[11px] font-semibold mb-1">{item.label}</p>
      {files.length > 0 ? (
        <div className="space-y-1">
          {files.map((doc) => (
            <div key={doc.id}>
              <p className="text-[11px] break-all leading-snug">{fileName(doc)}</p>
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
    </>
  );

  return (
    <div
      className={`group relative rounded-[10px] ${dragActive && !isDropTarget ? 'border-2 border-dashed border-amber-400/60' : 'border-2 border-transparent'}`}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
      onDragEnter={(e) => { e.preventDefault(); onDropTargetEnter(); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) onDropTargetLeave(); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
    >
      <ItemActionMenu
        open={menuOpen}
        onOpenChange={onMenuOpenChange}
        button={button}
        tooltip={tooltip}
        title={item.label}
        files={menuFiles}
        onUpload={pickFile}
        onAddFile={pickFile}
      >
        {(close) => (
          <>
            <ActionDivider />
            {statusOptions.map((opt) => (
              <ActionRow
                key={opt.key}
                label={opt.label}
                trailing={status === opt.key ? <Check className="w-3.5 h-3.5" /> : null}
                onClick={() => { close(); onStatusChange(opt.key); }}
              />
            ))}

            {keyDateLabel && (
              <>
                <ActionDivider />
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
          </>
        )}
      </ItemActionMenu>

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