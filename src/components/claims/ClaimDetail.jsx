import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Button } from "@/components/ui/button";
import { excessLabel, excessAnswered } from "@/components/shared/excessState";
import {
    ArrowLeft,
    Edit,
    User,
    Car,
    Shield,
    Users,
    Wrench,
    Calendar,
    DollarSign,
    ChevronDown,
    Package,
    Calculator,
    Mail,
    Phone,
    Briefcase,
    FileText,
    Archive,
    Trash2,
    Clock,
    AlertTriangle,
    BadgePercent,
    Download,
    Image,
    RefreshCw,
    MapPin,
    Eye,
    Star,
    CheckCircle,
    Save,
    Copy,
    Lock,
    Check,
    X,
} from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "../shared/StatusBadge";
import UpdateStatusBadge from '../shared/UpdateStatusBadge';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import ClaimClientForm from './ClaimClientForm';
import ClaimPartiesForm from './ClaimPartiesForm';
import PartyDisplayCard from '../shared/PartyDisplayCard';
import ClaimVehicleForm from './ClaimVehicleForm';
import ClaimCreditRepairForm from './ClaimCreditRepairForm';
import CreditRepairRatesCard from './CreditRepairRatesCard';
import CreditRepairInstructionModal from './CreditRepairInstructionModal';
import PurchaseOrderDialog from './financials/PurchaseOrderDialog';
import ClaimReferrerForm from './ClaimReferrerForm';
import ClaimFinancials from './financials/ClaimFinancials';
import { isTotalLossClaim } from '@/components/shared/totalLoss';
import { getClaimOutcome, isExceptionOutcome } from '@/components/shared/claimOutcome';
import ArchiveClaimDialog from './ArchiveClaimDialog';
import { claimOutstandingItems } from '@/components/shared/claimOutstandingItems';
import { hireSummaryText } from '@/components/shared/hireCharge';
import InlineEditableSection, { InlineField, useInlineEdit } from './InlineEditableSection';
import FieldEditSheet from '../shared/FieldEditSheet';
import ClaimBodyshopForm from './ClaimBodyshopForm';
import ClaimBodyshopInfo from './ClaimBodyshopInfo.jsx';
import ClaimBodyshopAllocateButton from './ClaimBodyshopAllocateButton';

import ClaimStatusForm from './ClaimStatusForm';

import ClaimVehicleDamageForm from './ClaimVehicleDamageForm';
import ClaimIndemnityForm from './ClaimIndemnityForm';
import IndemnityLinkManager from './IndemnityLinkManager';
import RepairPreferenceLinkManager from './RepairPreferenceLinkManager';
import WitnessStatementsSection from './WitnessStatementsSection';
import DeclarationOfNeedLinkManager from './DeclarationOfNeedLinkManager';
import ClaimExcessContributionForm from './ClaimExcessContributionForm';
import InstructionDefaultsForm from './InstructionDefaultsForm';
import ThirdPartyPursuitSection from './ThirdPartyPursuitSection';
import BackorderedPartsSection from './BackorderedPartsSection';
import DocumentTrackerModal from './DocumentTrackerModal';
import EstimateAuthorityTotals from './EstimateAuthorityTotals';
import NotesSection from '../shared/NotesSection';
import PartsRequestModal from './PartsRequestModal';
import EstimateRequestModal from './EstimateRequestModal';
import FileAttachmentModal from '../shared/FileAttachmentModal';
import ImageAttachmentModal from '../shared/ImageAttachmentModal';
import DragDropOverlay from '../shared/DragDropOverlay';
import TimeLogSection from '../shared/TimeLogSection';
import ClaimTasksSection from '../tasks/ClaimTasksSection';
import TasksModal from '../tasks/TasksModal';
import EmailComposerModal from '../shared/EmailComposerModal';
import { lookupVehicleData } from '@/functions/lookupVehicleData';
import NotesModal from '../shared/NotesModal';
import UpdateTrackingModal from './UpdateTrackingModal';
import UpdateOverrideModal from './UpdateOverrideModal';
import ClaimUpdatesModal from '../shared/ClaimUpdatesModal';
import ClaimQuickViewModal from './ClaimQuickViewModal';

import BackorderedPartsModal from './BackorderedPartsModal';
import { formatUKRegistration } from '../shared/formatRegistration';
import DuplicateClaimModal from './DuplicateClaimModal';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ClaimMobileSummary, { ClaimMobileSectionBar, ClaimStageTrack, groupSections } from './ClaimMobileSummary';
import AuthorisingPartyBanner from './AuthorisingPartyBanner';
import { generateClaimOverviewPdf } from './claimOverviewPdf';
import ClaimStatusEditForm from './ClaimStatusEditForm';
import { isUpdateTrackingClosed, computeUpdateStatusFlag, computeClientCommStatusFlag, buildStatusChangeRecord } from '../shared/claimStatusUpdate';
import { saveTimeLogInBackground } from '../shared/saveTimeLogInBackground';

import { askConfirm, notify, notifyError } from '@/lib/dialogs';
// ── Editing without the fields moving ──
// Controls a form shows (inputs, dropdowns, switches), in page order.
const FIELD_SELECTOR = 'input:not([type="hidden"]), textarea, select, button[role="combobox"], button[aria-haspopup], button[role="switch"], button[role="checkbox"]';
// Every control, in page order. The locked and editing forms are the same form, so the
// Nth control in one is the Nth control in the other.
const ANY_CONTROL = 'input:not([type="hidden"]), textarea, select, button';
const norm = (t) => String(t || '').toLowerCase().replace(/\(.*?\)|[^a-z0-9]+/g, ' ').replace(/\b(driver|client|no|number)\b/g, ' ').replace(/\s+/g, ' ').trim();

// Find the edit-form control whose label best matches the label the user clicked in the view.
function findControlByLabel(container, wanted) {
    const w = norm(wanted);
    if (!w) return null;
    let best = null; let bestScore = 0;
    container.querySelectorAll('label').forEach((lab) => {
        const l = norm(lab.textContent);
        if (!l) return;
        const score = l === w ? 3 : (l.includes(w) || w.includes(l)) ? 2 : 0;
        if (score > bestScore) { best = lab; bestScore = score; }
    });
    if (!best) return null;
    if (best.htmlFor) { const byId = container.querySelector(`#${CSS.escape(best.htmlFor)}`); if (byId) return byId; }
    return best.querySelector(FIELD_SELECTOR) || best.parentElement?.querySelector(FIELD_SELECTOR) || null;
}

// A real, visible control (not the hidden native inputs that dropdowns and switches carry).
// Some forms use their own dropdowns: a plain wide button that shows the value. Those
// count as fields too; small buttons (look-ups, add / remove) do not.
const FIELD_LIKE = `${FIELD_SELECTOR}, button:not([type="submit"])`;
const isRealControl = (c) => {
    if (c.getAttribute('aria-hidden') === 'true' || c.classList.contains('fm-hide') || c.closest('.fm-hide') || c.closest('[data-radix-popper-content-wrapper]') || c.closest('.fm-field-actions')) return false;
    if (c.tagName === 'BUTTON' && !c.matches(FIELD_SELECTOR)) return c.getBoundingClientRect().width >= 120;
    return true;
};
const realControls = (root) => Array.from(root.querySelectorAll(FIELD_LIKE)).filter(isRealControl);

// The block that belongs to one field: the control plus its label, climbing up the
// page until the next level up holds another field.
function fieldUnit(control, root) {
    let el = control;
    while (el.parentElement && el.parentElement !== root) {
        const p = el.parentElement;
        if (realControls(p).length > 1) break;
        el = p;
    }
    return el;
}

// The name of a field, for the edit box's heading.
function unitLabel(control, root) {
    const lab = fieldUnit(control, root).querySelector('label');
    const text = (lab?.textContent || control.getAttribute('aria-label') || control.getAttribute('placeholder') || '').trim();
    return text.replace(/\s*\*\s*$/, '').slice(0, 60);
}

function focusAndFlash(el) {
    if (!el) return;
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); // only scrolls if the field is off-screen
    try { el.focus({ preventScroll: true }); } catch { el.focus(); }
    el.classList.add('fm-flash');
    setTimeout(() => el.classList.remove('fm-flash'), 1400);
}

/**
 * A claim section card.
 *  sameLayout  → the edit form is always shown, locked and styled as text, so pressing Edit
 *                (or clicking a field) just unlocks it in place – nothing moves.
 *                `children` then holds only read-only extras (system dates, summaries).
 *  otherwise   → the section's own view is shown; clicking a value opens the form and
 *                jumps to that field, ready to type in.
 */
