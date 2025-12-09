import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Package, FileText, DollarSign, Calendar, ChevronDown, ChevronUp, Link as LinkIcon, Mail, Send, Users, Archive, Trash2, Car, Timer, History } from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "../shared/StatusBadge";
import PartBasicInfoForm from './PartBasicInfoForm';
import PartCustomerForm from './PartCustomerForm';
import PartOrderForm from './PartOrderForm';
import PartSupplierForm from './PartSupplierForm';
import NotesModal from '../shared/NotesModal';
import FileAttachmentModal from '../shared/FileAttachmentModal';
import TimeLogSection from '../shared/TimeLogSection';
import TimeLogsModal from '../shared/TimeLogsModal';
import ActivityLogModal from '../shared/ActivityLogModal';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DragDropOverlay from '../shared/DragDropOverlay';
import EmailComposerModal from '../shared/EmailComposerModal';
import SupplierTrackingSection from './SupplierTrackingSection';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


const EditableSection = ({ title, icon: Icon, claim, onUpdate, children, EditComponent, canEdit = true }) => {
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = (updatedData) => {
        onUpdate({ ...claim, ...updatedData });
        setIsEditing(false);
    };

    return (
        <div className="neomorph-flat p-4 md:p-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3 text-left flex-grow">
                    <Icon className="w-5 h-5 text-gold" />
                    <h3 className="font-bold">{title}</h3>
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
                    <EditComponent part={claim} onSave={handleSave} onCancel={() => setIsEditing(false)} />
                ) : (
                    children
                )}
            </div>
        </div>
    );
};

const DETAIL_SECTIONS = [
  { id: 'basic', label: 'Part & Vehicle', icon: Package },
  { id: 'vehicle', label: 'Vehicle Details', icon: Car },
  { id: 'contact', label: 'Contact & Delivery', icon: Mail },
  { id: 'supplier', label: 'Supplier & Pricing', icon: DollarSign },
  { id: 'order', label: 'Order Details', icon: Calendar },
];

function DetailRow({ label, value, isDate = false, isCurrency = false, isTime = false }) {
    let displayValue = value || '-';
    if (isDate && value) displayValue = format(new Date(value), 'dd/MM/yyyy');
    if (isCurrency && typeof value === 'number') displayValue = `£${value.toFixed(2)}`;
    if (isTime && typeof value === 'number') displayValue = value === 0 ? 'No Date' : `${value} Week(s)`;
    
    return (
        <div className="py-3 px-4 rounded-lg hover:bg-surface-hover transition-colors">
            <div className="text-xs font-semibold text-foreground-muted mb-1">{label}</div>
            <div className="text-sm font-medium">{displayValue}</div>
        </div>
    );
}

