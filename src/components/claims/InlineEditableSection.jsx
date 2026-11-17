import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { Button } from '@/components/ui/button';

import { Edit, Save, X, Check, Pencil } from 'lucide-react';
import { format } from 'date-fns';

// A claim section made of label / value fields (Key dates, Estimate details).
// Each field has its own pencil: tap it, change the value, green tick saves just
// that field (plus anything worked out from it, such as a gross figure), the cross
// puts it back. "Edit all" still opens every field at once.

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
    const { isEditing: editingAll, editingField, draft, setField, startField, saveField, cancelField, canEdit } = useInlineEdit();
    const editingThis = editingField === name;
    const isEditing = editingAll || editingThis;
    const inputRef = useRef(null);
    const value = draft[name];
    const isEmpty = !isEditing && (value === null || value === undefined || value === '' || value === 0);
    const display = isEmpty ? 'Not set' : formatDisplay(value, isDate, isCurrency);
    const inputType = isDate ? 'date' : (isCurrency || type === 'number' ? 'number' : type);
    const canPencil = canEdit && !readOnly && !editingAll && !editingThis;

    useEffect(() => {
        if (editingThis) inputRef.current?.focus({ preventScroll: true });
    }, [editingThis]);

    const handleChange = (e) => {
        let v;
        if (isDate) v = e.target.value;
        else if (isCurrency || type === 'number') v = e.target.value === '' ? '' : Number(e.target.value);
        else v = e.target.value;
        setField(name, v);
        if (onChange) onChange(v);
    };

    const onKeyDown = (e) => {
        if (!editingThis) return;
        if (e.key === 'Enter') { e.preventDefault(); saveField(); }
        if (e.key === 'Escape') { e.preventDefault(); cancelField(); }
    };

    const inputVal = isDate ? toInputDate(value) : (value ?? '');
    const valueClass = `text-sm font-medium ${(isCurrency || typeof value === 'number') ? 'tabular-nums' : ''}`;

    const content = isEditing ? (
        <input
            ref={inputRef}
            type={inputType}
            step={isCurrency || type === 'number' ? '0.01' : undefined}
            value={inputVal}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            readOnly={readOnly}
            aria-label={label}
            className={`w-full min-w-0 h-9 px-2.5 ${valueClass} text-foreground bg-card border border-input rounded-lg outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
        />
    ) : (
        <div className={`${valueClass} break-words min-w-0 ${isEmpty ? 'text-warning-fg !font-normal' : 'text-foreground'} ${readOnly ? 'opacity-60' : ''}`}>
            {display}
        </div>
    );

    const tail = editingThis ? (
        <span className="flex items-center gap-1 flex-shrink-0">
            <button type="button" onClick={saveField} aria-label={`Save ${label}`} title="Save" className="w-9 h-9 rounded-lg bg-success text-on-solid flex items-center justify-center shadow-card">
                <Check className="w-[18px] h-[18px]" aria-hidden="true" />
            </button>
            <button type="button" onClick={cancelField} aria-label="Cancel" title="Cancel" className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center">
                <X className="w-[18px] h-[18px]" aria-hidden="true" />
            </button>
        </span>
    ) : canPencil ? (
        <button
            type="button"
            onClick={() => startField(name)}
            aria-label={`Edit ${label}`}
            title={`Edit ${label}`}
            className="flex-shrink-0 w-8 h-8 -my-1 -mr-1.5 rounded-lg flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted active:bg-muted"
        >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
    ) : null;

    if (bare) {
        return (
            <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
                <div className="flex items-center gap-2 min-h-[32px]"><div className="flex-1 min-w-0">{content}</div>{tail}</div>
            </div>
        );
    }

    return (
        <div className={`py-2 px-3 rounded-lg transition-colors ${editingThis ? 'bg-card ring-2 ring-ring/30' : isEmpty ? 'bg-warning-bg/60 border border-warning/25' : isEditing ? 'bg-muted/30' : 'hover:bg-muted/50'}`}>
            <div className="text-xs font-medium text-muted-foreground mb-0.5">{label}</div>
            <div className="flex items-center gap-2 min-h-[28px]"><div className="flex-1 min-w-0">{content}</div>{tail}</div>
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
        isEditing, editingField, draft, setField, canEdit,
        startField, saveField: handleSave, cancelField: handleCancel,
    };

    return (
        <InlineEditContext.Provider value={ctx}>
            <div className="bg-card border border-border rounded-xl p-4 md:p-5 shadow-card">
                <div className="flex justify-between items-center min-h-[2.75rem] pb-3 mb-4 border-b border-border">
                    <div className="flex items-center gap-2.5 text-left flex-grow min-w-0">
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                        <h3 className="text-[15px] font-semibold text-foreground truncate">{title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {canEdit && !isEditing && (
                            <Button variant="ghost" size="sm" onClick={() => { setEditingField(null); setDraft(claim); setIsEditing(true); }} className="gap-1.5 text-muted-foreground" aria-label={`Edit all of ${title}`}>
                                <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                                Edit all
                            </Button>
                        )}
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