const EditableSection = ({ title, icon: Icon, claim, onUpdate, children, EditComponent, canEdit = true, sameLayout = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    // single: only one field is unlocked (pencil → tick / cross); otherwise "Edit all".
    const [single, setSingle] = useState(false);
    const [version, setVersion] = useState(0);
    const [pencils, setPencils] = useState([]); // a pencil button at the end of each locked field
    const [, setMeasure] = useState(0);
    const bodyRef = useRef(null);
    const pendingFocus = useRef(null); // { index } (same layout) or { label } (own view)
    const activeControl = useRef(null);
    const saveButton = useRef(null);
    // One field being changed in the edit box: { focus, label }. The section itself
    // stays exactly as it looks; the field is edited in the box and saved from there.
    const [sheet, setSheet] = useState(null);
    const sheetBody = useRef(null);

    // Exit edit mode when claim is updated externally (e.g. wizard save), and redraw the
    // locked form from the fresh claim.
    useEffect(() => {
        setIsEditing(false);
        setSingle(false);
        setSheet(null);
        setVersion((v) => v + 1);
    }, [claim]);

    const stopEditing = () => {
        setIsEditing(false);
        setSingle(false);
        setSheet(null);
        activeControl.current = null;
        saveButton.current = null;
    };

    const handleSave = (updatedData) => {
        onUpdate({ ...claim, ...updatedData });
        stopEditing();
    };

    const editable = !!(EditComponent && canEdit);

    // The edit box holds the section's form with only the chosen field showing. Everything
    // else in the form (other fields, headings, its own Save / Cancel) is hidden; the box's
    // Save presses the form's own Save, so the claim is saved exactly as before.
    useLayoutEffect(() => {
        const root = sheetBody.current;
        if (!sheet || !root) return;
        if (!activeControl.current || !root.contains(activeControl.current)) {
            const want = sheet.focus;
            let el = null;
            if (want?.index != null) el = root.querySelectorAll(ANY_CONTROL)[want.index];
            else if (want?.label) el = findControlByLabel(root, want.label);
            activeControl.current = (el && isRealControl(el) ? el : null) || realControls(root)[0] || null;
            saveButton.current = null;
        }
        const active = activeControl.current;
        if (!active) return;
        const activeUnit = fieldUnit(active, root);
        // Find the form's Save before hiding things. A button with no type inside a form
        // counts as "submit", Cancel included, so Save is found by its name first.
        if (!saveButton.current) {
            const SAVE = /^(save|update|confirm)\b/i;
            const NOT_SAVE = /^(cancel|close|back)\b/i;
            let byName = null; let bySubmit = null;
            root.querySelectorAll('button').forEach((b) => {
                if (activeUnit.contains(b)) return;
                const text = (b.textContent || '').trim();
                if (!byName && SAVE.test(text)) byName = b;
                if (!bySubmit && b.getAttribute('type') === 'submit' && !NOT_SAVE.test(text)) bySubmit = b;
            });
            saveButton.current = byName || bySubmit;
        }
        // Hide everything that isn't the chosen field (or one of the boxes it sits in).
        for (let el = activeUnit; el && el !== root; el = el.parentElement) {
            const parent = el.parentElement;
            if (!parent) break;
            Array.from(parent.children).forEach((sib) => { if (sib !== el) sib.classList.add('fm-sheet-hide'); });
            if (parent !== root) parent.classList.add('fm-sheet-path');
        }
        // The field's own label repeats the box's heading, so it's hidden (unless the
        // label wraps the control itself, like a tick box).
        const norm = (s) => (s || '').replace(/\s*\*\s*$/, '').trim().toLowerCase();
        if (sheet.label) activeUnit.querySelectorAll('label').forEach((l) => {
            if (norm(l.textContent) === norm(sheet.label) && !l.querySelector(FIELD_LIKE)) l.classList.add('fm-sheet-hide');
        });
    });

    // Re-measure the pencils when the card changes size (phone rotated, window resized).
    useEffect(() => {
        const el = bodyRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return undefined;
        const ro = new ResizeObserver(() => setMeasure((m) => m + 1));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Locked: a pencil button sits at the end of every field that can be changed.
    useLayoutEffect(() => {
        const root = bodyRef.current;
        const next = [];
        if (root && editable && !isEditing) {
            const r = root.getBoundingClientRect();
            const fs = root.querySelector('fieldset.fm-readonly');
            if (sameLayout && fs) {
                const all = Array.from(fs.querySelectorAll(ANY_CONTROL));
                realControls(fs).forEach((c) => {
                    if (c.readOnly) return; // read-only boxes (Job status) can't be edited
                    const a = c.getBoundingClientRect();
                    if (!a.width || !a.height) return;
                    if (c.tagName === 'BUTTON' && !c.matches(FIELD_SELECTOR)) c.setAttribute('data-fm-dropdown', '');
                    const narrow = a.width < 96; // a switch or tick box: pencil just before it
                    if (!narrow && c.style.paddingRight !== '52px') c.style.paddingRight = '52px';
                    const top = Math.round(a.top - r.top + (a.height > 60 ? 8 : (a.height - 36) / 2));
                    const left = Math.round(narrow ? a.left - r.left - 44 : a.right - r.left - 42);
                    next.push({ key: `i${all.indexOf(c)}`, top, left, focus: { index: all.indexOf(c) }, label: unitLabel(c, fs) });
                });
            } else if (!sameLayout) {
                root.querySelectorAll('[data-edit-label]').forEach((cell, i) => {
                    const a = cell.getBoundingClientRect();
                    if (!a.width || !a.height) return;
                    if (cell.style.paddingRight !== '52px') cell.style.paddingRight = '52px';
                    next.push({ key: `l${i}`, top: Math.round(a.top - r.top + (a.height - 36) / 2), left: Math.round(a.right - r.left - 44), focus: { label: cell.getAttribute('data-edit-label') } });
                });
            }
        }
        const same = next.length === pencils.length && next.every((p, i) => p.key === pencils[i].key && p.top === pencils[i].top && p.left === pencils[i].left);
        if (!same) setPencils(next);
    });

    const saveField = () => {
        const btn = saveButton.current;
        if (btn) { btn.click(); return; }
        const form = activeControl.current?.closest('form');
        if (form?.requestSubmit) form.requestSubmit();
        else stopEditing();
    };

    // Locked view: mark empty fields (amber, "Not set") the way the old view did.
    useLayoutEffect(() => {
        if (!sameLayout || isEditing || !bodyRef.current) return;
        // Each field block gets a pencil (CSS), so it's clear every field can be changed on its own.
        const fs = bodyRef.current.querySelector('fieldset.fm-readonly');
        if (fs && editable) realControls(fs).forEach((c) => fieldUnit(c, fs).setAttribute('data-fm-field', ''));
        bodyRef.current.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, select').forEach((el) => {
            const empty = el.value === '' || el.value == null;
            el.classList.toggle('fm-empty', empty);
            if (empty && !el.dataset.fmPh) { el.dataset.fmPh = '1'; el.placeholder = 'Not set'; }
        });
        // Action buttons only make sense while editing; dropdown buttons stay (they show the value).
        const ACTION = /^(save|cancel|update|add|remove|delete|clear|fetch|look ?up|search|upload|apply|reset|copy|send|use)\b/i;
        bodyRef.current.querySelectorAll('.fm-readonly button').forEach((b) => {
            const role = b.getAttribute('role');
            if (role === 'switch' || role === 'checkbox' || role === 'combobox') return;
            const text = (b.textContent || '').trim();
            if (b.type === 'submit' || ACTION.test(text) || (!text && !b.closest('[data-radix-popper-content-wrapper]') && b.querySelector('svg') && !b.getAttribute('aria-haspopup'))) b.classList.add('fm-hide');
        });
    });

    // After switching to edit, put the cursor where the user clicked.
    useEffect(() => {
        if (!isEditing || !pendingFocus.current || !bodyRef.current) return;
        const want = pendingFocus.current; pendingFocus.current = null;
        requestAnimationFrame(() => {
            const root = bodyRef.current; if (!root) return;
            const el = want.index != null
                ? root.querySelectorAll(ANY_CONTROL)[want.index]
                : findControlByLabel(root, want.label);
            focusAndFlash(el || root.querySelector(FIELD_SELECTOR));
        });
    }, [isEditing]);

    const startEdit = (focus) => { if (!editable) return; pendingFocus.current = focus || null; setSingle(false); setIsEditing(true); };
    // Pencil on one field: open the edit box for that field. The section doesn't change.
    const startField = (focus, label) => {
        if (!editable) return;
        activeControl.current = null;
        saveButton.current = null;
        setSheet({ focus: focus || null, label: label || focus?.label || '', n: Date.now() });
    };

    // Same layout: a click anywhere in a locked field opens editing on that field.
    const onLockedClick = (e) => {
        if (!editable) return;
        const root = bodyRef.current; if (!root) return;
        const fs = root.querySelector('fieldset.fm-readonly'); if (!fs) return;
        const block = e.target.closest('div'); if (!block) return;
        const pick = (el) => el && Array.from(el.querySelectorAll(ANY_CONTROL)).find((c) => !c.classList.contains('fm-hide'));
        const control = pick(block) || pick(e.target.closest('label')?.parentElement);
        const list = Array.from(fs.querySelectorAll(ANY_CONTROL));
        const index = control ? list.indexOf(control) : -1;
        if (index >= 0) startField({ index }, unitLabel(control, fs));
    };

    // Own view: clicking a value (DetailRow etc.) opens that one field for editing.
    const onViewClick = (e) => {
        if (!editable) return;
        const row = e.target.closest('[data-edit-label]');
        if (row) startField({ label: row.getAttribute('data-edit-label') });
    };

    const pencilButtons = !isEditing && pencils.map((p) => (
        <button
            key={p.key}
            type="button"
            onClick={(e) => { e.stopPropagation(); startField(p.focus, p.label); }}
            className="absolute z-[4] w-9 h-9 rounded-xl border border-border bg-card shadow-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-input active:scale-95 transition"
            style={{ top: p.top, left: p.left }}
            aria-label="Edit this field"
            title="Edit"
        >
            <Edit className="w-4 h-4" aria-hidden="true" />
        </button>
    ));

    const editBox = editable && (
        <FieldEditSheet
            open={!!sheet}
            title={sheet?.label || title}
            subtitle={sheet?.label ? title : undefined}
            onSave={saveField}
            onCancel={stopEditing}
            bodyRef={sheetBody}
        >
            {sheet && (
                <div className="fm-sheet-form">
                    <EditComponent key={`sheet-${sheet.n}`} claim={claim} onSave={handleSave} onCancel={stopEditing} />
                </div>
            )}
        </FieldEditSheet>
    );

    return (
        <div className="bg-card rounded-2xl p-4 md:p-5 m-card-tight shadow-card">
            {/* Fixed-height header so it doesn't shrink when the Edit button hides */}
            <div className="flex justify-between items-center min-h-[2.75rem] pb-3 mb-4 border-b border-border m-card-head">
                <div
                    className="flex items-center gap-2.5 text-left flex-grow min-w-0"
                >
                    <span className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-foreground" aria-hidden="true" />
                    </span>
                    <h3 className="text-base font-bold tracking-tight text-foreground truncate">{title}</h3>
                </div>
                <div className='flex items-center gap-2'>
                    {/* Same size as the Edit all button, so the header keeps its height */}
                    {isEditing && !single && (
                        <Button variant="ghost" size="sm" disabled className="gap-1.5 text-primary disabled:opacity-100" tabIndex={-1}>
                            <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                            Editing
                        </Button>
                    )}

                </div>
            </div>
            {editBox}
            <div ref={bodyRef} className="relative">
                {pencilButtons}
                {sameLayout && EditComponent ? (
                    <>
                        {children}
                        {isEditing ? (
                            <EditComponent key={`edit-${version}-${single ? 'one' : 'all'}`} claim={claim} onSave={handleSave} onCancel={stopEditing} />
                        ) : (
                            <fieldset key={`view-${version}`} disabled className={`fm-readonly ${editable ? 'fm-click-edit' : ''}`} onClick={onLockedClick} title={editable ? 'Click a field to edit it' : undefined}>
                                <EditComponent claim={claim} onSave={() => {}} onCancel={() => {}} />
                            </fieldset>
                        )}
                    </>
                ) : isEditing ? (
                    <EditComponent key={single ? 'one' : 'all'} claim={claim} onSave={handleSave} onCancel={stopEditing} />
                ) : (
                    <div className={editable ? 'fm-click-edit' : ''} onClick={onViewClick}>{children}</div>
                )}
            </div>
        </div>
    );
};

const EstimateInlineFields = () => {
    const { setField } = useInlineEdit();
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 m-fields-2 gap-2">
            <InlineField label="Email Estimate To" name="send_estimate_email" type="email" placeholder="Enter email address" />
            <InlineField label="Audatex Code" name="audatex_code" placeholder="Enter Audatex code" />
            <InlineField label="Estimate Fee" name="est_fee" isCurrency />
            <InlineField label="Authorising Party" name="authorising_party" />
            <InlineField label="Est. Cost (Net)" name="estimate_cost_net" isCurrency onChange={(v) => setField('estimate_cost_gross', v !== '' && v != null ? +(v * 1.2).toFixed(2) : '')} />
            <InlineField label="Auth. Cost (Net)" name="authority_cost_net" isCurrency onChange={(v) => setField('authority_cost_gross', v !== '' && v != null ? +(v * 1.2).toFixed(2) : '')} />
            <InlineField label="Est. Cost (Gross)" name="estimate_cost_gross" isCurrency readOnly />
            <InlineField label="Auth. Cost (Gross)" name="authority_cost_gross" isCurrency readOnly />
        </div>
    );
};

