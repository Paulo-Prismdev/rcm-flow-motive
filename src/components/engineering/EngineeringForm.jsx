
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Sparkles } from "lucide-react"; // Added Sparkles import
import FileUpload from '../shared/FileUpload';
import ManufacturerModelCombobox from '../shared/ManufacturerModelCombobox';
import AddressLookupInput from '../shared/AddressLookupInput';
import { base44 } from '@/api/base44Client';

export default function EngineeringForm({ job, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(job || {
    job_number: '',
    reference: '',
    status: 'New',
    engineer_assigned: '',
    inspection_type: 'Pre-repair Assessment',
    vehicle_reg: '',
    make_model: '',
    vehicle_location: '',
    client_name: '',
    client_phone: '',
    client_email: '',
    insurer: '',
    claim_ref: '',
    date_requested: new Date().toISOString().split('T')[0],
    findings: '',
    recommendations: '',
    report_status: 'Not Started',
    fee: 0,
    invoice_status: 'Not Ready for Invoicing',
    invoice_amount: 0,
    file_urls: [],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If creating a new job (not editing), generate job number
    if (!job) {
      try {
        const response = await base44.functions.invoke('generateJobNumber', {
          entityType: 'Engineering'
        });
        
        if (response.data.success) {
          formData.job_number = response.data.job_number;
        }
      } catch (error) {
        console.error('Failed to generate job number:', error);
        alert('Failed to generate job number. Please try again.');
        return;
      }
    }
    
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVehicleLocationChange = (addressData) => {
    setFormData(prev => ({
      ...prev,
      vehicle_location: addressData.display_name || addressData.address || ''
    }));
  };

  const handleAIExtract = (extractedData) => {
    console.log('AI extracted engineering data:', extractedData);
    
    const fields = Object.entries(extractedData)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    if (window.confirm(`AI found the following data:\n\n${fields}\n\nDo you want to auto-fill these fields?`)) {
      setFormData(prev => ({
        ...prev,
        ...extractedData
      }));
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 md:gap-6">
      {/* Header - Fixed */}
      <div className="neomorph p-6">
        <div className="flex items-center gap-4">
          <Button onClick={onCancel} className="neomorph-flat p-3"><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-700">{job ? 'Edit Job' : 'New Engineering Job'}</h1>
          </div>
        </div>
      </div>

      {/* Form Content - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="neomorph-flat p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {job && job.job_number && (
              <div>
                <label className="block text-sm text-gray-600 mb-2">Job Number</label>
                <div className="text-lg font-mono font-bold text-gold">{job.job_number}</div>
              </div>
            )}
            <Input placeholder="Reference" value={formData.reference} onChange={(e) => handleChange('reference', e.target.value)} required />
            <select value={formData.status} onChange={(e) => handleChange('status', e.target.value)} className="neomorph-inset w-full px-4 py-3 rounded-xl">
              <option>New</option>
              <option>Scheduled</option>
              <option>In Progress</option>
              <option>Report Pending</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
            <Input type="date" value={formData.date_requested} onChange={(e) => handleChange('date_requested', e.target.value)} />
          </div>

          <div className="neomorph-flat p-6 space-y-4">
            <h3 className="font-bold text-gray-700">Inspection Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Engineer Assigned" value={formData.engineer_assigned} onChange={(e) => handleChange('engineer_assigned', e.target.value)} />
              <select value={formData.inspection_type} onChange={(e) => handleChange('inspection_type', e.target.value)} className="neomorph-inset w-full px-4 py-3 rounded-xl">
                <option>Pre-repair Assessment</option>
                <option>Post-repair Inspection</option>
                <option>Total Loss Assessment</option>
                <option>Engineering Report</option>
                <option>Dispute Resolution</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          
          <div className="neomorph-flat p-6 space-y-4">
            <h3 className="font-bold text-gray-700">Vehicle & Client</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input placeholder="Vehicle Reg" value={formData.vehicle_reg} onChange={(e) => handleChange('vehicle_reg', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
              <div>
                <label className="block text-sm text-gray-600 mb-2">Make/Model</label>
                <ManufacturerModelCombobox
                  value={formData.make_model}
                  onChange={(value) => handleChange('make_model', value)}
                  placeholder="Select make & model..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Vehicle Location</label>
                <AddressLookupInput
                  value={formData.vehicle_location}
                  onChange={handleVehicleLocationChange}
                  placeholder="Start typing address..."
                  className="neomorph-inset"
                />
              </div>
              <Input placeholder="Client Name" value={formData.client_name} onChange={(e) => handleChange('client_name', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
              <Input placeholder="Client Phone" value={formData.client_phone} onChange={(e) => handleChange('client_phone', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
              <Input type="email" placeholder="Client Email" value={formData.client_email} onChange={(e) => handleChange('client_email', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
            </div>
          </div>

          <div className="neomorph-flat p-6 space-y-4">
            <h3 className="font-bold text-gray-700">Report & Findings</h3>
            <Textarea placeholder="Findings" value={formData.findings} onChange={(e) => handleChange('findings', e.target.value)} className="neomorph-inset h-24" />
            <Textarea placeholder="Recommendations" value={formData.recommendations} onChange={(e) => handleChange('recommendations', e.target.value)} className="neomorph-inset h-24" />
            <select value={formData.report_status} onChange={(e) => handleChange('report_status', e.target.value)} className="neomorph-inset w-full px-4 py-3 rounded-xl">
              <option>Not Started</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Sent to Client</option>
            </select>
          </div>
          
          {/* File Uploads */}
          <div className="neomorph-flat p-6 space-y-4">
            <h3 className="font-bold text-gray-700 mb-4">File Uploads</h3>
            <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-purple-800">
                  Upload inspection reports and click <Sparkles className="w-3 h-3 inline text-purple-600" /> to auto-extract details
                </p>
              </div>
            </div>
            <FileUpload
              value={Array.isArray(formData.file_urls) ? formData.file_urls : []}
              onChange={(urls) => handleChange('file_urls', urls)}
              enableAI={true}
              analysisType="engineering"
              onAIExtract={handleAIExtract}
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" onClick={onCancel} className="neomorph-flat px-6 py-3">Cancel</Button>
            <Button type="submit" className="neomorph-flat px-6 py-3 text-blue-600">{job ? 'Update Job' : 'Create Job'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
