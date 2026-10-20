import React, { cloneElement, useState } from 'react';
import { Check, Eye, Pencil, Trash2, Upload, X } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

/** One option in the menu. A plain row, so the same list serves the popup and the phone panel. */
export function ActionRow({
  icon, label, hint, trailing, onClick, disabled, title, danger, className = '',
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40 ${danger ? 'text-red-600 dark:text-red-400' : ''} ${className}`}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">
        {label}
        {hint && <span className="block truncate text-[10px] font-normal text-muted-foreground">{hint}</span>}
      </span>
      {trailing}
    </button>
  );
}

/** A divider between groups of options. */
export function ActionDivider() {
  return <div className="-mx-0.5 my-1 h-px bg-muted" />;
}

/**
 * The one way into an item's actions. Clicking the item's own button opens this
 * menu — no separate ⋮ — with the main action set apart at the top: the copy on
 * file to open, or the upload that puts one there. Everything else the item
 * offers at that moment sits underneath. A phone slides the same menu up from
 * the bottom of the screen; a desktop machine shows it beside the button.
 *
 * The button itself is rendered by the caller, so the menu never changes how it
 * looks — only what happens when it is clicked.
 */
export default function ItemActionMenu({
  open, onOpenChange, button, tooltip, title,
  files = [], onUpload, onAddFile, addLabel = 'Add another file', children,
}) {
  const isMobile = useIsMobile();
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  // The hover tip steps aside while the menu is open, so the two never stack.
  const [tipOpen, setTipOpen] = useState(false);

  const close = () => onOpenChange(false);
  const run = (fn) => () => { close(); fn?.(); };
  const hasFiles = files.length > 0;

  const submitRename = (file) => {
    const name = renameValue.trim();
    setRenamingId(null);
    if (name && name !== file.name) file.onRename?.(name);
  };

  const options = typeof children === 'function' ? children(close) : children;

  const content = (
    <>
      {/* The main action: the copy on file, or the upload that puts one there. */}
      <div className="rounded-md bg-primary/10 p-1">
        {!hasFiles && (
          <button
            type="button"
            onClick={run(onUpload)}
            className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            <Upload className="w-4 h-4 flex-shrink-0" />
            <span className="min-w-0 flex-1 truncate">Upload a copy</span>
          </button>
        )}

        {hasFiles && files.length === 1 && (
          <button
            type="button"
            onClick={run(() => files[0].onOpen?.())}
            className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            <Eye className="w-4 h-4 flex-shrink-0" />
            <span className="min-w-0 flex-1 truncate">View document</span>
          </button>
        )}

        {files.length > 1 && (
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-primary">
            <Eye className="w-4 h-4 flex-shrink-0" />
            <span className="min-w-0 flex-1">
              View document
              <span className="block text-[10px] font-normal text-muted-foreground">Pick which copy to open</span>
            </span>
          </div>
        )}

        {hasFiles && (
          <div className="space-y-0.5 pt-0.5">
            {files.map((file) => (
              <div key={file.id}>
                {renamingId === file.id ? (
                  <div className="flex items-center gap-1 px-1 py-0.5">
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') submitRename(file);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      autoFocus
                      className="h-7 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => submitRename(file)}
                      className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40 rounded"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingId(null)}
                      className="p-1 text-muted-foreground hover:bg-muted rounded"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 rounded-[6px] transition-colors hover:bg-primary/10">
                    <button
                      type="button"
                      onClick={run(() => file.onOpen?.())}
                      title={file.name}
                      className="flex-1 min-w-0 truncate py-1.5 pl-2 text-left text-xs hover:text-primary"
                    >
                      {file.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRenamingId(file.id); setRenameValue(file.name || ''); }}
                      className="p-1 text-muted-foreground hover:text-primary rounded flex-shrink-0"
                      title="Rename"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={run(() => file.onRemove?.())}
                      className="p-1 text-muted-foreground hover:text-red-500 rounded flex-shrink-0"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {hasFiles && onAddFile && (
        <>
          <ActionDivider />
          <ActionRow icon={<Upload className="w-3.5 h-3.5" />} label={addLabel} onClick={run(onAddFile)} />
        </>
      )}

      {options}
    </>
  );

  // A phone slides the menu up instead of opening a small popup beside the button.
  if (isMobile) {
    return (
      <>
        {cloneElement(button, {
          onClick: (event) => {
            button.props.onClick?.(event);
            onOpenChange(true);
          },
          'aria-haspopup': 'dialog',
        })}
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="max-h-[85vh] gap-0 rounded-t-[10px] p-0">
            <SheetHeader className="px-4 pb-1 pr-14 pt-3 text-left">
              <SheetTitle className="text-sm font-semibold">{title}</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto overscroll-contain px-2 pb-6 pt-1">{content}</div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  const trigger = <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>;

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      {tooltip ? (
        <Tooltip open={tipOpen && !open} onOpenChange={setTipOpen}>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="top" align="start" className="max-w-[300px] p-2.5">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      ) : trigger}
      <DropdownMenuContent align="end" className="w-64 p-1.5">{content}</DropdownMenuContent>
    </DropdownMenu>
  );
}