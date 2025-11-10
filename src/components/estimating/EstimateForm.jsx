
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Sparkles } from "lucide-react";
import FileUpload from '../shared/FileUpload';
import BodyshopCombobox from '../shared/BodyshopCombobox';
import ManufacturerModelCombobox from '../shared/ManufacturerModelCombobox';
import { base44 } from '@/api/base44Client';

export default function EstimateForm({ estimate, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(estimate || {
    job_number: '',
    name: '',
    status: 'New',
    priority: 'Medium',
    repairer_action: 'Awaiting Response',
    vda: '',
    date_received: new Date().toISOString().split('T')[0],
    repairer: '',
    email_address: '',
    bodyshop_list: '',
    est_platform: 'Audatex',
    job_type: '',
    fee: 0,
    credit_repair: false,
    bld_percent: 0,
    make_model: '',
    contract: '',
    insurer_work_provider: '',
    authorising_party: '',
    claim_number: '',
    estimate_value: 0,
    percent_vehicle_value: 0,
    auda_value: 0,
    methods: '',
    authority_notes: '',
    labour_rate_agreed: 0,
    authorised_value: 0,
    followed_method: false,
    all_docs_attached: false,
    missing_docs_details: '',
    supp_authority_notes: '',
    labour_hours: 0,
    paint_hours: 0,
    specialist_hours: 0,
    parts_cost: 0,
    final_authorised_inc_vat: 0,
    final_authorised_exc_vat: 0,
    info_request: '',
    qualified_vda_check: false,
    overtime: false,
    review: '',
    invoice_status: 'Not Ready for Invoicing',
    invoice_amount: 0,
    invoice_notes: '',
    external_invoice_ref: '',
    file_urls: [],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If creating a new estimate (not editing), generate job number
    if (!estimate) {
      try {
        const response = await base44.functions.invoke('generateJobNumber', {
          entityType: 'Estimate'
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

  const handleBodyshopChange = (bodyshop) => {
    setFormData(prev => ({
      ...prev,
      repairer: bodyshop.name,
      email_address: bodyshop.email || ''
    }));
  };

  const handleCheckboxChange = (field, checked) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
  };

  const handleAIExtract = (extractedData) => {
    console.log('AI extracted estimate data:', extractedData);
    
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
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={onCancel} className="neomorph-flat p-3 transition-all active:neomorph-pressed">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-700">{estimate ? 'Edit Estimate' : 'New Estimate'}</h1>
            <p className="text-sm text-gray-500 mt-1">Enter estimate details</p>
          </div>
        </div>
      </div>

      {/* Form Content - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* --- Basic Information --- */}
          <div className="neomorph-flat p-6 space-y-4">
            <h3 className="font-bold text-gray-700 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {estimate && estimate.job_number && (
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Job Number</label>
                  <div className="text-lg font-mono font-bold text-gold">{estimate.job_number}</div>
                </div>
              )}
              <Input placeholder="Job Reference (Name)" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required />
              <select value={formData.status} onChange={(e) => handleChange('status', e.target.value)} className="neomorph-inset w-full px-4 py-3 rounded-xl">
                <option>New</option>
                <option>In Progress</option>
                <option>Awaiting Authority</option>
                <option>Authorised</option>
                <option>Supplement Requested</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
              <select value={formData.priority} onChange={(e) => handleChange('priority', e.target.value)} className="neomorph-inset w-full px-4 py-3 rounded-xl">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>

          {/* --- Job Details --- */}
          <div className="neomorph-flat p-6 space-y-4">
            <h3 className="font-bold text-gray-700 mb-4">Job Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm text-gray-600 mb-2">Repairer</label>
                    <BodyshopCombobox
                        value={formData.repairer}
                        onChange={handleBodyshopChange}
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-2">Email Address</label>
                    <Input
                        type="email"
                        placeholder="Auto-filled from selection"
                        value={formData.email_address}
                        onChange={(e) => handleChange('email_address', e.target.value)}
                        className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    />
                </div>
                <Input placeholder="VDA" value={formData.vda} onChange={(e) => handleChange('vda', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
                <div>
                    <label className="block text-sm text-gray-600 mb-2">Make/Model</label>
                    <ManufacturerModelCombobox
                      value={formData.make_model}
                      onChange={(value) => handleChange('make_model', value)}
                      placeholder="Select make & model..."
                    />
                </div>
                <Input placeholder="Insurer/Work Provider" value={formData.insurer_work_provider} onChange={(e) => handleChange('insurer_work_provider', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
                <Input placeholder="Claim Number" value={formData.claim_number} onChange={(e) => handleChange('claim_number', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
                <Input placeholder="Authorising Party" value={formData.authorising_party} onChange={(e) => handleChange('authorising_party', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
                <select value={formData.est_platform} onChange={(e) => handleChange('est_platform', e.target.value)} className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl">
                    <option>Audatex</option>
                    <option>GT Estimate</option>
                    <option>Glassmatix</option>
                    <option>Other</option>
                </select>
                 <Input type="date" value={formData.date_received} onChange={(e) => handleChange('date_received', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" />
            </div>
          </div>

          {/* --- Financials --- */}
          <div className="neomorph-flat p-6 space-y-4">
            <h3 className="font-bold text-gray-700 mb-4">Financials</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input type="number" placeholder="Estimate Value" value={formData.estimate_value || ''} onChange={(e) => handleChange('estimate_value', parseFloat(e.target.value))} />
              <Input type="number" placeholder="Authorised Value" value={formData.authorised_value || ''} onChange={(e) => handleChange('authorised_value', parseFloat(e.target.value))} />
              <Input type="number" placeholder="Fee" value={formData.fee || ''} onChange={(e) => handleChange('fee', parseFloat(e.target.value))} />
              <Input type="number" placeholder="Labour Rate Agreed" value={formData.labour_rate_agreed || ''} onChange={(e) => handleChange('labour_rate_agreed', parseFloat(e.target.value))} />
              <Input type="number" placeholder="Parts Cost" value={formData.parts_cost || ''} onChange={(e) => handleChange('parts_cost', parseFloat(e.target.value))} />
              <Input type="number" placeholder="Final Auth (inc VAT)" value={formData.final_authorised_inc_vat || ''} onChange={(e) => handleChange('final_authorised_inc_vat', parseFloat(e.target.value))} />
              <Input type="number" placeholder="Final Auth (ex VAT)" value={formData.final_authorised_exc_vat || ''} onChange={(e) => handleChange('final_authorised_exc_vat', parseFloat(e.target.value))} />
            </div>
          </div>

           {/* --- File Uploads --- */}
          <div className="neomorph-flat p-6 space-y-4">
            <h3 className="font-bold text-gray-700 mb-4">File Uploads</h3>
            <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-purple-800">
                  Upload estimate documents and click <Sparkles className="w-3 h-3 inline text-purple-600" /> to auto-extract details
                </p>
              </div>
            </div>
            <FileUpload
              value={Array.isArray(formData.file_urls) ? formData.file_urls : []}
              onChange={(urls) => handleChange('file_urls', urls)}
              enableAI={true}
              analysisType="estimate"
              onAIExtract={handleAIExtract}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" onClick={onCancel} className="neomorph-flat px-6 py-3 font-medium text-gray-700">Cancel</Button>
            <Button type="submit" className="neomorph-flat px-6 py-3 font-medium text-blue-600">{estimate ? 'Update Estimate' : 'Create Estimate'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
