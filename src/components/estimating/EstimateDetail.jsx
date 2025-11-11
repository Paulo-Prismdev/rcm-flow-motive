
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, FileText, DollarSign, Calendar, ChevronDown, ChevronUp, Wrench, Mail, Archive, Trash2, Clock, Package } from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "../shared/StatusBadge";
import { base44 } from '@/api/base44Client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import DragDropOverlay from '../shared/DragDropOverlay';
import TimeLogSection from '../shared/TimeLogSection';
import EmailComposerModal from '../shared/EmailComposerModal';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";


// New imports for editable sections
import EstimateJobForm from './EstimateJobForm';
import EstimateFinancialsForm from './EstimateFinancialsForm';
import EstimateDatesForm from './EstimateDatesForm';

// Changed import: NotesButton is replaced with NotesModal
import NotesModal from '../shared/NotesModal';
// New import for FileAttachmentModal
import FileAttachmentModal from '../shared/FileAttachmentModal';
// New import for PartsModal
import PartsModal from '../shared/PartsModal'; // Assuming PartsModal exists as it's being opened


// New EditableSection component
const EditableSection = ({ title, icon: Icon, estimate, onUpdate, children, EditComponent, canEdit = true }) => {
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = (updatedData) => {
        onUpdate({ ...estimate, ...updatedData });
        setIsEditing(false);
    };

    return (
        <div className="neomorph-flat p-4 md:p-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <h3 className="font-bold text-gray-700">{title}</h3>
                </div>
                {!isEditing && EditComponent && canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8 hover:text-gold">
                        <Edit className="w-4 h-4" />
                    </Button>
                )}
            </div>
            <div>
                {isEditing ? (
                    <EditComponent estimate={estimate} onSave={handleSave} onCancel={() => setIsEditing(false)} />
                ) : (
                    children
                )}
            </div>
        </div>
    );
};


const Section = ({ title, icon: Icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="neomorph-flat p-4 md:p-6">
            <button className="w-full flex justify-between items-center text-left" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <h3 className="font-bold text-gray-700">{title}</h3>
                </div>
                {isOpen ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
            </button>
            {isOpen && <div className="mt-4 pt-4 border-t border-gray-300 border-opacity-50">{children}</div>}
        </div>
    );
};

function DetailRow({ label, value, isCurrency = false, isDate = false }) {
    let displayValue = value;
    if (isCurrency && typeof value === 'number') displayValue = `£${value.toFixed(2)}`;
    else if (isDate && value) displayValue = format(new Date(value), 'dd/MM/yyyy');
    if (value === null || typeof value === 'undefined' || value === '') displayValue = '-';
    
    return (
        <div className="py-3 px-4 rounded-lg hover:bg-surface-hover transition-colors">
            <div className="text-xs font-semibold text-foreground-muted mb-1">{label}</div>
            <div className="text-sm font-medium">{displayValue}</div>
        </div>
    );
}

const DETAIL_SECTIONS = [
    { id: 'job', label: 'Job Details', icon: Wrench },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'dates', label: 'Key Dates', icon: Calendar },
    { id: 'timelogs', label: 'Time Logs', icon: Clock },
];

