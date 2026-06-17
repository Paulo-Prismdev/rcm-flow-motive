import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
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
    Briefcase,
    FileText,
    Archive,
    Trash2,
    Clock,
    AlertTriangle,
    BadgePercent,
    Download,
    Image,
    RefreshCw
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
import ClaimInsuranceForm from './ClaimInsuranceForm';
import ClaimReferrerForm from './ClaimReferrerForm';
import ClaimFinancialsForm from './ClaimFinancialsForm';
import ClaimDatesForm from './ClaimDatesForm';
import ClaimBodyshopForm from './ClaimBodyshopForm';
import ClaimEstimateForm from './ClaimEstimateForm';
import ClaimStatusForm from './ClaimStatusForm';
import FinancialCalculator from './FinancialCalculator';
import FinancialSummary from './FinancialSummary';

import ClaimVehicleDamageForm from './ClaimVehicleDamageForm';
import ClaimIndemnityForm from './ClaimIndemnityForm';
import ClaimExcessContributionForm from './ClaimExcessContributionForm';
import ThirdPartyPursuitSection from './ThirdPartyPursuitSection';
import BackorderedPartsSection from './BackorderedPartsSection';
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
import InstructionTemplateModal from './InstructionTemplateModal';
import BackorderedPartsModal from './BackorderedPartsModal';
import { Textarea } from "@/components/ui/textarea";
import { formatUKRegistration } from '../shared/formatRegistration';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ClaimDetailMobileHeader from './ClaimDetailMobileHeader';
import ClaimJourneyTimeline from './ClaimJourneyTimeline';

const EditableSection = ({ title, icon: Icon, claim, onUpdate, children, EditComponent, canEdit = true }) => {
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = (updatedData) => {
        onUpdate({ ...claim, ...updatedData });
        setIsEditing(false);
    };

    return (
        <div className="bg-card border border-border rounded-[10px] p-4 md:p-5 shadow-sm">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-border">
                <div
                    className="flex items-center gap-2.5 text-left flex-grow"
                >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
                </div>
                <div className='flex items-center gap-2'>
                    {!isEditing && EditComponent && canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => { setIsEditing(true); }} className="h-8 w-8 hover:text-gold">
                            <Edit className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
            <div className="">
                {isEditing ? (
                    <EditComponent claim={claim} onSave={handleSave} onCancel={() => setIsEditing(false)} />
                ) : (
                    children
                )}
            </div>
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

    const isEmpty = value === null || typeof value === 'undefined' || value === '';
    if (isEmpty) {
        displayValue = '-';
    }

    return (
        <div className={`py-2 px-3 rounded-[8px] transition-colors ${isEmpty ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700' : 'hover:bg-muted/50'}`}>
            <div className="text-[11px] font-medium text-muted-foreground mb-0.5">
                {label}
            </div>
            <div className={`text-sm font-medium ${isEmpty ? 'text-amber-500' : 'text-foreground'} ${(isCurrency || (typeof value === 'number')) ? 'tabular-nums' : ''}`}>
                {isStatus ? <StatusBadge status={displayValue} /> : displayValue}
            </div>
        </div>
    );
}

import { ListTodo, History, Timer } from "lucide-react";
import ActivityLogSection from '../shared/ActivityLogSection';
import TimeLogsModal from '../shared/TimeLogsModal';
import ActivityLogModal from '../shared/ActivityLogModal';
import { logActivity, logChanges } from '../shared/useActivityLogger';

const SECTION_FIELDS = {
  status: ['claim_type', 'loss_date', 'vehicle_use', 'incident_location', 'circumstances'],
  client: ['client_name', 'client_phone', 'client_email', 'client_address_line_1', 'client_town', 'client_postcode', 'business_division'],
  insurance: ['insurer', 'claim_ref'],
  driver: ['driver_contact_name', 'driver_contact_phone', 'driver_contact_email'],
  thirdParty: ['tp_name', 'tp_phone', 'tp_reg', 'tp_insurer'],
  vehicle: ['make_model', 'vehicle_colour', 'vehicle_fuel_type', 'vehicle_type'],
  vehicleDamage: ['vehicle_location', 'vehicle_damage'],
  referrer: ['referrer', 'referrer_ref', 'file_handler'],
  bodyshop: ['bodyshop'],
  financials: ['estimate_cost_net', 'authority_cost_net', 'final_repair_cost'],
  dates: ['date_received', 'loss_date', 'booking_in_date', 'completion_date'],
  excessContribution: ['excess_contribution_amount', 'excess_contribution_method'],
  indemnity: ['indemnity_driver_dob', 'indemnity_registered_owner'],
};

const isSectionEmpty = (sectionId, claim) => {
  // "No Referrer" is a deliberate choice — not missing data
  if (sectionId === 'referrer' && !claim.referrer_id) return false;
  const fields = SECTION_FIELDS[sectionId] || [];
  return fields.some(f => claim[f] === null || claim[f] === undefined || claim[f] === '');
};

const DETAIL_SECTIONS = [
  { id: 'status', label: 'Status & Overview', icon: Clock },
  { id: 'dates', label: 'Key Dates', icon: Calendar },
  { id: 'estimate', label: 'Estimate Details', icon: Calculator },
  { id: 'client', label: 'Client Details', icon: Users },
  { id: 'insurance', label: 'Insurance & Broker', icon: Shield },
  { id: 'driver', label: 'Repair Contact (Driver)', icon: Users },
  { id: 'vehicle', label: 'Vehicle Details', icon: Car },
  { id: 'vehicleDamage', label: 'Vehicle Damage', icon: AlertTriangle },
  { id: 'thirdParty', label: 'Third Party Details', icon: Users },
  { id: 'bodyshop', label: 'Bodyshop Details', icon: Wrench },
  { id: 'referrer', label: 'Referrer Details', icon: Briefcase },
  { id: 'excessContribution', label: 'Excess Contribution', icon: BadgePercent },
  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'thirdpartyPursuit', label: 'Third Party Pursuit', icon: Users },
  { id: 'indemnity', label: 'Indemnity Details', icon: Shield },
  { id: 'backorderedParts', label: 'Backordered Parts', icon: Package },
];

