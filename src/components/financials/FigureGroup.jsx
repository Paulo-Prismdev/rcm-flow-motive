import React, { useEffect, useState } from 'react';
import { MacButton, MacPrimaryButton } from './MacButtons';
import { MacGroup } from './MacGroup';
import FigureRow, { toDraft } from './FigureRow';

/**
 * A group of figures under one heading, as System Settings sets them out: labels
 * down the left, values down the right, captions in grey. One Edit button in the
 * heading line opens every row in the group at once, and only Save writes anything
 * — so figures are still changed deliberately, and a discarded draft can never be
 * saved later by accident.
 */
export default function FigureGroup({ title, rows, editing, onEdit, onDone, onSave, footer }) {
  const [drafts, setDrafts] = useState({});

  // Each time the edit step opens it starts from the saved figures.
  useEffect(() => { if (editing) setDrafts({}); }, [editing]);

  const draftOf = (row) => (drafts[row.key] !== undefined ? drafts[row.key] : toDraft(row.value));
  const editable = rows.filter((row) => row.editable !== false);
  const changed = editable.filter((row) => draftOf(row) !== toDraft(row.value));

  const save = () => {
    const changes = Object.fromEntries(changed.map((row) => [row.key, draftOf(row)]));
    onDone();
    if (changed.length > 0) onSave(changes);
  };

  const action = editable.length === 0 ? null : editing ? (
    <span className="flex items-center gap-1">
      <MacButton onClick={onDone} className="h-6 px-2 text-[11px]">Cancel</MacButton>
      <MacPrimaryButton onClick={save} className="h-6 px-2 text-[11px]">Save</MacPrimaryButton>
    </span>
  ) : (
    <MacButton onClick={onEdit} className="h-6 px-2 text-[11px]">Edit</MacButton>
  );

  return (
    <div onKeyDown={(event) => { if (editing && event.key === 'Escape') onDone(); }}>
      <MacGroup
        title={title}
        action={action}
        footer={footer}
      >
        {rows.map((row) => (
          <FigureRow
            key={row.key}
            {...row}
            editing={editing}
            draft={draftOf(row)}
            onDraft={(value) => setDrafts((open) => ({ ...open, [row.key]: value }))}
          />
        ))}
      </MacGroup>
    </div>
  );
}