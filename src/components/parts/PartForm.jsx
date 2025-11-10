
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Check, Plus } from "lucide-react";
import FileUpload from '../shared/FileUpload';
import BodyshopCombobox from '../shared/BodyshopCombobox';
import SupplierCombobox from '../shared/SupplierCombobox';
import ManufacturerModelCombobox from '../shared/ManufacturerModelCombobox';
import WorkProviderCombobox from '../shared/WorkProviderCombobox';
import AddBodyshopModal from '../shared/AddBodyshopModal';
import AddSupplierModal from '../shared/AddSupplierModal';
import AddWorkProviderModal from '../shared/AddWorkProviderModal';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function PartForm({ part, onSubmit, onCancel }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showBodyshopModal, setShowBodyshopModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showWorkProviderModal, setShowWorkProviderModal] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(part || {
    job_number: '',
    vehicle_ref: '',
    date_requested: new Date().toISOString().split('T')[0],
    sourcing_status: 'New Request',
    manufacturer: '',
    part_description: '',
    part_number: '',
    bodyshop_company: '',
    contact_name: '',
    contact_number: '',
    contact_email: '',
    delivery_address: '',
    date_ordered: '',
    delivery_time_weeks: 0,
    work_provider: '',
    courtesy_vehicle_type: 'None',
    supplier: '',
    part_type: 'OEM',
    condition: 'New',
    file_urls: [],
  });

  // State to hold the full bodyshop object to derive address when checkbox changes
  const [selectedBodyshopData, setSelectedBodyshopData] = useState(null);

  const [sections, setSections] = useState({
    deliverySameAsCustomer: true,
  });

  const isEditing = !!part;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If creating a new part (not editing), generate job number
    if (!part) {
      try {
        const response = await base44.functions.invoke('generateJobNumber', {
          entityType: 'Part'
        });
        
        if (response.data.success) {
          const updatedFormData = { ...formData, job_number: response.data.job_number };
          onSubmit(updatedFormData);
          return;
        } else {
          console.error('Failed to generate job number:', response.data.error || 'Unknown error');
          alert('Failed to generate job number. Please try again.');
          return;
        }
      } catch (error) {
        console.error('Failed to generate job number:', error);
        alert('Failed to generate job number. Please try again.');
        return;
      }
    }
    
    // If editing or if new part job number generation is handled above, submit directly.
    // For new parts, the onSubmit with job_number would have already been called and returned.
    // So this line effectively only runs for editing existing parts.
    onSubmit(formData);
  };

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleBodyshopChange = (bodyshop) => {
    try {
      setSelectedBodyshopData(bodyshop);

      if (!bodyshop) {
        setFormData(prev => ({
          ...prev,
          bodyshop_company: '',
          contact_name: '',
          contact_number: '',
          contact_email: '',
          delivery_address: '',
        }));
        return;
      }

      const address = [
        bodyshop.address_line_1,
        bodyshop.address_line_2,
        bodyshop.town,
        bodyshop.county,
        bodyshop.postcode
      ].filter(Boolean).join(', ');

      setFormData(prev => ({
        ...prev,
        bodyshop_company: bodyshop.name,
        contact_name: bodyshop.contact_name || '',
        contact_number: bodyshop.phone || '',
        contact_email: bodyshop.email || '',
        delivery_address: sections.deliverySameAsCustomer ? address : prev.delivery_address,
      }));
    } catch (error) {
      console.error("[PartForm] Error in handleBodyshopChange:", error);
      alert("Error updating bodyshop information: " + error.message);
    }
  };

  const handleSupplierChange = (supplier) => {
    setFormData(prev => ({
      ...prev,
      supplier: supplier ? supplier.name : ''
    }));
  };

  const handleWorkProviderChange = (workProvider) => {
    setFormData(prev => ({
      ...prev,
      work_provider: workProvider ? workProvider.name : ''
    }));
  };

  const handleDeliveryCheckboxChange = (checked) => {
    setSections(prev => ({ ...prev, deliverySameAsCustomer: checked }));
    if (checked && selectedBodyshopData) {
      const address = [
        selectedBodyshopData.address_line_1,
        selectedBodyshopData.address_line_2,
        selectedBodyshopData.town,
        selectedBodyshopData.county,
        selectedBodyshopData.postcode
      ].filter(Boolean).join(', ');
      handleChange('delivery_address', address);
    } else if (!checked) {
      handleChange('delivery_address', '');
    }
  };

  const handleBodyshopModalSuccess = (newBodyshop) => {
    queryClient.invalidateQueries({ queryKey: ['bodyshops'] });
    handleBodyshopChange(newBodyshop);
    setShowBodyshopModal(false);
  };

  const handleSupplierModalSuccess = (newSupplier) => {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    handleSupplierChange(newSupplier);
    setShowSupplierModal(false);
  };

  const handleWorkProviderModalSuccess = (newWorkProvider) => {
    queryClient.invalidateQueries({ queryKey: ['workProviders'] });
    handleWorkProviderChange(newWorkProvider);
    setShowWorkProviderModal(false);
  };

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const steps = [
    { number: 1, title: "Basic Info" },
    { number: 2, title: "Customer Details" },
    { number: 3, title: "Order Details" },
    { number: 4, title: "Review" },
  ];

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return !!formData.vehicle_ref;
      case 2:
        return !!formData.bodyshop_company;
      case 3:
        return true;
      default:
        return true;
    }
  };

  // If editing, show traditional form
  if (isEditing) {
    return (
      <div className="space-y-6">
        {/* Modals for editing mode */}
        <AddBodyshopModal isOpen={showBodyshopModal} onClose={() => setShowBodyshopModal(false)} onSuccess={handleBodyshopModalSuccess} />
        <AddSupplierModal isOpen={showSupplierModal} onClose={() => setShowSupplierModal(false)} onSuccess={handleSupplierModalSuccess} />
        <AddWorkProviderModal isOpen={showWorkProviderModal} onClose={() => setShowWorkProviderModal(false)} onSuccess={handleWorkProviderModalSuccess} />

        <div className="neomorph p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button onClick={onCancel} className="neomorph-flat p-3"><ArrowLeft className="w-4" /></Button>
            <h1 className="text-2xl font-bold text-gray-700">Edit Part Request</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="neomorph-flat p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Job Number</label>
                <Input
                  value={formData.job_number}
                  readOnly
                  className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Vehicle Ref</label>
                <Input
                  placeholder="Vehicle Ref"
                  value={formData.vehicle_ref}
                  onChange={e => handleChange('vehicle_ref', e.target.value)}
                  className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Status</label>
                <select
                  value={formData.sourcing_status}
                  onChange={e => handleChange('sourcing_status', e.target.value)}
                  className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                >
                  <option>New Request</option>
                  <option>Searching</option>
                  <option>Found</option>
                  <option>Ordered</option>
                  <option>Delivered</option>
                  <option>Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Date Requested</label>
                <Input
                  type="date"
                  value={formData.date_requested}
                  onChange={e => handleChange('date_requested', e.target.value)}
                  className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                />
              </div>
            </div>

            <div className="neomorph-flat p-6 space-y-4">
              <h3 className="font-bold text-gray-700 mb-4">Part Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Manufacturer & Model</label>
                  <ManufacturerModelCombobox
                    value={formData.manufacturer}
                    onChange={(value) => handleChange('manufacturer', value)}
                    placeholder="Select make & model..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Part Number</label>
                  <Input
                    placeholder="Part Number"
                    value={formData.part_number}
                    onChange={e => handleChange('part_number', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    maxLength={50}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Part Description</label>
                <Textarea
                  placeholder="Part Description"
                  value={formData.part_description}
                  onChange={e => handleChange('part_description', e.target.value)}
                  className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24"
                  maxLength={50}
                />
              </div>
            </div>

            <div className="neomorph-flat p-6 space-y-4">
              <h3 className="font-bold text-gray-700 mb-4">Bodyshop & Contact Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Bodyshop Company</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <BodyshopCombobox value={formData.bodyshop_company} onChange={handleBodyshopChange} />
                    </div>
                    <Button 
                      type="button"
                      onClick={() => setShowBodyshopModal(true)}
                      className="neomorph-flat p-3"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Contact Name</label>
                  <Input
                    placeholder="Auto-filled"
                    value={formData.contact_name}
                    onChange={e => handleChange('contact_name', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Contact Number</label>
                  <Input
                    placeholder="Auto-filled"
                    value={formData.contact_number}
                    onChange={e => handleChange('contact_number', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Contact Email</label>
                  <Input
                    type="email"
                    placeholder="Auto-filled"
                    value={formData.contact_email}
                    onChange={e => handleChange('contact_email', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Delivery Address</label>
                <Textarea
                  placeholder="Auto-filled"
                  value={formData.delivery_address}
                  onChange={e => handleChange('delivery_address', e.target.value)}
                  className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-20"
                />
              </div>
            </div>

            <div className="neomorph-flat p-6 space-y-4">
              <h3 className="font-bold text-gray-700 mb-4">Order Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Date of Initial Order</label>
                  <Input
                    type="date"
                    value={formData.date_ordered}
                    onChange={e => handleChange('date_ordered', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Expected Delivery Time</label>
                  <select
                    value={formData.delivery_time_weeks}
                    onChange={e => handleChange('delivery_time_weeks', parseInt(e.target.value))}
                    className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                  >
                    <option value={0}>No Date</option>
                    <option value={1}>1 Week</option>
                    <option value={2}>2 Weeks</option>
                    <option value={3}>3 Weeks</option>
                    <option value={4}>4 Weeks</option>
                    <option value={6}>6 Weeks</option>
                    <option value={8}>8 Weeks</option>
                    <option value={12}>12 Weeks</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Work Provider</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <WorkProviderCombobox
                        value={formData.work_provider}
                        onChange={handleWorkProviderChange}
                      />
                    </div>
                    <Button 
                      type="button"
                      onClick={() => setShowWorkProviderModal(true)}
                      className="neomorph-flat p-3"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Courtesy Vehicle</label>
                  <select
                    value={formData.courtesy_vehicle_type}
                    onChange={e => handleChange('courtesy_vehicle_type', e.target.value)}
                    className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                  >
                    <option value="None">None</option>
                    <option value="Credit Hire">Credit Hire</option>
                    <option value="Repairers Courtesy Vehicle">Repairers Courtesy Vehicle</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="neomorph-flat p-6 space-y-4">
              <h3 className="font-bold text-gray-700 mb-4">Supplier & Sourcing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Supplier</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SupplierCombobox value={formData.supplier} onChange={handleSupplierChange} />
                    </div>
                    <Button 
                      type="button"
                      onClick={() => setShowSupplierModal(true)}
                      className="neomorph-flat p-3"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Part Type</label>
                  <select
                    value={formData.part_type}
                    onChange={e => handleChange('part_type', e.target.value)}
                    className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                  >
                    <option>OEM</option>
                    <option>Aftermarket</option>
                    <option>Recycled</option>
                    <option>Refurbished</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={e => handleChange('condition', e.target.value)}
                    className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                  >
                    <option>New</option>
                    <option>Used</option>
                    <option>Refurbished</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="neomorph-flat p-6 space-y-4">
              <h3 className="font-bold text-gray-700 mb-4">File Uploads</h3>
              <FileUpload value={Array.isArray(formData.file_urls) ? formData.file_urls : []} onChange={(urls) => handleChange('file_urls', urls)} />
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" onClick={onCancel} className="neomorph-flat px-6 py-3">Cancel</Button>
              <Button type="submit" className="neomorph-flat px-6 py-3 text-blue-600">Update Request</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Wizard mode for new parts
  return (
    <div className="space-y-6">
      {/* Modals for wizard mode */}
      <AddBodyshopModal isOpen={showBodyshopModal} onClose={() => setShowBodyshopModal(false)} onSuccess={handleBodyshopModalSuccess} />
      <AddSupplierModal isOpen={showSupplierModal} onClose={() => setShowSupplierModal(false)} onSuccess={handleSupplierModalSuccess} />
      <AddWorkProviderModal isOpen={showWorkProviderModal} onClose={() => setShowWorkProviderModal(false)} onSuccess={handleWorkProviderModalSuccess} />

      <div className="neomorph p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={onCancel} className="neomorph-flat p-3 transition-all active:neomorph-pressed">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-700">New Part Request</h1>
            <p className="text-sm text-gray-500 mt-1">Step {currentStep} of {steps.length}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  currentStep > step.number
                    ? 'bg-green-600 text-white'
                    : currentStep === step.number
                      ? 'bg-gold text-black'
                      : 'bg-gray-300 text-gray-600'
                }`}>
                  {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
                </div>
                <span className="text-xs text-gray-500 mt-2 hidden md:block">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 transition-all ${
                  currentStep > step.number ? 'bg-green-600' : 'bg-gray-300'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="neomorph-flat p-6 space-y-6">
              <h3 className="text-xl font-bold text-gray-700 mb-4">Let's start with the basics</h3>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Vehicle Registration *</label>
                <Input
                  value={formData.vehicle_ref}
                  onChange={(e) => handleChange('vehicle_ref', e.target.value)}
                  className="neomorph-inset px-4 py-3 text-gray-700 border-0 text-lg"
                  placeholder="e.g. AB12 CDE"
                  maxLength={10}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Manufacturer & Model</label>
                <ManufacturerModelCombobox
                  value={formData.manufacturer}
                  onChange={(value) => handleChange('manufacturer', value)}
                  placeholder="Select make & model..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Part Description</label>
                <Input
                  value={formData.part_description}
                  onChange={(e) => handleChange('part_description', e.target.value)}
                  className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  placeholder="Brief description of the part needed..."
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Part Number</label>
                <Input
                  value={formData.part_number}
                  onChange={(e) => handleChange('part_number', e.target.value)}
                  className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  placeholder="If known"
                  maxLength={50}
                />
              </div>
            </div>
          )}

          {/* Step 2: Customer Details */}
          {currentStep === 2 && (
            <div className="neomorph-flat p-6 space-y-6">
              <h3 className="text-xl font-bold text-gray-700 mb-4">Customer & Delivery Details</h3>
              <p className="text-sm text-gray-500 mb-4">Select the bodyshop or customer for this parts request</p>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Customer (Bodyshop) *</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <BodyshopCombobox
                      value={formData.bodyshop_company}
                      onChange={handleBodyshopChange}
                    />
                  </div>
                  <Button 
                    type="button"
                    onClick={() => setShowBodyshopModal(true)}
                    className="neomorph-flat p-3"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Contact Name</label>
                  <Input
                    value={formData.contact_name}
                    onChange={(e) => handleChange('contact_name', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    placeholder="Auto-filled from selection"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Contact Number</label>
                  <Input
                    value={formData.contact_number}
                    onChange={(e) => handleChange('contact_number', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    placeholder="Auto-filled from selection"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-2">Contact Email</label>
                  <Input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleChange('contact_email', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                    placeholder="Auto-filled from selection"
                  />
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="delivery_same"
                    checked={sections.deliverySameAsCustomer}
                    onChange={(e) => handleDeliveryCheckboxChange(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <label htmlFor="delivery_same" className="text-sm text-gray-600">
                    Delivery address same as customer address
                  </label>
                </div>

                {!sections.deliverySameAsCustomer && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Delivery Address</label>
                    <Textarea
                      value={formData.delivery_address}
                      onChange={(e) => handleChange('delivery_address', e.target.value)}
                      className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-24"
                      placeholder="Enter delivery address if different from customer address..."
                    />
                  </div>
                )}

                {sections.deliverySameAsCustomer && formData.delivery_address && (
                  <div className="neomorph-inset p-4 bg-gray-50">
                    <p className="text-sm text-gray-500 mb-1">Delivery Address:</p>
                    <p className="text-sm text-gray-700">{formData.delivery_address}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Order Details */}
          {currentStep === 3 && (
            <div className="neomorph-flat p-6 space-y-6">
              <h3 className="text-xl font-bold text-gray-700 mb-4">Order Details</h3>
              <p className="text-sm text-gray-500 mb-6">Additional information about this parts request</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Date of Initial Order</label>
                  <Input
                    type="date"
                    value={formData.date_ordered}
                    onChange={(e) => handleChange('date_ordered', e.target.value)}
                    className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Expected Time of Delivery</label>
                  <select
                    value={formData.delivery_time_weeks}
                    onChange={(e) => handleChange('delivery_time_weeks', parseInt(e.target.value))}
                    className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                  >
                    <option value={0}>No Date</option>
                    <option value={1}>1 Week</option>
                    <option value={2}>2 Weeks</option>
                    <option value={3}>3 Weeks</option>
                    <option value={4}>4 Weeks</option>
                    <option value={6}>6 Weeks</option>
                    <option value={8}>8 Weeks</option>
                    <option value={12}>12 Weeks</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Work Provider</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <WorkProviderCombobox
                        value={formData.work_provider}
                        onChange={handleWorkProviderChange}
                      />
                    </div>
                    <Button 
                      type="button"
                      onClick={() => setShowWorkProviderModal(true)}
                      className="neomorph-flat p-3"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Is Driver in a Courtesy Vehicle?</label>
                  <select
                    value={formData.courtesy_vehicle_type}
                    onChange={(e) => handleChange('courtesy_vehicle_type', e.target.value)}
                    className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                  >
                    <option value="None">None</option>
                    <option value="Credit Hire">Credit Hire</option>
                    <option value="Repairers Courtesy Vehicle">Repairers Courtesy Vehicle</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Final Step: Review */}
          {currentStep === steps.length && (
            <div className="neomorph-flat p-6 space-y-6">
              <h3 className="text-xl font-bold text-gray-700 mb-4">Review & Create</h3>
              <p className="text-sm text-gray-500 mb-6">Check the details below. You can edit any section after creating the request.</p>

              <div className="space-y-4">
                {formData.job_number && (
                  <div className="neomorph-inset p-4">
                    <p className="text-sm text-gray-500 mb-2">Job Number</p>
                    <p className="font-bold text-lg text-gold">{formData.job_number}</p>
                  </div>
                )}
                <div className="neomorph-inset p-4">
                  <p className="text-sm text-gray-500 mb-2">Vehicle Reference</p>
                  <p className="font-bold text-lg text-gold">{formData.vehicle_ref}</p>
                </div>

                <div className="neomorph-inset p-4">
                  <p className="text-sm text-gray-500 mb-2">Manufacturer & Model</p>
                  <p className="font-medium text-gray-700">{formData.manufacturer || 'Not specified'}</p>
                </div>

                <div className="neomorph-inset p-4">
                  <p className="text-sm text-gray-500 mb-2">Part Description</p>
                  <p className="font-medium text-gray-700">{formData.part_description || 'Not specified'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="neomorph-inset p-4">
                    <p className="text-sm text-gray-500 mb-2">Part Number</p>
                    <p className="font-medium text-gray-700">{formData.part_number || 'Not specified'}</p>
                  </div>

                  <div className="neomorph-inset p-4">
                    <p className="text-sm text-gray-500 mb-2">Part Type</p>
                    <p className="font-medium text-gray-700">{formData.part_type}</p>
                  </div>

                  <div className="neomorph-inset p-4">
                    <p className="text-sm text-gray-500 mb-2">Condition</p>
                    <p className="font-medium text-gray-700">{formData.condition}</p>
                  </div>

                  <div className="neomorph-inset p-4">
                    <p className="text-sm text-gray-500 mb-2">Date Ordered</p>
                    <p className="font-medium text-gray-700">{formData.date_ordered || 'Not specified'}</p>
                  </div>

                  <div className="neomorph-inset p-4">
                    <p className="text-sm text-gray-500 mb-2">Expected Delivery</p>
                    <p className="font-medium text-gray-700">
                      {formData.delivery_time_weeks === 0 ? 'No Date' : `${formData.delivery_time_weeks} Week(s)`}
                    </p>
                  </div>
                </div>

                {formData.bodyshop_company && (
                  <div className="neomorph-inset p-4">
                    <p className="text-sm text-gray-500 mb-2">Customer</p>
                    <p className="font-medium text-gray-700">{formData.bodyshop_company}</p>
                    {formData.contact_name && <p className="text-sm text-gray-600">Contact: {formData.contact_name}</p>}
                    {formData.contact_number && <p className="text-sm text-gray-600">Tel: {formData.contact_number}</p>}
                    {formData.contact_email && <p className="text-sm text-gray-600">Email: {formData.contact_email}</p>}
                    {formData.delivery_address && (
                      <p className="text-sm text-gray-600 mt-2">Delivery Address: {formData.delivery_address}</p>
                    )}
                  </div>
                )}

                {formData.work_provider && (
                  <div className="neomorph-inset p-4">
                    <p className="text-sm text-gray-500 mb-2">Work Provider</p>
                    <p className="font-medium text-gray-700">{formData.work_provider}</p>
                  </div>
                )}

                {formData.courtesy_vehicle_type !== 'None' && (
                  <div className="neomorph-inset p-4">
                    <p className="text-sm text-gray-500 mb-2">Courtesy Vehicle</p>
                    <p className="font-medium text-gray-700">{formData.courtesy_vehicle_type}</p>
                  </div>
                )}

                {formData.supplier && (
                  <div className="neomorph-inset p-4">
                    <p className="text-sm text-gray-500 mb-2">Supplier</p>
                    <p className="font-medium text-gray-700">{formData.supplier}</p>
                  </div>
                )}
              </div>

              <div className="neomorph-flat p-6">
                <h4 className="font-semibold text-gray-700 mb-4">Upload Files (Optional)</h4>
                <FileUpload
                  value={Array.isArray(formData.file_urls) ? formData.file_urls : []}
                  onChange={(urls) => handleChange('file_urls', urls)}
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {currentStep > 1 && (
              <Button
                type="button"
                onClick={prevStep}
                className="neomorph-flat px-6 py-3 font-medium text-gray-700 transition-all active:neomorph-pressed flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Button>
            )}

            <div className="flex-1" />

            {currentStep < steps.length && (
              <Button
                type="button"
                onClick={nextStep}
                className="neomorph-flat px-6 py-3 font-medium text-blue-600 transition-all active:neomorph-pressed flex items-center gap-2"
                disabled={!canGoNext()}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}

            {currentStep === steps.length && (
              <Button
                type="submit"
                className="neomorph-flat px-8 py-3 font-medium text-gold transition-all active:neomorph-pressed flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Create Request
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