export default function PartDetail({ part, onClose, onUpdate, isInternalUser = true }) {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [startTime] = useState(new Date());
  const [currentDuration, setCurrentDuration] = useState(0);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isTimeLogsOpen, setIsTimeLogsOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState('basic');
  const durationRef = useRef(0);
  const hasSavedRef = useRef(0);
  const queryClient = useQueryClient();

  const canEdit = isInternalUser;

  useEffect(() => {
    durationRef.current = currentDuration;
  }, [currentDuration]);

  const { data: linkedClaim } = useQuery({
    queryKey: ['claim', part.linked_claim_id],
    queryFn: () => part.linked_claim_id ? base44.entities.Claim.get(part.linked_claim_id) : null,
    enabled: !!part.linked_claim_id,
  });

  // Get all suppliers
  const { data: allSuppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  // Get custom statuses
  const { data: customStatuses = [] } = useQuery({
    queryKey: ['partStatusConfigs'],
    queryFn: () => base44.entities.PartStatusConfig.list(),
  });

  // Find suppliers that have this manufacturer in their associations
  const partManufacturer = part.manufacturer || part.vehicle_make;
  const linkedSuppliers = allSuppliers.filter(supplier =>
    supplier.manufacturer_associations?.includes(partManufacturer)
  );

  // Archive Mutation
  const archiveMutation = useMutation({
    mutationFn: () => base44.entities.Part.update(part.id, { archived: !part.archived }),
    onSuccess: (updatedPart) => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      // The onUpdate prop is used to update the parent component's state (e.g., the part object in a list)
      // We pass the relevant change (archived status) back.
      onUpdate({ ...part, archived: updatedPart.archived });
    },
    onError: (error) => {
        console.error("Failed to toggle archive status:", error);
        // Optionally show an error message to the user
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Part.delete(part.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      onClose(); // Close the detail view after successful deletion
    },
    onError: (error) => {
        console.error("Failed to delete part:", error);
        // Optionally show an error message to the user
    }
  });

  // Build the available statuses list - default + active custom statuses
  const defaultStatuses = [
    "New Request",
    "Quoted",
    "Waiting Repairer Payment",
    "Need to Order",
    "Ordered",
    "Complete",
    "Cancelled",
    "Refund Required",
    "Needs Crediting"
  ];

  const activeCustomStatuses = customStatuses
    .filter(s => s.is_active)
    .map(s => s.status_name);

  const availableStatuses = [...defaultStatuses, ...activeCustomStatuses];

  const handleStatusChange = (newStatus) => {
    onUpdate({ ...part, sourcing_status: newStatus });
  };

  // Effect to save time log when the component unmounts (e.g., on navigation away)
  useEffect(() => {
    return () => {
      // The cleanup function will run on component unmount
      const duration = durationRef.current;
      if (duration > 0 && !hasSavedRef.current) { // Only save if there was actual time spent and it hasn't been saved yet
        hasSavedRef.current = true; // Mark as saved to prevent double-saving
        base44.entities.TimeLog.create({
          parent_id: part.id,
          parent_type: 'Part',
          duration_seconds: duration,
          started_at: startTime.toISOString(),
          ended_at: new Date().toISOString()
        }).catch(error => {
          console.error('Failed to save time log on unmount:', error);
        });
      }
    };
  }, []); // Empty dependency array means this effect and its cleanup run only once on mount/unmount

  const handleClose = async () => {
    const duration = durationRef.current;
    if (duration > 0 && !hasSavedRef.current) { // Also save time log if there was time spent and it hasn't been saved
      hasSavedRef.current = true; // Mark as saved
      try {
        await base44.entities.TimeLog.create({
          parent_id: part.id,
          parent_type: 'Part',
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

  const handleFilesUploaded = (newFileUrls) => {
    const currentUrls = Array.isArray(part.file_urls) ? part.file_urls : [];
    const updatedUrls = [...currentUrls, ...newFileUrls];
    onUpdate({ ...part, file_urls: updatedUrls });
  };

  const handleFileRemove = (urlToRemove) => {
    const currentUrls = Array.isArray(part.file_urls) ? part.file_urls : [];
    const updatedUrls = currentUrls.filter(url => url !== urlToRemove);
    onUpdate({ ...part, file_urls: updatedUrls });
  };

  const handleArchive = () => {
    const action = part.archived ? 'restore' : 'archive';
    if (window.confirm(`Are you sure you want to ${action} this part request?`)) {
      archiveMutation.mutate();
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to permanently delete this part request? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const handleSendToLinkedSuppliers = async () => {
    if (linkedSuppliers.length === 0) {
      alert('No suppliers found for this manufacturer. Please add suppliers and assign them to this manufacturer in Settings > Suppliers.');
      return;
    }

    const supplierEmails = linkedSuppliers
      .filter(s => s.email)
      .map(s => s.email)
      .join('; ');

    if (!supplierEmails) {
      alert('None of the linked suppliers have email addresses on file.');
      return;
    }

    // Automatically mark these suppliers as contacted
    const linkedSupplierNames = linkedSuppliers.map(s => s.name);
    const currentContacted = part.contacted_suppliers || [];
    const updatedContacted = [...new Set([...currentContacted, ...linkedSupplierNames])]; // Use Set to avoid duplicates

    // Update the part with the contacted suppliers
    onUpdate({ ...part, contacted_suppliers: updatedContacted });

    // Create email body with part details
    const emailSubject = `Parts Quote Request - ${part.vehicle_ref || 'Vehicle'} - ${part.manufacturer || 'N/A'}`;
    const emailBody = `Dear Supplier,

We are requesting a quote for the following part:

Vehicle Reference: ${part.vehicle_ref || 'N/A'}
Manufacturer: ${part.manufacturer || 'N/A'}
Part Description: ${part.part_description || 'N/A'}
Part Number: ${part.part_number || 'N/A'}
Part Type: ${part.part_type || 'N/A'}
Condition: ${part.condition || 'N/A'}

Delivery Address:
${part.delivery_address || 'N/A'}

Bodyshop: ${part.bodyshop_company || 'N/A'}
Contact: ${part.contact_name || 'N/A'}
Phone: ${part.contact_number || 'N/A'}

Please provide your best quote including:
- Part price
- Delivery time
- Warranty information

Best regards,
Artura Pro Team`;

    window.location.href = `mailto:${encodeURIComponent(supplierEmails)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
  };

  const getFileName = (url) => (url ? new URL(url).pathname.split('/').pop() : "File"); // This function is defined but not used in the provided code.

const renderSelectedSection = () => {
    switch (selectedSection) {
      case 'basic':
        return (
          <EditableSection
            title="Part & Vehicle"
            icon={Package}
            claim={part}
            onUpdate={onUpdate}
            EditComponent={PartBasicInfoForm}
            canEdit={canEdit}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Vehicle Ref" value={part.vehicle_ref} />
              <DetailRow label="Manufacturer" value={part.manufacturer || part.vehicle_make} />
              <DetailRow label="Model" value={part.vehicle_model} />
              <DetailRow label="Part Number" value={part.part_number} />
            </div>
            <div className="mt-2 py-3 px-4 rounded-lg glass-inset">
              <div className="text-xs font-semibold text-foreground-muted mb-2">Part Description</div>
              <div className="text-sm leading-relaxed">{part.part_description || '-'}</div>
            </div>
          </EditableSection>
        );

      case 'vehicle':
        return (
          <EditableSection
            title="Vehicle Details"
            icon={Car}
            claim={part}
            onUpdate={onUpdate}
            EditComponent={null}
            canEdit={false}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Make/Model" value={part.make_model || `${part.vehicle_make || ''} ${part.vehicle_model || ''}`.trim()} />
              <DetailRow label="Make (DVLA)" value={part.vehicle_make} />
              <DetailRow label="Model (DVLA)" value={part.vehicle_model} />
              <DetailRow label="Colour" value={part.vehicle_colour} />
              <DetailRow label="Fuel Type" value={part.vehicle_fuel_type} />
              <DetailRow label="Year of Manufacture" value={part.vehicle_year_of_manufacture} />
              <DetailRow label="Engine Capacity (CC)" value={part.vehicle_engine_capacity} />
              <DetailRow label="CO2 Emissions (g/km)" value={part.vehicle_co2_emissions} />
              <DetailRow label="Euro Status" value={part.vehicle_euro_status} />
              <DetailRow label="MOT Status" value={part.vehicle_mot_status} />
              <DetailRow label="MOT Expiry Date" value={part.vehicle_mot_expiry_date} isDate />
              <DetailRow label="Tax Status" value={part.vehicle_tax_status} />
              <DetailRow label="Tax Due Date" value={part.vehicle_tax_due_date} isDate />
              <DetailRow label="Last V5C Issued" value={part.vehicle_date_of_last_v5c_issued} isDate />
              <DetailRow label="Wheelplan" value={part.vehicle_wheelplan} />
              <DetailRow label="Revenue Weight (kg)" value={part.vehicle_revenue_weight} />
            </div>
          </EditableSection>
        );

      case 'contact':
        return (
          <EditableSection
            title="Contact & Delivery"
            icon={Mail}
            claim={part}
            onUpdate={onUpdate}
            EditComponent={PartCustomerForm}
            canEdit={canEdit}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Bodyshop" value={part.bodyshop_company} />
              <DetailRow label="Contact Name" value={part.contact_name} />
              <DetailRow label="Contact Phone" value={part.contact_number} />
              <DetailRow label="Contact Email" value={part.contact_email} />
            </div>
            <div className="mt-2 py-3 px-4 rounded-lg glass-inset">
              <div className="text-xs font-semibold text-foreground-muted mb-2">Delivery Address</div>
              <div className="text-sm leading-relaxed">{part.delivery_address || '-'}</div>
            </div>
          </EditableSection>
        );

      case 'supplier':
        return (
          <EditableSection
            title="Supplier & Pricing"
            icon={DollarSign}
            claim={part}
            onUpdate={onUpdate}
            EditComponent={PartSupplierForm}
            canEdit={canEdit}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Supplier" value={part.supplier} />
              <DetailRow label="Part Type" value={part.part_type} />
              <DetailRow label="Condition" value={part.condition} />
              <DetailRow label="RRP" value={part.rrp} isCurrency />
              <DetailRow label="Net Price" value={part.net_price} isCurrency />
              <DetailRow label="Sourcing Fee" value={part.sourcing_fee} isCurrency />
            </div>
          </EditableSection>
        );

      case 'order':
        return (
          <EditableSection
            title="Order Details"
            icon={Calendar}
            claim={part}
            onUpdate={onUpdate}
            EditComponent={PartOrderForm}
            canEdit={canEdit}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Date Requested" value={part.date_requested} isDate />
              <DetailRow label="Date Ordered" value={part.date_ordered} isDate />
              <DetailRow label="Delivery Time" value={part.delivery_time_weeks} isTime />
              <DetailRow label="Work Provider" value={part.work_provider} />
              <DetailRow label="Courtesy Vehicle" value={part.courtesy_vehicle_type} />
            </div>
          </EditableSection>
        );

      default:
        return null;
    }
  };

  const suppliersWithStock = part.suppliers_with_stock || [];

  return (
    <DragDropOverlay onFilesUploaded={handleFilesUploaded}>
      <EmailComposerModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        itemType="Part"
        itemData={part}
      />
      <FileAttachmentModal
        fileUrls={part.file_urls || []}
        onRemove={handleFileRemove}
        isOpen={isAttachmentsOpen}
        onClose={() => setIsAttachmentsOpen(false)}
      />
      <NotesModal
        parentId={part.id}
        parentType="Part"
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
      />
      <TimeLogsModal
        parentId={part.id}
        parentType="Part"
        isOpen={isTimeLogsOpen}
        onClose={() => setIsTimeLogsOpen(false)}
      />
      <ActivityLogModal
        parentId={part.id}
        parentType="Part"
        isOpen={isActivityLogOpen}
        onClose={() => setIsActivityLogOpen(false)}
      />

      <div className="h-full flex flex-col gap-4 md:gap-6">
        <div className="neomorph p-3 md:p-6 flex-shrink-0 sticky top-0 z-10 bg-background">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 md:gap-4">
              <Button onClick={handleClose} className="neomorph-flat p-2 flex-shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base md:text-2xl font-bold truncate">{part.vehicle_ref || 'Part Request'}</h1>
                  {part.job_number && (
                    <span className="text-xs md:text-sm font-mono px-2 py-0.5 md:py-1 rounded bg-gold/20 text-gold font-semibold">
                      {part.job_number}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="neomorph-flat p-1.5 md:p-2">
                        <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsNotesOpen(true); }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Internal Notes
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsAttachmentsOpen(true); }}>
                        <FileText className="w-4 h-4 mr-2" />
                        Documents
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsTimeLogsOpen(true); }}>
                        <Timer className="w-4 h-4 mr-2" />
                        Time Logs
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsActivityLogOpen(true); }}>
                        <History className="w-4 h-4 mr-2" />
                        Activity Log
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsEmailModalOpen(true); }}>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Email
                      </DropdownMenuItem>
                      {linkedSuppliers.length > 0 && (
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleSendToLinkedSuppliers(); }}>
                          <Send className="w-4 h-4 mr-2" />
                          Email All Suppliers
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleArchive(); }} disabled={archiveMutation.isLoading}>
                        <Archive className="w-4 h-4 mr-2" />
                        {part.archived ? 'Unarchive' : 'Archive'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleDelete(); }} disabled={deleteMutation.isLoading} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge
                status={part.sourcing_status || 'New Request'}
                onStatusChange={canEdit ? handleStatusChange : undefined}
                availableStatuses={availableStatuses}
                customStatuses={customStatuses}
              />
              {part.archived && (
                <span className="neomorph-flat px-2 md:px-3 py-0.5 md:py-1 text-xs font-medium text-gray-600">
                  Archived
                </span>
              )}
            </div>
          </div>
        </div>

        {linkedClaim && (
          <div className="neomorph p-4 flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-4 h-4 text-gold">🔗</span>
              <h3 className="font-medium">Linked Cases</h3>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => window.open(`/claims?id=${linkedClaim.id}`, '_blank')}
                className="neomorph-flat px-4 py-2 text-sm hover:neomorph transition-all cursor-pointer"
                title="Click to open in new window"
              >
                <span className="text-gray-500">Claim:</span>{' '}
                <span className="font-medium text-blue-600 underline">{linkedClaim.job_number || linkedClaim.reg}</span>
              </button>
            </div>
          </div>
        )}

        {canEdit && linkedSuppliers.length > 0 && (
          <div className="neomorph p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gold" />
                  Linked Suppliers for {part.manufacturer || part.vehicle_make}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {linkedSuppliers.length} supplier(s) configured for this manufacturer
                </p>
              </div>
              <Button
                onClick={handleSendToLinkedSuppliers}
                className="neomorph-flat px-4 py-2 flex items-center gap-2 text-gold font-medium"
              >
                <Send className="w-4 h-4" />
                Email All
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {linkedSuppliers.map(supplier => (
                <div key={supplier.id} className="neomorph-flat p-3">
                  <p className="font-medium text-gray-700 text-sm">{supplier.name}</p>
                  <p className="text-xs text-gray-500">{supplier.contact_name}</p>
                  <p className="text-xs text-gray-600">{supplier.email}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="neomorph p-4 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full neomorph-flat p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {React.createElement(DETAIL_SECTIONS.find(s => s.id === selectedSection)?.icon || Package, { className: "w-5 h-5" })}
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
                  {section.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {renderSelectedSection()}
        </div>
      </div>
    </DragDropOverlay>
  );
}