export default function ClaimDetail({ claim: claimProp, onClose, onUpdate, isInternalUser = true }) {
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
  const [startTime] = useState(new Date());
  const [currentDuration, setCurrentDuration] = useState(0);
  const [selectedSection, setSelectedSection] = useState('status');
  const durationRef = React.useRef(0);
  const hasSavedRef = React.useRef(false);
  const queryClient = useQueryClient();
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isUpdateTrackingOpen, setIsUpdateTrackingOpen] = useState(false);
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [isTimeLogsOpen, setIsTimeLogsOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [isFetchingVehicle, setIsFetchingVehicle] = useState(false);
  const [vehicleFetchError, setVehicleFetchError] = useState('');

  const [isBackorderedPartsModalOpen, setIsBackorderedPartsModalOpen] = useState(false);

  const canEdit = true;

  const ClientEditComponent = useCallback((props) => <ClaimPartiesForm {...props} mode="client" />, []);
  const DriverEditComponent = useCallback((props) => <ClaimPartiesForm {...props} mode="driver" />, []);
  const ThirdPartyEditComponent = useCallback((props) => <ClaimPartiesForm {...props} mode="thirdParty" />, []);

  const isClosedStatus = ['Completed', 'Cancelled', 'Total Loss'].includes(claim.job_status);

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

  const { data: claimUpdates = [] } = useQuery({
    queryKey: ['claimUpdates', claim.id],
    queryFn: () => base44.entities.ClaimUpdate.filter({ claim_id: claim.id }, 'created_date', 500),
    staleTime: 60000,
  });

  const handleUpdate = async (updatedData) => {
    // Update local state immediately for instant UI feedback
    setClaim(updatedData);
    const statusChanged = updatedData.job_status && updatedData.job_status !== claim.job_status;
    
    // Log all changes to activity log
    await logChanges({
      parentId: claim.id,
      parentType: 'Claim',
      oldData: claim,
      newData: updatedData,
      user: currentUser,
    });
    
    if (statusChanged) {
      const oldStatus = claim.job_status || 'New';
      const newStatus = updatedData.job_status;
      
      try {
        await base44.entities.ClaimUpdate.create({
          claim_id: claim.id,
          update_type: 'Status Change',
          description: `Status changed from "${oldStatus}" to "${newStatus}"`,
          next_steps: '',
          due_date_for_next_action: ''
        });
        
        queryClient.invalidateQueries({ queryKey: ['claimUpdates', claim.id] });
      } catch (error) {
        console.error('Failed to log status change:', error);
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['activityLogs', claim.id] });
    onUpdate(updatedData);
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
      return base44.entities.Claim.delete(claim.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      onClose();
    },
    onError: (error) => {
      console.error('Failed to delete claim:', error);
      alert('Failed to delete claim: ' + (error.message || 'Unknown error'));
    },
  });

  React.useEffect(() => {
    return () => {
      const duration = durationRef.current;
      if (duration > 0 && !hasSavedRef.current) {
        hasSavedRef.current = true;
        base44.entities.TimeLog.create({
          parent_id: claim.id,
          parent_type: 'Claim',
          duration_seconds: duration,
          started_at: startTime.toISOString(),
          ended_at: new Date().toISOString()
        }).catch(error => {
          console.error('Failed to save time log on unmount:', error);
        });
      }
    };
  }, []);

  const handleOverrideSave = (overrideData) => {
    handleUpdate({ ...claim, ...overrideData, last_updated_at: new Date().toISOString() });
  };

  const handleClaimUpdateCreated = (newStatus, newSecondaryStatus, updateType) => {
    const now = new Date();
    const closedStatuses = ['Completed', 'Cancelled', 'Total Loss'];
    const effectiveStatus = newStatus || claim.job_status;
    const isClosedAfterUpdate = closedStatuses.includes(effectiveStatus);

    // Only reset the 48hr timer for Client Communication updates on active claims
    const isClientComm = updateType === 'Client Communication';
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const updateData = {
      ...claim,
      ...(isClientComm && !isClosedAfterUpdate && {
        last_updated_at: now.toISOString(),
        next_update_due_at: fortyEightHoursFromNow.toISOString(),
        update_status_flag: 'Green',
      }),
      ...(isClosedAfterUpdate && {
        update_status_flag: 'Gray',
      }),
    };
    
    if (newStatus) {
      updateData.job_status = newStatus;
      // Keep job_statuses in sync — replace the old primary status with the new one
      const currentStatuses = claim.job_statuses?.length ? [...claim.job_statuses] : (claim.job_status ? [claim.job_status] : ['New']);
      const oldPrimary = claim.job_status || 'New';
      const idx = currentStatuses.indexOf(oldPrimary);
      if (idx !== -1) {
        currentStatuses[idx] = newStatus;
      } else {
        currentStatuses.unshift(newStatus);
      }
      updateData.job_statuses = currentStatuses;
    }
    
    if (newSecondaryStatus !== undefined) {
      updateData.secondary_status = newSecondaryStatus;
    }
    
    handleUpdate(updateData);
  };

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (claim && !['Completed', 'Cancelled', 'Total Loss'].includes(claim.job_status)) {
        queryClient.invalidateQueries({ queryKey: ['claims'] });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [claim, queryClient]);

  const handleClose = async () => {
    const duration = durationRef.current;
    if (duration > 0 && !hasSavedRef.current) {
      hasSavedRef.current = true;
      try {
        await base44.entities.TimeLog.create({
          parent_id: claim.id,
          parent_type: 'Claim',
          duration_seconds: duration,
          started_at: startTime.toISOString(),
          ended_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to save time log on close:', error);
      }
    }
    onClose();
  };

  const handleArchive = () => {
    const action = claim.archived ? 'restore' : 'archive';
    if (window.confirm(`Are you sure you want to ${action} this claim?`)) {
      archiveMutation.mutate();
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to permanently delete this claim? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const handleFilesUploaded = (newFileUrls) => {
    const currentUrls = Array.isArray(claim.file_urls) ? claim.file_urls : [];
    const updatedUrls = [...currentUrls, ...newFileUrls];
    handleUpdate({ ...claim, file_urls: updatedUrls });
  };

  const handleFileRemove = (urlToRemove) => {
    const currentUrls = Array.isArray(claim.file_urls) ? claim.file_urls : [];
    const updatedUrls = currentUrls.filter(url => url !== urlToRemove);
    handleUpdate({ ...claim, file_urls: updatedUrls });
  };

  const handleImagesAdd = (newImageUrls) => {
    const currentUrls = Array.isArray(claim.image_urls) ? claim.image_urls : [];
    handleUpdate({ ...claim, image_urls: [...currentUrls, ...newImageUrls] });
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
      console.log('Fetching DVLA data for:', claim.reg);
      const response = await lookupVehicleData({ registrationNumber: claim.reg });
      console.log('DVLA response:', response);
      
      // The function returns the data directly, not wrapped in success/error
      const result = response.data || response;
      console.log('Processed result:', result);
      
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
      
      await logChanges({
        parentId: claim.id,
        parentType: 'Claim',
        oldData: claim,
        newData: { ...claim, ...updates },
        user: currentUser,
      });
      
      handleUpdate({ ...claim, ...updates });
      
      // Show success message with summary
      const summary = `${result.make} ${result.model || ''} (${result.year_of_manufacture}) - ${result.colour} ${result.fuel_type}`;
      alert(`✓ Vehicle data fetched successfully!\n\n${summary}\n\nThe claim has been updated with the DVLA data.`);
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

  const handleAIExtract = (extractedData) => {
    console.log('AI extracted data from attachment:', extractedData);
    
    const fields = Object.entries(extractedData)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    if (window.confirm(`AI found the following data:\n\n${fields}\n\nDo you want to update the claim with this data?`)) {
      handleUpdate({ ...claim, ...extractedData });
    }
  };

  const openLinkedItem = (pageUrl, itemId) => {
    const url = `${pageUrl}?id=${itemId}`;
    window.open(url, '_blank');
  };

  const openLinkedClaim = (claimId) => {
    window.open(`/claims?id=${claimId}`, '_blank');
  };

  const renderSelectedSection = () => {
        switch (selectedSection) {
          case 'thirdpartyPursuit':
        // Only show for fault claims
        if (claim.claim_type !== 'Fault Claim') {
          return (
            <div className="neomorph-flat p-3 md:p-5">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-5 h-5 text-gold" />
                <h3 className="font-bold">Third Party Pursuit</h3>
              </div>
              <div className="text-center py-12 text-gray-500">
                <p>Third party pursuit is only applicable for Fault Claims.</p>
              </div>
            </div>
          );
        }
        return <ThirdPartyPursuitSection claim={claim} onUpdate={handleUpdate} />;

      case 'status':
        return (
          <EditableSection 
            title="Status & Overview" 
            icon={Clock} 
            claim={claim} 
            onUpdate={handleUpdate}
            EditComponent={({ claim: editClaim, onSave, onCancel }) => (
              <div className="space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">Job Status (Read-only)</label>
                    <div className="px-3 py-2 glass-inset text-sm">{editClaim.job_status || 'Not set'}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">Claim Type</label>
                    <select
                      value={editClaim.claim_type || ''}
                      onChange={(e) => onSave({ claim_type: e.target.value })}
                      className="glass-inset w-full px-3 py-2 text-sm"
                    >
                      <option value="">Select type...</option>
                      <option value="Credit Repair">Credit Repair</option>
                      <option value="Fault Claim">Fault Claim</option>
                      <option value="Non-Fault Claim">Non-Fault Claim</option>
                      <option value="Total Loss">Total Loss</option>
                      <option value="Glass Claim">Glass Claim</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">Date of Loss</label>
                    <input
                      type="date"
                      value={editClaim.loss_date || ''}
                      onChange={(e) => onSave({ loss_date: e.target.value })}
                      className="glass-inset w-full px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">Time of Loss</label>
                    <input
                      type="text"
                      value={editClaim.loss_time || ''}
                      onChange={(e) => onSave({ loss_time: e.target.value })}
                      placeholder="HH:MM"
                      className="glass-inset w-full px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">Use of Vehicle</label>
                    <select
                      value={editClaim.vehicle_use || ''}
                      onChange={(e) => onSave({ vehicle_use: e.target.value })}
                      className="glass-inset w-full px-3 py-2 text-sm"
                    >
                      <option value="">Select use...</option>
                      <option value="Business">Business</option>
                      <option value="Social">Social</option>
                      <option value="Commuting">Commuting</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">Courtesy Car Required</label>
                    <select
                      value={editClaim.courtesy_car_required ? 'true' : 'false'}
                      onChange={(e) => onSave({ courtesy_car_required: e.target.value === 'true' })}
                      className="glass-inset w-full px-3 py-2 text-sm"
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1">Incident Location</label>
                  <input
                    type="text"
                    value={editClaim.incident_location || ''}
                    onChange={(e) => onSave({ incident_location: e.target.value })}
                    className="glass-inset w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1">Circumstances</label>
                  <textarea
                    value={editClaim.circumstances || ''}
                    onChange={(e) => onSave({ circumstances: e.target.value })}
                    rows={4}
                    className="glass-inset w-full px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button onClick={onCancel} variant="outline" size="sm">Done</Button>
                </div>
              </div>
            )}
            canEdit={canEdit}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Job Status" value={claim.job_status} isStatus />
              <DetailRow label="Claim Type" value={claim.claim_type} />
              <DetailRow label="Date of Loss" value={claim.loss_date} isDate />
              <DetailRow label="Time of Loss" value={claim.loss_time} />
              <DetailRow label="Use of Vehicle" value={claim.vehicle_use} />
              <DetailRow label="Courtesy Car Required" value={claim.courtesy_car_required ? 'Yes' : 'No'} />
            </div>
            <div className="mt-2 py-3 px-4 rounded-lg glass-inset">
              <div className="text-xs font-semibold text-foreground-muted mb-2">Incident Location</div>
              <div className="text-sm font-medium mb-3">{claim.incident_location || '-'}</div>
              <div className="text-xs font-semibold text-foreground-muted mb-2">Circumstances</div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {claim.circumstances || '-'}
              </div>
            </div>
          </EditableSection>
        );

      case 'client':
        return (
          <EditableSection title="Billing Party — Client" icon={Users} claim={claim} onUpdate={handleUpdate} EditComponent={ClientEditComponent} canEdit={canEdit}>
            <PartyDisplayCard
              title="Billing Party — Client"
              partyType="client"
              data={{
                name: claim.client_name,
                phone: claim.client_phone,
                email: claim.client_email,
                address_line_1: claim.client_address_line_1,
                address_line_2: claim.client_address_line_2,
                town: claim.client_town,
                county: claim.client_county,
                postcode: claim.client_postcode,
              }}
              extras={[
                { label: 'Business Division', value: claim.business_division, isEmpty: !claim.business_division },
                { label: 'VAT Status', value: claim.client_vat_status || 'Unknown', isEmpty: !claim.client_vat_status },
                { label: 'Driver', value: claim.driver_same_as_client === false ? claim.driver_contact_name || '—' : 'Same as client', isEmpty: false, meta: claim.driver_same_as_client === false ? 'Different person' : null },
              ]}
              canEdit={false}
              bare={true}
            />
          </EditableSection>
        );

      case 'insurance':
        return (
          <EditableSection title="Insurance & Broker" icon={Shield} claim={claim} onUpdate={handleUpdate} EditComponent={ClaimInsuranceForm} canEdit={canEdit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Broker" value={claim.broker_name} />
              <DetailRow label="Insurer" value={claim.insurer} />
              <DetailRow label="Claim Reference" value={claim.claim_ref} />
              <DetailRow label="Policy Number" value={claim.policy_number} />
              <DetailRow label="Policy Excess" value={claim.policy_excess} isCurrency />
            </div>
          </EditableSection>
        );

      case 'driver':
        return (
          <EditableSection title="Repair Contact — Driver" icon={User} claim={claim} onUpdate={handleUpdate} EditComponent={DriverEditComponent} canEdit={canEdit}>
            <PartyDisplayCard
              title="Repair Contact — Driver"
              partyType="driver"
              data={{
                name: claim.driver_contact_name,
                phone: claim.driver_contact_phone,
                email: claim.driver_contact_email,
                address_line_1: claim.driver_contact_address_line_1,
                address_line_2: claim.driver_contact_address_line_2,
                town: claim.driver_contact_town,
                county: claim.driver_contact_county,
                postcode: claim.driver_contact_postcode,
              }}
              extras={[
                { label: 'Driving License', value: claim.client_driving_license, isEmpty: !claim.client_driving_license },
                { label: 'Same as Client', value: claim.driver_same_as_client === false ? 'No — different person' : 'Yes', isEmpty: false },
              ]}
              canEdit={false}
              bare={true}
            />
          </EditableSection>
        );

      case 'thirdParty':
        return (
          <EditableSection title="Third Party" icon={Users} claim={claim} onUpdate={handleUpdate} EditComponent={ThirdPartyEditComponent} canEdit={canEdit}>
            {(claim.tp_name || claim.tp_reg) ? (
              <div className="space-y-3">
                <PartyDisplayCard
                  title="Third Party"
                  partyType="thirdParty"
                  data={{
                    name: claim.tp_name,
                    phone: claim.tp_phone,
                    email: claim.tp_email,
                    address_line_1: claim.tp_address_line_1,
                    address_line_2: claim.tp_address_line_2,
                    town: claim.tp_town,
                    county: claim.tp_county,
                    postcode: claim.tp_postcode,
                  }}
                  extras={[
                    { label: 'TP Driver/Contact', value: claim.tp_driver_contact, isEmpty: !claim.tp_driver_contact },
                    { label: 'TP Broker', value: claim.tp_broker_name, isEmpty: !claim.tp_broker_name },
                    { label: 'TP Insurer', value: claim.tp_insurer, isEmpty: !claim.tp_insurer },
                    { label: 'TP Claim Ref', value: claim.tp_claim_ref, isEmpty: !claim.tp_claim_ref },
                    { label: 'TP Policy No.', value: claim.tp_policy_number, isEmpty: !claim.tp_policy_number },
                    { label: 'TP Registration', value: claim.tp_reg, isEmpty: !claim.tp_reg },
                    { label: 'TP Make / Model', value: claim.tp_make_model, isEmpty: !claim.tp_make_model },
                  ]}
                  canEdit={false}
                  bare={true}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No third party involvement recorded. Click edit to add details.</p>
            )}
          </EditableSection>
        );

      case 'vehicle':
        return (
          <EditableSection title="Vehicle Details" icon={Car} claim={claim} onUpdate={handleUpdate} EditComponent={ClaimVehicleForm} canEdit={canEdit}>
            {/* DVLA Lookup Button */}
            {claim.reg && (
              <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200 text-sm">DVLA Vehicle Lookup</p>
                    <p className="text-xs text-blue-600 dark:text-blue-300">Fetch vehicle data from DVLA for {claim.reg}</p>
                  </div>
                  <Button
                    onClick={handleFetchVehicleData}
                    disabled={isFetchingVehicle}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    {isFetchingVehicle ? 'Fetching...' : 'Fetch from DVLA'}
                  </Button>
                </div>
                {vehicleFetchError && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">{vehicleFetchError}</p>
                )}
              </div>
            )}
            
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-600 mb-3">Basic Information</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <DetailRow label="Make/Model" value={claim.make_model} />
                <DetailRow label="Make (DVLA)" value={claim.vehicle_make} />
                <DetailRow label="Model (DVLA)" value={claim.vehicle_model} />
                <DetailRow label="Colour" value={claim.vehicle_colour} />
                <DetailRow label="Fuel Type" value={claim.vehicle_fuel_type} />
                <DetailRow label="Year of Manufacture" value={claim.vehicle_year_of_manufacture} />
                <DetailRow label="Vehicle Type" value={claim.vehicle_type} />
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-600 mb-3">Technical Details</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <DetailRow label="Engine Capacity (CC)" value={claim.vehicle_engine_capacity} />
                <DetailRow label="CO2 Emissions (g/km)" value={claim.vehicle_co2_emissions} />
                <DetailRow label="Euro Status" value={claim.vehicle_euro_status} />
                <DetailRow label="Wheelplan" value={claim.vehicle_wheelplan} />
                <DetailRow label="Revenue Weight (kg)" value={claim.vehicle_revenue_weight} />
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-600 mb-3">MOT & Tax Status</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <DetailRow label="MOT Status" value={claim.vehicle_mot_status} />
                <DetailRow label="MOT Expiry Date" value={claim.vehicle_mot_expiry_date} isDate />
                <DetailRow label="Tax Status" value={claim.vehicle_tax_status} />
                <DetailRow label="Tax Due Date" value={claim.vehicle_tax_due_date} isDate />
                <DetailRow label="Last V5C Issued" value={claim.vehicle_date_of_last_v5c_issued} isDate />
              </div>
            </div>
          </EditableSection>
        );

      case 'vehicleDamage':
        return (
          <EditableSection 
            title="Vehicle Damage" 
            icon={AlertTriangle} 
            claim={claim} 
            onUpdate={handleUpdate} 
            EditComponent={ClaimVehicleDamageForm} 
            canEdit={canEdit}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Courtesy Car (CC) Needed" value={claim.courtesy_car_required ? 'Yes' : 'No'} />
              <DetailRow label="Undriveable / Drivable" value={claim.unroadworthy ? 'Undriveable' : 'Drivable'} />
            </div>
            <div className="mt-2 py-3 px-4 rounded-lg glass-inset">
              <div className="text-xs font-semibold text-foreground-muted mb-2">Vehicle Location</div>
              <div className="text-sm mb-3">{claim.vehicle_location || '-'}</div>
              <div className="text-xs font-semibold text-foreground-muted mb-2">Damage Description</div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{claim.vehicle_damage || '-'}</div>
            </div>
          </EditableSection>
        );



      case 'excessContribution':
        return (
          <EditableSection 
            title="Excess Contribution" 
            icon={BadgePercent} // Changed from Percent to BadgePercent
            claim={claim} 
            onUpdate={handleUpdate} 
            EditComponent={ClaimExcessContributionForm} 
            canEdit={canEdit}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Contribution Amount" value={claim.excess_contribution_amount} isCurrency />
              <DetailRow label="Payment Method" value={claim.excess_contribution_method || 'None'} />
              <DetailRow label="Contribution Paid" value={claim.excess_contribution_paid ? 'Yes' : 'No'} />
              <DetailRow label="Date Paid" value={claim.excess_contribution_paid_date} isDate />
            </div>
            {claim.excess_contribution_method === 'Via Repairer' && (
              <div className="mt-2 py-3 px-4 rounded-lg glass-inset">
                <div className="text-xs font-semibold text-foreground-muted mb-2">Invoice from Repairer</div>
                <div className="text-sm">{claim.excess_contribution_invoice_received ? 'Received ✓' : 'Not Received'}</div>
              </div>
            )}
            {claim.excess_contribution_notes && (
              <div className="mt-2 py-3 px-4 rounded-lg glass-inset">
                <div className="text-xs font-semibold text-foreground-muted mb-2">Notes</div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{claim.excess_contribution_notes}</div>
              </div>
            )}
          </EditableSection>
        );

      case 'referrer':
        return (
          <EditableSection title="Referrer Details" icon={Briefcase} claim={claim} onUpdate={handleUpdate} EditComponent={ClaimReferrerForm} canEdit={canEdit}>
            {claim.referrer ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <DetailRow label="Referrer" value={claim.referrer} />
                <DetailRow label="Referrer Email" value={claim.referrer_email} />
                <DetailRow label="Referrer Ref" value={claim.referrer_ref} />
                <DetailRow label="File Handler" value={claim.file_handler} />
                <DetailRow label="% to Referrer" value={claim.percent_to_referrer} />
                <DetailRow label="Repairer Referral Fee %" value={claim.referral_fee_repairer} />
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">No Referrer — Direct Client</p>
                <p className="text-xs text-muted-foreground mt-1">No referral fees are payable for this claim.</p>
              </div>
            )}
          </EditableSection>
        );

      case 'indemnity':
        if (!claim.requires_indemnity) {
          return (
            <EditableSection 
              title="Indemnity Details" 
              icon={Shield} 
              claim={claim} 
              onUpdate={handleUpdate} 
              EditComponent={ClaimIndemnityForm} 
              canEdit={canEdit}
            >
              <div className="text-center py-8 text-gray-500">
                <p className="mb-4">This claim does not currently require indemnity checks.</p>
                <p className="text-sm">Click the edit button to enable indemnity details if needed.</p>
              </div>
            </EditableSection>
          );
        }
        
        return (
          <EditableSection 
            title="Indemnity Details" 
            icon={Shield} 
            claim={claim} 
            onUpdate={handleUpdate} 
            EditComponent={ClaimIndemnityForm} 
            canEdit={canEdit}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Driver's Date of Birth" value={claim.indemnity_driver_dob} isDate />
              <DetailRow label="Registered Owner/Keeper" value={claim.indemnity_registered_owner} />
            </div>
            <div className="mt-2 space-y-3">
              <div className="py-3 px-4 rounded-lg glass-inset">
                <div className="text-xs font-semibold text-foreground-muted mb-2">Pending Prosecutions?</div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{claim.indemnity_pending_prosecutions || '-'}</div>
              </div>
              <div className="py-3 px-4 rounded-lg glass-inset">
                <div className="text-xs font-semibold text-foreground-muted mb-2">Told not to drive by DVLA/Medical?</div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{claim.indemnity_dvla_medical_restrictions || '-'}</div>
              </div>
              <div className="py-3 px-4 rounded-lg glass-inset">
                <div className="text-xs font-semibold text-foreground-muted mb-2">Held full UK/EU license for 12+ months?</div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{claim.indemnity_full_license_12_months ? 'Yes' : 'No'}</div>
              </div>
              <div className="py-3 px-4 rounded-lg glass-inset">
                <div className="text-xs font-semibold text-foreground-muted mb-2">Motoring convictions/points in last 5 years?</div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{claim.indemnity_convictions_last_5_years || '-'}</div>
              </div>
              <div className="py-3 px-4 rounded-lg glass-inset">
                <div className="text-xs font-semibold text-foreground-muted mb-2">Vehicle use at time of incident</div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{claim.indemnity_vehicle_use_at_incident || '-'}</div>
              </div>
              <div className="py-3 px-4 rounded-lg glass-inset">
                <div className="text-xs font-semibold text-foreground-muted mb-2">Vehicle modifications?</div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{claim.indemnity_vehicle_modifications || '-'}</div>
              </div>
            </div>
          </EditableSection>
        );



      case 'financials':
        return (
          <EditableSection title="Financials" icon={DollarSign} claim={claim} onUpdate={handleUpdate} EditComponent={ClaimFinancialsForm} canEdit={canEdit}>
            <FinancialSummary claim={claim} onClaimUpdated={(updated) => handleUpdate(updated)} />
          </EditableSection>
        );

      case 'dates':
        return (
          <EditableSection title="Key Dates" icon={Calendar} claim={claim} onUpdate={handleUpdate} EditComponent={ClaimDatesForm} canEdit={canEdit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Date Received" value={claim.date_received} isDate />
              <DetailRow label="Loss Date" value={claim.loss_date} isDate />
              <DetailRow label="Estimate Completed" value={claim.estimate_completed} isDate />
              <DetailRow label="Authority Received" value={claim.authority_received} isDate />
              <DetailRow label="Bodyshop Instructed" value={claim.bs_instructed} isDate />
              <DetailRow label="Booking In Date (BID)" value={claim.booking_in_date} isDate />
              <DetailRow label="On-Site Date" value={claim.on_site_date} isDate />
              <DetailRow label="Est. Completion (ECD)" value={claim.ecd} isDate />
              <DetailRow label="Completion Date" value={claim.completion_date} isDate />
            </div>
          </EditableSection>
        );

      case 'bodyshop':
        return (
          <EditableSection title="Bodyshop Details" icon={Wrench} claim={claim} onUpdate={handleUpdate} EditComponent={ClaimBodyshopForm} canEdit={canEdit}>
            {/* Repairer Acceptance Status Banner */}
            {claim.bodyshop_id && !claim.repairer_accepted && (
              <div className="mb-4 p-3 rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-900/20 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">Awaiting Repairer Acceptance</p>
                  <p className="text-xs text-amber-600 dark:text-amber-300">The bodyshop has not yet confirmed they can handle this repair</p>
                </div>
              </div>
            )}
            {claim.bodyshop_id && claim.repairer_accepted && (
              <div className="mb-4 p-3 rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-900/20 flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Repairer Accepted</p>
                  <p className="text-xs text-green-600 dark:text-green-300">
                    {claim.repairer_accepted_date ? `Accepted on ${format(new Date(claim.repairer_accepted_date), 'dd/MM/yyyy')}` : 'Job confirmed by bodyshop'}
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Bodyshop" value={claim.bodyshop} />
              <DetailRow label="Bodyshop Email" value={claim.bodyshop_email} />
            </div>
            
            {/* Instruction PDF Download - Only show if there's a PDF */}
            {claim.instruction_pdf_url && (
              <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/30">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium">Instruction PDF</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(claim.instruction_pdf_url, '_blank')}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </EditableSection>
        );

      case 'estimate':
        return (
          <EditableSection title="Estimate Details" icon={Calculator} claim={claim} onUpdate={handleUpdate} EditComponent={ClaimEstimateForm} canEdit={canEdit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Audatex Code" value={claim.audatex_code} />
              <DetailRow label="Estimate Fee" value={claim.est_fee} isCurrency />
              <DetailRow label="Authorising Party" value={claim.authorising_party} />
              <DetailRow label="Est. Cost (Net)" value={claim.estimate_cost_net} isCurrency />
              <DetailRow label="Auth. Cost (Net)" value={claim.authority_cost_net} isCurrency />
              <DetailRow label="Est. Cost (Gross)" value={claim.estimate_cost_gross} isCurrency />
              <DetailRow label="Auth. Cost (Gross)" value={claim.authority_cost_gross} isCurrency />
            </div>
            <div className="mt-2 py-3 px-4 rounded-lg glass-inset">
              <div className="text-xs font-semibold text-foreground-muted mb-2">Artura Estimate URL</div>
              <div className="text-sm break-all">{claim.artura_est_url || '-'}</div>
            </div>
          </EditableSection>
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
      <FileAttachmentModal
        fileUrls={claim.file_urls || []}
        onAdd={(newUrls) => {
          const current = Array.isArray(claim.file_urls) ? claim.file_urls : [];
          handleUpdate({ ...claim, file_urls: [...current, ...newUrls] });
        }}
        onRemove={handleFileRemove}
        isOpen={isAttachmentsOpen}
        onClose={() => setIsAttachmentsOpen(false)}
        enableAI={true}
        analysisType="claim"
        onAIExtract={handleAIExtract}
        existingData={claim}
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
      />

      <ClaimUpdatesModal
        claimId={claim.id}
        currentStatus={claim.job_status}
        isOpen={isClaimUpdatesOpen}
        onClose={() => setIsClaimUpdatesOpen(false)}
        onUpdateCreated={handleClaimUpdateCreated}
      />

      <UpdateTrackingModal
        claim={claim}
        isOpen={isUpdateTrackingOpen}
        onClose={() => setIsUpdateTrackingOpen(false)}
        onSetOverride={() => {
          setIsUpdateTrackingOpen(false);
          setIsOverrideModalOpen(true);
        }}
        canEdit={canEdit}
      />

      <InstructionTemplateModal
                claim={claim}
                isOpen={isInstructionModalOpen}
                onClose={() => setIsInstructionModalOpen(false)}
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

      <div className="flex flex-col gap-2 md:gap-3" style={{height: '100%', touchAction: 'auto', isolation: 'isolate'}}>

          {/* ── MOBILE header (< lg) ── */}
          <ClaimDetailMobileHeader
            claim={{...claim, _selectedSection: selectedSection}}
            isClosedStatus={isClosedStatus}
            onClose={handleClose}
            onUpdates={() => setIsClaimUpdatesOpen(true)}
            onUpdateTracking={() => setIsUpdateTrackingOpen(true)}
            onAction={(val) => {
              if (val.startsWith('section:')) { setSelectedSection(val.replace('section:', '')); return; }
              if (val === 'notes') setIsNotesOpen(true);
              else if (val === 'docs') setIsAttachmentsOpen(true);
              else if (val === 'images') setIsImagesOpen(true);
              else if (val === 'timelogs') setIsTimeLogsOpen(true);
              else if (val === 'activity') setIsActivityLogOpen(true);
              else if (val === 'email') setIsEmailModalOpen(true);
              else if (val === 'tasks') setIsTasksModalOpen(true);
              else if (val === 'instructions') setIsInstructionModalOpen(true);
              else if (val === 'download_pdf') window.open(claim.instruction_pdf_url, '_blank');
              else if (val === 'estimate') setIsEstimateModalOpen(true);
              else if (val === 'parts') setIsPartsModalOpen(true);
              else if (val === 'backorders') setIsBackorderedPartsModalOpen(true);
              else if (val === 'archive') handleArchive();
              else if (val === 'delete') handleDelete();
            }}
          />

          {/* ── DESKTOP top bar (≥ lg) — unchanged Radix dropdown ── */}
          <div className="hidden lg:block bg-card border border-border rounded-[10px] p-3 flex-shrink-0 shadow-sm">
              <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                      <button
                        onClick={handleClose}
                        className="p-2 flex-shrink-0 rounded-[10px] border border-border bg-card hover:bg-muted transition-colors"
                      >
                          <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h1 className="text-xl font-bold truncate">{formatUKRegistration(claim.reg) || 'Claim Details'}</h1>
                            {claim.job_number && (
                              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-gold/20 text-gold font-semibold whitespace-nowrap flex-shrink-0">
                                {claim.job_number}
                              </span>
                            )}
                          </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {canEdit && (
                          <Button onClick={() => setIsClaimUpdatesOpen(true)} className="h-9 px-4 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white">
                            Updates & Status
                          </Button>
                        )}
                        {!canEdit && (
                          <Button onClick={() => setIsClaimUpdatesOpen(true)} variant="outline" className="h-9 px-4 text-sm font-medium rounded-lg">
                            Updates
                          </Button>
                        )}
                        <Button onClick={() => setIsImagesOpen(true)} variant="outline" className="h-9 px-3 text-sm font-medium rounded-lg gap-1.5">
                          <Image className="w-4 h-4" /> Images
                        </Button>
                        <Button onClick={() => setIsAttachmentsOpen(true)} variant="outline" className="h-9 px-3 text-sm font-medium rounded-lg gap-1.5">
                          <FileText className="w-4 h-4" /> Docs
                        </Button>
                        {canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="p-2 h-9 w-9"><ChevronDown className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsNotesOpen(true); }}><Edit className="w-4 h-4 mr-2" />Internal Notes</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsAttachmentsOpen(true); }}><FileText className="w-4 h-4 mr-2" />Documents</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsImagesOpen(true); }}><Image className="w-4 h-4 mr-2" />Images</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsTimeLogsOpen(true); }}><Timer className="w-4 h-4 mr-2" />Time Logs</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsActivityLogOpen(true); }}><History className="w-4 h-4 mr-2" />Activity Log</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsEmailModalOpen(true); }}><Mail className="w-4 h-4 mr-2" />Send Email</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsTasksModalOpen(true); }}><ListTodo className="w-4 h-4 mr-2" />Manage Tasks</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsInstructionModalOpen(true); }}><FileText className="w-4 h-4 mr-2" />Generate Instructions</DropdownMenuItem>
                              {claim.instruction_pdf_url && <DropdownMenuItem onSelect={(e) => { e.preventDefault(); window.open(claim.instruction_pdf_url, '_blank'); }}><Download className="w-4 h-4 mr-2" />Download Instruction PDF</DropdownMenuItem>}
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsEstimateModalOpen(true); }}><Calculator className="w-4 h-4 mr-2" />Request Estimate</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsPartsModalOpen(true); }}><Package className="w-4 h-4 mr-2" />Log Parts Issue</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsBackorderedPartsModalOpen(true); }}><Package className="w-4 h-4 mr-2" />Backordered Parts</DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleArchive(); }} disabled={archiveMutation.isLoading}><Archive className="w-4 h-4 mr-2" />{claim.archived ? 'Unarchive' : 'Archive'}</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleDelete()} disabled={deleteMutation.isLoading} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={claim.job_status || 'New'} />
                    {claim.secondary_status && <StatusBadge status={claim.secondary_status} variant="secondary" />}
                    {!isClosedStatus && claim.update_status_flag && (
                      <button onClick={() => setIsUpdateTrackingOpen(true)} className="hover:opacity-80 transition-all cursor-pointer rounded-md">
                        <UpdateStatusBadge status={claim.update_status_flag} small />
                      </button>
                    )}
                    {claim.archived && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Archived</span>}
                  </div>
                  <ClaimJourneyTimeline claim={claim} updates={claimUpdates} />
              </div>
          </div>

        {(linkedEstimate || linkedEngineering || linkedParts || linkedThirdPartyClaim || linkedOriginalClaim) && (
          <div className="hidden lg:block bg-card border border-border rounded-[10px] p-3 flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-4 h-4 text-gold">🔗</span>
              <h3 className="font-medium">Linked Cases</h3>
            </div>
            <div className="flex gap-3 flex-wrap">
              {linkedOriginalClaim && (
                <button
                  onClick={() => openLinkedClaim(linkedOriginalClaim.id)}
                  className="bg-muted hover:bg-muted/80 border border-border rounded-[8px] px-3 py-1.5 text-sm transition-all cursor-pointer"
                  title="Click to open in new window"
                >
                  <span className="text-gray-500">Original Fault Claim:</span>{' '}
                  <span className="font-medium text-blue-600 underline">{linkedOriginalClaim.job_number || linkedOriginalClaim.reg}</span>
                </button>
              )}
              {linkedThirdPartyClaim && (
                <button
                  onClick={() => openLinkedClaim(linkedThirdPartyClaim.id)}
                  className="bg-muted hover:bg-muted/80 border border-border rounded-[8px] px-3 py-1.5 text-sm transition-all cursor-pointer"
                  title="Click to open in new window"
                >
                  <span className="text-gray-500">Third Party Claim:</span>{' '}
                  <span className="font-medium text-indigo-600 underline">{linkedThirdPartyClaim.job_number || linkedThirdPartyClaim.reg}</span>
                </button>
              )}
              {linkedEstimate && (
                <button
                  onClick={() => openLinkedItem(createPageUrl('Estimating'), linkedEstimate.id)}
                  className="bg-muted hover:bg-muted/80 border border-border rounded-[8px] px-3 py-1.5 text-sm transition-all cursor-pointer"
                  title="Click to open in new window"
                >
                  <span className="text-gray-500">Estimate:</span>{' '}
                  <span className="font-medium text-green-600 underline">{linkedEstimate.name}</span>
                </button>
              )}
              {linkedEngineering && (
                <button
                  onClick={() => openLinkedItem(createPageUrl('Engineering'), linkedEngineering.id)}
                  className="bg-muted hover:bg-muted/80 border border-border rounded-[8px] px-3 py-1.5 text-sm transition-all cursor-pointer"
                  title="Click to open in new window"
                >
                  <span className="text-gray-500">Engineering:</span>{' '}
                  <span className="font-medium text-purple-600 underline">{linkedEngineering.reference}</span>
                </button>
              )}
              {linkedParts && (
                <button
                  onClick={() => openLinkedItem(createPageUrl('Parts'), linkedParts.id)}
                  className="bg-muted hover:bg-muted/80 border border-border rounded-[8px] px-3 py-1.5 text-sm transition-all cursor-pointer"
                  title="Click to open in new window"
                >
                  <span className="text-gray-500">Parts:</span>{' '}
                  <span className="font-medium text-orange-600 underline">{linkedParts.vehicle_ref}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section selector — desktop only (mobile uses ClaimDetailMobileHeader) */}
        <div className="hidden lg:block bg-card border border-border rounded-[10px] px-3 py-2 flex-shrink-0 shadow-sm">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full px-3 py-3 flex items-center justify-between bg-transparent">
                <div className="flex items-center gap-2">
                  {React.createElement(DETAIL_SECTIONS.find(s => s.id === selectedSection)?.icon || User, { className: "w-5 h-5" })}
                  <span className="font-medium">{DETAIL_SECTIONS.find(s => s.id === selectedSection)?.label || 'Select Section'}</span>
                </div>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full max-h-80 overflow-y-auto" align="start" side="bottom">
              {DETAIL_SECTIONS.map(section => (
                <DropdownMenuItem
                  key={section.id}
                  onSelect={() => setSelectedSection(section.id)}
                  className={selectedSection === section.id ? 'bg-glass-hover' : ''}
                >
                  <section.icon className="w-4 h-4 mr-2" />
                  <span className="flex-1">{section.label}</span>
                  {isSectionEmpty(section.id, claim) && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 ml-2" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-4" style={{WebkitOverflowScrolling: 'touch', overflowY: 'auto'}}>
          <div>
            {renderSelectedSection()}
          </div>
        </div>
      </div>
    </DragDropOverlay>
  );
}