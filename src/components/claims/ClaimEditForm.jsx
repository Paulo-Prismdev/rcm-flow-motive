import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Search, Loader, AlertCircle } from "lucide-react";
import InsurerCombobox from "../shared/InsurerCombobox";
import BodyshopCombobox from "../shared/BodyshopCombobox";
import FileUpload from '../shared/FileUpload';
import ClientCombobox from '../shared/ClientCombobox';
import ReferrerCombobox from '../shared/ReferrerCombobox';
import StatusMultiSelect from '../shared/StatusMultiSelect';
import ClaimIndemnityFields from './ClaimIndemnityFields';
import AddressLookupInput from '../shared/AddressLookupInput';
import AIExtractConfirmDialog from '../shared/AIExtractConfirmDialog';
import { COURTESY_CAR_OPTIONS } from '../shared/courtesyCarOptions';

export default function ClaimEditForm({
  formData, handleChange, handleCheckboxChange,
  handleSubmit, onCancel,
  handleVehicleLookup, isLookingUpVehicle, vehicleLookupError,
  handleTPVehicleLookup, isLookingUpTPVehicle, tpVehicleLookupError, setTpVehicleLookupError,
  handleClientChange, handleReferrerChange, handleBodyshopChange,
  handleIncidentLocationChange, handleVehicleLocationChange,
  handleTPChange,
  isInternalUser, setShowClientModal,
  aiExtractDialog, setAiExtractDialog, handleAIExtractConfirm, handleAIExtract,
}) {
  console.log('[ClaimEditForm] Form submit handler:', handleSubmit?.toString?.().substring(0, 100));
  const Plus = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;

  return (
    <div className="h-full flex flex-col gap-4 md:gap-6">
      <AIExtractConfirmDialog
        isOpen={aiExtractDialog.isOpen}
        onClose={() => setAiExtractDialog({ isOpen: false, data: null, linkedEntityTypes: [] })}
        onConfirm={handleAIExtractConfirm}
        extractedData={aiExtractDialog.data}
        existingData={formData}
        linkedEntityTypes={aiExtractDialog.linkedEntityTypes || []}
        title="AI Data Extraction"
      />
      <div className="neomorph p-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button onClick={(e) => { e.preventDefault(); e.stopPropagation(); console.log('[ClaimEditForm] Back button clicked'); onCancel(); }} className="neomorph-flat p-3 transition-all active:neomorph-pressed">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-700">Edit Claim</h1>
            <p className="text-sm text-gray-500 mt-1">Update claim details</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); handleSubmit(e); }} className="space-y-6">
          {/* Basic Info */}
          <div className="neomorph-flat p-6 space-y-4">
            <h3 className="font-bold text-gray-700 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm text-gray-600 mb-2">Registration *</label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Input value={formData.reg} onChange={(e) => { handleChange('reg', e.target.value); }} className="neomorph-inset px-4 py-3 text-gray-700 border-0" required />
                    <Button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); console.log('[ClaimEditForm] Vehicle Lookup clicked'); handleVehicleLookup(); }} disabled={isLookingUpVehicle || !formData.reg} className="neomorph-flat px-4 py-3 whitespace-nowrap">
                      {isLookingUpVehicle ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  {vehicleLookupError && <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg"><AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" /><p className="text-xs text-orange-800">{vehicleLookupError}</p></div>}
                  {formData.make_model && !vehicleLookupError && <div className="p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-xs text-green-700 font-medium">✓ {formData.make_model}{formData.vehicle_colour && ` • ${formData.vehicle_colour}`}{formData.vehicle_year_of_manufacture && ` • ${formData.vehicle_year_of_manufacture}`}</p></div>}
                </div>
              </div>
              <div><label className="block text-sm text-gray-600 mb-2">Job Statuses</label><StatusMultiSelect selectedStatuses={formData.job_statuses || []} onStatusesChange={(s) => handleChange('job_statuses', s)} availableStatuses={['New','In Progress','Awaiting Authority','Placed','In Repair','Completed','Cancelled','Total Loss']} placeholder="Select statuses..." /></div>
              <div><label className="block text-sm text-gray-600 mb-2">Claim Type</label><select value={formData.claim_type} onChange={(e) => handleChange('claim_type', e.target.value)} className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"><option>Credit Repair</option><option>Fault Claim</option><option>Non-Fault - Own Insurer</option><option>Non-Fault Claim</option><option>Total Loss</option><option>Glass Claim</option><option>Paying Privately</option></select></div>
              <div><label className="block text-sm text-gray-600 mb-2">Date of Loss</label><Input type="date" value={formData.loss_date} onChange={(e) => handleChange('loss_date', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
              <div><label className="block text-sm text-gray-600 mb-2">Time of Loss</label><Input type="time" value={formData.loss_time} onChange={(e) => handleChange('loss_time', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
              <div><label className="block text-sm text-gray-600 mb-2">Use of Vehicle</label><select value={formData.vehicle_use} onChange={(e) => handleChange('vehicle_use', e.target.value)} className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"><option value="">Not specified</option><option>Business</option><option>Social</option><option>Commuting</option></select></div>
            </div>
            <div><label className="block text-sm text-gray-600 mb-2">Incident Location</label><AddressLookupInput value={formData.incident_location} onChange={handleIncidentLocationChange} placeholder="Start typing address or postcode..." className="neomorph-inset" /></div>
            <div><label className="block text-sm text-gray-600 mb-2">Circumstances</label><Textarea value={formData.circumstances} onChange={(e) => handleChange('circumstances', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24" /></div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="text-sm text-gray-600 flex-1">Courtesy Car Required</span>
                <select value={formData.courtesy_car_required || 'No'} onChange={(e) => handleChange('courtesy_car_required', e.target.value)} className="neomorph-inset px-3 py-2 text-sm text-gray-700 border-0 rounded-xl">
                  {COURTESY_CAR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.has_third_party} onChange={(e) => handleCheckboxChange('has_third_party', e.target.checked)} className="neomorph-inset" /><span className="text-sm text-gray-600">Third Party Involved</span></label>
              <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.requires_indemnity} onChange={(e) => handleCheckboxChange('requires_indemnity', e.target.checked)} className="neomorph-inset" /><span className="text-sm text-gray-600">Indemnity Details Required</span></label>
            </div>
          </div>

          {/* Client */}
          <div className="neomorph-flat p-6 space-y-4">
            <h3 className="font-bold text-gray-700 mb-4">Client Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-600 mb-2">Client Name *</label>{isInternalUser ? <div className="flex gap-2"><div className="flex-1"><ClientCombobox value={formData.client_name} onChange={handleClientChange} /></div><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); console.log('[ClaimEditForm] Add Client modal clicked'); setShowClientModal(true); }} className="neomorph-flat p-3 rounded-lg"><Plus /></button></div> : <ClientCombobox value={formData.client_name} onChange={handleClientChange} />}</div>
              <div><label className="block text-sm text-gray-600 mb-2">Phone</label><Input value={formData.client_phone} onChange={(e) => handleChange('client_phone', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
              <div><label className="block text-sm text-gray-600 mb-2">Driver/Contact Name</label><Input value={formData.driver_contact_name} onChange={(e) => handleChange('driver_contact_name', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
            </div>
            {formData.driver_contact_name && (
              <div className="neomorph-inset p-4 mt-4 space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-200">Driver Contact Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Phone</label><Input value={formData.driver_contact_phone} onChange={(e) => handleChange('driver_contact_phone', e.target.value)} className="neomorph-inset px-3 py-2 text-sm" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Email</label><Input type="email" value={formData.driver_contact_email} onChange={(e) => handleChange('driver_contact_email', e.target.value)} className="neomorph-inset px-3 py-2 text-sm" /></div>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Address Line 1</label><Input value={formData.driver_contact_address_line_1} onChange={(e) => handleChange('driver_contact_address_line_1', e.target.value)} className="neomorph-inset px-3 py-2 text-sm" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Address Line 2</label><Input value={formData.driver_contact_address_line_2} onChange={(e) => handleChange('driver_contact_address_line_2', e.target.value)} className="neomorph-inset px-3 py-2 text-sm" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Town</label><Input value={formData.driver_contact_town} onChange={(e) => handleChange('driver_contact_town', e.target.value)} className="neomorph-inset px-3 py-2 text-sm" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">County</label><Input value={formData.driver_contact_county} onChange={(e) => handleChange('driver_contact_county', e.target.value)} className="neomorph-inset px-3 py-2 text-sm" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Postcode</label><Input value={formData.driver_contact_postcode} onChange={(e) => handleChange('driver_contact_postcode', e.target.value)} className="neomorph-inset px-3 py-2 text-sm" /></div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-600 mb-2">Email</label><Input type="email" value={formData.client_email} onChange={(e) => handleChange('client_email', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
            </div>
            <div><label className="block text-sm text-gray-600 mb-2">Address Line 1</label><Input value={formData.client_address_line_1} onChange={(e) => handleChange('client_address_line_1', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
            <div><label className="block text-sm text-gray-600 mb-2">Address Line 2</label><Input value={formData.client_address_line_2} onChange={(e) => handleChange('client_address_line_2', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="block text-sm text-gray-600 mb-2">Town</label><Input value={formData.client_town} onChange={(e) => handleChange('client_town', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
              <div><label className="block text-sm text-gray-600 mb-2">County</label><Input value={formData.client_county} onChange={(e) => handleChange('client_county', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
              <div><label className="block text-sm text-gray-600 mb-2">Postcode</label><Input value={formData.client_postcode} onChange={(e) => handleChange('client_postcode', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
            </div>
            <div><label className="block text-sm text-gray-600 mb-2">VAT Status</label><select value={formData.client_vat_status} onChange={(e) => handleChange('client_vat_status', e.target.value)} className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"><option>VAT Registered</option><option>Non-VAT</option><option>Unknown</option></select></div>
          </div>

          {/* Vehicle */}
          <div className="neomorph-flat p-6 space-y-4">
            <h3 className="font-bold text-gray-700 mb-4">Vehicle Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-600 mb-2">Vehicle Type</label><select value={formData.vehicle_type} onChange={(e) => handleChange('vehicle_type', e.target.value)} className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"><option>Car</option><option>Van</option><option>Motorcycle</option><option>HGV</option><option>Other</option></select></div>
              <div className="md:col-span-2"><label className="block text-sm text-gray-600 mb-2">Vehicle Location</label><AddressLookupInput value={formData.vehicle_location} onChange={handleVehicleLocationChange} placeholder="Start typing address..." className="neomorph-inset" /></div>
            </div>
            <div><label className="block text-sm text-gray-600 mb-2">Vehicle Damage</label><Textarea value={formData.vehicle_damage} onChange={(e) => handleChange('vehicle_damage', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24" /></div>
          </div>

          {/* Insurance */}
          <div className="neomorph-flat p-6 space-y-4">
            <h3 className="font-bold text-gray-700 mb-4">Insurance Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-600 mb-2">Insurer</label><InsurerCombobox value={formData.insurer} onChange={(v) => handleChange('insurer', v)} /></div>
              <div><label className="block text-sm text-gray-600 mb-2">Claim Reference</label><Input value={formData.claim_ref} onChange={(e) => handleChange('claim_ref', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
              <div><label className="block text-sm text-gray-600 mb-2">Policy Number</label><Input value={formData.policy_number} onChange={(e) => handleChange('policy_number', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
              <div><label className="block text-sm text-gray-600 mb-2">Policy Excess (£)</label><Input type="text" inputMode="decimal" value={formData.policy_excess || ''} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) handleChange('policy_excess', v === '' ? 0 : parseFloat(v) || 0); }} className="neomorph-inset px-4 py-3 text-gray-700 border-0" placeholder="0.00" /></div>
            </div>
          </div>

          {/* Referrer */}
          <div className="neomorph-flat p-6 space-y-4">
            <h3 className="font-bold text-gray-700 mb-4">Referrer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-600 mb-2">Referrer</label><ReferrerCombobox value={formData.referrer} onChange={handleReferrerChange} /></div>
              <div><label className="block text-sm text-gray-600 mb-2">Referrer Email</label><Input type="email" value={formData.referrer_email} onChange={(e) => handleChange('referrer_email', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
              <div><label className="block text-sm text-gray-600 mb-2">Referrer Ref</label><Input value={formData.referrer_ref} onChange={(e) => handleChange('referrer_ref', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
              <div><label className="block text-sm text-gray-600 mb-2">File Handler</label><Input value={formData.file_handler} onChange={(e) => handleChange('file_handler', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
            </div>
          </div>

          {/* Bodyshop */}
          <div className="neomorph-flat p-6 space-y-4">
            <h3 className="font-bold text-gray-700 mb-4">Bodyshop Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-600 mb-2">Bodyshop</label><BodyshopCombobox value={formData.bodyshop} onChange={handleBodyshopChange} /></div>
              <div><label className="block text-sm text-gray-600 mb-2">Bodyshop Email</label><Input type="email" value={formData.bodyshop_email} onChange={(e) => handleChange('bodyshop_email', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
            </div>
          </div>

          {/* Third Party */}
          {formData.has_third_party && (
            <div className="neomorph-flat p-6 space-y-4">
              <h3 className="font-bold text-gray-700 mb-4">Third Party Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-600 mb-2">Name</label><Input value={formData.tp_name} onChange={(e) => handleChange('tp_name', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                <div><label className="block text-sm text-gray-600 mb-2">Phone</label><Input value={formData.tp_phone} onChange={(e) => handleChange('tp_phone', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                <div><label className="block text-sm text-gray-600 mb-2">Email</label><Input type="email" value={formData.tp_email} onChange={(e) => handleChange('tp_email', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm text-gray-600 mb-2">Town</label><Input value={formData.tp_town} onChange={(e) => handleChange('tp_town', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                <div><label className="block text-sm text-gray-600 mb-2">County</label><Input value={formData.tp_county} onChange={(e) => handleChange('tp_county', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                <div><label className="block text-sm text-gray-600 mb-2">Postcode</label><Input value={formData.tp_postcode} onChange={(e) => handleChange('tp_postcode', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
              </div>
              <h4 className="font-semibold text-gray-700 mt-4">Third Party Vehicle</h4>
              <div className="flex gap-2">
                <Input value={formData.tp_reg} onChange={(e) => { handleChange('tp_reg', e.target.value.toUpperCase()); setTpVehicleLookupError(null); }} className="neomorph-inset px-4 py-3 text-gray-700 border-0 flex-1" placeholder="e.g. AB12 CDE" />
                <Button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); console.log('[ClaimEditForm] TP Vehicle Lookup clicked'); handleTPVehicleLookup(); }} disabled={isLookingUpTPVehicle || !formData.tp_reg} className="neomorph-flat px-4 py-3">
                  {isLookingUpTPVehicle ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {tpVehicleLookupError && <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg"><AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" /><p className="text-xs text-orange-800">{tpVehicleLookupError}</p></div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-600 mb-2">Make/Model</label><Input value={formData.tp_make_model} onChange={(e) => handleChange('tp_make_model', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                <div><label className="block text-sm text-gray-600 mb-2">Their Insurer</label><InsurerCombobox value={formData.tp_insurer} onChange={(v) => handleChange('tp_insurer', v)} /></div>
                <div><label className="block text-sm text-gray-600 mb-2">Their Claim Ref</label><Input value={formData.tp_claim_ref} onChange={(e) => handleChange('tp_claim_ref', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
                <div><label className="block text-sm text-gray-600 mb-2">Their Policy No.</label><Input value={formData.tp_policy_number} onChange={(e) => handleChange('tp_policy_number', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0" /></div>
              </div>
            </div>
          )}

          {formData.requires_indemnity && <ClaimIndemnityFields formData={formData} handleChange={handleChange} />}

          {/* Files */}
          <div className="neomorph-flat p-6 space-y-4">
            <h3 className="font-bold text-gray-700 mb-4">File Uploads</h3>
            <FileUpload value={Array.isArray(formData.file_urls) ? formData.file_urls : []} onChange={(urls) => handleChange('file_urls', urls)} enableAI={true} analysisType="claim" onAIExtract={handleAIExtract} />
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); console.log('[ClaimEditForm] Cancel clicked'); onCancel(); }} className="neomorph-flat px-6 py-3 font-medium text-gray-700 transition-all active:neomorph-pressed">Cancel</Button>
            <Button type="submit" onClick={(e) => { console.log('[ClaimEditForm] Update Claim submit clicked'); }} className="neomorph-flat px-6 py-3 font-medium text-blue-600 transition-all active:neomorph-pressed">Update Claim</Button>
          </div>
        </form>
      </div>
    </div>
  );
}