function DetailRow({ label, value, isCurrency = false, isDate = false, isStatus = false }) {
    let displayValue = value;
    if (isCurrency && typeof value === 'number') {
        displayValue = `£${value.toFixed(2)}`;
    } else if (isDate && value) {
        try {
            displayValue = format(new Date(value), 'dd/MM/yyyy');
        } catch (e) {
            displayValue = 'Invalid Date';
        }
    }

    const isEmpty = value === null || typeof value === 'undefined' || value === '' || value === 0;
    if (isEmpty) {
        displayValue = 'Not set';
    }

    // Empty fields stay marked (amber) so gaps are easy to spot, just more quietly.
    return (
        <div data-edit-label={label} className={`py-2 px-3 rounded-lg transition-colors ${isEmpty ? 'bg-warning-bg/60 border border-warning/25' : 'hover:bg-muted/50'}`}>
            <div className="text-xs font-medium text-muted-foreground mb-0.5">
                {label}
            </div>
            <div className={`text-sm ${isEmpty ? 'text-warning-fg font-normal' : 'text-foreground font-medium'} ${(isCurrency || (typeof value === 'number')) ? 'tabular-nums' : ''}`}>
                {isStatus ? <StatusBadge status={displayValue} /> : displayValue}
            </div>
        </div>
    );
}

import { ListTodo, History, Timer, Link2, KeyRound, FileSignature } from "lucide-react";
import { ClaimFieldsSection, SectionShell } from './ClaimFieldCards';
import { syncClaimEditToRecords } from '../shared/linkedRecords';
import { overviewCards, insuranceCards, datesCards, estimateCards, clientCards, driverCards, thirdPartyCards, tpInsuranceCards, referrerCards, hireCards, creditRepairCards, vehicleCards, instructionCards, indemnityCards, signedFormCards } from './claimScreens';

