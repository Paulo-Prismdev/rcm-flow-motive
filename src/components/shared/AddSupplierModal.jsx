
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Loader, X } from 'lucide-react';
import AddressLookupInput from './AddressLookupInput';

export default function AddSupplierModal({ isOpen, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '', // Changed from initialName, as initialName prop is removed
    contact_name: '',
    phone: '',
    email: '',
    address_line_1: '',
    address_line_2: '',
    town: '',
    county: '',
    postcode: '',
    website: '',
    account_number: '',
    notes: '',
  });

  // Removed useEffect for initialName as the prop is no longer passed

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create(data),
    onSuccess: (newSupplier) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      onSuccess(newSupplier);
      handleClose();
    },
    onError: (error) => {
      alert("Failed to add supplier: " + error.message);
    },
  });

  const handleAddressChange = (addressData) => {
    setFormData(prev => ({
      ...prev,
      address_line_1: addressData.address_line_1 || '',
      address_line_2: addressData.address_line_2 || '',
      town: addressData.town || '',
      county: addressData.county || '',
      postcode: addressData.postcode || ''
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!formData.name || !formData.contact_name || !formData.phone || !formData.email) {
      alert('Please fill in all required fields: Name, Contact Name, Phone, Email.');
      return;
    }

    createMutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      address_line_1: '',
      address_line_2: '',
      town: '',
      county: '',
      postcode: '',
      website: '',
      account_number: '',
      notes: '',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="neomorph p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-700">Add New Supplier</h2>
          <Button onClick={handleClose} variant="ghost" size="icon" disabled={createMutation.isPending}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Supplier Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="neomorph-inset"
              required
              placeholder="Supplier Company Name"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Contact Name *</label>
            <Input
              value={formData.contact_name}
              onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
              className="neomorph-inset"
              required
              placeholder="Main Contact Person"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Phone *</label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="neomorph-inset"
              required
              placeholder="Phone Number"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Email *</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="neomorph-inset"
              required
              placeholder="Email Address"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Website</label>
            <Input
              value={formData.website}
              onChange={(e) => setFormData({...formData, website: e.target.value})}
              className="neomorph-inset"
              placeholder="https://www.example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Account Number</label>
            <Input
              value={formData.account_number}
              onChange={(e) => setFormData({...formData, account_number: e.target.value})}
              className="neomorph-inset"
              placeholder="Your account number with this supplier"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Address Lookup</label>
            <AddressLookupInput
              value={formData.address_line_1} // Use address_line_1 to seed the lookup input
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
              className="neomorph-inset"
              placeholder="Street Address"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Address Line 2</label>
            <Input
              value={formData.address_line_2}
              onChange={(e) => setFormData({...formData, address_line_2: e.target.value})}
              className="neomorph-inset"
              placeholder="Apartment, suite, etc. (optional)"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Town</label>
              <Input
                value={formData.town}
                onChange={(e) => setFormData({...formData, town: e.target.value})}
                className="neomorph-inset"
                placeholder="Town or City"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">County</label>
              <Input
                value={formData.county}
                onChange={(e) => setFormData({...formData, county: e.target.value})}
                className="neomorph-inset"
                placeholder="County or State"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Postcode</label>
              <Input
                value={formData.postcode}
                onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                className="neomorph-inset"
                placeholder="Postal Code"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Notes</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="neomorph-inset h-24"
              placeholder="Additional notes about this supplier..."
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="neomorph-flat px-6 py-3"
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="neomorph-flat px-6 py-3 text-gold"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Supplier'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
