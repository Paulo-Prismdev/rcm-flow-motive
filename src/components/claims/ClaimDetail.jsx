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
    Lock
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
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ClaimDetailMobileHeader from './ClaimDetailMobileHeader';
import AuthorisingPartyBanner from './AuthorisingPartyBanner';
import ClaimJourneyTimeline from './ClaimJourneyTimeline';
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
    const [version, setVersion] = useState(0);
    const bodyRef = useRef(null);
    const pendingFocus = useRef(null); // { index } (same layout) or { label } (own view)

    // Exit edit mode when claim is updated externally (e.g. wizard save), and redraw the
    // locked form from the fresh claim.
    useEffect(() => {
        setIsEditing(false);
        setVersion((v) => v + 1);
    }, [claim]);

    const handleSave = (updatedData) => {
        onUpdate({ ...claim, ...updatedData });
        setIsEditing(false);
    };

    const editable = !!(EditComponent && canEdit);

    // Locked view: mark empty fields (amber, "Not set") the way the old view did.
    useLayoutEffect(() => {
        if (!sameLayout || isEditing || !bodyRef.current) return;
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

    const startEdit = (focus) => { if (!editable) return; pendingFocus.current = focus || null; setIsEditing(true); };

    // Same layout: a click anywhere in a locked field opens editing on that field.
    const onLockedClick = (e) => {
        if (!editable) return;
        const root = bodyRef.current; if (!root) return;
        const block = e.target.closest('div'); if (!block) return;
        const pick = (el) => el && Array.from(el.querySelectorAll(ANY_CONTROL)).find((c) => !c.classList.contains('fm-hide'));
        const control = pick(block) || pick(e.target.closest('label')?.parentElement);
        const list = Array.from(root.querySelectorAll(ANY_CONTROL));
        const index = control ? list.indexOf(control) : -1;
        startEdit(index >= 0 ? { index } : null);
    };

    // Own view: clicking a value (DetailRow etc.) opens editing on the matching field.
    const onViewClick = (e) => {
        if (!editable) return;
        const row = e.target.closest('[data-edit-label]');
        if (row) startEdit({ label: row.getAttribute('data-edit-label') });
    };

    return (
        <div className="bg-card border border-border rounded-xl p-4 md:p-5 m-card-tight shadow-card">
            {/* Fixed-height header so it doesn't shrink when the Edit button hides */}
            <div className="flex justify-between items-center min-h-[2.75rem] pb-3 mb-4 border-b border-border m-card-head">
                <div
                    className="flex items-center gap-2.5 text-left flex-grow min-w-0"
                >
                    <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                    <h3 className="text-[15px] font-semibold text-foreground truncate">{title}</h3>
                </div>
                <div className='flex items-center gap-2'>
                    {/* Same size as the Edit button, so the header keeps its height */}
                    {isEditing && (
                        <Button variant="ghost" size="sm" disabled className="gap-1.5 text-primary disabled:opacity-100" tabIndex={-1}>
                            <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                            Editing
                        </Button>
                    )}
                    {!isEditing && EditComponent && canEdit && (
                        <Button variant="outline" size="sm" onClick={() => startEdit(null)} className="gap-1.5" aria-label={`Edit ${title}`}>
                            <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                            Edit
                        </Button>
                    )}
                </div>
            </div>
            <div ref={bodyRef}>
                {sameLayout && EditComponent ? (
                    <>
                        {children}
                        {isEditing ? (
                            <EditComponent key={`edit-${version}`} claim={claim} onSave={handleSave} onCancel={() => setIsEditing(false)} />
                        ) : (
                            <fieldset key={`view-${version}`} disabled className={`fm-readonly ${editable ? 'fm-click-edit' : ''}`} onClick={onLockedClick} title={editable ? 'Click a field to edit it' : undefined}>
                                <EditComponent claim={claim} onSave={() => {}} onCancel={() => {}} />
                            </fieldset>
                        )}
                    </>
                ) : isEditing ? (
                    <EditComponent claim={claim} onSave={handleSave} onCancel={() => setIsEditing(false)} />
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

import { ListTodo, History, Timer, Link2 } from "lucide-react";

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
  client: ['client_name', 'client_phone', 'client_email', 'client_address_line_1', 'client_town', 'client_postcode', 'business_division', 'client_ref', 'broker_name', 'insurer', 'claim_ref', 'policy_number', 'policy_excess'],
  creditRepair: ['credit_repair_company_name', 'credit_repair_company_contact_name', 'credit_repair_company_phone', 'credit_repair_company_email', 'credit_repair_company_account_ref'],
  driver: ['driver_contact_name', 'driver_contact_phone', 'driver_contact_email'],
  estimate: ['send_estimate_email', 'audatex_code', 'est_fee', 'authorising_party', 'estimate_cost_net', 'authority_cost_net', 'estimate_cost_gross', 'authority_cost_gross'],
  thirdParty: ['tp_name', 'tp_phone', 'tp_reg', 'tp_insurer'],
  vehicle: ['make_model', 'vehicle_colour', 'vehicle_fuel_type', 'vehicle_type'],
  vehicleLocation: ['vehicle_location'],
  vehicleDamage: ['vehicle_damage'],
  referrer: ['referrer', 'referrer_ref', 'file_handler'],
  bodyshop: ['bodyshop'],
  financials: ['estimate_cost_net', 'authority_cost_net', 'final_repair_cost'],
  dates: ['date_received', 'loss_date', 'booking_in_date', 'completion_date', 'claim_complete_date'],
  excessContribution: ['excess_contribution_amount', 'excess_contribution_method'],
  indemnity: ['indemnity_driver_dob', 'indemnity_registered_owner'],
  repairPreference: ['repair_preference_signed', 'repair_preference_pdf_url'],
  declarationOfNeed: ['declaration_of_need_signed', 'declaration_of_need_pdf_url'],
};

const isSectionEmpty = (sectionId, claim) => {
  // "No Referrer" is a deliberate choice — not missing data
  if (sectionId === 'referrer' && !claim.referrer_id) return false;
  // "None" excess contribution method means not applicable — not missing data
  if (sectionId === 'excessContribution' && (!claim.excess_contribution_method || claim.excess_contribution_method === 'None')) return false;
  // A figure, Waived or TBC on authority are all answers — never a gap.
  const fields = (SECTION_FIELDS[sectionId] || [])
    .filter(f => !(f === 'policy_excess' && excessAnswered(claim)));
  return fields.some(f => {
    const val = claim[f];
    return val === null || val === undefined || val === '' || val === 0;
  });
};

const DETAIL_SECTIONS = [
  { id: 'status', label: 'Job overview', icon: Clock },
  { id: 'dates', label: 'Key dates', icon: Calendar },
  { id: 'estimate', label: 'Estimate details', icon: Calculator },
  { id: 'client', label: 'Client details', icon: Users },
  { id: 'creditRepair', label: 'Credit repair', icon: Shield },
  { id: 'driver', label: 'Repair contact (driver)', icon: Users },
  { id: 'vehicle', label: 'Vehicle details', icon: Car },
  { id: 'vehicleDamage', label: 'Vehicle damage', icon: AlertTriangle },
  { id: 'vehicleLocation', label: 'Vehicle location', icon: MapPin },
  { id: 'thirdParty', label: 'Third party details', icon: Users },
  { id: 'bodyshop', label: 'Bodyshop details', icon: Wrench },
  { id: 'referrer', label: 'Referrer details', icon: Briefcase },
  { id: 'instructionDefaults', label: 'Instruction defaults', icon: FileText },
  { id: 'excessContribution', label: 'Excess contribution', icon: BadgePercent },
  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'thirdpartyPursuit', label: 'Third party pursuit', icon: Users },
  { id: 'indemnity', label: 'Indemnity details', icon: Shield },
  { id: 'repairPreference', label: 'Repair preference', icon: FileText },
  { id: 'declarationOfNeed', label: 'Declaration of need', icon: FileText },
  { id: 'witnessStatements', label: 'Witness statements', icon: FileText },
  { id: 'backorderedParts', label: 'Backordered parts', icon: Package },
  ];

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
  const [selectedSection, setSelectedSection] = useState(initialSection);
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
    
    if ((primaryChanged || secondaryChanged) && !options.skipClaimUpdateLog) {
        const parts = [];
        if (primaryChanged) parts.push(`Status changed from "${oldStatus}" to "${newStatus}"`);
        if (secondaryChanged) parts.push(`Secondary status changed from "${oldSec || 'None'}" to "${newSec || 'None'}"`);

        const statusRecord = buildStatusChangeRecord(claim, updatedData);
        try {
        await base44.entities.ClaimUpdate.create({
            claim_id: claim.id,
            update_type: 'Status Change',
            ...(statusRecord && { status_change: statusRecord }),
            description: parts.join(' · '),
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
        switch (selectedSection) {
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
        return (
          <EditableSection 
            sameLayout
            title="Job overview" 
            icon={Clock} 
            claim={claim} 
            onUpdate={handleUpdate}
            EditComponent={ClaimStatusEditForm}
            canEdit={canEdit}
          >
            {claim.created_date && (
              <p className="text-xs text-muted-foreground mb-3">Created in the system {(() => { try { return format(new Date(claim.created_date), 'dd/MM/yyyy'); } catch { return ''; } })()}</p>
            )}
          </EditableSection>
        );

      case 'client': {
        const clientName = claim.client_name || linkedClient?.name;
        const clientContacts = linkedClient?.contacts || [];
        const primaryContact = clientContacts.find(c => c.is_primary) || clientContacts[0] || null;
        const companyContactName = primaryContact?.name || linkedClient?.company_contact_name;
        const companyContactPhone = primaryContact?.phone || linkedClient?.company_contact_phone;
        const companyContactEmail = primaryContact?.email || linkedClient?.company_contact_email;
        const clientPhone = claim.client_phone || linkedClient?.phone;
        const clientEmail = claim.client_email || linkedClient?.email;
        // Prefer the linked client's VAT status when the claim snapshot is empty/Unknown
        const claimVat = claim.client_vat_status && claim.client_vat_status !== 'Unknown' ? claim.client_vat_status : null;
        const vatStatus = claimVat || linkedClient?.vat_status || 'Unknown';
        return (
          <EditableSection title="Billing Party — Client" icon={Users} claim={claim} onUpdate={handleUpdate} EditComponent={ClientEditComponent} canEdit={canEdit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 m-fields-2 gap-2">
              <div className="py-2 px-3 rounded-[8px] hover:bg-muted/50"><div className="text-xs font-medium text-muted-foreground mb-0.5">Name</div><div className="text-sm font-medium">{clientName || '-'}</div></div>
              {companyContactName && <div className="py-2 px-3 rounded-[8px] hover:bg-muted/50"><div className="text-xs font-medium text-muted-foreground mb-0.5">Company Contact Name</div><div className="text-sm font-medium">{companyContactName}</div></div>}
              {companyContactPhone && <div className="py-2 px-3 rounded-[8px] hover:bg-muted/50"><div className="text-xs font-medium text-muted-foreground mb-0.5">Company Contact Phone</div><div className="text-sm font-medium">{companyContactPhone}</div></div>}
              {companyContactEmail && <div className="py-2 px-3 rounded-[8px] hover:bg-muted/50"><div className="text-xs font-medium text-muted-foreground mb-0.5">Company Contact Email</div><div className="text-sm font-medium">{companyContactEmail}</div></div>}
              <div className={`py-2 px-3 rounded-[8px] ${!clientPhone ? 'bg-warning-bg border border-warning/50' : 'hover:bg-muted/50'}`}><div className="text-xs font-medium text-muted-foreground mb-0.5">Phone</div><div className={`text-sm font-medium ${!clientPhone ? 'text-warning' : ''}`}>{clientPhone || '-'}</div></div>
              <div className={`py-2 px-3 rounded-[8px] ${!clientEmail ? 'bg-warning-bg border border-warning/50' : 'hover:bg-muted/50'}`}><div className="text-xs font-medium text-muted-foreground mb-0.5">Email</div><div className={`text-sm font-medium ${!clientEmail ? 'text-warning' : ''}`}>{clientEmail || '-'}</div></div>
              <div className="py-2 px-3 rounded-[8px] hover:bg-muted/50"><div className="text-xs font-medium text-muted-foreground mb-0.5">VAT Status</div><div className="text-sm font-medium">{vatStatus}</div></div>
              { claim.client_ref && <div className="py-2 px-3 rounded-[8px] hover:bg-muted/50"><div className="text-xs font-medium text-muted-foreground mb-0.5">Client Ref</div><div className="text-sm font-medium">{claim.client_ref}</div></div>}
              {claim.business_division && <div className="py-2 px-3 rounded-[8px] hover:bg-muted/50"><div className="text-xs font-medium text-muted-foreground mb-0.5">Business Division</div><div className="text-sm font-medium">{claim.business_division}</div></div>}
            </div>
            {clientContacts.length > 0 && (
              <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Users className="w-3.5 h-3.5" /> Contacts at this business
                </div>
                <div className="space-y-1.5">
                  {clientContacts.map((c, i) => {
                    const primary = c.is_primary || (i === 0 && !clientContacts.some(x => x.is_primary));
                    return (
                      <div key={i} className="rounded-lg border border-border bg-card p-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{c.name || '—'}</span>
                          {c.position && <span className="text-xs text-muted-foreground">· {c.position}</span>}
                          {primary && <span className="inline-flex items-center gap-0.5 text-xs text-warning-fg font-medium"><Star className="w-3 h-3 fill-amber-500 text-warning" /> Primary</span>}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                          {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Insurance Details</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 m-fields-2 gap-2">
                <DetailRow label="Broker" value={claim.broker_name} />
                <DetailRow label="Insurer" value={claim.insurer} />
                <DetailRow label="Claim Reference" value={claim.claim_ref} />
                <DetailRow label="Policy Number" value={claim.policy_number} />
                <DetailRow label="Policy Excess" value={excessLabel(claim)} />
              </div>
            </div>
            {(claim.client_address_line_1 || claim.client_town || claim.client_postcode) && (
              <div className="mt-2 py-3 px-4 rounded-lg bg-muted/40">
                <div className="text-xs font-semibold text-muted-foreground mb-2">Address</div>
                <div className="text-sm leading-relaxed space-y-0.5">
                  {claim.client_address_line_1 && <div>{claim.client_address_line_1}</div>}
                  {claim.client_address_line_2 && <div>{claim.client_address_line_2}</div>}
                  {(claim.client_town || claim.client_county || claim.client_postcode) && <div>{[claim.client_town, claim.client_county, claim.client_postcode].filter(Boolean).join(', ')}</div>}
                </div>
              </div>
            )}
          </EditableSection>
        );
      }

      case 'creditRepair':
        return (
          <EditableSection title="Credit repair" icon={Shield} claim={claim} onUpdate={handleUpdate} EditComponent={ClaimCreditRepairForm} canEdit={canEdit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 m-fields-2 gap-2">
              <DetailRow label="Company" value={claim.credit_repair_company_name} />
              <DetailRow label="Contact Name" value={claim.credit_repair_company_contact_name} />
              <DetailRow label="Phone" value={claim.credit_repair_company_phone} />
              <DetailRow label="Email" value={claim.credit_repair_company_email} />
              <DetailRow label="Account Ref" value={claim.credit_repair_company_account_ref} />
              <DetailRow label="Hire Category" value={claim.hire_category} />
            </div>
            <CreditRepairRatesCard claim={claim} />
            {claim.credit_repair_company_name && (
              <div className="mt-4 p-3 rounded-lg bg-info-bg dark:bg-indigo-900/20 border border-info/30">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-info-fg flex-shrink-0" />
                    <div>
                      <span className="text-sm font-medium block">Credit Repair Instruction</span>
                      <span className="text-xs text-muted-foreground">Generate a PDF instruction and email it to {claim.credit_repair_company_name}.</span>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setIsCreditRepairInstructionOpen(true)} className="gap-2">
                    <FileText className="w-4 h-4" /> Send Instruction
                  </Button>
                </div>
              </div>
            )}
          </EditableSection>
        );

      case 'driver':
        return (
          <EditableSection sameLayout
            title="Repair Contact — Driver" icon={User} claim={claim} onUpdate={handleUpdate} EditComponent={DriverEditComponent} canEdit={canEdit}>
          </EditableSection>
        );

      case 'thirdParty':
        return (
          <EditableSection sameLayout
            title="Third Party" icon={Users} claim={claim} onUpdate={handleUpdate} EditComponent={ThirdPartyEditComponent} canEdit={canEdit}>
          </EditableSection>
        );

      case 'vehicle':
        return (
          <EditableSection sameLayout
            title="Vehicle details" icon={Car} claim={claim} onUpdate={handleUpdate} EditComponent={ClaimVehicleForm} canEdit={canEdit}>
            {/* DVLA Lookup Button */}
            {claim.reg && (
              <div className="mb-4 p-3 rounded-xl bg-info-bg border border-info/30">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-info-fg text-sm">DVLA Vehicle Lookup</p>
                    <p className="text-xs text-info-fg">Fetch vehicle data from DVLA for {claim.reg}</p>
                  </div>
                  <Button
                    onClick={handleFetchVehicleData}
                    disabled={isFetchingVehicle}
                    className="bg-info hover:bg-info/90 text-on-solid text-sm"
                  >
                    {isFetchingVehicle ? 'Fetching...' : 'Fetch from DVLA'}
                  </Button>
                </div>
                {vehicleFetchError && (
                  <p className="mt-2 text-xs text-danger-fg">{vehicleFetchError}</p>
                )}
              </div>
            )}
          </EditableSection>
        );

      case 'vehicleLocation':
        return (
          <EditableSection 
            title="Vehicle location" 
            icon={MapPin} 
            claim={claim} 
            onUpdate={handleUpdate} 
            EditComponent={VehicleLocationEditComponent} 
            canEdit={canEdit}
          >
            <DetailRow label="Vehicle Location" value={claim.vehicle_location} />
          </EditableSection>
        );

      case 'vehicleDamage':
        return (
          <EditableSection 
            title="Vehicle damage" 
            icon={AlertTriangle} 
            claim={claim} 
            onUpdate={handleUpdate} 
            EditComponent={VehicleDamageEditComponent} 
            canEdit={canEdit}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 m-fields-2 gap-2">
              <DetailRow label="Courtesy Car (CC) Needed" value={claim.courtesy_car_required === true ? 'Yes' : (claim.courtesy_car_required || 'No')} />
              <DetailRow label="Hire to Invoice" value={hireSummaryText(claim)} />
              <DetailRow label="Undriveable / Drivable" value={claim.unroadworthy ? 'Undriveable' : 'Drivable'} />
            </div>
            <div data-edit-label="Damage Description" className="mt-2 py-3 px-4 rounded-lg glass-inset">
              <div className="text-xs font-semibold text-foreground-muted mb-2">Damage Description</div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{claim.vehicle_damage || '-'}</div>
            </div>
          </EditableSection>
        );



      case 'excessContribution':
        return (
          <EditableSection 
            sameLayout
            title="Excess contribution" 
            icon={BadgePercent}
            claim={claim} 
            onUpdate={handleUpdate} 
            EditComponent={ClaimExcessContributionForm} 
            canEdit={canEdit}
          >
          </EditableSection>
        );

      case 'instructionDefaults':
        return (
          <EditableSection 
            sameLayout
            title="Instruction defaults" 
            icon={FileText}
            claim={claim} 
            onUpdate={handleUpdate} 
            EditComponent={InstructionDefaultsForm}
            canEdit={canEdit}
          >
          </EditableSection>
        );

      case 'referrer':
        return (
          <EditableSection sameLayout
            title="Referrer details" icon={Briefcase} claim={claim} onUpdate={handleUpdate} EditComponent={ClaimReferrerForm} canEdit={canEdit}>
          </EditableSection>
        );

      case 'indemnity':
        if (!claim.requires_indemnity) {
          return (
            <EditableSection 
              title="Indemnity details" 
              icon={Shield} 
              claim={claim} 
              onUpdate={handleUpdate} 
              EditComponent={ClaimIndemnityForm} 
              canEdit={canEdit}
            >
              <IndemnityLinkManager claim={claim} onUpdate={handleUpdate} />
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">This claim does not currently require indemnity checks.</p>
                <p className="text-sm">Click the edit button to enable indemnity details if needed.</p>
              </div>
            </EditableSection>
          );
        }
        
        return (
          <EditableSection 
            title="Indemnity details" 
            icon={Shield} 
            claim={claim} 
            onUpdate={handleUpdate} 
            EditComponent={ClaimIndemnityForm} 
            canEdit={canEdit}
          >
            <IndemnityLinkManager claim={claim} onUpdate={handleUpdate} />
            <div className="grid grid-cols-1 lg:grid-cols-2 m-fields-2 gap-2">
              <DetailRow label="Driver's Age" value={(() => {
                const dob = claim.indemnity_driver_dob;
                if (!dob) return claim.indemnity_driver_age;
                const d = new Date(dob);
                if (isNaN(d.getTime())) return claim.indemnity_driver_age;
                const now = new Date();
                let age = now.getFullYear() - d.getFullYear();
                const m = now.getMonth() - d.getMonth();
                if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
                return age;
              })()} />
              <DetailRow label="Driver's Date of Birth" value={claim.indemnity_driver_dob} isDate />
              <DetailRow label="Registered Owner/Keeper" value={claim.indemnity_registered_owner} />
              <DetailRow label="Pending Prosecutions?" value={claim.indemnity_pending_prosecutions} />
              <DetailRow label="Told not to drive (DVLA/Medical)?" value={claim.indemnity_dvla_medical_restrictions} />
              <DetailRow label="Convictions/points (5 yrs)?" value={claim.indemnity_convictions_last_5_years} />
              <DetailRow label="Incidents/losses/thefts (5 yrs)?" value={claim.indemnity_incidents_last_5_years} />
              <DetailRow label="Full UK/EU licence 12+ months?" value={claim.indemnity_full_license_12_months} />
              <DetailRow label="Vehicle Use at Incident" value={claim.indemnity_vehicle_use_at_incident} />
              <DetailRow label="Vehicle Modifications?" value={claim.indemnity_vehicle_modifications} />
              <DetailRow label="Pre-existing Damages?" value={claim.indemnity_pre_existing_damage} />
              <DetailRow label="CCTV / Dashcam Footage?" value={claim.indemnity_cctv_dashcam} />
              <DetailRow label="Property Damaged?" value={claim.indemnity_property_damaged} />
              <DetailRow label="More Photos Available?" value={claim.indemnity_more_photos} />
            </div>
            <div className="mt-2 space-y-3">
              {claim.indemnity_modification_details && (
                <div className="py-3 px-4 rounded-lg glass-inset">
                  <div className="text-xs font-semibold text-foreground-muted mb-2">Modification Details</div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{claim.indemnity_modification_details}</div>
                </div>
              )}
              {claim.indemnity_other_info && (
                <div className="py-3 px-4 rounded-lg glass-inset">
                  <div className="text-xs font-semibold text-foreground-muted mb-2">Other Information</div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{claim.indemnity_other_info}</div>
                </div>
              )}
            </div>
          </EditableSection>
        );



      case 'repairPreference':
        return (
          <div className="bg-card border border-border rounded-xl p-4 md:p-5 m-card-tight shadow-card">
            <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-border m-card-head">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-[15px] font-semibold text-foreground">Statement of Repair Preference</h3>
            </div>
            <RepairPreferenceLinkManager claim={claim} onUpdate={handleUpdate} />
            <div className="grid grid-cols-1 lg:grid-cols-2 m-fields-2 gap-2 mt-4">
              <DetailRow label="Signed" value={claim.repair_preference_signed ? 'Yes' : 'No'} />
              <DetailRow label="Signed At" value={claim.repair_preference_signed_at} isDate />
              <DetailRow label="Signed By" value={claim.repair_preference_client_name} />
            </div>
            {claim.repair_preference_pdf_url && (
              <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Signed PDF</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.open(claim.repair_preference_pdf_url, '_blank')} className="gap-2">
                  <Download className="w-4 h-4" /> View / Download
                </Button>
              </div>
            )}
          </div>
        );

      case 'witnessStatements':
        return (
          <div className="bg-card border border-border rounded-xl p-4 md:p-5 m-card-tight shadow-card">
            <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-border m-card-head">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-[15px] font-semibold text-foreground">Witness statements</h3>
            </div>
            <WitnessStatementsSection claim={claim} />
          </div>
        );

      case 'declarationOfNeed':
        return (
          <div className="bg-card border border-border rounded-xl p-4 md:p-5 m-card-tight shadow-card">
            <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-border m-card-head">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-[15px] font-semibold text-foreground">Declaration of Need – Replacement Vehicle</h3>
            </div>
            <DeclarationOfNeedLinkManager claim={claim} onUpdate={handleUpdate} />
            <div className="grid grid-cols-1 lg:grid-cols-2 m-fields-2 gap-2 mt-4">
              <DetailRow label="Signed" value={claim.declaration_of_need_signed ? 'Yes' : 'No'} />
              <DetailRow label="Signed At" value={claim.declaration_of_need_signed_at} isDate />
              <DetailRow label="Signed By" value={claim.declaration_of_need_client_name} />
              <DetailRow label="Form Version" value={claim.declaration_of_need_form_version} />
            </div>
            {claim.declaration_of_need_pdf_url && (
              <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Signed PDF</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.open(claim.declaration_of_need_pdf_url, '_blank')} className="gap-2">
                  <Download className="w-4 h-4" /> View / Download
                </Button>
              </div>
            )}
          </div>
        );



      case 'financials':
        return (
          <div className="bg-card border border-border rounded-xl p-4 md:p-5 m-card-tight shadow-card">
            <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-border m-card-head">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-[15px] font-semibold text-foreground">Financials</h3>
              {isInternalUser && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                  <Lock className="w-3 h-3" aria-hidden="true" /> Internal only
                </span>
              )}
            </div>
            <ClaimFinancials
              claim={claim}
              currentUser={currentUser}
              onUpdate={handleUpdate}
              showInvoicing={isInternalUser}
            />
          </div>
        );

      case 'dates':
        return (
          <InlineEditableSection title="Key dates" icon={Calendar} claim={claim} onUpdate={handleUpdate} canEdit={canEdit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 m-fields-2 gap-2">
              <InlineField label="Date Received" name="date_received" isDate />
              <InlineField label="Loss Date" name="loss_date" isDate />
              <InlineField label="Estimate Completed" name="estimate_completed" isDate />
              <InlineField label="Supplementary Estimate Completed" name="supplementary_estimate_completed" isDate />
              <InlineField label="Authority Received" name="authority_received" isDate />
              <InlineField label="Supplementary Authority Received" name="supplementary_authority_received" isDate />
              <InlineField label="Bodyshop Instructed" name="bs_instructed" isDate />
              <InlineField label="Booking In Date (BID)" name="booking_in_date" isDate />
              <InlineField label="On-Site Date" name="on_site_date" isDate />
              <InlineField label="Hand Over Date" name="hand_over_date" isDate />
              {totalLoss && <InlineField label="Salvage Collected" name="salvage_collected_date" isDate />}
              <InlineField label="Est. Completion (ECD)" name="ecd" isDate />
              <InlineField label="Completion Date" name="completion_date" isDate />
              <InlineField label="Final Authority Received" name="final_authority_received" isDate />
              {totalLoss && <InlineField label="Total Loss Marked" name="total_loss_marked_date" isDate />}
              <InlineField label="Claim Complete Date" name="claim_complete_date" isDate />
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Rectification milestones — greyed out until the claim is on the Rectification journey.</p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                <InlineField label="Rectification Booking In" name="rectification_booking_in_date" isDate readOnly={!isRectification} />
                <InlineField label="Rectification Completion" name="rectification_completion_date" isDate readOnly={!isRectification} />
                <InlineField label="Rectification Hand-Over" name="rectification_hand_over_date" isDate readOnly={!isRectification} />
              </div>
            </div>
          </InlineEditableSection>
        );

      case 'bodyshop':
        return (
          <EditableSection title="Bodyshop details" icon={Wrench} claim={claim} onUpdate={handleUpdate} EditComponent={ClaimBodyshopForm} canEdit={canEdit}>
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
                <div className="text-xs text-muted-foreground mt-2">Debug: bodyshop_id = {claim.bodyshop_id}</div>
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
          </EditableSection>
        );

      case 'estimate':
        return (
          <InlineEditableSection title="Estimate details" icon={Calculator} claim={claim} onUpdate={handleUpdate} canEdit={canEdit}>
            <EstimateInlineFields />
            <EstimateAuthorityTotals claim={claim} className="mt-2" />
            <div className="mt-2 py-3 px-4 rounded-lg glass-inset">
              <InlineField label="Artura Estimate URL" name="artura_est_url" bare placeholder="Enter URL" />
            </div>
            {/* Purchase Order generation — uses estimate total as authority figure */}
            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <div>
                    <span className="text-sm font-medium block">Purchase Order</span>
                    <span className="text-xs text-muted-foreground">
                      Authority figure: {(() => {
                        const v = claim.authority_cost_gross ?? claim.estimate_cost_gross ?? claim.authority_cost_net ?? claim.estimate_cost_net;
                        return v != null && v !== '' ? `£${Number(v).toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : '—';
                      })()}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPoDialogOpen(true)}
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Generate PO
                </Button>
              </div>
            </div>
          </InlineEditableSection>
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

          {/* ── MOBILE header (< lg) ── */}
          <ClaimDetailMobileHeader
            claim={{...claim, _selectedSection: selectedSection}}
            isClosedStatus={isClosedStatus}
            collapsed={headerCollapsed}
            onClose={handleClose}
            onUpdates={() => setIsClaimUpdatesOpen(true)}
            onUpdateTracking={() => setIsUpdateTrackingOpen(true)}
            updatesCount={claimUpdates.length}
            imagesCount={claim.image_urls?.length || 0}
            docsCount={claim.file_urls?.length || 0}
            onAction={(val) => {
              if (val.startsWith('section:')) { setSelectedSection(val.replace('section:', '')); return; }
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
            }}
          />

          {/* ── DESKTOP top bar (≥ lg) ── */}
          <div className="hidden lg:block bg-card border border-border rounded-xl p-3 flex-shrink-0 shadow-card">
              <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                      <button aria-label="Back"
                        onClick={handleClose}
                        className="p-2 flex-shrink-0 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                      >
                          <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 min-w-0">
                            <h1 className="text-page-title truncate tracking-wide">{claim.reg || 'Claim details'}</h1>
                            {claim.job_number && (
                              <span className="text-sm text-muted-foreground font-medium whitespace-nowrap flex-shrink-0 tabular-nums">
                                {claim.job_number}
                              </span>
                            )}
                          </div>
                          {/* Who it's for, who authorises, their claim number (was a coloured strip above) */}
                          <AuthorisingPartyBanner claim={claim} caption />
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button onClick={() => setIsQuickViewOpen(true)} variant="outline" className="h-9 px-3 text-sm font-medium gap-1.5">
                          <Eye className="w-4 h-4" /> Quick view
                        </Button>
                        {canEdit && (
                          <Button onClick={() => setIsClaimUpdatesOpen(true)} className="h-9 px-3.5 text-sm font-medium gap-1.5">
                            {claim.unread_bodyshop_update && (
                              <span className="w-2 h-2 rounded-full bg-info ring-2 ring-primary-foreground/70 flex-shrink-0" title="New update from the repairer" aria-label="New update from the repairer" />
                            )}
                            Updates & status
                            {claimUpdates.length > 0 && <InlineCount n={claimUpdates.length} tone="onPrimary" label="updates" />}
                          </Button>
                        )}
                        {!canEdit && (
                          <Button onClick={() => setIsClaimUpdatesOpen(true)} className="h-9 px-3.5 text-sm font-medium gap-1.5">
                            Updates
                            {claimUpdates.length > 0 && <InlineCount n={claimUpdates.length} tone="onPrimary" label="updates" />}
                          </Button>
                        )}
                        <Button onClick={() => setIsImagesOpen(true)} variant="outline" className="h-9 px-3 text-sm font-medium gap-1.5">
                          <Image className="w-4 h-4" /> Images
                          {(claim.image_urls?.length > 0) && <InlineCount n={claim.image_urls.length} label="images" />}
                        </Button>
                        <Button onClick={() => setIsAttachmentsOpen(true)} variant="outline" className="h-9 px-3 text-sm font-medium gap-1.5">
                          <FileText className="w-4 h-4" /> Docs
                          {(claim.file_urls?.length > 0) && <InlineCount n={claim.file_urls.length} label="documents" />}
                        </Button>
                        {isInternalUser && (
                          <Button onClick={() => setIsNotesOpen(true)} variant="outline" className="h-9 px-3 text-sm font-medium gap-1.5">
                            <Edit className="w-4 h-4" /> Internal updates
                            {notesTotalCount > 0 && <InlineCount n={notesTotalCount} tone="info" label="internal updates" />}
                          </Button>
                        )}
                        {canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-label="Expand" variant="outline" className="p-2 h-9 w-9"><ChevronDown className="w-4 h-4" /></Button>
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
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSelectedSection('declarationOfNeed'); }}><FileText className="w-4 h-4 mr-2" />Declaration of need</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsDuplicateModalOpen(true); }}><Copy className="w-4 h-4 mr-2" />Duplicate Claim</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleArchive(); }} disabled={archiveMutation.isLoading}><Archive className="w-4 h-4 mr-2" />{claim.archived ? 'Unarchive' : 'Archive'}</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleDelete()} disabled={deleteMutation.isLoading} className="text-danger-fg"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
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
                  <ClaimJourneyTimeline claim={claim} updates={claimUpdates} />
              </div>
          </div>

          {/* ── Starred update notice: one row under the header ── */}
          {starredUpdates.length > 0 && (
            <div role="status" className="bg-warning-bg border border-warning/40 rounded-xl px-3 py-2 flex items-center gap-2.5 flex-shrink-0">
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

        {/* Sections: a source list down the left on desktop, the Mac way (phones choose
            the section in ClaimDetailMobileHeader). Same sections, same order. */}
        <div className="flex-1 min-h-0 flex gap-3">
          <nav aria-label="Claim sections" className="hidden lg:flex w-56 flex-shrink-0 flex-col gap-0.5 min-h-0 overflow-y-auto rounded-xl border border-border bg-muted p-2">
            {DETAIL_SECTIONS.filter(s => s.id !== 'creditRepair' || claim.claim_type === 'Credit Repair').map(section => {
              const on = selectedSection === section.id;
              const empty = isSectionEmpty(section.id, claim);
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSelectedSection(section.id)}
                  aria-current={on ? 'true' : undefined}
                  className={`flex flex-shrink-0 items-center gap-2 h-8 px-2.5 rounded-lg text-left text-[13px] font-medium transition-colors ${on ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'}`}
                >
                  <section.icon className={`w-4 h-4 flex-shrink-0 ${on ? '' : 'text-muted-foreground'}`} aria-hidden="true" />
                  <span className="flex-1 truncate">{section.label}</span>
                  {empty && (
                    <span className="w-2 h-2 rounded-full bg-warning flex-shrink-0" title="Has details still to fill in" aria-label="Has details still to fill in" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex-1 min-w-0 overflow-y-auto min-h-0 pr-1 pb-4" data-claim-body style={{WebkitOverflowScrolling: 'touch'}}>
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