// Counts sit inside their button (no floating bubbles), so nothing overlaps.
const InlineCount = ({ n, tone = 'neutral', label }) => (
  <span
    aria-label={label ? `${n} ${label}` : undefined}
    className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold inline-flex items-center justify-center leading-none tabular-nums ${
      tone === 'onPrimary' ? 'bg-primary-foreground/20 text-primary-foreground'
      : tone === 'info' ? 'bg-info-bg text-info-fg'
      : 'bg-muted text-muted-foreground'
    }`}
  >
    {n}
  </span>
);
import ActivityLogSection from '../shared/ActivityLogSection';
import TimeLogsModal from '../shared/TimeLogsModal';
import ActivityLogModal from '../shared/ActivityLogModal';
import { logActivity, logChanges, deleteAndLog } from '../shared/useActivityLogger';

const SECTION_FIELDS = {
  status: ['reg', 'claim_type', 'loss_date', 'vehicle_use', 'incident_location', 'circumstances'],
  insurance: ['insurer', 'claim_ref', 'policy_number', 'policy_excess'],
  client: ['client_name', 'client_phone', 'client_email', 'client_address_line_1', 'client_town', 'client_postcode'],
  creditRepair: ['credit_repair_company_name', 'credit_repair_company_contact_name', 'credit_repair_company_phone', 'credit_repair_company_email', 'credit_repair_company_account_ref'],
  driver: ['driver_contact_name', 'driver_contact_phone'],
  estimate: ['estimate_cost_net', 'authorising_party'],
  thirdParty: ['tp_name', 'tp_phone', 'tp_reg'],
  tpInsurance: ['tp_insurer'],
  vehicle: ['vehicle_colour', 'vehicle_fuel_type', 'vehicle_type', 'vehicle_location', 'vehicle_damage'],
  referrer: ['referrer', 'referrer_ref', 'file_handler'],
  bodyshop: ['bodyshop'],
  financials: ['estimate_cost_net', 'authority_cost_net', 'final_repair_cost'],
  dates: ['date_received'],
  indemnity: ['indemnity_driver_dob', 'indemnity_registered_owner'],
};

const isSectionEmpty = (sectionId, claim) => {
  // "No Referrer" is a deliberate choice — not missing data
  if (sectionId === 'referrer' && !claim.referrer_id) return false;
  // "None" excess contribution method means not applicable — not missing data
  // Hire / credit repair company details only matter on a credit repair claim.
  if (sectionId === 'creditRepair' && claim.claim_type !== 'Credit Repair') return false;
  // The repair contact is the client unless switched off.
  if (sectionId === 'driver' && claim.driver_same_as_client !== false) return false;
  // Indemnity only counts when checks are switched on.
  if (sectionId === 'indemnity' && !claim.requires_indemnity) return false;
  // A figure, Waived or TBC on authority are all answers — never a gap.
  const fields = (SECTION_FIELDS[sectionId] || [])
    .filter(f => !(f === 'policy_excess' && excessAnswered(claim)));
  return fields.some(f => {
    const val = claim[f];
    return val === null || val === undefined || val === '' || val === 0;
  });
};

const DETAIL_SECTIONS = [
  { id: 'status', label: 'Overview', icon: Clock },
  { id: 'dates', label: 'Key dates', icon: Calendar },
  { id: 'estimate', label: 'Estimate', icon: Calculator },
  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'client', label: 'Client details', icon: Users },
  { id: 'insurance', label: 'Client insurance', icon: Shield },
  { id: 'driver', label: 'Repair contact (driver)', icon: User },
  { id: 'thirdParty', label: 'Third party details', icon: Users },
  { id: 'tpInsurance', label: 'Third party insurance', icon: Shield },
  { id: 'referrer', label: 'Referrer', icon: Briefcase },
  { id: 'creditRepair', label: 'Credit repair company', icon: BadgePercent },
  { id: 'vehicle', label: 'Vehicle', icon: Car },
  { id: 'hire', label: 'Courtesy car & hire', icon: KeyRound },
  { id: 'bodyshop', label: 'Bodyshop', icon: Wrench },
  { id: 'instructionDefaults', label: 'Instruction defaults', icon: FileText },
  { id: 'backorderedParts', label: 'Backordered parts', icon: Package },
  { id: 'thirdpartyPursuit', label: 'Third party pursuit', icon: Users },
  { id: 'indemnity', label: 'Indemnity', icon: Shield },
  { id: 'signedForms', label: 'Signed forms', icon: FileSignature },
];

// Screens that were merged into another one: old links still land in the right place.
const SECTION_ALIASES = {
  excessContribution: 'insurance', vehicleDamage: 'vehicle', vehicleLocation: 'vehicle',
  repairPreference: 'signedForms', declarationOfNeed: 'signedForms', witnessStatements: 'signedForms',
};
const canonicalSection = (id) => SECTION_ALIASES[id] || id;

export default function ClaimDetail({ claim: claimProp, onClose, onUpdate, isInternalUser = true, initialSection = 'status' }) {
  const [claim, setClaim] = useState(claimProp);
  
  // Sync local state when parent passes a newer version (e.g. after refetch)
  React.useEffect(() => {
    setClaim(claimProp);
  }, [claimProp]);

  const navigate = useNavigate();
  const [isPartsModalOpen, setIsPartsModalOpen] = useState(false);
  const [isEstimateModalOpen, setIsEstimateModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const [isImagesOpen, setIsImagesOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isClaimUpdatesOpen, setIsClaimUpdatesOpen] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [startTime] = useState(new Date());
  const [currentDuration, setCurrentDuration] = useState(0);
  const [selectedSection, setSelectedSection] = useState(canonicalSection(initialSection));
  const durationRef = React.useRef(0);
  const hasSavedRef = React.useRef(false);
  const queryClient = useQueryClient();
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideTrackerType, setOverrideTrackerType] = useState('general');
  const [isUpdateTrackingOpen, setIsUpdateTrackingOpen] = useState(false);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [isTimeLogsOpen, setIsTimeLogsOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [archiveWarning, setArchiveWarning] = useState(null);
  const [isFetchingVehicle, setIsFetchingVehicle] = useState(false);
  const [vehicleFetchError, setVehicleFetchError] = useState('');
  const [isRegeneratingPdf, setIsRegeneratingPdf] = useState(false);
  const [regenTemplateOpen, setRegenTemplateOpen] = useState(false);
  const [regenTemplateType, setRegenTemplateType] = useState('standard');
  const [regenPdfUrl, setRegenPdfUrl] = useState(null);
  const [savedRegenToDocs, setSavedRegenToDocs] = useState(false);
  const [isSavingRegenToDocs, setIsSavingRegenToDocs] = useState(false);
  const [isPoDialogOpen, setIsPoDialogOpen] = useState(false);
  const [isCreditRepairInstructionOpen, setIsCreditRepairInstructionOpen] = useState(false);

  const [isBackorderedPartsModalOpen, setIsBackorderedPartsModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  const canEdit = true;

  // Phones: the claim header shrinks to a slim bar as the page scrolls down, and
  // expands again once the page is back at the top. On phones the header sits in the
  // page's own flow, so folding it away takes that much height out of the page: on a
  // short section (Referrer Details, for one) that left the page with nothing left to
  // scroll, so it pulled itself back to the top, unfolded, and flickered up and down
  // between the two instead of reaching its end. The header therefore only folds where
  // the page still has a good deal more to scroll than the header takes up, and only
  // unfolds again back at the top.
  const rootRef = React.useRef(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  // The fold is tracked in a ref as well as in state: the scroll handler has to know
  // where the header stands without being torn down and rebuilt on every fold.
  const foldedRef = React.useRef(false);
  const setHeaderFolded = React.useCallback((next) => {
    if (foldedRef.current === next) return;
    foldedRef.current = next;
    setHeaderCollapsed(next);
  }, []);

  React.useEffect(() => {
    const FOLD_AT = 120;    // scrolled past the fold point
    const UNFOLD_AT = 20;   // back at the top
    const FOLD_ROOM = 200;  // a page this long still scrolls once the header is out of the way
    // How much page there is to scroll is read while the header is whole: folding it
    // takes height out of the page, and that must not be mistaken for a short section.
    const roomRef = { current: 0 };

    const geometry = (target) => {
      const el = target?.nodeType === 1 ? target : null;
      return el
        ? { top: el.scrollTop || 0, reach: el.scrollHeight - el.clientHeight }
        : {
          top: window.scrollY || document.documentElement.scrollTop || 0,
          reach: document.documentElement.scrollHeight - window.innerHeight,
        };
    };

    let frame = 0;
    const onScroll = (e) => {
      // Only the page's own scroller folds the header — a scrolling list inside an
      // open menu is none of its business.
      const target = e.target;
      const root = rootRef.current;
      if (root && target?.nodeType === 1 && !target.contains(root)) return;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const { top, reach } = geometry(target);
        if (!foldedRef.current) roomRef.current = reach;
        const room = roomRef.current;
        setHeaderFolded(foldedRef.current
          ? !(top <= UNFOLD_AT || room <= FOLD_ROOM)
          : (top > FOLD_AT && room > FOLD_ROOM));
      });
    };

    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [setHeaderFolded]);

  // Opening a different section starts at the top of the page again.
  React.useEffect(() => {
    const scroller = rootRef.current?.closest('[data-claim-scroll]');
    if (scroller) scroller.scrollTop = 0;
    setHeaderFolded(false);
  }, [selectedSection]);

  // Rectification milestone dates in Key Dates are only editable once the claim
  // has been moved onto the Rectification journey.
  const isRectification = claim?.journey_status === 'Rectification' || claim?.job_status === 'Rectification';
  // A total loss job carries its own two dates: the day the salvage was collected,
  // which is what puts it on the invoicing radar, and the day it was marked.
  const totalLoss = isTotalLossClaim(claim);

  const ClientEditComponent = useCallback((props) => <ClaimPartiesForm {...props} mode="client" />, []);
  const DriverEditComponent = useCallback((props) => <ClaimPartiesForm {...props} mode="driver" />, []);
  const ThirdPartyEditComponent = useCallback((props) => <ClaimPartiesForm {...props} mode="thirdParty" />, []);
  const VehicleLocationEditComponent = useCallback((props) => <ClaimVehicleDamageForm {...props} mode="location" />, []);
  const VehicleDamageEditComponent = useCallback((props) => <ClaimVehicleDamageForm {...props} mode="damage" />, []);

  const isClosedStatus = isUpdateTrackingClosed(claim);

  React.useEffect(() => {
    durationRef.current = currentDuration;
  }, [currentDuration]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: linkedEstimate } = useQuery({
    queryKey: ['estimate', claim.linked_estimate_id],
    queryFn: () => claim.linked_estimate_id ? base44.entities.Estimate.get(claim.linked_estimate_id) : null,
    enabled: !!claim.linked_estimate_id,
  });

  const { data: linkedEngineering } = useQuery({
    queryKey: ['engineering', claim.linked_engineering_id],
    queryFn: () => claim.linked_engineering_id ? base44.entities.Engineering.get(claim.linked_engineering_id) : null,
    enabled: !!claim.linked_engineering_id,
  });

  const { data: linkedParts } = useQuery({
    queryKey: ['part', claim.linked_parts_id],
    queryFn: () => claim.linked_parts_id ? base44.entities.Part.get(claim.linked_parts_id) : null,
    enabled: !!claim.linked_parts_id,
  });

  // Linked third-party claim (from fault claim)
  const { data: linkedThirdPartyClaim } = useQuery({
    queryKey: ['claim', claim.linked_third_party_claim_id],
    queryFn: () => claim.linked_third_party_claim_id ? base44.entities.Claim.get(claim.linked_third_party_claim_id) : null,
    enabled: !!claim.linked_third_party_claim_id,
  });

  // Linked original fault claim (from third-party claim)
  const { data: linkedOriginalClaim } = useQuery({
    queryKey: ['claim', claim.linked_original_claim_id],
    queryFn: () => claim.linked_original_claim_id ? base44.entities.Claim.get(claim.linked_original_claim_id) : null,
    enabled: !!claim.linked_original_claim_id,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Colleagues who have this claim open right now (staff only).
  const othersInClaim = useClaimPresence(claim.id, currentUser, isInternalUser);

  const { data: linkedClient } = useQuery({
    queryKey: ['client', claim.client_id || claim.client_name],
    queryFn: async () => {
      if (claim.client_id) return base44.entities.Client.get(claim.client_id);
      if (claim.client_name) {
        const results = await base44.entities.Client.filter({ name: claim.client_name });
        return results?.[0] || null;
      }
      return null;
    },
    enabled: !!(claim.client_id || claim.client_name),
    staleTime: 5 * 60 * 1000,
  });

  const { data: claimUpdates = [] } = useQuery({
    queryKey: ['claimUpdates', claim.id],
    queryFn: () => base44.entities.ClaimUpdate.filter({ claim_id: claim.id }, 'created_date', 500),
    staleTime: 60000,
  });

  // Clear the unread bodyshop update bubble once an internal user opens the updates modal
  React.useEffect(() => {
    if (isClaimUpdatesOpen && claim?.unread_bodyshop_update) {
      base44.entities.Claim.update(claim.id, { unread_bodyshop_update: false })
        .then(() => queryClient.invalidateQueries({ queryKey: ['claims'] }))
        .catch(err => console.error('Failed to clear unread bodyshop update flag:', err));
    }
  }, [isClaimUpdatesOpen, claim?.unread_bodyshop_update, claim.id, queryClient]);

  const { data: claimNotes = [] } = useQuery({
    queryKey: ['notes', claim.id, 'Claim'],
    queryFn: () => base44.entities.Note.filter({ parent_id: claim.id, parent_type: 'Claim' }),
    staleTime: 30000,
  });
  const notesFileCount = claimNotes.reduce((sum, n) => sum + (n.file_urls?.length || 0), 0);
  const notesTotalCount = claimNotes.length + notesFileCount;

  const starredUpdates = claimUpdates.filter(u => u.starred && !u.parent_update_id);

  // Phones: the claim opens on its summary; a section opens on its own page. The
  // open section lives in the page address (&section=<id>), so the phone's back
  // gesture, the browser's back button and the on-screen Back all return to the
  // summary the same way.
  const routeLocation = useLocation();
  const urlSection = new URLSearchParams(routeLocation.search).get('section');
  const mobilePage = urlSection ? 'section' : 'summary';
  const sectionPushed = useRef(false);
  useEffect(() => {
    if (urlSection && canonicalSection(urlSection) !== selectedSection) setSelectedSection(canonicalSection(urlSection));
    if (!urlSection) sectionPushed.current = false;
     
  }, [urlSection]);
  const phoneSections = DETAIL_SECTIONS
    .map(s => ({ ...s, empty: isSectionEmpty(s.id, claim) }));
  // Where the summary was scrolled to when a section was opened, so Back returns there.
  const summaryScroll = useRef(0);
  const openPhoneSection = (id) => {
    // (The claim column normally does the scrolling on phones; the page itself is a fallback.)
    summaryScroll.current = rootRef.current?.closest('[data-claim-scroll]')?.scrollTop || window.scrollY || 0;
    setSelectedSection(id);
    const params = new URLSearchParams(routeLocation.search);
    params.set('section', id);
    navigate({ search: `?${params.toString()}` });
    sectionPushed.current = true;
  };
  const backToSummary = () => {
    if (sectionPushed.current) { sectionPushed.current = false; navigate(-1); return; }
    const params = new URLSearchParams(routeLocation.search);
    params.delete('section');
    navigate({ search: `?${params.toString()}` }, { replace: true });
  };
  // A section opens at its top; going back puts the summary exactly where you left it.
  React.useEffect(() => {
    const scroller = rootRef.current?.closest('[data-claim-scroll]');
    if (!scroller) return undefined;
    if (mobilePage !== 'summary') { scroller.scrollTop = 0; return undefined; }
    const to = summaryScroll.current;
    const put = () => { scroller.scrollTop = to; if (scroller.scrollTop < to - 4) window.scrollTo(0, to); };
    put();
    // Once more after the summary has finished laying out (cards, counts, photos).
    const f1 = requestAnimationFrame(put);
    const t = setTimeout(put, 150);
    return () => { cancelAnimationFrame(f1); clearTimeout(t); };
  }, [mobilePage]);
  const handlePhoneAction = (val) => {
    if (val === 'notes') setIsNotesOpen(true);
    else if (val === 'docs') setIsAttachmentsOpen(true);
    else if (val === 'images') setIsImagesOpen(true);
    else if (val === 'timelogs') setIsTimeLogsOpen(true);
    else if (val === 'activity') setIsActivityLogOpen(true);
    else if (val === 'email') setIsEmailModalOpen(true);
    else if (val === 'tasks') setIsTasksModalOpen(true);
    else if (val === 'download_pdf') window.open(claim.instruction_pdf_url, '_blank');
    else if (val === 'download_overview') handleDownloadOverviewPdf();
    else if (val === 'estimate') setIsEstimateModalOpen(true);
    else if (val === 'parts') setIsPartsModalOpen(true);
    else if (val === 'backorders') setIsBackorderedPartsModalOpen(true);
    else if (val === 'duplicate') setIsDuplicateModalOpen(true);
    else if (val === 'archive') handleArchive();
    else if (val === 'delete') handleDelete();
  };

  // Saves a change to the claim. The screen updates at once; the history is only
  // written once the save has gone through, and a failed save puts the screen back.
  // Resolves true when saved, false when not.
  const handleUpdate = async (updatedData, options = {}) => {
    const previous = claim;
    // Update local state immediately for instant UI feedback
    setClaim(updatedData);
    const saved = await onUpdate(updatedData);
    if (saved === false) {
      setClaim(previous);
      return false;
    }
    // Contact details that belong to a directory record (client, third party, referrer,
    // credit repair company) are kept the same on that record and on every other claim.
    syncClaimEditToRecords(previous, updatedData).then((r) => {
      if (!r?.records?.length) return;
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      notify(`Also updated ${r.records.join(' and ')}${r.claims ? ` and ${r.claims} other claim${r.claims === 1 ? '' : 's'}` : ''}`);
    }).catch(() => {});
    const oldStatus = claim.job_status || 'New';
    const newStatus = updatedData.job_status;
    const oldSec = claim.secondary_status || '';
    const newSec = updatedData.secondary_status || '';
    const primaryChanged = !!(newStatus && newStatus !== oldStatus);
    const secondaryChanged = updatedData.secondary_status !== undefined && newSec !== oldSec;
    
    // Log all changes to activity log. A section that records its own history for
    // the fields it writes (Financials) asks us not to log them a second time.
    if (!options.skipFieldLog) {
      await logChanges({
        parentId: claim.id,
        parentType: 'Claim',
        oldData: claim,
        newData: updatedData,
        user: currentUser,
        fieldLabels: {
          policy_excess: 'Policy excess',
          excess_tbc: 'Excess on authority (TBC)',
        },
      });
    }
    
    // Outcome and tertiary changes are recorded too, not just journey and secondary.
    const statusRecord = buildStatusChangeRecord(claim, updatedData);
    if ((primaryChanged || secondaryChanged || statusRecord) && !options.skipClaimUpdateLog) {
        const parts = [];
        if (primaryChanged) parts.push(`Status changed from "${oldStatus}" to "${newStatus}"`);
        if (secondaryChanged) parts.push(`Secondary status changed from "${oldSec || 'None'}" to "${newSec || 'None'}"`);
        if (statusRecord?.changed.includes('outcome')) parts.push(`Outcome changed from "${statusRecord.from.outcome || 'None'}" to "${statusRecord.to.outcome || 'None'}"`);
        if (statusRecord?.changed.includes('tertiary')) parts.push(`Additional status changed from "${statusRecord.from.tertiary || 'None'}" to "${statusRecord.to.tertiary || 'None'}"`);

        try {
        await base44.entities.ClaimUpdate.create({
            claim_id: claim.id,
            update_type: 'Status Change',
            ...(statusRecord && { status_change: statusRecord }),
            description: parts.join(' · ') || 'Status updated',
            next_steps: '',
            due_date_for_next_action: ''
        });

        queryClient.invalidateQueries({ queryKey: ['claimUpdates', claim.id] });
        } catch (error) {
        console.error('Failed to log status change:', error);
        }
    }

    queryClient.invalidateQueries({ queryKey: ['activityLogs', claim.id] });
    return true;
  };

  const archiveMutation = useMutation({
    mutationFn: () => base44.entities.Claim.update(claim.id, { archived: !claim.archived }),
    onSuccess: (updatedClaim) => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      handleUpdate({ ...claim, archived: updatedClaim.archived });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Verify claim exists before deletion
      try {
        await base44.entities.Claim.get(claim.id);
      } catch (e) {
        throw new Error('Claim not found - it may have already been deleted');
      }
      return deleteAndLog("Claim", claim.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      onClose();
    },
    onError: (error) => {
      console.error('Failed to delete claim:', error);
      notifyError('Could not delete the claim', error);
    },
  });

  // The time spent on the claim is logged once, in the background, however the
  // screen is left — the back button, the browser's own back gesture, or
  // switching to another claim. Nothing here waits for the write, and the key
  // makes a second save update the same log instead of adding another one.
  const saveTimeLog = React.useCallback(() => {
    if (hasSavedRef.current) return;
    const duration = durationRef.current;
    if (!(duration > 0)) return;
    hasSavedRef.current = true;
    saveTimeLogInBackground({
      parent_id: claim.id,
      parent_type: 'Claim',
      duration_seconds: duration,
      started_at: startTime.toISOString(),
      ended_at: new Date().toISOString(),
      log_key: `Claim:${claim.id}:${startTime.toISOString()}`
    });
  }, [claim.id, startTime]);

  // Leaving the claim any other way (browser back gesture, switching claim)
  // unmounts this screen — the log is written then.
  React.useEffect(() => saveTimeLog, [saveTimeLog]);

  const handleOverrideSave = (overrideData) => {
    if (overrideTrackerType === 'client_comm') {
      handleUpdate({ ...claim, ...overrideData });
    } else {
      handleUpdate({ ...claim, ...overrideData, last_updated_at: new Date().toISOString() });
    }
  };

  const handleClaimUpdateCreated = (newStatus, newSecondaryStatus, newTertiaryStatus, updateType, direction, dates) => {
    const now = new Date();
    const effectiveStatus = newStatus || claim.job_status;
    const isClosedAfterUpdate = isUpdateTrackingClosed({ ...claim, job_status: effectiveStatus, journey_status: newStatus || claim.journey_status, outcome: dates?.outcome || claim.outcome, invoice_status: claim.invoice_status });
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // General 48hr timer only resets on an Incoming update (any type).
    // Client comm timer only resets on an Outgoing Client Communication.
    const resetGeneral = direction === 'Incoming';
    const resetClientComm = updateType === 'Client Communication' && direction === 'Outgoing';

    // DB payload — only the fields that should actually change. Spreading the
    // entire claim here would overwrite the stored record with any stale prop
    // value (e.g. wiping tertiary_status that was set elsewhere).
    const dbUpdate = {
      id: claim.id,
      ...(resetGeneral && !isClosedAfterUpdate && {
        last_updated_at: now.toISOString(),
        next_update_due_at: fortyEightHoursFromNow.toISOString(),
        update_status_flag: 'Green',
      }),
      ...(resetGeneral && isClosedAfterUpdate && {
        update_status_flag: 'Gray',
      }),
    };

    // Full local merge for immediate UI feedback (keeps all existing fields).
    const localClaim = {
      ...claim,
      ...(resetGeneral && !isClosedAfterUpdate && {
        last_updated_at: now.toISOString(),
        next_update_due_at: fortyEightHoursFromNow.toISOString(),
        update_status_flag: 'Green',
      }),
      ...(resetGeneral && isClosedAfterUpdate && { update_status_flag: 'Gray' }),
    };

    // Client Communication updates also reset the dedicated 48-hour client
    // communication tracker. The ClaimUpdateForm already persists these to
    // the server, but we must also set them on localClaim so the badge updates
    // instantly — otherwise setClaim(localClaim) would overwrite them with the
    // stale values from the old claim prop.
    if (resetClientComm) {
      dbUpdate.last_client_comm_at = now.toISOString();
      dbUpdate.next_client_comm_due_at = fortyEightHoursFromNow.toISOString();
      dbUpdate.client_comm_status_flag = isClosedAfterUpdate ? 'Gray' : 'Green';
      localClaim.last_client_comm_at = now.toISOString();
      localClaim.next_client_comm_due_at = fortyEightHoursFromNow.toISOString();
      localClaim.client_comm_status_flag = isClosedAfterUpdate ? 'Gray' : 'Green';
    }

    if (updateType === 'Status Change') {
      if (dates?.outcome) {
        dbUpdate.outcome = dates.outcome;
        localClaim.outcome = dates.outcome;
      }
      if (newStatus) {
        dbUpdate.job_status = newStatus;
        dbUpdate.journey_status = newStatus;
        localClaim.job_status = newStatus;
        localClaim.journey_status = newStatus;
        const currentStatuses = claim.job_statuses?.length ? [...claim.job_statuses] : (claim.job_status ? [claim.job_status] : ['New']);
        const oldPrimary = claim.job_status || 'New';
        const idx = currentStatuses.indexOf(oldPrimary);
        if (idx !== -1) currentStatuses[idx] = newStatus;
        else currentStatuses.unshift(newStatus);
        dbUpdate.job_statuses = currentStatuses;
        localClaim.job_statuses = currentStatuses;
      }
      dbUpdate.secondary_status = newSecondaryStatus || null;
      dbUpdate.tertiary_status = newTertiaryStatus || null;
      localClaim.secondary_status = newSecondaryStatus || null;
      localClaim.tertiary_status = newTertiaryStatus || null;
      // Preserve milestone dates set by the update form (on_site_date,
      // completion_date, etc.) so the optimistic full-object save below does
      // not overwrite them with stale values from the old claim prop.
      if (dates) {
        ['on_site_date', 'completion_date', 'claim_complete_date', 'salvage_collected_date', 'hand_over_date'].forEach((k) => {
          if (dates[k]) {
            dbUpdate[k] = dates[k];
            localClaim[k] = dates[k];
          }
        });
      }
    }

    handleUpdate(localClaim, { skipClaimUpdateLog: true });
  };

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (claim && !isUpdateTrackingClosed(claim)) {
        queryClient.invalidateQueries({ queryKey: ['claims'] });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [claim, queryClient]);

  // Closing never waits for the time log: it is handed to the background save
  // and the screen closes on the same tap.
  const handleClose = () => {
    saveTimeLog();
    onClose();
  };

  const handleArchive = async () => {
    if (claim.archived) {
      if (await askConfirm({ title: 'Restore this claim?', message: 'It moves back to the live claims list.', confirmLabel: 'Restore' })) archiveMutation.mutate();
      return;
    }
    // Anything still outstanding is listed before the claim is filed away, so
    // archiving a claim with money still on it stays a deliberate choice.
    const outstanding = claimOutstandingItems(claim);
    if (outstanding.length > 0) {
      setArchiveWarning(outstanding);
      return;
    }
    if (await askConfirm({ title: 'Archive this claim?', message: 'It moves to the Archive. You can restore it later.', confirmLabel: 'Archive' })) {
      archiveMutation.mutate();
    }
  };

  const handleDelete = async () => {
    const ok = await askConfirm({
      title: `Delete claim ${claim.job_number || ''}?`.replace(' ?', '?'),
      message: 'The claim is deleted permanently and can’t be brought back. Archiving keeps it instead.',
      confirmLabel: 'Delete permanently',
      destructive: true,
    });
    if (ok) deleteMutation.mutate();
  };

  const handleFilesUploaded = (newFileUrls) => {
    const currentUrls = Array.isArray(claim.file_urls) ? claim.file_urls : [];
    const updatedUrls = [...currentUrls, ...newFileUrls];
    handleUpdate({ ...claim, file_urls: updatedUrls });
    // Invalidate query cache so uploads appear immediately
    queryClient.invalidateQueries({ queryKey: ['claims'] });
    queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
  };

  const handleFileRemove = (urlToRemove) => {
    const currentUrls = Array.isArray(claim.file_urls) ? claim.file_urls : [];
    const updatedUrls = currentUrls.filter(url => url !== urlToRemove);
    handleUpdate({ ...claim, file_urls: updatedUrls });
  };

  const handleImagesAdd = (newImageUrls) => {
    const currentUrls = Array.isArray(claim.image_urls) ? claim.image_urls : [];
    handleUpdate({ ...claim, image_urls: [...currentUrls, ...newImageUrls] });
    // Invalidate query cache so uploads appear immediately
    queryClient.invalidateQueries({ queryKey: ['claims'] });
    queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
  };

  const handleImageRemove = (urlToRemove) => {
    const currentUrls = Array.isArray(claim.image_urls) ? claim.image_urls : [];
    handleUpdate({ ...claim, image_urls: currentUrls.filter(url => url !== urlToRemove) });
  };

  const handleFetchVehicleData = async () => {
    if (!claim.reg) {
      setVehicleFetchError('Please enter a registration number first');
      return;
    }
    
    setIsFetchingVehicle(true);
    setVehicleFetchError('');
    
    try {
      const response = await lookupVehicleData({ registrationNumber: claim.reg });
      // The function returns the data directly, not wrapped in success/error
      const result = response.data || response;
      
      if (result.error) {
        setVehicleFetchError(result.message || result.error || 'Failed to fetch vehicle data');
        return;
      }
      
      const updates = {
        vehicle_make: result.make || '',
        vehicle_model: result.model || '',
        make_model: result.make_model || '',
        vehicle_colour: result.colour || '',
        vehicle_fuel_type: result.fuel_type || '',
        vehicle_year_of_manufacture: result.year_of_manufacture || null,
        vehicle_engine_capacity: result.engine_capacity || null,
        vehicle_co2_emissions: result.co2_emissions || null,
        vehicle_euro_status: result.euro_status || '',
        vehicle_mot_status: result.mot_status || '',
        vehicle_mot_expiry_date: result.mot_expiry_date || null,
        vehicle_tax_status: result.tax_status || '',
        vehicle_tax_due_date: result.tax_due_date || null,
        vehicle_date_of_last_v5c_issued: result.date_of_last_v5c_issued || null,
        vehicle_wheelplan: result.wheelplan || '',
        vehicle_revenue_weight: result.revenue_weight || null,
      };
      
      // handleUpdate logs each changed field, so it isn't logged here as well.
      const saved = await handleUpdate({ ...claim, ...updates });
      if (saved === false) return;
      const summary = [
        [result.make, result.model].filter(Boolean).join(' '),
        result.year_of_manufacture ? `(${result.year_of_manufacture})` : '',
        [result.colour, result.fuel_type].filter(Boolean).join(' '),
      ].filter(Boolean).join(' – ');
      notify('Vehicle details updated from the DVLA', summary);
    } catch (error) {
      console.error('Failed to fetch vehicle data:', error);
      setVehicleFetchError(error.message || 'An error occurred while fetching vehicle data');
    } finally {
      setIsFetchingVehicle(false);
    }
  };

  const handlePartCreated = (createdPart) => {
    handleUpdate({ ...claim, linked_parts_id: createdPart.id });
    queryClient.invalidateQueries({ queryKey: ['parts'] });
  };

  const handleEstimateCreated = (createdEstimate) => {
    handleUpdate({ ...claim, linked_estimate_id: createdEstimate.id });
    queryClient.invalidateQueries({ queryKey: ['estimates'] });
  };

  const handleAIExtract = async (extractedData) => {
    const found = Object.entries(extractedData || {})
      .filter(([, value]) => value !== null && value !== undefined && value !== '');
    if (found.length === 0) {
      notify('Nothing to fill in', 'No claim details were found in that file.');
      return;
    }
    const label = (key) => key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
    const ok = await askConfirm({
      title: 'Update the claim with these details?',
      message: found.map(([key, value]) => `${label(key)}: ${value}`).join('\n'),
      confirmLabel: 'Update the claim',
    });
    if (ok) handleUpdate({ ...claim, ...Object.fromEntries(found) });
  };

  const openLinkedItem = (pageUrl, itemId) => {
    const url = `${pageUrl}?id=${itemId}`;
    window.open(url, '_blank');
  };

  const openLinkedClaim = (claimId) => {
    window.open(`/claims?id=${claimId}`, '_blank');
  };

  const handleRegenerateInstruction = async (templateType = 'standard') => {
    setIsRegeneratingPdf(true);
    setRegenTemplateOpen(false);
    setRegenPdfUrl(null);
    setSavedRegenToDocs(false);
    try {
      const contactSource = (claim.last_contact_source || 'Client').toLowerCase();
      let contactOverrides = {};
      if (contactSource === 'client') {
        contactOverrides = { name: claim.client_name, phone: claim.client_phone, email: claim.client_email };
      } else if (contactSource === 'driver') {
        contactOverrides = { name: claim.driver_contact_name, phone: claim.driver_contact_phone, email: claim.driver_contact_email };
      }

      const response = await base44.functions.invoke('generateBodyshopInstructionPdf', {
        claimId: claim.id,
        contactOverrides,
        templateType,
      });

      const { file_url } = response.data;
      if (!file_url) throw new Error('No file URL returned');
      setRegenPdfUrl(file_url);
      window.open(file_url, '_blank');
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
    } catch (error) {
      console.error('Error regenerating instruction PDF:', error);
      notifyError('Could not create the instruction PDF', error);
    } finally {
      setIsRegeneratingPdf(false);
    }
  };

  const handleSaveRegenToDocs = async () => {
    if (!regenPdfUrl) return;
    setIsSavingRegenToDocs(true);
    try {
      const existingFiles = claim.file_urls || [];
      const updatedFiles = existingFiles.includes(regenPdfUrl)
        ? existingFiles
        : [...existingFiles, regenPdfUrl];
      await base44.entities.Claim.update(claim.id, { file_urls: updatedFiles });
      setSavedRegenToDocs(true);
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
    } catch (error) {
      console.error('Error saving PDF to claim docs:', error);
      notifyError('Could not save the PDF to the claim documents', error);
    } finally {
      setIsSavingRegenToDocs(false);
    }
  };

  const handleDownloadOverviewPdf = () => {
    generateClaimOverviewPdf(claim, linkedClient);
  };

  // The amount is checked before anything is generated, so the order is issued at a
  // figure someone has seen rather than silently off the estimate.
  const handlePurchaseOrderIssued = (order) => {
    queryClient.invalidateQueries({ queryKey: ['claims'] });
    queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
    if (order?.file_url) window.open(order.file_url, '_blank');
  };

  const renderSelectedSection = () => {
        switch (canonicalSection(selectedSection)) {
          case 'thirdpartyPursuit':
        // Only show for fault claims
        if (claim.claim_type !== 'Fault Claim' && claim.claim_type !== 'Non-Fault - Own Insurer') {
          return (
            <div className="bg-card border border-border rounded-xl p-4 md:p-5 shadow-card">
              <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-border">
                <Users className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-[15px] font-semibold text-foreground">Third party pursuit</h3>
              </div>
              <div className="text-center py-12 text-sm text-muted-foreground">
                <p>Third party pursuit only applies to fault claims.</p>
              </div>
            </div>
          );
        }
        return <ThirdPartyPursuitSection claim={claim} onUpdate={handleUpdate} />;

      case 'status':
        return <ClaimFieldsSection title="Overview" icon={Clock} claim={claim} onUpdate={handleUpdate} canEdit={canEdit} cards={overviewCards(claim)} />;

      case 'insurance':
        return <ClaimFieldsSection title="Client insurance" icon={Shield} claim={claim} onUpdate={handleUpdate} canEdit={canEdit} cards={insuranceCards(claim, { ExcessForm: ClaimExcessContributionForm })} />;

      case 'client': {
        const clientContacts = linkedClient?.contacts || [];
        const contactsCard = {
          title: 'Contacts at this business',
          wide: true,
          after: (
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {clientContacts.map((c, i) => {
                const primary = c.is_primary || (i === 0 && !clientContacts.some(x => x.is_primary));
                return (
                  <div key={i} className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{c.name || '—'}</span>
                      {c.position && <span className="text-xs text-muted-foreground">· {c.position}</span>}
                      {primary && <span className="inline-flex items-center gap-0.5 text-xs text-warning-fg font-medium"><Star className="w-3 h-3 fill-amber-500 text-warning" /> Primary</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-[13px] text-muted-foreground">
                      {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-foreground"><Phone className="w-3.5 h-3.5" /> {c.phone}</a>}
                      {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-foreground break-all"><Mail className="w-3.5 h-3.5" /> {c.email}</a>}
                    </div>
                  </div>
                );
              })}
            </div>
          ),
        };
        return <ClaimFieldsSection title="Client details" icon={Users} claim={claim} onUpdate={handleUpdate} canEdit={canEdit} cards={[...clientCards(claim, { linkedClient }), ...(clientContacts.length ? [contactsCard] : [])]} />;
      }

      case 'hire':
        return <ClaimFieldsSection title="Courtesy car & hire" icon={KeyRound} claim={claim} onUpdate={handleUpdate} canEdit={canEdit} cards={hireCards(claim)} />;

      case 'creditRepair':
        return (
          <ClaimFieldsSection
            title="Credit repair company" icon={BadgePercent} claim={claim} onUpdate={handleUpdate} canEdit={canEdit}
            cards={creditRepairCards(claim, { CreditRepairForm: ClaimCreditRepairForm })}
            after={(
              <>
                <CreditRepairRatesCard claim={claim} />
                {claim.credit_repair_company_name && (
                  <div className="rounded-2xl bg-card shadow-card p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <span className="text-sm font-semibold block">Credit repair instruction</span>
                        <span className="text-xs text-muted-foreground">Generate a PDF instruction and email it to {claim.credit_repair_company_name}.</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setIsCreditRepairInstructionOpen(true)} className="gap-2">
                      <FileText className="w-4 h-4" /> Send instruction
                    </Button>
                  </div>
                )}
              </>
            )}
          />
        );

      case 'driver':
        return <ClaimFieldsSection title="Repair contact (driver)" icon={User} claim={claim} onUpdate={handleUpdate} canEdit={canEdit} cards={driverCards(claim)} />;

      case 'thirdParty':
        return <ClaimFieldsSection title="Third party details" icon={Users} claim={claim} onUpdate={handleUpdate} canEdit={canEdit} cards={thirdPartyCards(claim)} />;

      case 'tpInsurance':
        return <ClaimFieldsSection title="Third party insurance" icon={Shield} claim={claim} onUpdate={handleUpdate} canEdit={canEdit} cards={tpInsuranceCards(claim)} />;

      case 'vehicle':
        return (
          <ClaimFieldsSection
            title="Vehicle" icon={Car} claim={claim} onUpdate={handleUpdate} canEdit={canEdit}
            before={vehicleFetchError ? <p className="text-xs text-danger-fg px-1">{vehicleFetchError}</p> : null}
            cards={vehicleCards(claim, {
              dvlaAction: claim.reg ? (
                <Button size="sm" variant="outline" onClick={handleFetchVehicleData} disabled={isFetchingVehicle} className="h-8">
                  {isFetchingVehicle ? 'Fetching…' : 'Fetch from DVLA'}
                </Button>
              ) : null,
            })}
          />
        );

      case 'instructionDefaults':
        return <ClaimFieldsSection title="Instruction defaults" icon={FileText} claim={claim} onUpdate={handleUpdate} canEdit={canEdit} cards={instructionCards(claim)} />;

      case 'referrer':
        return <ClaimFieldsSection title="Referrer" icon={Briefcase} claim={claim} onUpdate={handleUpdate} canEdit={canEdit} cards={referrerCards(claim, { ReferrerForm: ClaimReferrerForm })} />;

      case 'indemnity':
        return (
          <ClaimFieldsSection
            title="Indemnity" icon={Shield} claim={claim} onUpdate={handleUpdate} canEdit={canEdit}
            before={<IndemnityLinkManager claim={claim} onUpdate={handleUpdate} />}
            cards={indemnityCards(claim, { IndemnityForm: ClaimIndemnityForm })}
          />
        );

      case 'signedForms': {
        const [rp, don] = signedFormCards(claim);
        const pdf = (url) => url ? (
          <div className="px-4 py-2.5 border-t border-border flex items-center justify-between gap-3">
            <span className="text-sm font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" /> Signed PDF</span>
            <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')} className="gap-2 h-8"><Download className="w-4 h-4" /> View</Button>
          </div>
        ) : null;
        return (
          <ClaimFieldsSection
            title="Signed forms" icon={FileSignature} claim={claim} onUpdate={handleUpdate} canEdit={canEdit}
            cards={[
              { ...rp, wide: true, before: <div className="px-4 pb-3"><RepairPreferenceLinkManager claim={claim} onUpdate={handleUpdate} /></div>, after: pdf(claim.repair_preference_pdf_url) },
              { ...don, wide: true, before: <div className="px-4 pb-3"><DeclarationOfNeedLinkManager claim={claim} onUpdate={handleUpdate} /></div>, after: pdf(claim.declaration_of_need_pdf_url) },
              { title: 'Witness statements', wide: true, after: <div className="px-4 pb-4"><WitnessStatementsSection claim={claim} /></div> },
            ]}
          />
        );
      }

      case 'financials':
        return (
          <SectionShell
            title="Financials" icon={DollarSign}
            actions={isInternalUser && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                <Lock className="w-3 h-3" aria-hidden="true" /> Internal only
              </span>
            )}
          >
            <div className="rounded-2xl bg-card shadow-card p-4 md:p-5">
              <ClaimFinancials claim={claim} currentUser={currentUser} onUpdate={handleUpdate} showInvoicing={isInternalUser} />
            </div>
          </SectionShell>
        );

      case 'dates':
        return <ClaimFieldsSection title="Key dates" icon={Calendar} claim={claim} onUpdate={handleUpdate} canEdit={canEdit} cards={datesCards(claim, { totalLoss, isRectification })} />;

      case 'bodyshop':
        return (
          <SectionShell title="Bodyshop" icon={Wrench}>
          <div className="rounded-2xl bg-card shadow-card p-4 md:p-5">
            {/* Find Repairer on Map — always visible, no edit mode needed */}
            <div className="mb-4">
              <ClaimBodyshopAllocateButton claim={claim} onAllocated={(data) => handleUpdate({ ...claim, ...data })} />
            </div>
            {/* Repairer Acceptance Status Banner */}
            {claim.bodyshop_id && !claim.repairer_accepted && (
              <div className="mb-4 p-3 rounded-lg border-2 border-warning bg-warning-bg flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-warning-fg flex-shrink-0" />
                <div>
                  <p className="font-medium text-warning-fg">Awaiting Repairer Acceptance</p>
                  <p className="text-xs text-warning-fg">The bodyshop has not yet confirmed they can handle this repair</p>
                </div>
              </div>
            )}
            {claim.bodyshop_id && claim.repairer_accepted && (
              <div className="mb-4 p-3 rounded-lg border-2 border-success bg-success-bg flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div>
                  <p className="font-medium text-success-fg">Repairer Accepted</p>
                  <p className="text-xs text-success-fg">
                    {claim.repairer_accepted_date ? `Accepted on ${format(new Date(claim.repairer_accepted_date), 'dd/MM/yyyy')}` : 'Job confirmed by bodyshop'}
                  </p>
                </div>
              </div>
            )}
            {/* Extended bodyshop information when allocated */}
            {claim.bodyshop_id && (
              <>
                <ClaimBodyshopInfo bodyshopId={claim.bodyshop_id} />
              </>
            )}
            
            {/* Instruction PDF Download / Regenerate */}
            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Instruction PDF</span>
                </div>
                <div className="flex items-center gap-2">
                  {claim.instruction_pdf_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(claim.instruction_pdf_url, '_blank')}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Pre-select based on the existing instruction's template
                      const existingUrl = claim.instruction_pdf_url || '';
                      setRegenTemplateType(existingUrl.includes('orkin') ? 'orkin' : 'standard');
                      setRegenTemplateOpen((v) => !v);
                    }}
                    disabled={isRegeneratingPdf}
                    className="gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRegeneratingPdf ? 'animate-spin' : ''}`} />
                    {isRegeneratingPdf ? 'Generating...' : 'Regenerate'}
                  </Button>
                </div>
              </div>
              {regenTemplateOpen && (
                <div className="mt-3 pt-3 border-t border-primary/20 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Select template to regenerate:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegenTemplateType('standard')}
                      className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        regenTemplateType === 'standard'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <FileText className="w-4 h-4 mx-auto mb-1" />
                      Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegenTemplateType('orkin')}
                      className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        regenTemplateType === 'orkin'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Wrench className="w-4 h-4 mx-auto mb-1" />
                      Orkin
                    </button>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleRegenerateInstruction(regenTemplateType)}
                    disabled={isRegeneratingPdf}
                  >
                    {isRegeneratingPdf ? (
                      <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      <>Generate {regenTemplateType === 'orkin' ? 'Orkin' : 'Standard'} Instruction</>
                    )}
                  </Button>
                </div>
              )}
              {regenPdfUrl && !isRegeneratingPdf && (
                <div className="mt-3 pt-3 border-t border-primary/20 space-y-2">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-success-bg border border-success/30 text-success-fg">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm flex-1">
                      {savedRegenToDocs ? 'Saved to claim docs.' : 'PDF generated.'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(regenPdfUrl, '_blank')}
                      className="gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> View
                    </Button>
                  </div>
                  {!savedRegenToDocs && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveRegenToDocs}
                      disabled={isSavingRegenToDocs}
                      className="w-full gap-2"
                    >
                      {isSavingRegenToDocs ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                      ) : (
                        <><Save className="w-4 h-4" /> Save to Claim Docs Now</>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
          </SectionShell>
        );

      case 'estimate':
        return (
          <ClaimFieldsSection
            title="Estimate" icon={Calculator} claim={claim} onUpdate={handleUpdate} canEdit={canEdit}
            cards={estimateCards(claim)}
            after={
              <>
                <EstimateAuthorityTotals claim={claim} />
                <div className="rounded-2xl bg-card shadow-card p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <span className="text-sm font-semibold block">Purchase order</span>
                      <span className="text-xs text-muted-foreground">
                        Authority figure: {(() => {
                          const v = claim.authority_cost_gross ?? claim.estimate_cost_gross ?? claim.authority_cost_net ?? claim.estimate_cost_net;
                          return v != null && v !== '' ? `£${Number(v).toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : '—';
                        })()}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsPoDialogOpen(true)} className="gap-2">
                    <FileText className="w-4 h-4" /> Generate PO
                  </Button>
                </div>
              </>
            }
          />
        );

      case 'backorderedParts':
        return (
          <BackorderedPartsSection
            claim={claim}
            currentUser={currentUser}
            onSendEmail={() => setIsEmailModalOpen(true)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <DragDropOverlay onFilesUploaded={handleFilesUploaded}>
      <PartsRequestModal
        claim={claim}
        isOpen={isPartsModalOpen}
        onClose={() => setIsPartsModalOpen(false)}
        onPartCreated={handlePartCreated}
      />
      <EstimateRequestModal
        claim={claim}
        isOpen={isEstimateModalOpen}
        onClose={() => setIsEstimateModalOpen(false)}
        onEstimateCreated={handleEstimateCreated}
      />
      <EmailComposerModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        itemType="Claim"
        itemData={claim}
      />
      <DocumentTrackerModal
        isOpen={isAttachmentsOpen}
        onClose={() => setIsAttachmentsOpen(false)}
        claim={claim}
        currentUser={currentUser}
        onUpdate={handleUpdate}
      />
      <ImageAttachmentModal
        imageUrls={claim.image_urls || []}
        onAdd={handleImagesAdd}
        onRemove={handleImageRemove}
        isOpen={isImagesOpen}
        onClose={() => setIsImagesOpen(false)}
      />
      <NotesModal
        parentId={claim.id}
        parentType="Claim"
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
      />

      <UpdateOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        claim={claim}
        onSave={handleOverrideSave}
        trackerType={overrideTrackerType}
      />

      <ClaimUpdatesModal
        claimId={claim.id}
        currentStatus={claim.job_status}
        isOpen={isClaimUpdatesOpen}
        onClose={() => setIsClaimUpdatesOpen(false)}
        onUpdateCreated={handleClaimUpdateCreated}
      />
      <ClaimQuickViewModal
        claim={claim}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />

      <UpdateTrackingModal
        claim={claim}
        isOpen={isUpdateTrackingOpen}
        onClose={() => setIsUpdateTrackingOpen(false)}
        onSetOverride={() => {
          setIsUpdateTrackingOpen(false);
          setOverrideTrackerType('general');
          setIsOverrideModalOpen(true);
        }}
        onSetClientCommOverride={() => {
          setIsUpdateTrackingOpen(false);
          setOverrideTrackerType('client_comm');
          setIsOverrideModalOpen(true);
        }}
        canEdit={canEdit}
      />

      <TasksModal
                claimId={claim.id}
                claimJobNumber={claim.job_number}
                claimReg={claim.reg}
                isOpen={isTasksModalOpen}
                onClose={() => setIsTasksModalOpen(false)}
              />

              <TimeLogsModal
                parentId={claim.id}
                parentType="Claim"
                isOpen={isTimeLogsOpen}
                onClose={() => setIsTimeLogsOpen(false)}
              />

              <ActivityLogModal
                parentId={claim.id}
                parentType="Claim"
                isOpen={isActivityLogOpen}
                onClose={() => setIsActivityLogOpen(false)}
              />

              <BackorderedPartsModal
                claim={claim}
                currentUser={currentUser}
                isOpen={isBackorderedPartsModalOpen}
                onClose={() => setIsBackorderedPartsModalOpen(false)}
                onSendEmail={() => setIsEmailModalOpen(true)}
              />

              <DuplicateClaimModal
                claim={claim}
                isOpen={isDuplicateModalOpen}
                onClose={() => setIsDuplicateModalOpen(false)}
                onDuplicated={(newClaim) => {
                  setIsDuplicateModalOpen(false);
                  navigate(`/Claims?id=${newClaim.id}`);
                }}
              />

              <CreditRepairInstructionModal
                claim={claim}
                isOpen={isCreditRepairInstructionOpen}
                onClose={() => setIsCreditRepairInstructionOpen(false)}
              />

              <PurchaseOrderDialog
                open={isPoDialogOpen}
                onClose={() => setIsPoDialogOpen(false)}
                claim={claim}
                onIssued={handlePurchaseOrderIssued}
              />

              <ArchiveClaimDialog
                isOpen={!!archiveWarning}
                claim={claim}
                items={archiveWarning || []}
                onClose={() => setArchiveWarning(null)}
                onConfirm={() => {
                  setArchiveWarning(null);
                  archiveMutation.mutate();
                }}
              />

      <div ref={rootRef} className="flex flex-col gap-2 md:gap-3 h-full" data-claim-root style={{touchAction: 'auto', isolation: 'isolate'}}>

          <ClaimPresenceBanner others={othersInClaim} />

          {/* ── PHONE (< lg): the claim opens on a summary; each section opens on its own page ── */}
          {mobilePage === 'summary' ? (
            <ClaimMobileSummary
              claim={claim}
              sections={phoneSections}
              isClosedStatus={isClosedStatus}
              isInternalUser={isInternalUser}
              onClose={handleClose}
              onOpenSection={openPhoneSection}
              onQuickView={() => setIsQuickViewOpen(true)}
              onUpdates={() => setIsClaimUpdatesOpen(true)}
              onUpdateTracking={() => setIsUpdateTrackingOpen(true)}
              onAction={handlePhoneAction}
              updatesCount={claimUpdates.filter(u => !u.parent_update_id).length}
              imagesCount={claim.image_urls?.length || 0}
              docsCount={claim.file_urls?.length || 0}
              notesCount={notesTotalCount}
              starredCount={starredUpdates.length}
            />
          ) : (
            <ClaimMobileSectionBar
              claim={claim}
              title={(DETAIL_SECTIONS.find(s => s.id === selectedSection) || DETAIL_SECTIONS[0]).label}
              onBack={backToSummary}
              onAction={handlePhoneAction}
              isInternalUser={isInternalUser}
            />
          )}

          {/* ── DESKTOP top bar (≥ lg) ── */}
          <div className="hidden lg:block bg-card rounded-2xl p-4 flex-shrink-0 shadow-card">
              <div className="flex flex-col gap-3">
                  {/* Left: who and what, given the room to stand out. Right: actions, with the
                      statuses tucked underneath them. */}
                  <div className="flex items-start gap-4">
                      <button aria-label="Back"
                        onClick={handleClose}
                        className="mt-1 p-2 flex-shrink-0 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
                      >
                          <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <h1 className="flex-shrink-0 rounded-lg bg-primary text-primary-foreground px-3.5 py-1 text-[26px] font-bold tracking-[0.08em] tabular-nums leading-tight shadow-card">
                              {claim.reg || 'No reg'}
                            </h1>
                            <div className="min-w-0">
                              <p className="text-xl font-bold tracking-tight leading-tight truncate">{claim.client_name || 'No client name'}</p>
                              <p className="text-[13px] text-muted-foreground truncate tabular-nums mt-0.5">
                                {[claim.job_number, claim.make_model].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                          </div>
                          {/* Claim type, who authorises, their claim number */}
                          <div className="mt-2.5"><AuthorisingPartyBanner claim={claim} caption /></div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5 justify-end">
                        <Button onClick={() => setIsQuickViewOpen(true)} title="Quick view" variant="outline" className="h-8 px-2.5 text-[13px] font-medium gap-1.5">
                          <Eye className="w-3.5 h-3.5" /> <span className="max-2xl:sr-only">Quick view</span>
                        </Button>
                        {canEdit && (
                          <Button onClick={() => setIsClaimUpdatesOpen(true)} className="h-8 px-3 text-[13px] font-medium gap-1.5">
                            {claim.unread_bodyshop_update && (
                              <span className="w-2 h-2 rounded-full bg-info ring-2 ring-primary-foreground/70 flex-shrink-0" title="New update from the repairer" aria-label="New update from the repairer" />
                            )}
                            Updates & status
                            {claimUpdates.length > 0 && <InlineCount n={claimUpdates.length} tone="onPrimary" label="updates" />}
                          </Button>
                        )}
                        {!canEdit && (
                          <Button onClick={() => setIsClaimUpdatesOpen(true)} className="h-8 px-3 text-[13px] font-medium gap-1.5">
                            Updates
                            {claimUpdates.length > 0 && <InlineCount n={claimUpdates.length} tone="onPrimary" label="updates" />}
                          </Button>
                        )}
                        <Button onClick={() => setIsImagesOpen(true)} title="Images" variant="outline" className="h-8 px-2.5 text-[13px] font-medium gap-1.5">
                          <Image className="w-3.5 h-3.5" /> <span className="max-2xl:sr-only">Images</span>
                          {(claim.image_urls?.length > 0) && <InlineCount n={claim.image_urls.length} label="images" />}
                        </Button>
                        <Button onClick={() => setIsAttachmentsOpen(true)} title="Docs" variant="outline" className="h-8 px-2.5 text-[13px] font-medium gap-1.5">
                          <FileText className="w-3.5 h-3.5" /> <span className="max-2xl:sr-only">Docs</span>
                          {(claim.file_urls?.length > 0) && <InlineCount n={claim.file_urls.length} label="documents" />}
                        </Button>
                        {isInternalUser && (
                          <Button onClick={() => setIsNotesOpen(true)} title="Internal updates" variant="outline" className="h-8 px-2.5 text-[13px] font-medium gap-1.5">
                            <Edit className="w-3.5 h-3.5" /> <span className="max-2xl:sr-only">Internal updates</span>
                            {notesTotalCount > 0 && <InlineCount n={notesTotalCount} tone="info" label="internal updates" />}
                          </Button>
                        )}
                        {canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-label="Expand" variant="outline" className="p-0 h-8 w-8"><ChevronDown className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsAttachmentsOpen(true); }}><FileText className="w-4 h-4 mr-2" />Documents</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsImagesOpen(true); }}><Image className="w-4 h-4 mr-2" />Images</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsTimeLogsOpen(true); }}><Timer className="w-4 h-4 mr-2" />Time Logs</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsActivityLogOpen(true); }}><History className="w-4 h-4 mr-2" />Activity Log</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsEmailModalOpen(true); }}><Mail className="w-4 h-4 mr-2" />Send Email</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsTasksModalOpen(true); }}><ListTodo className="w-4 h-4 mr-2" />Manage Tasks</DropdownMenuItem>
                              {claim.instruction_pdf_url && <DropdownMenuItem onSelect={(e) => { e.preventDefault(); window.open(claim.instruction_pdf_url, '_blank'); }}><Download className="w-4 h-4 mr-2" />Download Instruction PDF</DropdownMenuItem>}
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleDownloadOverviewPdf(); }}><FileText className="w-4 h-4 mr-2" />Download File Overview</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsEstimateModalOpen(true); }}><Calculator className="w-4 h-4 mr-2" />Request Estimate</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsPartsModalOpen(true); }}><Package className="w-4 h-4 mr-2" />Log Parts Issue</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsBackorderedPartsModalOpen(true); }}><Package className="w-4 h-4 mr-2" />Backordered parts</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSelectedSection('signedForms'); }}><FileText className="w-4 h-4 mr-2" />Declaration of need</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsDuplicateModalOpen(true); }}><Copy className="w-4 h-4 mr-2" />Duplicate Claim</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleArchive(); }} disabled={archiveMutation.isLoading}><Archive className="w-4 h-4 mr-2" />{claim.archived ? 'Unarchive' : 'Archive'}</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleDelete()} disabled={deleteMutation.isLoading} className="text-danger-fg"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {isExceptionOutcome(getClaimOutcome(claim)) && <StatusBadge status={getClaimOutcome(claim)} />}
                    {claim.secondary_status && <StatusBadge status={claim.secondary_status} />}
                    {claim.tertiary_status && <StatusBadge status={claim.tertiary_status} variant="secondary" />}
                    {!isClosedStatus && claim.update_status_flag && (
                      <button onClick={() => setIsUpdateTrackingOpen(true)} className="hover:opacity-80 transition-all cursor-pointer rounded-md">
                        <UpdateStatusBadge status={computeUpdateStatusFlag(claim)} small labelPrefix="Updates" />
                      </button>
                    )}
                    {!isClosedStatus && claim.client_comm_status_flag && (
                      <button onClick={() => setIsUpdateTrackingOpen(true)} className="hover:opacity-80 transition-all cursor-pointer rounded-md">
                        <UpdateStatusBadge status={computeClientCommStatusFlag(claim)} small labelPrefix="Client" />
                      </button>
                    )}
                    {claim.archived && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">Archived</span>}
                        </div>
                      </div>
                  </div>
                  {/* Where it's at: the stage in the client's words, the same track as the phone */}
                  <div className="rounded-xl bg-muted/50 px-4 py-2.5">
                    <ClaimStageTrack claim={claim} />
                  </div>
              </div>
          </div>

          {/* ── Starred update notice: one row under the header ── */}
          {starredUpdates.length > 0 && (
            <div role="status" className="max-lg:hidden bg-warning-bg border border-warning/40 rounded-xl px-3 py-2 flex items-center gap-2.5 flex-shrink-0">
              <Star className="w-4 h-4 text-warning fill-current flex-shrink-0" aria-hidden="true" />
              <p className="flex-1 min-w-0 text-sm text-warning-fg">
                <span className="font-semibold">{starredUpdates.length} flagged update{starredUpdates.length !== 1 ? 's' : ''}.</span>{' '}
                This job can't be completed until the star{starredUpdates.length !== 1 ? 's are' : ' is'} removed.
              </p>
              <button onClick={() => setIsClaimUpdatesOpen(true)} className="text-sm font-medium text-warning-fg underline underline-offset-2 hover:opacity-80 flex-shrink-0">View flagged updates</button>
            </div>
          )}

        {(linkedEstimate || linkedEngineering || linkedParts || linkedThirdPartyClaim || linkedOriginalClaim) && (
          <div className="hidden lg:block bg-card border border-border rounded-xl p-3 flex-shrink-0 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-semibold">Linked cases</h3>
            </div>
            <div className="flex gap-3 flex-wrap">
              {linkedOriginalClaim && (
                <button
                  onClick={() => openLinkedClaim(linkedOriginalClaim.id)}
                  className="bg-muted hover:bg-muted/80 border border-border rounded-[8px] px-3 py-1.5 text-sm transition-all cursor-pointer"
                  title="Click to open in new window"
                >
                  <span className="text-muted-foreground">Original Fault Claim:</span>{' '}
                  <span className="font-medium text-info-fg underline">{linkedOriginalClaim.job_number || linkedOriginalClaim.reg}</span>
                </button>
              )}
              {linkedThirdPartyClaim && (
                <button
                  onClick={() => openLinkedClaim(linkedThirdPartyClaim.id)}
                  className="bg-muted hover:bg-muted/80 border border-border rounded-[8px] px-3 py-1.5 text-sm transition-all cursor-pointer"
                  title="Click to open in new window"
                >
                  <span className="text-muted-foreground">Third Party Claim:</span>{' '}
                  <span className="font-medium text-info-fg underline">{linkedThirdPartyClaim.job_number || linkedThirdPartyClaim.reg}</span>
                </button>
              )}
              {linkedEstimate && (
                <button
                  onClick={() => openLinkedItem(createPageUrl('Estimating'), linkedEstimate.id)}
                  className="bg-muted hover:bg-muted/80 border border-border rounded-[8px] px-3 py-1.5 text-sm transition-all cursor-pointer"
                  title="Click to open in new window"
                >
                  <span className="text-muted-foreground">Estimate:</span>{' '}
                  <span className="font-medium text-success-fg underline">{linkedEstimate.name}</span>
                </button>
              )}
              {linkedEngineering && (
                <button
                  onClick={() => openLinkedItem(createPageUrl('Engineering'), linkedEngineering.id)}
                  className="bg-muted hover:bg-muted/80 border border-border rounded-[8px] px-3 py-1.5 text-sm transition-all cursor-pointer"
                  title="Click to open in new window"
                >
                  <span className="text-muted-foreground">Engineering:</span>{' '}
                  <span className="font-medium text-purple-600 underline">{linkedEngineering.reference}</span>
                </button>
              )}
              {linkedParts && (
                <button
                  onClick={() => openLinkedItem(createPageUrl('Parts'), linkedParts.id)}
                  className="bg-muted hover:bg-muted/80 border border-border rounded-[8px] px-3 py-1.5 text-sm transition-all cursor-pointer"
                  title="Click to open in new window"
                >
                  <span className="text-muted-foreground">Parts:</span>{' '}
                  <span className="font-medium text-warning-fg underline">{linkedParts.vehicle_ref}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sections: a source list down the left on desktop, the Mac way (phones open a
            section from ClaimMobileSummary). Same sections, same order. */}
        <div className={`flex-1 min-h-0 flex gap-3 ${mobilePage === 'summary' ? 'max-lg:hidden' : ''}`}>
          {/* Same groups and headings as the phone's All details list */}
          <nav aria-label="Claim sections" className="hidden lg:flex w-[17.5rem] flex-shrink-0 flex-col min-h-0 overflow-y-auto rounded-2xl bg-card shadow-card p-2">
            {groupSections(phoneSections).map(([group, list]) => (
              <div key={group} className="mb-1.5 last:mb-0">
                <h3 className="flex items-center justify-between px-2.5 pt-2 pb-1 text-[13px] font-bold tracking-tight text-foreground">
                  <span className="capitalize">{group}</span>
                  {list.some(s => s.empty) && <span className="text-[11px] font-medium text-warning-fg">{list.filter(s => s.empty).length} to fill in</span>}
                </h3>
                {list.map(section => {
                  const on = selectedSection === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setSelectedSection(section.id)}
                      aria-current={on ? 'true' : undefined}
                      className={`w-full flex flex-shrink-0 items-center gap-2.5 h-9 px-2 rounded-xl text-left text-[13.5px] font-semibold transition-colors ${on ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}
                    >
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${on ? 'bg-primary-foreground/15' : 'bg-muted'}`}>
                        <section.icon className="w-3.5 h-3.5" aria-hidden="true" />
                      </span>
                      <span className="flex-1 truncate capitalize">{section.label}</span>
                      {section.empty && (
                        <span className="w-2 h-2 rounded-full bg-warning flex-shrink-0" title="Has details still to fill in" aria-label="Has details still to fill in" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="flex-1 min-w-0 overflow-y-auto min-h-0 lg:px-1.5 lg:pt-0.5 pr-1 pb-4" data-claim-body style={{WebkitOverflowScrolling: 'touch'}}>
            {/* keyed by section, so switching sections never carries an open edit across */}
            <div key={selectedSection}>
              {renderSelectedSection()}
            </div>
          </div>
        </div>
      </div>
    </DragDropOverlay>
  );
}