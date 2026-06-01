import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, FileText, X, Loader, Eye, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FileViewer from './FileViewer';

export default function FileUpload({ 
  value = [], 
  onChange, 
  enableAI = false, 
  analysisType = 'general',
  onAIExtract = null 
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [analyzingFile, setAnalyzingFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const currentUrls = Array.isArray(value) ? [...value] : [];

    try {
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        currentUrls.push(result.file_url);
      }
      onChange(currentUrls);
    } catch (error) {
      console.error("File upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (event) => {
    const files = event.target.files;
    await uploadFiles(files);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    await uploadFiles(files);
  };

  const handleRemoveFile = (urlToRemove) => {
    onChange(value.filter(url => url !== urlToRemove));
  };

  const handleAIAnalysis = async (fileUrl) => {
    if (!onAIExtract) return;
    
    setAnalyzingFile(fileUrl);
    
    try {
      // Define schemas based on analysis type
      const schemas = {
        claim: {
          type: "object",
          properties: {
            reg: { type: "string", description: "Vehicle registration number" },
            client_name: { type: "string", description: "Client/policyholder name" },
            client_phone: { type: "string", description: "Client phone number" },
            client_email: { type: "string", description: "Client email address" },
            client_address_line_1: { type: "string", description: "Client address line 1" },
            client_address_line_2: { type: "string", description: "Client address line 2" },
            client_town: { type: "string", description: "Client town" },
            client_county: { type: "string", description: "Client county" },
            client_postcode: { type: "string", description: "Client postcode" },
            make_model: { type: "string", description: "Vehicle make and model" },
            loss_date: { type: "string", description: "Date of incident/loss in YYYY-MM-DD format" },
            insurer: { type: "string", description: "Insurance company name" },
            claim_ref: { type: "string", description: "Claim reference number" },
            policy_number: { type: "string", description: "Policy number" },
            policy_excess: { type: "number", description: "Policy excess amount" },
            circumstances: { type: "string", description: "Description of what happened" },
            incident_location: { type: "string", description: "Where the incident occurred" },
            vehicle_damage: { type: "string", description: "Description of vehicle damage" },
            estimate_cost_net: { type: "number", description: "Estimated repair cost (net)" },
            estimate_cost_gross: { type: "number", description: "Estimated repair cost (gross)" },
            bodyshop: { type: "string", description: "Bodyshop name" },
            bodyshop_email: { type: "string", description: "Bodyshop email" },
            referrer: { type: "string", description: "Referrer name" },
            referrer_email: { type: "string", description: "Referrer email" }
          }
        },
        estimate: {
          type: "object",
          properties: {
            name: { type: "string", description: "Job reference or name" },
            make_model: { type: "string", description: "Vehicle make and model" },
            claim_number: { type: "string", description: "Related claim number" },
            repairer: { type: "string", description: "Repairer/bodyshop name" },
            insurer_work_provider: { type: "string", description: "Insurer or work provider name" },
            estimate_value: { type: "number", description: "Total estimate value" },
            labour_rate_agreed: { type: "number", description: "Agreed labour rate" },
            labour_hours: { type: "number", description: "Total labour hours" },
            paint_hours: { type: "number", description: "Paint hours" },
            parts_cost: { type: "number", description: "Total parts cost" },
            date_estimate_completed: { type: "string", description: "Date estimate completed in YYYY-MM-DD format" },
            methods: { type: "string", description: "Repair methods or notes" }
          }
        },
        engineering: {
          type: "object",
          properties: {
            reference: { type: "string", description: "Job reference" },
            vehicle_reg: { type: "string", description: "Vehicle registration" },
            make_model: { type: "string", description: "Vehicle make and model" },
            client_name: { type: "string", description: "Client name" },
            client_phone: { type: "string", description: "Client phone" },
            insurer: { type: "string", description: "Insurance company" },
            claim_ref: { type: "string", description: "Claim reference" },
            findings: { type: "string", description: "Engineering findings" },
            recommendations: { type: "string", description: "Recommendations" },
            inspection_date: { type: "string", description: "Inspection date in YYYY-MM-DD format" },
            fee: { type: "number", description: "Fee amount" }
          }
        },
        invoice: {
          type: "object",
          properties: {
            invoice_ref: { type: "string", description: "Invoice reference number" },
            invoice_date: { type: "string", description: "Invoice date in YYYY-MM-DD format" },
            invoice_amount: { type: "number", description: "Total invoice amount" },
            net_amount: { type: "number", description: "Net amount before VAT" },
            vat_amount: { type: "number", description: "VAT amount" },
            supplier_name: { type: "string", description: "Supplier/company name" },
            customer_name: { type: "string", description: "Customer name" },
            description: { type: "string", description: "Services/items description" },
            due_date: { type: "string", description: "Payment due date in YYYY-MM-DD format" }
          }
        },
        general: {
          type: "object",
          properties: {
            extracted_data: { 
              type: "object", 
              description: "Any relevant data found in the document",
              additionalProperties: true 
            }
          }
        }
      };

      const schema = schemas[analysisType] || schemas.general;

      // Use ExtractDataFromUploadedFile for all file types (supports PDFs, images, CSVs)
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: schema
      });

      // Check if extraction was successful
      if (result.status === 'success' && result.output) {
        onAIExtract(result.output);
      } else {
        const errorMsg = result.details || 'Unable to extract data from this file. The file may be empty, corrupted, or in an unsupported format.';
        alert(errorMsg);
      }
    } catch (error) {
      console.error("AI analysis failed:", error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to analyze document. Please try again or enter details manually.';
      alert(`AI Analysis Error: ${errorMessage}`);
    } finally {
      setAnalyzingFile(null);
    }
  };

  const getFileName = (url) => {
    try {
      const urlObject = new URL(url);
      const path = urlObject.pathname;
      return path.substring(path.lastIndexOf('/') + 1);
    } catch (e) {
      return "Uploaded File";
    }
  };

  return (
    <>
      <FileViewer fileUrl={viewingFile} onClose={() => setViewingFile(null)} />
      <div className="space-y-4">
        <div 
          className={`neomorph-inset p-4 rounded-xl text-center transition-all ${
            isDragging ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20' : ''
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex flex-col items-center justify-center space-y-2 text-gray-600">
              {isUploading ? (
                <>
                  <Loader className="w-8 h-8 animate-spin" />
                  <p>Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className={`w-8 h-8 ${isDragging ? 'text-purple-600' : ''}`} />
                  <p className={isDragging ? 'text-purple-600 font-semibold' : ''}>
                    {isDragging ? 'Drop files here!' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-xs text-gray-500">
                    (Multiple files supported{enableAI ? ' • AI analysis available' : ''})
                  </p>
                </>
              )}
            </div>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              onChange={handleFileChange}
              disabled={isUploading}
              multiple
            />
          </label>
        </div>

        {(value || []).length > 0 && (
          <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-600">Uploaded Files:</h4>
                {enableAI && onAIExtract && (value || []).length > 0 && (
                  <div className="px-3 py-2 rounded-lg relative overflow-hidden">
                    {/* Solid gradient background */}
                    <div 
                      className="absolute inset-0 opacity-100"
                      style={{
                        background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)',
                      }}
                    />
                    {/* Border with gradient */}
                    <div 
                      className="absolute inset-0 rounded-lg"
                      style={{
                        border: '2px solid',
                        borderImage: 'linear-gradient(135deg, #9333ea, #ec4899) 1',
                        borderRadius: '8px'
                      }}
                    />
                    {/* Content */}
                    <div className="relative z-10 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-pulse" />
                      <span className="text-xs font-bold text-gray-900 dark:text-white">AI Ready</span>
                    </div>
                  </div>
                )}
              </div>
              {(value || []).map((url, index) => (
                  <div key={index} className="neomorph-flat p-3 flex items-center justify-between text-sm gap-3 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2 truncate flex-grow min-w-0">
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{getFileName(url)}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {enableAI && onAIExtract && (
                          <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAIAnalysis(url)}
                              disabled={analyzingFile === url}
                              className="h-9 px-4 font-bold rounded-lg transition-all duration-300 relative overflow-hidden group"
                              style={{
                                background: analyzingFile === url 
                                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                boxShadow: '0 4px 15px 0 rgba(116, 75, 162, 0.4), 0 0 20px rgba(102, 126, 234, 0.3)',
                                color: 'white'
                              }}
                              title="Analyze with AI"
                          >
                              {/* Animated shine effect */}
                              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                              
                              <span className="relative flex items-center gap-2">
                                {analyzingFile === url ? (
                                  <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    <span className="text-xs">Analyzing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-4 h-4 animate-pulse" />
                                    <span className="text-xs">AI Analyze</span>
                                  </>
                                )}
                              </span>
                          </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingFile(url)}
                            className="h-8 w-8"
                        >
                            <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFile(url)}
                            className="h-8 w-8 hover:text-red-600"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                      </div>
                  </div>
              ))}
          </div>
        )}
      </div>
    </>
  );
}