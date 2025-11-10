
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, User, Car, FileText, DollarSign, Calendar, ChevronDown, ChevronUp, Mail, Archive, Trash2, Clock } from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "../shared/StatusBadge";
import EngineeringForm from "./EngineeringForm";
import { useQueryClient, useMutation } from '@tanstack/react-query';
import FileAttachmentModal from '../shared/FileAttachmentModal';
import DragDropOverlay from '../shared/DragDropOverlay';
import TimeLogSection from '../shared/TimeLogSection';
import EmailComposerModal from '../shared/EmailComposerModal';
import NotesModal from '../shared/NotesModal';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { base44 } from '@/api/base44Client';

import EngineeringJobForm from './EngineeringJobForm';
import EngineeringClientForm from './EngineeringClientForm';
import EngineeringReportForm from './EngineeringReportForm';

const EditableSection = ({ title, icon: Icon, claim, onUpdate, children, EditComponent, canEdit = true }) => {
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = (updatedData) => {
        onUpdate({ ...claim, ...updatedData });
        setIsEditing(false);
    };

    return (
        <div className="neomorph-flat p-4 md:p-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <h3 className="font-bold">{title}</h3>
                </div>
                {!isEditing && EditComponent && canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8 hover:text-gold">
                        <Edit className="w-4 h-4" />
                    </Button>
                )}
            </div>
            <div>
                {isEditing ? (
                    <EditComponent job={claim} onSave={handleSave} onCancel={() => setIsEditing(false)} />
                ) : (
                    children
                )}
            </div>
        </div>
    );
};

function DetailRow({ label, value, isDate = false }) {
    let displayValue = value || '-';
    if (isDate && value) displayValue = format(new Date(value), 'dd/MM/yyyy');
    
    return (
        <div className="py-3 px-4 rounded-lg hover:bg-surface-hover transition-colors">
            <div className="text-xs font-semibold text-foreground-muted mb-1">{label}</div>
            <div className="text-sm font-medium">{displayValue}</div>
        </div>
    );
}

const DETAIL_SECTIONS = [
  { id: 'job', label: 'Vehicle & Job', icon: Car },
  { id: 'client', label: 'Client Details', icon: User },
  { id: 'report', label: 'Report & Dates', icon: FileText },
  { id: 'timelogs', label: 'Time Logs', icon: Clock },
];

