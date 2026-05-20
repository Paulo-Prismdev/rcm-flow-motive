import React, { useState, useRef } from 'react';
import { X, Eye, Download, Sparkles, Loader, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FileViewer from './FileViewer';
import AIExtractConfirmDialog from './AIExtractConfirmDialog';
import { base44 } from '@/api/base44Client';

export default function FileAttachmentModal({ fileUrls = [], onAdd, onRemove, isOpen, onClose, enableAI = false, analysisType = 'general', onAIExtract = null, existingData = {} }) {
  const [viewingFile, setViewingFile] = useState(null);
  const [analyzingFile, setAnalyzingFile] = useState(null);
  const [aiExtractDialog, setAiExtractDialog] = useState({ isOpen: false, data: null });
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const newUrls = [];
    for (const file of Array.from(files)) {
      const result = await base44.integrations.Core.UploadFile({ file });
      newUrls.push(result.file_url);
    }
    if (onAdd) onAdd(newUrls);
    setIsUploading(false);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    await handleUpload(e.dataTransfer.files);
  };

  if (!isOpen) return null;

  const getFileName = (url) => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split('/').pop();
      return decodeURIComponent(fileName);
    } catch (e) {
      return url.split('/').pop() || 'file';
    }
  };

  const getFileExtension = (url) => {
    const fileName = getFileName(url);
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension || '';
  };

  const handleDownload = (url) => {
    window.open(url, '_blank');
  };

  const handleAIAnalysis = async (fileUrl) => {
    if (!onAIExtract || analyzingFile) return;
    
    setAnalyzingFile(fileUrl);
    
    try {
      let schema = {};
      
      if (analysisType === 'claim') {
        schema = {
          type: "object",
          properties: {
            // Basic Info
            reg: { type: "string", description: "Vehicle registration number or plate" },
            claim_type: { type: "string", description: "Type of claim (Own Damage, Third Party, etc.)" },
            job_status: { type: "string", description: "Current job status" },
            
            // Dates
            loss_date: { type: "string", description: "Date of loss/incident (YYYY-MM-DD)" },
            loss_time: { type: "string", description: "Time of loss/incident" },
            date_received: { type: "string", description: "Date claim was received" },
            
            // Client Details
            client_name: { type: "string", description: "Client or policyholder name" },
            client_phone: { type: "string", description: "Client phone number" },
            client_email: { type: "string", description: "Client email address" },
            driver_contact_name: { type: "string", description: "Driver or contact person name" },
            client_address_line_1: { type: "string", description: "Client address line 1" },
            client_address_line_2: { type: "string", description: "Client address line 2" },
            client_town: { type: "string", description: "Client town/city" },
            client_county: { type: "string", description: "Client county" },
            client_postcode: { type: "string", description: "Client postcode" },
            
            // Vehicle Details
            make_model: { type: "string", description: "Vehicle make and model" },
            vehicle_type: { type: "string", description: "Type of vehicle (Car, Van, etc.)" },
            vehicle_location: { type: "string", description: "Current location of vehicle" },
            vehicle_damage: { type: "string", description: "Description of vehicle damage" },
            vehicle_colour: { type: "string", description: "Vehicle colour" },
            
            // Insurance Details
            insurer: { type: "string", description: "Insurance company name" },
            claim_ref: { type: "string", description: "Insurance claim reference number" },
            policy_number: { type: "string", description: "Policy number" },
            policy_excess: { type: "number", description: "Policy excess amount" },
            
            // Referrer Details
            referrer: { type: "string", description: "Referrer or work provider name" },
            referrer_ref: { type: "string", description: "Referrer reference number" },
            referrer_email: { type: "string", description: "Referrer email address" },
            file_handler: { type: "string", description: "File handler name" },
            
            // Bodyshop Details
            bodyshop: { type: "string", description: "Bodyshop or repairer name" },
            bodyshop_email: { type: "string", description: "Bodyshop email address" },
            authorising_party: { type: "string", description: "Authorising party name" },
            
            // Financial Details
            estimate_cost_net: { type: "number", description: "Estimate cost excluding VAT" },
            estimate_cost_gross: { type: "number", description: "Estimate cost including VAT" },
            authority_cost_net: { type: "number", description: "Authorised cost excluding VAT" },
            authority_cost_gross: { type: "number", description: "Authorised cost including VAT" },
            est_fee: { type: "number", description: "Estimate fee amount" },
            
            // Other Details
            circumstances: { type: "string", description: "Description of incident circumstances" },
            incident_location: { type: "string", description: "Where the incident occurred" },
            vehicle_use: { type: "string", description: "Use of vehicle (Business, Social, Commuting)" },
            courtesy_car_required: { type: "boolean", description: "Whether a courtesy car is required" }
          }
        };
      } else if (analysisType === 'estimate') {
        schema = {
          type: "object",
          properties: {
            // Job Details
            name: { type: "string", description: "Job reference or name" },
            claim_number: { type: "string", description: "Claim number or reference" },
            status: { type: "string", description: "Current status of estimate" },
            
            // Vehicle Details
            reg: { type: "string", description: "Vehicle registration" },
            make_model: { type: "string", description: "Vehicle make and model" },
            
            // Repairer/Bodyshop
            repairer: { type: "string", description: "Repairer or bodyshop name" },
            email_address: { type: "string", description: "Repairer email address" },
            
            // Financial Details - MOST IMPORTANT
            estimate_value: { 
              type: "number", 
              description: "CRITICAL: Main estimate total. Look for any of: Total, Grand Total, Estimate Total, Net Total, Gross Total, Final Total, Repair Cost, Amount. This is usually the largest monetary value on the document."
            },
            authorised_value: { 
              type: "number", 
              description: "Authorised repair amount. Look for: Authorised, Approved Amount, Auth Total."
            },
            final_authorised_inc_vat: { 
              type: "number", 
              description: "Final authorised amount including VAT/tax"
            },
            final_authorised_exc_vat: { 
              type: "number", 
              description: "Final authorised amount excluding VAT/tax"
            },
            
            // Breakdown
            labour_hours: { type: "number", description: "Labour hours or work hours" },
            paint_hours: { type: "number", description: "Paint hours or refinish hours" },
            specialist_hours: { type: "number", description: "Specialist hours" },
            parts_cost: { type: "number", description: "Parts cost or materials cost" },
            labour_rate_agreed: { type: "number", description: "Agreed labour rate per hour" },
            fee: { type: "number", description: "Estimate fee or service charge" },
            
            // Insurance/Work Provider
            authorising_party: { type: "string", description: "Authorising party or insurance company" },
            insurer_work_provider: { type: "string", description: "Insurer or work provider name" },
            contract: { type: "string", description: "Contract reference" },
            
            // Dates
            date_received: { type: "string", description: "Date estimate was received" },
            date_estimate_completed: { type: "string", description: "Date estimate was completed" },
            date_authorised: { type: "string", description: "Date estimate was authorised" },
            
            // Platform & Methods
            est_platform: { type: "string", description: "Estimate platform (Audatex, GT Estimate, etc.)" },
            methods: { type: "string", description: "Repair methods or procedures" },
            
            // Additional Info
            priority: { type: "string", description: "Priority level (High, Medium, Low)" },
            job_type: { type: "string", description: "Type of job or work" },
            vda: { type: "string", description: "VDA number or reference" }
          }
        };
      } else if (analysisType === 'engineering') {
        schema = {
          type: "object",
          properties: {
            reference: { type: "string", description: "Job reference" },
            vehicle_reg: { type: "string", description: "Vehicle registration" },
            make_model: { type: "string", description: "Vehicle make and model" },
            client_name: { type: "string", description: "Client name" },
            client_phone: { type: "string", description: "Client phone" },
            client_email: { type: "string", description: "Client email" },
            insurer: { type: "string", description: "Insurance company" },
            claim_ref: { type: "string", description: "Claim reference" },
            vehicle_location: { type: "string", description: "Vehicle location" },
            inspection_type: { type: "string", description: "Type of inspection" },
            inspection_date: { type: "string", description: "Date of inspection (YYYY-MM-DD)" },
            report_completed_date: { type: "string", description: "Date report was completed" },
            findings: { type: "string", description: "Engineering findings or observations" },
            recommendations: { type: "string", description: "Engineer recommendations" },
            fee: { type: "number", description: "Engineering fee amount" }
          }
        };
      } else if (analysisType === 'part') {
        schema = {
          type: "object",
          properties: {
            vehicle_ref: { type: "string", description: "Vehicle reference or registration" },
            manufacturer: { type: "string", description: "Vehicle manufacturer" },
            part_description: { type: "string", description: "Part description or name" },
            part_number: { type: "string", description: "Part number or OE number" },
            part_type: { type: "string", description: "Part type (OEM, Aftermarket, Recycled, etc.)" },
            condition: { type: "string", description: "Part condition (New, Used, Refurbished)" },
            bodyshop_company: { type: "string", description: "Bodyshop or customer company name" },
            contact_name: { type: "string", description: "Contact person name" },
            contact_number: { type: "string", description: "Contact phone number" },
            contact_email: { type: "string", description: "Contact email" },
            delivery_address: { type: "string", description: "Delivery address" },
            supplier: { type: "string", description: "Supplier name" },
            rrp: { type: "number", description: "Recommended retail price" },
            net_price: { type: "number", description: "Net price or trade price" },
            sourcing_fee: { type: "number", description: "Sourcing fee amount" },
            courier_charge: { type: "number", description: "Courier or delivery charge" },
            delivery_time: { type: "string", description: "Expected delivery time" },
            warranty: { type: "string", description: "Warranty information" },
            work_provider: { type: "string", description: "Work provider name" }
          }
        };
      } else {
        schema = {
          type: "object",
          properties: {
            extracted_data: { 
              type: "string", 
              description: "Any relevant data found in the document" 
            }
          }
        };
      }

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: schema
      });

      if (result.status === 'success' && result.output) {
        setAiExtractDialog({
          isOpen: true,
          data: result.output
        });
      } else {
        alert('Could not extract data from this file. ' + (result.details || 'Please try again.'));
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      alert('Failed to analyze file with AI. Please try again.');
    } finally {
      setAnalyzingFile(null);
    }
  };

  const handleAIExtractConfirm = (selectedData) => {
    if (selectedData && onAIExtract) {
      onAIExtract(selectedData);
    }
  };

  const isPDF = (url) => {
    return getFileExtension(url) === 'pdf';
  };

  return (
    <>
      <AIExtractConfirmDialog
        isOpen={aiExtractDialog.isOpen}
        onClose={() => setAiExtractDialog({ isOpen: false, data: null })}
        onConfirm={handleAIExtractConfirm}
        extractedData={aiExtractDialog.data}
        existingData={existingData}
        title="AI Data Extraction"
      />

      <FileViewer fileUrl={viewingFile} onClose={() => setViewingFile(null)} />
      
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div 
          className="glass-elevated w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-glass-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Attachments</h3>
                <p className="text-xs text-foreground-muted mt-0.5">
                  {fileUrls.length} {fileUrls.length === 1 ? 'file' : 'files'}
                  {enableAI && ' • AI analysis available'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="neomorph-flat p-2 hover:bg-surface-hover transition-colors rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Upload Area */}
          <div className="px-6 pt-4 flex-shrink-0">
            <div
              className={`neomorph-inset p-3 rounded-xl text-center transition-all cursor-pointer ${isDragging ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              {isUploading ? (
                <div className="flex items-center justify-center gap-2 text-foreground-muted py-1">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Uploading...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-foreground-muted py-1">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Click or drag & drop to upload documents</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => { handleUpload(e.target.files); e.target.value = ''; }}
                disabled={isUploading}
              />
            </div>
          </div>

          {/* Files List - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {fileUrls.length === 0 ? (
              <div className="text-center py-12 text-foreground-muted">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No files attached</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {fileUrls.map((url, index) => {
                  const fileName = getFileName(url);
                  const extension = getFileExtension(url);
                  const isCurrentlyAnalyzing = analyzingFile === url;
                  
                  return (
                    <div
                      key={index}
                      className="neomorph-flat p-4 rounded-lg flex items-center gap-4 hover:bg-surface-hover transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-accent" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{fileName}</p>
                        <p className="text-xs text-foreground-muted uppercase">{extension} file</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {enableAI && onAIExtract && (
                          <button
                            onClick={() => handleAIAnalysis(url)}
                            disabled={isCurrentlyAnalyzing}
                            className="neomorph-flat p-2 hover:bg-purple-500/10 transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Analyze with AI"
                          >
                            {isCurrentlyAnalyzing ? (
                              <Loader className="w-4 h-4 text-purple-500 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4 text-purple-500" />
                            )}
                          </button>
                        )}
                        
                        <button
                          onClick={() => setViewingFile(url)}
                          className="neomorph-flat p-2 hover:bg-blue-500/10 transition-colors rounded-lg"
                          title="View file"
                        >
                          <Eye className="w-4 h-4 text-blue-500" />
                        </button>
                        
                        <button
                          onClick={() => handleDownload(url)}
                          className="neomorph-flat p-2 hover:bg-green-500/10 transition-colors rounded-lg"
                          title="Download file"
                        >
                          <Download className="w-4 h-4 text-green-500" />
                        </button>
                        
                        {onRemove && (
                          <button
                            onClick={() => onRemove(url)}
                            className="neomorph-flat p-2 hover:bg-red-500/10 transition-colors rounded-lg"
                            title="Remove file"
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with AI Info */}
          {enableAI && (
            <div className="p-4 border-t border-glass-border bg-purple-600 dark:bg-purple-700 flex-shrink-0">
              <div className="flex items-start gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                <p className="text-white">
                  <strong className="text-white font-bold">AI Analysis:</strong> Click the sparkle icon to automatically extract data from documents. 
                  The AI will analyze the file and populate matching fields for you to review.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}