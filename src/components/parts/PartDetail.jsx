
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Package, FileText, DollarSign, Calendar, ChevronDown, ChevronUp, Link as LinkIcon, Mail, Send, Users, Archive, Trash2, Clock } from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "../shared/StatusBadge";
import PartBasicInfoForm from './PartBasicInfoForm';
import PartCustomerForm from './PartCustomerForm';
import PartOrderForm from './PartOrderForm';
import PartSupplierForm from './PartSupplierForm';
import NotesModal from '../shared/NotesModal';
import FileAttachmentModal from '../shared/FileAttachmentModal';
import TimeLogSection from '../shared/TimeLogSection';
import ItemActivityLog from '../shared/ItemActivityLog'; // New import
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DragDropOverlay from '../shared/DragDropOverlay';
import Timer from '../shared/Timer';
import EmailComposerModal from '../shared/EmailComposerModal';
import SupplierTrackingSection from './SupplierTrackingSection';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


const EditableSection = ({ title, icon: Icon, claim, onUpdate, children, EditComponent, defaultOpen = false, canEdit = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = (updatedData) => {
        // Merge the updated data with the existing part data before calling the parent onUpdate
        onUpdate({ ...claim, ...updatedData });
        setIsEditing(false);
    };

    return (
        <div className="neomorph-flat p-4 md:p-6">
            <div className="flex justify-between items-center">
                <button
                    className="flex items-center gap-3 text-left flex-grow"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Icon className="w-5 h-5 text-gold" />
                    <h3 className="font-bold">{title}</h3>
                </button>
                <div className='flex items-center gap-2'>
                    {!isEditing && EditComponent && canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => { setIsEditing(true); setIsOpen(true); }} className="h-8 w-8 hover:text-gold">
                            <Edit className="w-4 h-4" />
                        </Button>
                    )}
                     <button onClick={() => setIsOpen(!isOpen)}>
                        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                </div>
            </div>
            {isOpen && (
                <div className="mt-4 pt-4 border-t border-gray-300 border-opacity-50">
                    {isEditing ? (
                        <EditComponent part={claim} onSave={handleSave} onCancel={() => setIsEditing(false)} />
                    ) : (
                        children
                    )}
                </div>
            )}
        </div>
    );
};

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

