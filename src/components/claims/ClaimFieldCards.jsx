import React, { useLayoutEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, Pencil } from 'lucide-react';
import FieldEditSheet from '../shared/FieldEditSheet';
import AddressLookupInput from '../shared/AddressLookupInput';
import BrokerCombobox from '../shared/BrokerCombobox';
import InsurerCombobox from '../shared/InsurerCombobox';
import ClientCombobox from '../shared/ClientCombobox';
import ThirdPartyCombobox from '../shared/ThirdPartyCombobox';
import ExcessModeField from '../shared/ExcessModeField';
import { claimPatchFromThirdParty } from '../shared/thirdPartyFields';

// ── Claim detail screens: one look everywhere ──
// Every screen is a few small cards with a heading. Inside a card every field is the
// same row: the label, the value, and a pencil. Tapping the row (or the pencil) opens
// the edit box for that field; the screen itself never changes look.
//
// A field is described once:
//   { key, label, type, options, display(claim), value(claim), patch(value, claim),
//     readOnly, hint, multiline, group: [fields], form: Component }
// `group` edits several fields in one box (an address); `form` opens a section's
// existing form in the box (used where the fields depend on each other).

const isBlank = (v) => v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v));

export const fmtDate = (v) => {
    if (!v) return '';
    try { const d = new Date(v); return Number.isNaN(d.getTime()) ? String(v) : format(d, 'dd/MM/yyyy'); } catch { return String(v); }
};
export const fmtMoney = (v) => (isBlank(v) ? '' : `£${Number(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
export const yesNo = (v) => (v === true || v === 'Yes' ? 'Yes' : v === false || v === 'No' ? 'No' : (v || ''));
export const joinLines = (...parts) => parts.filter((p) => !isBlank(p)).join('\n');

const toInputDate = (v) => {
    if (!v) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v);
    try { return new Date(v).toISOString().slice(0, 10); } catch { return ''; }
};

function shown(def, claim) {
    if (def.display) return def.display(claim);
    const v = def.value ? def.value(claim) : claim[def.key];
    if (def.type === 'date') return fmtDate(v);
    if (def.type === 'currency') return fmtMoney(v);
    if (def.type === 'yesno' || def.type === 'bool') return isBlank(v) ? '' : yesNo(v);
    if (def.type === 'select' && def.options) {
        const o = def.options.find((x) => (x.value ?? x) === v);
        return o ? (o.label ?? o) : (v ?? '');
    }
    return isBlank(v) ? '' : String(v);
}

// Is this field still to fill in? (Read-only and optional fields never count.)
const missing = (def, claim) => !def.optional && !def.readOnly && isBlank(shown(def, claim));

// ── Building blocks ──

export function SectionShell({ title, icon: Icon, actions, children }) {
    return (
        <div className="space-y-3 max-lg:px-3 max-lg:pt-1" data-section-shell>
            <div className="max-lg:hidden flex items-center gap-2.5 px-1 min-h-[2.5rem]">
                {Icon && (
                    <span className="w-8 h-8 rounded-xl bg-card shadow-card flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-foreground" aria-hidden="true" />
                    </span>
                )}
                <h3 className="text-lg font-bold tracking-tight text-foreground flex-1 min-w-0 truncate">{title}</h3>
                {actions}
            </div>
            {children}
        </div>
    );
}

export function FieldCard({ title, action, children, wide, todo = 0, collapsible = false, defaultOpen = true, className = '' }) {
    const [open, setOpen] = useState(defaultOpen);
    const head = (
        <>
            <h4 className="text-[14.5px] font-semibold text-foreground flex-1 min-w-0 truncate">{title}</h4>
            {todo > 0 && <span className="text-xs font-medium text-warning-fg flex-shrink-0">{todo} to fill in</span>}
            {action && <span className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>{action}</span>}
            {collapsible && <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />}
        </>
    );
    return (
        <section className={`rounded-2xl bg-card shadow-card overflow-hidden ${wide ? 'xl:col-span-2' : ''} ${className}`} aria-label={title}>
            {title && (collapsible ? (
                <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center gap-2 px-4 pt-3.5 pb-2.5 text-left">
                    {head}
                </button>
            ) : (
                <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5">{head}</div>
            ))}
            {(!collapsible || open) && children}
        </section>
    );
}

export function FieldRow({ label, value, empty, onEdit, multiline, readOnly, hint, href, emptyText = 'Not set', quietEmpty = false }) {
    const isEmpty = empty ?? isBlank(value);
    const canEdit = !!onEdit && !readOnly;
    const body = isEmpty ? (
        <span className={`font-normal ${quietEmpty ? 'text-muted-foreground' : 'text-warning-fg'}`}>{emptyText}</span>
    ) : href ? (
        <a href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-link hover:underline break-all">{value}</a>
    ) : value;
    const onKey = (e) => { if (canEdit && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onEdit(); } };
    return (
        <div
            data-field-row={label}
            role={canEdit ? 'button' : undefined}
            tabIndex={canEdit ? 0 : undefined}
            onClick={canEdit ? onEdit : undefined}
            onKeyDown={onKey}
            className={`flex gap-3 px-4 py-2.5 min-h-[48px] border-t border-border first:border-t-0 ${multiline ? 'flex-col sm:flex-row sm:items-start' : 'items-center'} ${canEdit ? 'cursor-pointer hover:bg-muted/50 active:bg-muted/70' : ''} transition-colors`}
        >
            <div className={`flex-shrink-0 text-[13px] leading-snug text-muted-foreground ${multiline ? 'sm:w-36 sm:pt-[7px]' : 'w-[40%] sm:w-36'}`}>{label}</div>
            <div className={`flex items-center gap-2 flex-1 min-w-0 ${multiline ? 'w-full items-start' : ''}`}>
                <div className={`flex-1 min-w-0 text-[14.5px] leading-snug font-medium text-foreground break-words ${multiline ? 'whitespace-pre-line sm:pt-[5px]' : ''} ${readOnly && !isEmpty ? 'text-foreground/80' : ''}`}>
                    {body}
                    {hint && <div className="text-xs font-normal text-muted-foreground mt-0.5">{hint}</div>}
                </div>
                {canEdit && (
                    <span
                        className="flex-shrink-0 w-8 h-8 rounded-lg border border-border bg-card shadow-card flex items-center justify-center text-muted-foreground"
                        aria-hidden="true"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </span>
                )}
            </div>
        </div>
    );
}

// ── The edit box contents ──

const inputCls = 'w-full h-12 px-3.5 rounded-xl border border-input bg-muted/40 text-base font-medium text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30';

function FieldInput({ def, claim, draft, setDraft, showLabel }) {
    const raw = def.value ? def.value({ ...claim, ...draft }) : (def.key in draft ? draft[def.key] : claim[def.key]);
    const put = (v) => setDraft((d) => ({ ...d, ...(def.patch ? def.patch(v, { ...claim, ...d }) : { [def.key]: v }) }));
    const label = showLabel && <label className="block text-xs font-medium text-muted-foreground mb-1">{def.label}</label>;
    const merged = { ...claim, ...draft };
    let control;
    switch (def.type) {
        case 'textarea':
            control = <textarea value={raw ?? ''} onChange={(e) => put(e.target.value)} rows={5} className={`${inputCls} h-auto py-3 resize-y`} placeholder={def.placeholder} />;
            break;
        case 'date':
            control = <input type="date" value={toInputDate(raw)} onChange={(e) => put(e.target.value || null)} className={inputCls} />;
            break;
        case 'currency':
        case 'number':
            control = (
                <input
                    type="number" inputMode="decimal" step={def.type === 'currency' ? '0.01' : 'any'}
                    value={isBlank(raw) ? '' : raw}
                    onChange={(e) => put(e.target.value === '' ? null : Number(e.target.value))}
                    className={inputCls} placeholder={def.placeholder}
                />
            );
            break;
        case 'select':
        case 'yesno':
        case 'bool': {
            const opts = def.type === 'select' ? def.options : ['Yes', 'No'];
            const cur = def.type === 'select' ? (raw ?? '') : (isBlank(raw) ? '' : yesNo(raw));
            control = (
                <select value={cur} onChange={(e) => put(def.type === 'bool' ? e.target.value === 'Yes' : e.target.value)} className={`${inputCls} appearance-auto`}>
                    {cur === '' && <option value="">Choose…</option>}
                    {opts.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
                </select>
            );
            break;
        }
        case 'address':
            control = <AddressLookupInput value={raw || ''} onChange={(a) => put(a?.display_name || a?.address || '')} />;
            break;
        case 'broker':
            control = (
                <BrokerCombobox
                    value={merged[def.nameKey] || ''}
                    placeholder={def.placeholder}
                    onChange={(b) => setDraft((d) => ({ ...d, [def.idKey]: b?.id || '', [def.nameKey]: b?.name || '' }))}
                />
            );
            break;
        case 'insurer':
            control = <InsurerCombobox value={raw || ''} placeholder={def.placeholder} onChange={(v) => put(v || '')} />;
            break;
        case 'client':
            control = <ClientCombobox value={merged.client_name || ''} allowClear onChange={(c) => setDraft((d) => ({ ...d, ...def.patch(c, { ...claim, ...d }) }))} />;
            break;
        case 'thirdParty':
            control = (
                <ThirdPartyCombobox
                    value={merged.tp_name || ''} allowClear placeholder="Select or add third party..."
                    onChange={(tp) => setDraft((d) => ({ ...d, ...(tp ? claimPatchFromThirdParty(tp, { ...claim, ...d }) : { tp_name: '' }) }))}
                />
            );
            break;
        case 'excess':
            control = <ExcessModeField claim={{ policy_excess: merged.policy_excess, excess_tbc: merged.excess_tbc }} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} />;
            break;
        default:
            control = (
                <input
                    type={def.type === 'email' ? 'email' : def.type === 'tel' ? 'tel' : 'text'}
                    inputMode={def.type === 'tel' ? 'tel' : def.type === 'email' ? 'email' : undefined}
                    value={raw ?? ''}
                    onChange={(e) => put(def.upper ? e.target.value.toUpperCase() : e.target.value)}
                    className={inputCls} placeholder={def.placeholder}
                />
            );
    }
    return <div>{label}{control}{def.editHint && <p className="text-xs text-muted-foreground mt-1.5">{def.editHint}</p>}</div>;
}

// A section's own form in the box: its Save / Cancel are hidden and the box's Save
// presses the form's Save, so the form saves exactly as it always has.
function FormInBox({ Form, claim, onSave, onCancel, saveRef }) {
    const ref = useRef(null);
    useLayoutEffect(() => {
        const root = ref.current;
        if (!root) return;
        const SAVE = /^(save|update|confirm)\b/i;
        const ACTION = /^(save|cancel|update|confirm|close)\b/i;
        let save = null;
        root.querySelectorAll('button').forEach((b) => {
            const t = (b.textContent || '').trim();
            if (!save && SAVE.test(t)) save = b;
            if (ACTION.test(t)) b.classList.add('fm-sheet-hide');
        });
        if (!save) save = root.querySelector('button[type="submit"]');
        saveRef.current = () => {
            if (save) save.click();
            else root.querySelector('form')?.requestSubmit?.();
        };
    });
    return <div ref={ref} className="fm-form-in-box"><Form claim={claim} onSave={onSave} onCancel={onCancel} /></div>;
}

// ── A whole screen of cards ──

export function useFieldEditor({ claim, onUpdate, canEdit = true }) {
    const [edit, setEdit] = useState(null); // { def, card }
    const [draft, setDraft] = useState({});
    const formSave = useRef(null);
    const open = (def, card) => { if (!canEdit || def.readOnly) return; setDraft({}); formSave.current = null; setEdit({ def, card }); };
    const close = () => { setEdit(null); setDraft({}); };
    const save = () => {
        if (!edit) return;
        if (edit.def.form) { formSave.current?.(); return; }
        if (Object.keys(draft).length) onUpdate({ ...claim, ...draft });
        close();
    };

    const def = edit?.def;
    const box = (
        <FieldEditSheet open={!!edit} title={(def?.form ? edit?.card : def?.label) || ''} subtitle={def?.form ? undefined : edit?.card} onSave={save} onCancel={close} autoFocus={!def?.form}>
            {def && (def.form ? (
                <FormInBox
                    Form={def.form}
                    claim={claim}
                    saveRef={formSave}
                    onSave={(data) => { onUpdate({ ...claim, ...data }); close(); }}
                    onCancel={close}
                />
            ) : def.group ? (
                <div className="space-y-3">
                    {def.group.map((g) => <FieldInput key={g.key || g.label} def={g} claim={claim} draft={draft} setDraft={setDraft} showLabel />)}
                </div>
            ) : (
                <FieldInput def={def} claim={claim} draft={draft} setDraft={setDraft} />
            ))}
        </FieldEditSheet>
    );
    return { open, box };
}

export function FieldList({ fields, claim, onEdit, card }) {
    return fields.filter((f) => !f.hidden).map((f) => (
        <FieldRow
            key={f.key || f.label}
            label={f.label}
            value={shown(f, claim)}
            empty={f.readOnly ? isBlank(shown(f, claim)) : undefined}
            emptyText={f.readOnly || f.optional ? '—' : 'Not set'}
            quietEmpty={!!(f.readOnly || f.optional)}
            readOnly={f.readOnly}
            hint={typeof f.hint === 'function' ? f.hint(claim) : f.hint}
            multiline={f.multiline || f.type === 'textarea'}
            href={f.href ? f.href(claim) : undefined}
            onEdit={onEdit ? () => onEdit(f, card) : undefined}
        />
    ));
}

/**
 * A claim screen made of field cards.
 *  cards: [{ title, fields, wide, action, before, after, collapsible, defaultOpen, hidden }]
 *  before / after: anything else the screen shows (buttons, banners, lists).
 */
export function ClaimFieldsSection({ title, icon, claim, onUpdate, canEdit = true, cards, before, after, actions }) {
    const { open, box } = useFieldEditor({ claim, onUpdate, canEdit });
    const visible = cards.filter((c) => !c.hidden);
    return (
        <SectionShell title={title} icon={icon} actions={actions}>
            {before}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
                {visible.map((c) => (
                    <FieldCard
                        key={c.title}
                        title={c.title}
                        wide={c.wide}
                        action={c.action}
                        collapsible={c.collapsible}
                        defaultOpen={c.defaultOpen}
                        todo={(c.fields || []).filter((f) => !f.hidden && missing(f, claim)).length}
                    >
                        {c.before}
                        {c.fields && <FieldList fields={c.fields} claim={claim} card={c.title} onEdit={canEdit ? open : undefined} />}
                        {c.after}
                    </FieldCard>
                ))}
            </div>
            {after}
            {box}
        </SectionShell>
    );
}
