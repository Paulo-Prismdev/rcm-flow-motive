import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  User,
  Car,
  Shield,
  Calendar,
  Wrench,
  Clock,
  AlertTriangle,
  ChevronDown,
  FileText,
  Image,
  MessageSquare,
  Download,
  ExternalLink,
  Send,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "../shared/StatusBadge";
import { formatUKRegistration } from '../shared/formatRegistration';
import ClaimJourneyTimeline from '../claims/ClaimJourneyTimeline';
import ClaimUpdatesModal from '../shared/ClaimUpdatesModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Fields considered required per section
const SECTION_REQUIRED_FIELDS = {
  status:        ['claim_type', 'loss_date', 'circumstances'],
  client:        ['client_name', 'client_phone', 'client_email', 'client_address_line_1', 'client_postcode'],
  vehicle:       ['make_model', 'vehicle_colour', 'vehicle_type'],
  vehicleDamage: ['vehicle_damage'],
  insurance:     ['insurer', 'claim_ref', 'policy_number'],
  dates:         ['date_received'],
  bodyshop:      ['bodyshop'],
};

function isEmpty(val) {
  return val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0);
}

function DetailRow({ label, value, isCurrency = false, isDate = false, isStatus = false, missing = false }) {
  let displayValue = value;
  if (isCurrency && typeof value === 'number') {
    displayValue = `£${value.toFixed(2)}`;
  } else if (isDate && value) {
    try { displayValue = format(new Date(value), 'dd/MM/yyyy'); } catch (e) { displayValue = 'Invalid Date'; }
  }
  if (isEmpty(value)) displayValue = '-';

  return (
    <div className={`py-3 px-4 rounded-lg transition-colors ${missing ? 'bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/50' : 'hover:bg-surface-hover'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-semibold text-foreground-muted">{label}</span>
        {missing && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
      </div>
      <div className="text-sm font-medium">
        {isStatus ? <StatusBadge status={displayValue} /> : <span className={missing ? 'text-amber-600 dark:text-amber-400 italic text-xs' : ''}>{missing ? 'Not filled in' : displayValue}</span>}
      </div>
    </div>
  );
}

const DETAIL_SECTIONS = [
  { id: 'status',        label: 'Status & Overview',  icon: Clock },
  { id: 'client',        label: 'Client Details',      icon: User },
  { id: 'vehicle',       label: 'Vehicle Details',     icon: Car },
  { id: 'vehicleDamage', label: 'Vehicle Damage',      icon: AlertTriangle },
  { id: 'insurance',     label: 'Insurance Details',   icon: Shield },
  { id: 'dates',         label: 'Key Dates',           icon: Calendar },
  { id: 'bodyshop',      label: 'Bodyshop Details',    icon: Wrench },
  { id: 'documents',     label: 'Documents',           icon: FileText },
  { id: 'images',        label: 'Images',              icon: Image },
];

function getFileName(url) {
  try {
    const parts = decodeURIComponent(url).split('/');
    return parts[parts.length - 1].split('?')[0];
  } catch {
    return 'File';
  }
}

function isImageUrl(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(url);
}

export default function ReferrerClaimDetail({ claim, onClose }) {
  const [selectedSection, setSelectedSection] = useState('status');
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isClaimUpdatesOpen, setIsClaimUpdatesOpen] = useState(false);
  const queryClient = useQueryClient();

  // Always fetch updates so documents/images from updates are always included
  const { data: claimUpdates = [] } = useQuery({
    queryKey: ['claimUpdates', claim.id],
    queryFn: () => base44.entities.ClaimUpdate.filter({ claim_id: claim.id }, '-created_date'),
  });

  const replyMutation = useMutation({
    mutationFn: (description) => base44.entities.ClaimUpdate.create({
      claim_id: claim.id,
      update_type: 'Referrer Response',
      description,
    }),
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['claimUpdates', claim.id] });
    },
  });

  const handleReply = () => {
    const text = replyText.trim();
    if (!text) return;
    replyMutation.mutate(text);
  };

  const handleClaimUpdateCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['claimUpdates', claim.id] });
    queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
  };

  const incompleteSections = useMemo(() => {
    return Object.entries(SECTION_REQUIRED_FIELDS).reduce((acc, [sectionId, fields]) => {
      if (fields.some(f => isEmpty(claim[f]))) acc.add(sectionId);
      return acc;
    }, new Set());
  }, [claim]);

  const m = (field) => isEmpty(claim[field]);

  const allFileUrls = claim.file_urls || [];
  const allImageUrls = claim.image_urls || [];

  const updateFiles = claimUpdates.flatMap(u => u.file_urls || []).filter(u => !isImageUrl(u));
  const updateImages = claimUpdates.flatMap(u => u.file_urls || []).filter(u => isImageUrl(u));

  const documents = [...allFileUrls.filter(u => !isImageUrl(u)), ...updateFiles];
  const images = [...allImageUrls, ...allFileUrls.filter(u => isImageUrl(u)), ...updateImages];

  const renderSelectedSection = () => {
    switch (selectedSection) {
      case 'status':
        return (
          <div className="neomorph-flat p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4"><Clock className="w-5 h-5 text-gold" /><h3 className="font-bold">Status & Overview</h3></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Job Status" value={claim.job_status} isStatus />
              {claim.secondary_status && <DetailRow label="Secondary Status" value={claim.secondary_status} isStatus />}
              <DetailRow label="Claim Type" value={claim.claim_type} missing={m('claim_type')} />
              <DetailRow label="Date of Loss" value={claim.loss_date} isDate missing={m('loss_date')} />
              <DetailRow label="Time of Loss" value={claim.loss_time} />
              <DetailRow label="Use of Vehicle" value={claim.vehicle_use} />
              <DetailRow label="Courtesy Car Required" value={claim.courtesy_car_required ? 'Yes' : 'No'} />
            </div>
            <div className={`mt-2 py-3 px-4 rounded-lg ${m('circumstances') ? 'bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/50' : 'glass-inset'}`}>
              <div className="text-xs font-semibold text-foreground-muted mb-2">Incident Location</div>
              <div className="text-sm font-medium mb-3">{claim.incident_location || '-'}</div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-semibold text-foreground-muted">Circumstances</span>
                {m('circumstances') && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </div>
              <div className={`text-sm leading-relaxed whitespace-pre-wrap ${m('circumstances') ? 'text-amber-600 dark:text-amber-400 italic' : ''}`}>{claim.circumstances || 'Not filled in'}</div>
            </div>
          </div>
        );

      case 'client':
        return (
          <div className="neomorph-flat p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4"><User className="w-5 h-5 text-gold" /><h3 className="font-bold">Client Details</h3></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Client Name" value={claim.client_name} missing={m('client_name')} />
              <DetailRow label="Client Phone" value={claim.client_phone} missing={m('client_phone')} />
              <DetailRow label="Client Email" value={claim.client_email} missing={m('client_email')} />
              <DetailRow label="Driver/Contact" value={claim.driver_contact_name} />
              <DetailRow label="VAT Status" value={claim.client_vat_status} />
              <DetailRow label="Business Division" value={claim.business_division} />
            </div>
            <div className={`mt-2 py-3 px-4 rounded-lg ${(m('client_address_line_1') || m('client_postcode')) ? 'bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/50' : 'glass-inset'}`}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-semibold text-foreground-muted">Address</span>
                {(m('client_address_line_1') || m('client_postcode')) && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </div>
              <div className="text-sm leading-relaxed space-y-0.5">
                {claim.client_address_line_1 && <div>{claim.client_address_line_1}</div>}
                {claim.client_address_line_2 && <div>{claim.client_address_line_2}</div>}
                {claim.client_town && <div>{claim.client_town}</div>}
                {claim.client_county && <div>{claim.client_county}</div>}
                {claim.client_postcode && <div>{claim.client_postcode}</div>}
                {!claim.client_address_line_1 && !claim.client_town && !claim.client_postcode && <span className="text-amber-600 dark:text-amber-400 italic">Not filled in</span>}
              </div>
            </div>
          </div>
        );

      case 'vehicle':
        return (
          <div className="neomorph-flat p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4"><Car className="w-5 h-5 text-gold" /><h3 className="font-bold">Vehicle Details</h3></div>
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-600 mb-3">Basic Information</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <DetailRow label="Make/Model" value={claim.make_model} missing={m('make_model')} />
                <DetailRow label="Colour" value={claim.vehicle_colour} missing={m('vehicle_colour')} />
                <DetailRow label="Fuel Type" value={claim.vehicle_fuel_type} />
                <DetailRow label="Year of Manufacture" value={claim.vehicle_year_of_manufacture} />
                <DetailRow label="Vehicle Type" value={claim.vehicle_type} missing={m('vehicle_type')} />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-600 mb-3">MOT & Tax Status</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <DetailRow label="MOT Status" value={claim.vehicle_mot_status} />
                <DetailRow label="MOT Expiry Date" value={claim.vehicle_mot_expiry_date} isDate />
                <DetailRow label="Tax Status" value={claim.vehicle_tax_status} />
                <DetailRow label="Tax Due Date" value={claim.vehicle_tax_due_date} isDate />
              </div>
            </div>
          </div>
        );

      case 'vehicleDamage':
        return (
          <div className="neomorph-flat p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4"><AlertTriangle className="w-5 h-5 text-gold" /><h3 className="font-bold">Vehicle Damage</h3></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Courtesy Car Needed" value={claim.courtesy_car_required ? 'Yes' : 'No'} />
              <DetailRow label="Undriveable / Drivable" value={claim.unroadworthy ? 'Undriveable' : 'Drivable'} />
            </div>
            <div className={`mt-2 py-3 px-4 rounded-lg ${m('vehicle_damage') ? 'bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/50' : 'glass-inset'}`}>
              <div className="text-xs font-semibold text-foreground-muted mb-2">Vehicle Location</div>
              <div className="text-sm mb-3">{claim.vehicle_location || '-'}</div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-semibold text-foreground-muted">Damage Description</span>
                {m('vehicle_damage') && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </div>
              <div className={`text-sm leading-relaxed whitespace-pre-wrap ${m('vehicle_damage') ? 'text-amber-600 dark:text-amber-400 italic' : ''}`}>{claim.vehicle_damage || 'Not filled in'}</div>
            </div>
          </div>
        );

      case 'insurance':
        return (
          <div className="neomorph-flat p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4"><Shield className="w-5 h-5 text-gold" /><h3 className="font-bold">Insurance Details</h3></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Insurer" value={claim.insurer} missing={m('insurer')} />
              <DetailRow label="Claim Ref" value={claim.claim_ref} missing={m('claim_ref')} />
              <DetailRow label="Policy Number" value={claim.policy_number} missing={m('policy_number')} />
              <DetailRow label="Policy Excess" value={claim.policy_excess} isCurrency />
            </div>
          </div>
        );

      case 'dates':
        return (
          <div className="neomorph-flat p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4"><Calendar className="w-5 h-5 text-gold" /><h3 className="font-bold">Key Dates</h3></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Date Received" value={claim.date_received} isDate missing={m('date_received')} />
              <DetailRow label="Loss Date" value={claim.loss_date} isDate />
              <DetailRow label="Estimate Completed" value={claim.estimate_completed} isDate />
              <DetailRow label="Authority Received" value={claim.authority_received} isDate />
              <DetailRow label="Bodyshop Instructed" value={claim.bs_instructed} isDate />
              <DetailRow label="Booking In Date" value={claim.booking_in_date} isDate />
              <DetailRow label="On-Site Date" value={claim.on_site_date} isDate />
              <DetailRow label="Est. Completion (ECD)" value={claim.ecd} isDate />
              <DetailRow label="Completion Date" value={claim.completion_date} isDate />
            </div>
          </div>
        );

      case 'bodyshop':
        return (
          <div className="neomorph-flat p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4"><Wrench className="w-5 h-5 text-gold" /><h3 className="font-bold">Bodyshop Details</h3></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Bodyshop" value={claim.bodyshop} missing={m('bodyshop')} />
              <DetailRow label="Bodyshop Email" value={claim.bodyshop_email} />
              <DetailRow label="Authorising Party" value={claim.authorising_party} />
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="neomorph-flat p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4"><FileText className="w-5 h-5 text-gold" /><h3 className="font-bold">Documents</h3></div>
            {documents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No documents attached.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((url, i) => (
                  <div key={i} className="neomorph-flat p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-foreground-muted flex-shrink-0" />
                      <span className="text-sm truncate">{getFileName(url)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                      <a href={url} download>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'images':
        return (
          <div className="neomorph-flat p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4"><Image className="w-5 h-5 text-gold" /><h3 className="font-bold">Images</h3></div>
            {images.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No images attached.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((url, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity neomorph-flat"
                    onClick={() => setLightboxUrl(url)}
                  >
                    <img src={url} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 md:gap-6">
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white text-2xl font-bold bg-black/40 rounded-full w-10 h-10 flex items-center justify-center"
            onClick={() => setLightboxUrl(null)}
          >×</button>
        </div>
      )}

      <ClaimUpdatesModal
        claimId={claim.id}
        currentStatus={claim.job_status}
        isOpen={isClaimUpdatesOpen}
        onClose={() => setIsClaimUpdatesOpen(false)}
        onUpdateCreated={handleClaimUpdateCreated}
      />

      {/* Combined Header + Section Selector */}
      <div className="neomorph p-3 flex-shrink-0 sticky top-0 z-10 bg-background">
        <div className="flex items-center gap-2">
          <Button onClick={onClose} variant="outline" className="p-2 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <h1 className="text-sm md:text-base font-bold truncate">{formatUKRegistration(claim.reg) || 'Claim Details'}</h1>
            {claim.referrer_ref && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-gold/20 text-gold font-semibold">
                {claim.referrer_ref}
              </span>
            )}
            <StatusBadge status={claim.job_status || 'New'} />
            {claim.secondary_status && <StatusBadge status={claim.secondary_status} variant="secondary" />}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setIsClaimUpdatesOpen(true)} 
              className="h-9 px-4 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white"
            >
              Updates & Status
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 flex-shrink-0 text-sm">
                  {React.createElement(DETAIL_SECTIONS.find(s => s.id === selectedSection)?.icon || Clock, { className: "w-4 h-4" })}
                  <span className="hidden sm:inline">{DETAIL_SECTIONS.find(s => s.id === selectedSection)?.label}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60 max-h-80 overflow-y-auto" align="end" side="bottom">
                {DETAIL_SECTIONS.map(section => (
                  <DropdownMenuItem
                    key={section.id}
                    onSelect={() => setSelectedSection(section.id)}
                    className={selectedSection === section.id ? 'bg-muted font-semibold' : ''}
                  >
                    <section.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="flex-1">{section.label}</span>
                    {incompleteSections.has(section.id) && (
                      <span className="ml-2 w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Journey Timeline */}
      <div className="flex-shrink-0">
        <ClaimJourneyTimeline claim={claim} updates={claimUpdates} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {renderSelectedSection()}
      </div>
    </div>
  );
}