export default function EstimateDetail({ estimate, onClose, onUpdate, isInternalUser = true }) {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isPartsModalOpen, setIsPartsModalOpen] = useState(false); // Added state for PartsModal
  const [startTime] = useState(new Date());
  const [currentDuration, setCurrentDuration] = useState(0);
  const [selectedSection, setSelectedSection] = useState('job');
  const durationRef = React.useRef(0);
  const hasSavedRef = React.useRef(false);
  const queryClient = useQueryClient();

  const canEdit = isInternalUser;

  // Effect to keep durationRef updated with currentDuration state
  React.useEffect(() => {
    durationRef.current = currentDuration;
  }, [currentDuration]);

  // Background timer - still tracks time but doesn't display
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const archiveMutation = useMutation({
    mutationFn: () => base44.entities.Estimate.update(estimate.id, { archived: !estimate.archived }),
    onSuccess: (updatedEstimate) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      onUpdate({ ...estimate, archived: updatedEstimate.archived });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Estimate.delete(estimate.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      onClose();
    },
  });

  // Modified: useEffect cleanup to save time log on unmount
  React.useEffect(() => {
    return () => {
      const duration = durationRef.current;
      if (duration > 0 && !hasSavedRef.current) {
        hasSavedRef.current = true; // Mark as saved to prevent double saving
        base44.entities.TimeLog.create({
          parent_id: estimate.id,
          parent_type: 'Estimate',
          duration_seconds: duration,
          started_at: startTime.toISOString(),
          ended_at: new Date().toISOString()
        }).catch(error => {
          console.error('Failed to save time log on unmount:', error);
        });
      }
    };
  }, []); // Empty dependency array to run cleanup once on unmount

  // Modified: handleClose to save time log before closing
  const handleClose = async () => {
    const duration = durationRef.current;
    if (duration > 0 && !hasSavedRef.current) {
      hasSavedRef.current = true; // Mark as saved to prevent double saving
      try {
        await base44.entities.TimeLog.create({
          parent_id: estimate.id,
          parent_type: 'Estimate',
          duration_seconds: duration,
          started_at: startTime.toISOString(),
          ended_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to save time log before closing:', error);
      }
    }
    onClose();
  };

  const handleArchive = () => {
    const action = estimate.archived ? 'restore' : 'archive';
    if (window.confirm(`Are you sure you want to ${action} this estimate?`)) {
      archiveMutation.mutate();
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to permanently delete this estimate? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const handleFilesUploaded = (newFileUrls) => {
    const currentUrls = Array.isArray(estimate.file_urls) ? estimate.file_urls : [];
    const updatedUrls = [...currentUrls, ...newFileUrls];
    onUpdate({ ...estimate, file_urls: updatedUrls });
  };

  const handleFileRemove = (urlToRemove) => {
    const currentUrls = Array.isArray(estimate.file_urls) ? estimate.file_urls : [];
    const updatedUrls = currentUrls.filter(url => url !== urlToRemove);
    onUpdate({ ...estimate, file_urls: updatedUrls });
  };

  const handleAIExtract = (extractedData) => {
    console.log('AI extracted data from attachment:', extractedData);
    
    const fields = Object.entries(extractedData)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    if (window.confirm(`AI found the following data:\n\n${fields}\n\nDo you want to update the estimate with this data?`)) {
      onUpdate({ ...estimate, ...extractedData });
    }
  };

  const renderSelectedSection = () => {
    switch (selectedSection) {
      case 'job':
        return (
          <EditableSection
            title="Job Details"
            icon={Wrench}
            estimate={estimate}
            onUpdate={onUpdate}
            EditComponent={EstimateJobForm}
            canEdit={canEdit}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Make/Model" value={estimate.make_model} />
              <DetailRow label="VDA" value={estimate.vda} />
              <DetailRow label="Insurer/Work Provider" value={estimate.insurer_work_provider} />
              <DetailRow label="Claim Number" value={estimate.claim_number} />
              <DetailRow label="Authorising Party" value={estimate.authorising_party} />
            </div>
          </EditableSection>
        );

      case 'financials':
        return (
          <EditableSection
            title="Financials"
            icon={DollarSign}
            estimate={estimate}
            onUpdate={onUpdate}
            EditComponent={EstimateFinancialsForm}
            canEdit={canEdit}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Estimate Value" value={estimate.estimate_value} isCurrency />
              <DetailRow label="Authorised Value" value={estimate.authorised_value} isCurrency />
              <DetailRow label="Fee" value={estimate.fee} isCurrency />
              <DetailRow label="Labour Rate Agreed" value={estimate.labour_rate_agreed} isCurrency />
              <DetailRow label="Parts Cost" value={estimate.parts_cost} isCurrency />
              <DetailRow label="Final Auth (inc VAT)" value={estimate.final_authorised_inc_vat} isCurrency />
              <DetailRow label="Final Auth (ex VAT)" value={estimate.final_authorised_exc_vat} isCurrency />
              <DetailRow label="Invoice Status" value={estimate.invoice_status} />
              <DetailRow label="Invoice Amount" value={estimate.invoice_amount} isCurrency />
            </div>
          </EditableSection>
        );

      case 'dates':
        return (
          <EditableSection
            title="Key Dates"
            icon={Calendar}
            estimate={estimate}
            onUpdate={onUpdate}
            EditComponent={EstimateDatesForm}
            canEdit={canEdit}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Date Received" value={estimate.date_received} isDate />
              <DetailRow label="Estimate Completed" value={estimate.date_estimate_completed} isDate />
              <DetailRow label="Date Authorised" value={estimate.date_authorised} isDate />
            </div>
          </EditableSection>
        );

      case 'timelogs':
        return <TimeLogSection parentId={estimate.id} parentType="Estimate" />;

      default:
        return null;
    }
  };

  return (
    <DragDropOverlay onFilesUploaded={handleFilesUploaded}>
      <EmailComposerModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        itemType="Estimate"
        itemData={estimate}
      />
      <FileAttachmentModal
        fileUrls={estimate.file_urls || []}
        onRemove={handleFileRemove}
        isOpen={isAttachmentsOpen}
        onClose={() => setIsAttachmentsOpen(false)}
        enableAI={true}
        analysisType="estimate"
        onAIExtract={handleAIExtract}
      />
      <NotesModal
        parentId={estimate.id}
        parentType="Estimate"
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
      />
      <PartsModal
        isOpen={isPartsModalOpen}
        onClose={() => setIsPartsModalOpen(false)}
        estimate={estimate}
      />
      <div className="space-y-6">
          <div className="neomorph p-3 md:p-6 sticky top-0 z-10 bg-background">
              <div className="flex flex-col gap-3">
                  {/* Top Row: Back button + Title */}
                  <div className="flex items-center gap-2 md:gap-4">
                      <Button onClick={handleClose} className="neomorph-flat p-2 flex-shrink-0">
                          <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <div className="flex-1 min-w-0">
                          <h1 className="text-base md:text-2xl font-bold truncate">{estimate.name || 'Estimate'}</h1>
                      </div>
                  </div>

                  {/* Status Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={estimate.status || 'New'} />
                    {estimate.archived && (
                      <span className="neomorph-flat px-2 md:px-3 py-0.5 md:py-1 text-xs font-medium text-gray-600">
                        Archived
                      </span>
                    )}
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                      <Button
                        onClick={() => setIsAttachmentsOpen(true)}
                        className="neomorph-flat p-1.5 md:p-3"
                        title="View Attachments"
                      >
                        <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                      <Button
                        onClick={() => setIsNotesOpen(true)}
                        className="neomorph-flat p-1.5 md:p-3"
                        title="Updates & Notes"
                      >
                        <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                      <Button
                        onClick={() => setIsEmailModalOpen(true)}
                        className="neomorph-flat p-1.5 md:p-3"
                        title="Send Email"
                      >
                        <Mail className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button className="neomorph-flat p-1.5 md:p-3">
                              <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsPartsModalOpen(true); }}>
                                <Package className="w-4 h-4 mr-2" />
                                Log Parts Issue
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleArchive(); }} disabled={archiveMutation.isLoading}>
                              <Archive className="w-4 h-4 mr-2" />
                              {estimate.archived ? 'Unarchive' : 'Archive'}
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
          </div>

        {/* Section Selector */}
        <div className="neomorph p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full neomorph-flat p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {React.createElement(DETAIL_SECTIONS.find(s => s.id === selectedSection)?.icon || Wrench, { className: "w-5 h-5 text-gray-600" })}
                  <span className="font-medium text-gray-700">{DETAIL_SECTIONS.find(s => s.id === selectedSection)?.label || 'Select Section'}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full" align="start">
              {DETAIL_SECTIONS.map(section => (
                <DropdownMenuItem
                  key={section.id}
                  onSelect={() => setSelectedSection(section.id)}
                  className={selectedSection === section.id ? 'bg-glass-hover' : ''}
                >
                  <section.icon className="w-4 h-4 mr-2 text-gray-600" />
                  {section.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Selected Section Content */}
        <div>
          {renderSelectedSection()}
        </div>
      </div>
    </DragDropOverlay>
  );
}

