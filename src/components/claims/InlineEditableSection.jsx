import React, { useState, useEffect, createContext, useContext } from 'react';
import { Button } from '@/components/ui/button';

import { Edit, Save, X } from 'lucide-react';
import { format } from 'date-fns';

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

const InlineEditContext = createContext({ isEditing: false, draft: {}, setField: () => {} });
export const useInlineEdit = () => useContext(InlineEditContext);

export function InlineField({ label, name, type = 'text', isCurrency = false, isDate = false, placeholder, bare = false, readOnly = false, onChange }) {
    const { isEditing, draft, setField } = useInlineEdit();
    const value = draft[name];
    const isEmpty = !isEditing && (value === null || value === undefined || value === '' || value === 0);
    const display = formatDisplay(value, isDate, isCurrency);
    const inputType = isDate ? 'date' : (isCurrency || type === 'number' ? 'number' : type);

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

    const content = isEditing ? (
        <input
            type={inputType}
            step={isCurrency || type === 'number' ? '0.01' : undefined}
            value={inputVal}
            onChange={handleChange}
            placeholder={placeholder}
            readOnly={readOnly}
            style={{ height: '24px', minHeight: '24px', maxHeight: '24px', padding: '0 8px', lineHeight: '24px' }}
            className={`w-full ${valueClass} ${isEmpty ? 'text-amber-500' : 'text-foreground'} bg-muted/50 dark:bg-gray-800 border border-border/70 rounded-[5px] outline-none focus:border-ring focus:ring-1 focus:ring-ring/40 ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
        />
    ) : (
        <div className={`${valueClass} ${isEmpty ? 'text-amber-500' : 'text-foreground'}`}>
            {display}
        </div>
    );

    if (bare) {
        return (
            <div>
                <div className="text-xs font-semibold text-foreground-muted mb-1">{label}</div>
                <div className="flex items-center min-h-[24px]">{content}</div>
            </div>
        );
    }

    return (
        <div className={`py-2 px-3 rounded-[8px] transition-colors ${isEmpty ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700' : isEditing ? 'bg-muted/30' : 'hover:bg-muted/50'}`}>
            <div className="text-[11px] font-medium text-muted-foreground mb-0.5">{label}</div>
            <div className="flex items-center min-h-[24px]">{content}</div>
        </div>
    );
}

export default function InlineEditableSection({ title, icon: Icon, claim, onUpdate, children, canEdit = true }) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(claim);

    useEffect(() => { setDraft(claim); setIsEditing(false); }, [claim]);

    const setField = (name, value) => setDraft(prev => ({ ...prev, [name]: value }));

    const handleSave = () => {
        const cleaned = { ...draft };
        Object.keys(cleaned).forEach(k => { if (cleaned[k] === '') cleaned[k] = null; });
        onUpdate(cleaned);
        setIsEditing(false);
    };

    const handleCancel = () => { setDraft(claim); setIsEditing(false); };

    return (
        <InlineEditContext.Provider value={{ isEditing, draft, setField }}>
            <div className="bg-card border border-border rounded-[10px] p-4 md:p-5 shadow-sm">
                <div className="flex justify-between items-center pb-3 mb-4 border-b border-border">
                    <div className="flex items-center gap-2.5 text-left flex-grow">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {canEdit && !isEditing && (
                            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8 hover:text-gold">
                                <Edit className="w-4 h-4" />
                            </Button>
                        )}
                        {isEditing && (
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" onClick={handleCancel} className="h-8 gap-1.5">
                                    <X className="w-3.5 h-3.5" /> Cancel
                                </Button>
                                <Button size="sm" onClick={handleSave} className="h-8 gap-1.5 bg-primary text-primary-foreground">
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