export default function PartDetail({ part, onClose, onUpdate, onArchive, onDelete, isInternalUser = true }) {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSendingToSuppliers, setIsSendingToSuppliers] = useState(false);
  const [startTime] = useState(new Date());
  const [currentDuration, setCurrentDuration] = useState(0);
  const [showSupplierTracking, setShowSupplierTracking] = useState(false);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false); // New state
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

  // Get manufacturer config for this part's manufacturer
  const { data: manufacturerConfigs = [] } = useQuery({
    queryKey: ['partManufacturerConfigs'],
    queryFn: () => base44.entities.PartManufacturerConfig.list(),
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

  // Find the config for this part's manufacturer
  const relevantConfig = manufacturerConfigs.find(
    config => config.name?.toLowerCase() === part.manufacturer?.toLowerCase()
  );

  // Get the actual supplier objects for the linked suppliers
  const linkedSuppliers = relevantConfig?.associated_supplier_names
    ? allSuppliers.filter(supplier =>
        relevantConfig.associated_supplier_names.includes(supplier.name)
      )
    : [];

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

  const handleSendToLinkedSuppliers = async () => {
    if (linkedSuppliers.length === 0) {
      alert('No linked suppliers found for this manufacturer. Please configure supplier links in the Parts Manufacturer Links page.');
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

  const getFileName = (url) => (url ? new URL(url).pathname.split('/').pop() : "File");

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
      <ItemActivityLog
        isOpen={isActivityLogOpen}
        onClose={() => setIsActivityLogOpen(false)}
        entityType="Part"
        entityId={part.id}
        entityReference={part.vehicle_ref || part.job_number}
      />

      <div className="h-full flex flex-col gap-4">
        {/* Header */}
        <div className="neomorph p-4 md:p-6 flex-shrink-0">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
              <Button onClick={handleClose} className="neomorph-flat p-2 md:p-3 flex-shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-2xl font-bold truncate">{part.vehicle_ref || 'Part Request'}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge
                    status={part.sourcing_status || 'New Request'}
                    onStatusChange={canEdit ? handleStatusChange : undefined}
                    availableStatuses={availableStatuses}
                    customStatuses={customStatuses}
                  />
                  {part.archived && (
                    <span className="neomorph-flat px-3 py-1 text-xs font-medium text-gray-600">
                      Archived
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Timer onTimeUpdate={setCurrentDuration} />
            <Button
              onClick={() => setIsAttachmentsOpen(true)}
              className="neomorph-flat p-2 md:p-3"
              title="View Attachments"
            >
              <FileText className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setIsNotesOpen(true)}
              className="neomorph-flat p-2 md:p-3"
              title="Updates & Notes"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setIsEmailModalOpen(true)}
              className="neomorph-flat p-2 md:p-3"
              title="Send Email"
            >
              <Mail className="w-4 h-4" />
            </Button>
            {isInternalUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="neomorph-flat p-2 md:p-3">
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsActivityLogOpen(true); }}>
                    <Clock className="w-4 h-4 mr-2" />
                    Activity History
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onArchive({ id: part.id, archived: !part.archived }); }}>
                    <Archive className="w-4 h-4 mr-2" />
                    {part.archived ? 'Unarchive' : 'Archive'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onDelete(part.id); }} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {canEdit && linkedSuppliers.length > 0 && (
          <div className="neomorph p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gold" />
                  Linked Suppliers for {part.manufacturer}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {linkedSuppliers.length} supplier(s) configured to receive quotes for this manufacturer
                </p>
              </div>
              <Button
                onClick={handleSendToLinkedSuppliers}
                className="neomorph-flat px-6 py-3 flex items-center gap-2 text-gold font-medium"
              >
                <Send className="w-4 h-4" />
                Email All Suppliers
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {linkedSuppliers.map(supplier => (
                <div key={supplier.id} className="neomorph-flat p-4">
                  <p className="font-medium text-gray-700">{supplier.name}</p>
                  <p className="text-sm text-gray-500">{supplier.contact_name}</p>
                  <p className="text-sm text-gray-600">{supplier.email}</p>
                  <p className="text-sm text-gray-600">{supplier.phone}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {linkedClaim && (
            <div className="neomorph p-4">
              <div className="flex items-center gap-2 mb-3">
                <LinkIcon className="w-4 h-4 text-gold" />
                <h3 className="font-medium">Linked Claim</h3>
              </div>
              <div className="flex gap-3 flex-wrap">
                 <Link to={createPageUrl(`Claims?view=${linkedClaim.id}`)}>
                      <div className="neomorph-flat px-4 py-2 text-sm card-hover">
                          <span className="text-gray-500">Claim:</span>{' '}
                          <span className="font-medium text-blue-600">{linkedClaim.reg}</span>
                      </div>
                  </Link>
              </div>
            </div>
          )}

        <SupplierTrackingSection
          part={part}
          onUpdate={onUpdate}
          isOpen={showSupplierTracking}
          onToggle={() => setShowSupplierTracking(!showSupplierTracking)}
          canEdit={canEdit}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <EditableSection
              title="Part & Vehicle"
              icon={Package}
              claim={part}
              onUpdate={onUpdate}
              EditComponent={PartBasicInfoForm}
              defaultOpen
              canEdit={canEdit}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <DetailRow label="Vehicle Ref" value={part.vehicle_ref} />
                <DetailRow label="Manufacturer" value={part.manufacturer} />
                <DetailRow label="Part Number" value={part.part_number} />
              </div>
              <div className="mt-2 py-3 px-4 rounded-lg glass-inset">
                <div className="text-xs font-semibold text-foreground-muted mb-2">Part Description</div>
                <div className="text-sm leading-relaxed">{part.part_description || '-'}</div>
              </div>
            </EditableSection>

            <EditableSection
              title="Contact & Delivery"
              icon={Package}
              claim={part}
              onUpdate={onUpdate}
              EditComponent={PartCustomerForm}
              defaultOpen
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
          </div>
          <div className="space-y-6">
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

            <TimeLogSection parentId={part.id} parentType="Part" />
          </div>
        </div>
      </div>
    </DragDropOverlay>
  );
}
