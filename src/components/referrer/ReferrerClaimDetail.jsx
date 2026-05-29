import React, { useState } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function DetailRow({ label, value, isCurrency = false, isDate = false, isStatus = false }) {
  let displayValue = value;
  if (isCurrency && typeof value === 'number') {
    displayValue = `£${value.toFixed(2)}`;
  } else if (isDate && value) {
    try { displayValue = format(new Date(value), 'dd/MM/yyyy'); } catch (e) { displayValue = 'Invalid Date'; }
  }
  if (value === null || typeof value === 'undefined' || value === '') displayValue = '-';

  return (
    <div className="py-3 px-4 rounded-lg hover:bg-surface-hover transition-colors">
      <div className="text-xs font-semibold text-foreground-muted mb-1">{label}</div>
      <div className="text-sm font-medium">
        {isStatus ? <StatusBadge status={displayValue} /> : displayValue}
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
  { id: 'updates',       label: 'Updates',             icon: MessageSquare },
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
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{claim.circumstances || '-'}</div>
            </div>
          </div>
        );

      case 'client':
        return (
          <div className="neomorph-flat p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4"><User className="w-5 h-5 text-gold" /><h3 className="font-bold">Client Details</h3></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Client Name" value={claim.client_name} />
              <DetailRow label="Client Phone" value={claim.client_phone} />
              <DetailRow label="Client Email" value={claim.client_email} />
              <DetailRow label="Driver/Contact" value={claim.driver_contact_name} />
              <DetailRow label="VAT Status" value={claim.client_vat_status} />
              <DetailRow label="Business Division" value={claim.business_division} />
            </div>
            <div className="mt-2 py-3 px-4 rounded-lg glass-inset">
              <div className="text-xs font-semibold text-foreground-muted mb-2">Address</div>
              <div className="text-sm leading-relaxed space-y-0.5">
                {claim.client_address_line_1 && <div>{claim.client_address_line_1}</div>}
                {claim.client_address_line_2 && <div>{claim.client_address_line_2}</div>}
                {claim.client_town && <div>{claim.client_town}</div>}
                {claim.client_county && <div>{claim.client_county}</div>}
                {claim.client_postcode && <div>{claim.client_postcode}</div>}
                {!claim.client_address_line_1 && !claim.client_town && !claim.client_postcode && '-'}
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
                <DetailRow label="Make/Model" value={claim.make_model} />
                <DetailRow label="Colour" value={claim.vehicle_colour} />
                <DetailRow label="Fuel Type" value={claim.vehicle_fuel_type} />
                <DetailRow label="Year of Manufacture" value={claim.vehicle_year_of_manufacture} />
                <DetailRow label="Vehicle Type" value={claim.vehicle_type} />
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
            <div className="mt-2 py-3 px-4 rounded-lg glass-inset">
              <div className="text-xs font-semibold text-foreground-muted mb-2">Vehicle Location</div>
              <div className="text-sm mb-3">{claim.vehicle_location || '-'}</div>
              <div className="text-xs font-semibold text-foreground-muted mb-2">Damage Description</div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{claim.vehicle_damage || '-'}</div>
            </div>
          </div>
        );

      case 'insurance':
        return (
          <div className="neomorph-flat p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4"><Shield className="w-5 h-5 text-gold" /><h3 className="font-bold">Insurance Details</h3></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Insurer" value={claim.insurer} />
              <DetailRow label="Claim Ref" value={claim.claim_ref} />
              <DetailRow label="Policy Number" value={claim.policy_number} />
              <DetailRow label="Policy Excess" value={claim.policy_excess} isCurrency />
            </div>
          </div>
        );

      case 'dates':
        return (
          <div className="neomorph-flat p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4"><Calendar className="w-5 h-5 text-gold" /><h3 className="font-bold">Key Dates</h3></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <DetailRow label="Date Received" value={claim.date_received} isDate />
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
              <DetailRow label="Bodyshop" value={claim.bodyshop} />
              <DetailRow label="Bodyshop Email" value={claim.bodyshop_email} />
              <DetailRow label="Authorising Party" value={claim.authorising_party} />
            </div>
          </div>
        );

      case 'updates':
        return (
          <div className="neomorph-flat p-4 md:p-6 space-y-4">
            <div className="flex items-center gap-3"><MessageSquare className="w-5 h-5 text-gold" /><h3 className="font-bold">Updates</h3></div>

            {/* Reply form */}
            <div className="neomorph p-4 space-y-3">
              <p className="text-sm font-medium text-foreground-muted">Send a response to RCM</p>
              <Textarea
                placeholder="Type your message here..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                rows={3}
                className="neomorph-inset resize-none"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleReply}
                  disabled={!replyText.trim() || replyMutation.isPending}
                  className="bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20"
                >
                  {replyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Response
                </Button>
              </div>
            </div>

            {/* Updates list */}
            {claimUpdates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No updates yet.</p>
            ) : (
              <div className="space-y-3">
                {claimUpdates.map(update => {
                  const isReferrerResponse = update.update_type === 'Referrer Response';
                  return (
                    <div
                      key={update.id}
                      className={`neomorph p-4 rounded-xl space-y-2 ${isReferrerResponse ? 'border-l-4 border-accent/50' : ''}`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isReferrerResponse
                            ? 'bg-accent/20 text-accent'
                            : 'bg-muted text-foreground-muted'
                        }`}>
                          {update.update_type}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-foreground-muted">
                          {update.created_by && <span>{update.created_by}</span>}
                          <span>{update.created_date ? format(new Date(update.created_date), 'dd/MM/yyyy HH:mm') : ''}</span>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{update.description}</p>
                      {update.next_steps && (
                        <div className="py-2 px-3 rounded-lg bg-surface-hover text-xs">
                          <span className="font-semibold text-foreground-muted">Next Steps: </span>
                          {update.next_steps}
                        </div>
                      )}
                      {update.file_urls?.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {update.file_urls.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-accent hover:underline"
                            >
                              {isImageUrl(url)
                                ? <Image className="w-3.5 h-3.5 flex-shrink-0" />
                                : <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                              }
                              {getFileName(url)}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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

      {/* Combined Header + Section Selector */}
      <div className="neomorph p-3 flex-shrink-0 sticky top-0 z-10 bg-background">
        <div className="flex items-center gap-2">
          <Button onClick={onClose} variant="outline" className="p-2 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm md:text-base font-bold truncate">{formatUKRegistration(claim.reg) || 'Claim Details'}</h1>
              {claim.referrer_ref && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-gold/20 text-gold font-semibold">
                  {claim.referrer_ref}
                </span>
              )}
              <StatusBadge status={claim.job_status || 'New'} />

            </div>
          </div>
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
                  <section.icon className="w-4 h-4 mr-2" />
                  {section.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {renderSelectedSection()}
      </div>
    </div>
  );
}