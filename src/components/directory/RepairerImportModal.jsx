import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import ImportSection from './ImportSection';
import ImportRowCard from './ImportRowCard';
import ImportPossibleCard from './ImportPossibleCard';

const placeFacts = (row) => [
  row.town && { label: 'Town', value: row.town },
  row.postcode && { label: 'Postcode', value: row.postcode },
  row.group_name && { label: 'Group', value: row.group_name },
  row.map_group && { label: 'Map group', value: row.map_group },
].filter(Boolean);

const mapNote = (row) => {
  if (row.map_ok) return 'Map location worked out';
  if (row.map_failed) return 'No map location found — check the postcode';
  return '';
};

/**
 * Everything a spreadsheet import would do, before it does any of it.
 * Nothing is saved until the button at the bottom is pressed.
 */
export default function RepairerImportModal({ open, preview, applying, result, onClose, onConfirm }) {
  const [decisions, setDecisions] = useState({});

  useEffect(() => { setDecisions({}); }, [preview]);

  const totals = preview?.totals || {};
  const possible = preview?.possible || [];

  const applyList = useMemo(() => {
    if (!preview) return [];
    const list = [
      ...(preview.create || []).map((row) => ({ action: 'create', fields: row.fields })),
      ...(preview.update || []).map((row) => ({ action: 'update', id: row.id, fields: row.fields })),
    ];
    possible.forEach((row, index) => {
      const choice = decisions[index] || 'skip';
      if (choice === 'existing' && Object.keys(row.update_fields || {}).length > 0) {
        list.push({ action: 'update', id: row.candidate.id, fields: row.update_fields });
      }
      if (choice === 'create') list.push({ action: 'create', fields: row.create_fields });
    });
    return list;
  }, [preview, possible, decisions]);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !applying) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Repairer import</DialogTitle>
          <DialogDescription>
            {result
              ? 'Import finished.'
              : 'Nothing has been saved yet. Existing repairers only gain the details the spreadsheet actually contains — empty cells never clear anything.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-1">
          {result ? (
            <div className="rounded-[10px] border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-[13px] font-semibold text-foreground">
                  {result.created} created · {result.updated} updated
                </p>
              </div>
              {(result.errors || []).length > 0 && (
                <ul className="mt-2 space-y-1">
                  {result.errors.map((message) => (
                    <li key={message} className="flex items-start gap-1.5 text-[11px] text-destructive">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      {message}
                    </li>
                  ))}
                </ul>
              )}
              {result.created === 0 && result.updated === 0 && (result.errors || []).length === 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">There was nothing to change.</p>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-[10px] border border-border bg-card p-3">
                <div className="flex flex-wrap gap-1.5">
                  <Chip label="new" value={totals.create || 0} tone="create" />
                  <Chip label="existing" value={totals.update || 0} tone="update" />
                  <Chip label="to confirm" value={totals.possible || 0} tone="possible" />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {totals.rows || 0} rows in the file
                  {totals.skipped ? ` · ${totals.skipped} blank rows skipped` : ''}
                  {totals.unchanged ? ` · ${totals.unchanged} already up to date` : ''}
                </p>
                {(preview?.columns || []).length > 0 && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Columns read: {preview.columns.map((column) => column.header).join(', ')}
                  </p>
                )}
              </div>

              {possible.length > 0 && (
                <ImportSection
                  title="Possible matches — please confirm"
                  subtitle="These are left out unless you choose."
                  count={possible.length}
                  tone="possible"
                >
                  {possible.map((row, index) => (
                    <ImportPossibleCard
                      key={`${row.row}-${row.name}`}
                      row={row}
                      choice={decisions[index] || 'skip'}
                      onChoose={(choice) => setDecisions((prev) => ({ ...prev, [index]: choice }))}
                    />
                  ))}
                </ImportSection>
              )}

              {(preview?.update || []).length > 0 && (
                <ImportSection
                  title="Existing — will be updated"
                  subtitle="Only the fields listed change."
                  count={preview.update.length}
                  tone="update"
                >
                  {preview.update.map((row) => (
                    <ImportRowCard
                      key={`${row.row}-${row.id}`}
                      title={row.existing_name || row.name}
                      row={row.row}
                      changes={row.changes}
                      note={row.map_updated ? 'Map location worked out from the postcode' : ''}
                    />
                  ))}
                </ImportSection>
              )}

              {(preview?.create || []).length > 0 && (
                <ImportSection
                  title="New — will be created"
                  count={preview.create.length}
                  tone="create"
                >
                  {preview.create.map((row) => (
                    <ImportRowCard
                      key={`${row.row}-${row.name}`}
                      title={row.name}
                      row={row.row}
                      facts={placeFacts(row)}
                      note={mapNote(row)}
                    />
                  ))}
                </ImportSection>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border pt-3">
          {result ? (
            <Button onClick={onClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={applying}>Cancel</Button>
              <Button onClick={() => onConfirm(applyList)} disabled={applying || applyList.length === 0}>
                {applying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {applying ? 'Saving...' : `Save ${applyList.length} change${applyList.length === 1 ? '' : 's'}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TONE = {
  create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  update: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  possible: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

function Chip({ label, value, tone }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${TONE[tone]}`}>
      {value} {label}
    </span>
  );
}