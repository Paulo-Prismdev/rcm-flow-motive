import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation } from '@tanstack/react-query';
import AddressLookupInput from './AddressLookupInput';

export default function AddClientModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address_line_1: '',
    address_line_2: '',
    town: '',
    county: '',
    postcode: '',
    latitude: null,
    longitude: null
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: (newClient) => {
      if (onSuccess) onSuccess(newClient);
      handleClose();
    },
  });

  const handleClose = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address_line_1: '',
      address_line_2: '',
      town: '',
      county: '',
      postcode: '',
      latitude: null,
      longitude: null
    });
    onClose();
  };

  const handleAddressChange = (addressData) => {
    setFormData(prev => ({
      ...prev,
      address_line_1: addressData.address_line_1 || '',
      address_line_2: addressData.address_line_2 || '',
      town: addressData.town || '',
      county: addressData.county || '',
      postcode: addressData.postcode || '',
      latitude: addressData.latitude,
      longitude: addressData.longitude
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="neomorph p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-700">Add New Client</h2>
          <Button onClick={handleClose} variant="ghost" size="icon" className="neomorph-flat p-2">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="neomorph-inset px-4 py-3 text-gray-700 border-0"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Phone *</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="neomorph-inset px-4 py-3 text-gray-700 border-0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Address Lookup</label>
            <AddressLookupInput
              value={formData.address_line_1}
              onChange={handleAddressChange}
              placeholder="Start typing address or postcode..."
              className="neomorph-inset"
            />
            <p className="text-xs text-gray-500 mt-1">Start typing to search, or fill in fields manually below</p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Address Line 1</label>
            <Input
              value={formData.address_line_1}
              onChange={(e) => setFormData({...formData, address_line_1: e.target.value})}
              className="neomorph-inset px-4 py-3 text-gray-700 border-0"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Address Line 2</label>
            <Input
              value={formData.address_line_2}
              onChange={(e) => setFormData({...formData, address_line_2: e.target.value})}
              className="neomorph-inset px-4 py-3 text-gray-700 border-0"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Town</label>
              <Input
                value={formData.town}
                onChange={(e) => setFormData({...formData, town: e.target.value})}
                className="neomorph-inset px-4 py-3 text-gray-700 border-0"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">County</label>
              <Input
                value={formData.county}
                onChange={(e) => setFormData({...formData, county: e.target.value})}
                className="neomorph-inset px-4 py-3 text-gray-700 border-0"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Postcode</label>
              <Input
                value={formData.postcode}
                onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                className="neomorph-inset px-4 py-3 text-gray-700 border-0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" onClick={handleClose} className="neomorph-flat px-6 py-3">
              Cancel
            </Button>
            <Button type="submit" className="neomorph-flat px-6 py-3 text-blue-600" disabled={createMutation.isLoading}>
              {createMutation.isLoading ? 'Creating...' : 'Create Client'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}