export default function EngineeringDetail({ job, onClose, onUpdate, isInternalUser = true }) {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [startTime] = useState(new Date());
  const [currentDuration, setCurrentDuration] = useState(0);
  const [selectedSection, setSelectedSection] = useState('job');
  const durationRef = useRef(0);
  const hasSavedRef = useRef(false);
  const queryClient = useQueryClient();

  const canEdit = isInternalUser;

  useEffect(() => {
    durationRef.current = currentDuration;
  }, [currentDuration]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const archiveMutation = useMutation({
    mutationFn: () => base44.entities.Engineering.update(job.id, { archived: !job.archived }),
    onSuccess: (updatedJob) => {
      queryClient.invalidateQueries({ queryKey: ['engineering'] });
      onUpdate(updatedJob); 
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Engineering.delete(job.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineering'] });
      onClose();
    },
  });

  useEffect(() => {
    return () => {
      const duration = durationRef.current;
      if (duration > 0 && !hasSavedRef.current) {
        hasSavedRef.current = true;
        base44.entities.TimeLog.create({
          parent_id: job.id,
          parent_type: 'Engineering',
          duration_seconds: duration,
          started_at: startTime.toISOString(),
          ended_at: new Date().toISOString()
        }).catch(error => {
          console.error('Failed to save time log on unmount:', error);
        });
      }
    };
  }, []);

  const handleClose = async () => {
    const duration = durationRef.current;
    if (duration > 0 && !hasSavedRef.current) {
      hasSavedRef.current = true;
      try {
        await base44.entities.TimeLog.create({
          parent_id: job.id,
          parent_type: 'Engineering',
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
    const currentUrls = Array.isArray(job.file_urls) ? job.file_urls : [];
    const updatedUrls = [...currentUrls, ...newFileUrls];
    onUpdate({ ...job, file_urls: updatedUrls });
  };

  const handleFileRemove = (urlToRemove) => {
    const currentUrls = Array.isArray(job.file_urls) ? job.file_urls : [];
    const updatedUrls = currentUrls.filter(url => url !== urlToRemove);
    onUpdate({ ...job, file_urls: updatedUrls });
  };

  const handleArchive = () => {
    const action = job.archived ? 'restore' : 'archive';
    if (window.confirm(`Are you sure you want to ${action} this engineering job?`)) {
      archiveMutation.mutate();
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to permanently delete this engineering job? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const handleAIExtract = (extractedData) => {
    console.log('AI extracted data from attachment:', extractedData);
    
    const fields = Object.entries(extractedData)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    if (window.confirm(`AI found the following data:\n\n${fields}\n\nDo you want to update the engineering job with this data?`)) {
      onUpdate({ ...job, ...extractedData });
    }
  };

  const renderSelectedSection = () => {
    switch (selectedSection) {
      case 'job':
        return (
          <EditableSection 
            title="Vehicle & Job" 
            icon={Car} 
            claim={job} 
            onUpdate={onUpdate} 
            EditComponent={EngineeringJobForm} 
            canEdit={canEdit}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Reference" value={job.reference} />
              <DetailRow label="Vehicle Reg" value={job.vehicle_reg} />
              <DetailRow label="Make/Model" value={job.make_model} />
              <DetailRow label="Inspection Type" value={job.inspection_type} />
            </div>
            <div className="mt-2 py-3 px-4 rounded-lg glass-inset">
              <div className="text-xs font-semibold text-foreground-muted mb-2">Vehicle Location</div>
              <div className="text-sm">{job.vehicle_location || '-'}</div>
            </div>
          </EditableSection>
        );
      
      case 'client':
        return (
          <EditableSection 
            title="Client Details" 
            icon={User} 
            claim={job} 
            onUpdate={onUpdate} 
            EditComponent={EngineeringClientForm} 
            canEdit={canEdit}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Client" value={job.client_name} />
              <DetailRow label="Phone" value={job.client_phone} />
              <DetailRow label="Email" value={job.client_email} />
              <DetailRow label="Insurer" value={job.insurer} />
              <DetailRow label="Claim Ref" value={job.claim_ref} />
            </div>
          </EditableSection>
        );
      
      case 'report':
        return (
          <EditableSection 
            title="Report & Dates" 
            icon={FileText} 
            claim={job} 
            onUpdate={onUpdate} 
            EditComponent={EngineeringReportForm} 
            canEdit={canEdit}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Date Requested" value={job.date_requested} isDate />
              <DetailRow label="Inspection Date" value={job.inspection_date} isDate />
              <DetailRow label="Fee" value={`£${job.fee || 0}`} />
            </div>
            <div className="mt-4 space-y-4">
              <div className="py-3 px-4 rounded-lg glass-inset">
                <div className="text-xs font-semibold text-foreground-muted mb-2">Findings</div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{job.findings || 'N/A'}</div>
              </div>
              <div className="py-3 px-4 rounded-lg glass-inset">
                <div className="text-xs font-semibold text-foreground-muted mb-2">Recommendations</div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{job.recommendations || 'N/A'}</div>
              </div>
            </div>
          </EditableSection>
        );
      
      case 'timelogs':
        return <TimeLogSection parentId={job.id} parentType="Engineering" />;
      
      default:
        return null;
    }
  };

  return (
    <DragDropOverlay onFilesUploaded={handleFilesUploaded}>
      <EmailComposerModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        itemType="Engineering"
        itemData={job}
      />
      <FileAttachmentModal 
        fileUrls={job.file_urls || []} 
        onRemove={handleFileRemove}
        isOpen={isAttachmentsOpen}
        onClose={() => setIsAttachmentsOpen(false)}
        enableAI={true}
        analysisType="engineering"
        onAIExtract={handleAIExtract}
      />
      <NotesModal 
        parentId={job.id} 
        parentType="Engineering"
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
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
                <h1 className="text-base md:text-2xl font-bold truncate">{job.reference || 'Job'}</h1>
              </div>
            </div>

            {/* Status Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={job.status} />
              {job.archived && (
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
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleArchive(); }} disabled={archiveMutation.isLoading}>
                      <Archive className="w-4 h-4 mr-2" />
                      {job.archived ? 'Unarchive' : 'Archive'}
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

        <div className="neomorph p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full neomorph-flat p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {React.createElement(DETAIL_SECTIONS.find(s => s.id === selectedSection)?.icon || Car, { className: "w-5 h-5" })}
                  <span className="font-medium">{DETAIL_SECTIONS.find(s => s.id === selectedSection)?.label || 'Select Section'}</span>
                </div>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full" align="start">
              {DETAIL_SECTIONS.map(section => (
                <DropdownMenuItem
                  key={section.id}
                  onSelect={(e) => { e.preventDefault(); setSelectedSection(section.id); }}
                  className={selectedSection === section.id ? 'bg-glass-hover' : ''}
                >
                  <section.icon className="w-4 h-4 mr-2" />
                  {section.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div>
          {renderSelectedSection()}
        </div>
      </div>
    </DragDropOverlay>
  );
}
