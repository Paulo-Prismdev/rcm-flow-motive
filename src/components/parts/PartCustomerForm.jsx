import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import BodyshopCombobox from '../shared/BodyshopCombobox';
import AddBodyshopModal from '../shared/AddBodyshopModal';
import AddressLookupInput from '../shared/AddressLookupInput';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function PartCustomerForm({ part, onSave, onCancel }) {
  const [showBodyshopModal, setShowBodyshopModal] = useState(false);
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    bodyshop_company: part.bodyshop_company || '',
    contact_name: part.contact_name || '',
    contact_number: part.contact_number || '',
    contact_email: part.contact_email || '',
    delivery_address: part.delivery_address || '',
  });

  const handleBodyshopChange = (bodyshop) => {
    if (!bodyshop) return;
    
    const address = [
      bodyshop.address_line_1,
      bodyshop.address_line_2,
      bodyshop.town,
      bodyshop.county,
      bodyshop.postcode
    ].filter(Boolean).join(', ');

    setFormData({
      bodyshop_company: bodyshop.name,
      contact_name: bodyshop.contact_name || '',
      contact_number: bodyshop.phone || '',
      contact_email: bodyshop.email || '',
      delivery_address: address,
    });
  };

  const handleBodyshopModalSuccess = (newBodyshop) => {
    queryClient.invalidateQueries({ queryKey: ['bodyshops'] });
    handleBodyshopChange(newBodyshop);
    setShowBodyshopModal(false);
  };

  const handleAddressChange = (addressData) => {
    setFormData(prev => ({
      ...prev,
      delivery_address: addressData.display_name || addressData.address || ''
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <>
      <AddBodyshopModal 
        isOpen={showBodyshopModal} 
        onClose={() => setShowBodyshopModal(false)} 
        onSuccess={handleBodyshopModalSuccess} 
      />
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-2">Bodyshop Company</label>
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
        <div>
          <label className="block text-sm text-gray-600 mb-2">Contact Name</label>
          <Input
            value={formData.contact_name}
            onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Contact Number</label>
          <Input
            value={formData.contact_number}
            onChange={(e) => setFormData({...formData, contact_number: e.target.value})}
            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Contact Email</label>
          <Input
            type="email"
            value={formData.contact_email}
            onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Delivery Address</label>
          <AddressLookupInput
            value={formData.delivery_address}
            onChange={handleAddressChange}
            placeholder="Start typing address or postcode..."
            className="neomorph-inset"
          />
          <p className="text-xs text-gray-500 mt-1">Or enter manually in the field below</p>
          <Textarea
            value={formData.delivery_address}
            onChange={(e) => setFormData({...formData, delivery_address: e.target.value})}
            className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-20 mt-2"
            placeholder="Full delivery address"
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" onClick={onCancel} className="neomorph-flat px-6 py-2">Cancel</Button>
          <Button type="submit" className="neomorph-flat px-6 py-2 text-blue-600">Save</Button>
        </div>
      </form>
    </>
  );
}