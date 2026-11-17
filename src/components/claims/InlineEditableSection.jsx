import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { Button } from '@/components/ui/button';

import { Edit, Save, X, Check, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import FieldEditSheet from '../shared/FieldEditSheet';

// A claim section made of label / value fields (Key dates, Estimate details).
// Each field has its own pencil: tap it and an edit box opens (above the keyboard on
// a phone). Save keeps just that field (plus anything worked out from it, such as a
// gross figure); Cancel puts it back. The field itself never changes look.

const toInputDate = (date) => {
    if (!date) return '';
    try { return new Date(date).toISOString().split('T')[0]; } catch { return ''; }
};

const formatDisplay = (value, isDate, isCurrency) => {
    if (value === null || value === undefined || value === '') return '-';
    if (isDate) { try { return format(new Date(value), 'dd/MM/yyyy'); } catch { return 'Invalid Date'; } }
    if (isCurrency && typeof value === 'number') return `£${value.toFixed(2)}`;
    return value;
};

const InlineEditContext = createContext({ isEditing: false, editingField: null, draft: {}, setField: () => {} });
export const useInlineEdit = () => useContext(InlineEditContext);

export function InlineField({ label, name, type = 'text', isCurrency = false, isDate = false, placeholder, bare = false, readOnly = false, onChange }) {
    const { isEditing: editingAll, editingField, draft, setField, startField, saveField, cancelField, canEdit, savedValues } = useInlineEdit();
    const editingThis = editingField === name;
    const isEditing = editingAll; // the field only turns into a box when every field is open
    const inputRef = useRef(null);
    const value = draft[name];
    const isEmpty = !isEditing && (value === null || value === undefined || value === '' || value === 0);
    const display = isEmpty ? 'Not set' : formatDisplay(value, isDate, isCurrency);
    const inputType = isDate ? 'date' : (isCurrency || type === 'number' ? 'number' : type);
    const canPencil = canEdit && !readOnly && !editingAll && !editingThis;
    const claimValue = savedValues?.[name];

    const handleChange = (e) => {
        let v;
        if (isDate) v = e.target.value;
        else if (isCurrency || type === 'number') v = e.target.value === '' ? '' : Number(e.target.value);
        else v = e.target.value;
        setField(name, v);
        if (onChange) onChange(v);
    };

    const inputVal = isDate ? toInputDate(value) : (value ?? '');
    const valueClass = `text-sm font-medium ${(isCurrency || typeof value === 'number') ? 'tabular-nums' : ''}`;

    const input = (big) => (
        <input
            ref={inputRef}
            type={inputType}
            step={isCurrency || type === 'number' ? '0.01' : undefined}
            inputMode={isCurrency || type === 'number' ? 'decimal' : undefined}
            value={inputVal}
            onChange={handleChange}
            placeholder={placeholder}
            readOnly={readOnly}
            aria-label={label}
            className={`w-full min-w-0 ${big ? 'h-12 px-3.5 text-base rounded-xl bg-muted/40' : `h-9 px-2.5 ${valueClass} rounded-lg bg-card`} font-medium text-foreground border border-input outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
        />
    );

    // While this field's edit box is open the field still shows its saved value.
    const shown = editingThis ? (claimValue ?? null) : value;
    const shownEmpty = shown === null || shown === undefined || shown === '' || shown === 0;
    const content = isEditing ? input(false) : (
        <div className={`${valueClass} break-words min-w-0 ${(editingThis ? shownEmpty : isEmpty) ? 'text-warning-fg !font-normal' : 'text-foreground'} ${readOnly ? 'opacity-60' : ''}`}>
            {editingThis ? (shownEmpty ? 'Not set' : formatDisplay(shown, isDate, isCurrency)) : display}
        </div>
    );

    const box = (
        <FieldEditSheet open={editingThis} title={label} onSave={saveField} onCancel={cancelField}>
            {input(true)}
        </FieldEditSheet>
    );

    const tail = canPencil || editingThis ? (
        <button
            type="button"
            onClick={() => startField(name)}
            aria-label={`Edit ${label}`}
            title={`Edit ${label}`}
            className="flex-shrink-0 w-9 h-9 -my-1 rounded-xl border border-border bg-card shadow-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-input active:scale-95 transition"
        >
            <Pencil className="w-4 h-4" aria-hidden="true" />
        </button>
    ) : null;

    if (bare) {
        return (
            <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
                <div className="flex items-center gap-2 min-h-[32px]"><div className="flex-1 min-w-0">{content}</div>{tail}</div>
                {box}
            </div>
        );
    }

    return (
        <div className={`py-2 px-3 rounded-lg transition-colors ${(editingThis ? shownEmpty : isEmpty) ? 'bg-warning-bg/60 border border-warning/25' : isEditing ? 'bg-muted/30' : 'hover:bg-muted/50'}`}>
            <div className="text-xs font-medium text-muted-foreground mb-0.5">{label}</div>
            <div className="flex items-center gap-2 min-h-[28px]"><div className="flex-1 min-w-0">{content}</div>{tail}</div>
            {box}
        </div>
    );
}

export default function InlineEditableSection({ title, icon: Icon, claim, onUpdate, children, canEdit = true }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [draft, setDraft] = useState(claim);

    useEffect(() => { setDraft(claim); setIsEditing(false); setEditingField(null); }, [claim]);

    const setField = (name, value) => setDraft(prev => ({ ...prev, [name]: value }));

    const handleSave = () => {
        const cleaned = { ...draft };
        Object.keys(cleaned).forEach(k => { if (cleaned[k] === '') cleaned[k] = null; });
        onUpdate(cleaned);
        setIsEditing(false);
        setEditingField(null);
    };

    const handleCancel = () => { setDraft(claim); setIsEditing(false); setEditingField(null); };

    // One field at a time: opening another field drops any unsaved change to the last one.
    const startField = (name) => { setDraft(claim); setIsEditing(false); setEditingField(name); };

    const ctx = {
        isEditing, editingField, draft, setField, canEdit, savedValues: claim,
        startField, saveField: handleSave, cancelField: handleCancel,
    };

    return (
        <InlineEditContext.Provider value={ctx}>
            <div className="bg-card rounded-2xl p-4 md:p-5 m-card-tight shadow-card">
                <div className="flex justify-between items-center min-h-[2.75rem] pb-3 mb-4 border-b border-border m-card-head">
                    <div className="flex items-center gap-2.5 text-left flex-grow min-w-0">
                        <span className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-foreground" aria-hidden="true" />
                        </span>
                        <h3 className="text-base font-bold tracking-tight text-foreground truncate">{title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {isEditing && (
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" onClick={handleCancel} className="h-8 gap-1.5">
                                    <X className="w-3.5 h-3.5" /> Cancel
                                </Button>
                                <Button size="sm" onClick={handleSave} className="h-8 gap-1.5">
                                    <Save className="w-3.5 h-3.5" /> Save
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    {children}
                </div>
            </div>
        </InlineEditContext.Provider>
    );
}
