import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Loader, X, ChevronDown } from 'lucide-react';
import AddressLookupInput from './AddressLookupInput';
import { VEHICLE_MANUFACTURERS } from './vehicleManufacturers';

export default function AddSupplierModal({ isOpen, onClose, onSuccess, editingSupplier = null }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    phone: '',
    emails: [],
    address_line_1: '',
    address_line_2: '',
    town: '',
    county: '',
    postcode: '',
    website: '',
    account_number: '',
    notes: '',
    manufacturer_associations: [],
  });
  const [newEmail, setNewEmail] = useState('');
  const [showManufacturers, setShowManufacturers] = useState(false);

  useEffect(() => {
    if (editingSupplier) {
      setFormData({
        name: editingSupplier.name || '',
        contact_name: editingSupplier.contact_name || '',
        phone: editingSupplier.phone || '',
        emails: editingSupplier.emails || (editingSupplier.email ? [editingSupplier.email] : []),
        address_line_1: editingSupplier.address_line_1 || '',
        address_line_2: editingSupplier.address_line_2 || '',
        town: editingSupplier.town || '',
        county: editingSupplier.county || '',
        postcode: editingSupplier.postcode || '',
        website: editingSupplier.website || '',
        account_number: editingSupplier.account_number || '',
        notes: editingSupplier.notes || '',
        manufacturer_associations: editingSupplier.manufacturer_associations || [],
      });
    }
  }, [editingSupplier]);

  const createMutation = useMutation({
    mutationFn: (data) => editingSupplier 
      ? base44.entities.Supplier.update(editingSupplier.id, data)
      : base44.entities.Supplier.create(data),
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

    if (!formData.name || !formData.contact_name || !formData.phone || !formData.emails || formData.emails.length === 0) {
      alert('Please fill in all required fields: Name, Contact Name, Phone, and at least one Email.');
      return;
    }

    createMutation.mutate(formData);
  };

  const handleAddEmail = () => {
    if (!newEmail.trim()) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    if (formData.emails.includes(newEmail)) {
      alert('This email has already been added');
      return;
    }

    setFormData({
      ...formData,
      emails: [...formData.emails, newEmail]
    });
    setNewEmail('');
  };

  const handleRemoveEmail = (emailToRemove) => {
    setFormData({
      ...formData,
      emails: formData.emails.filter(e => e !== emailToRemove)
    });
  };

  const handleManufacturerToggle = (manufacturer) => {
    setFormData(prev => {
      const current = prev.manufacturer_associations || [];
      const isSelected = current.includes(manufacturer);
      return {
        ...prev,
        manufacturer_associations: isSelected
          ? current.filter(m => m !== manufacturer)
          : [...current, manufacturer]
      };
    });
  };

  const handleClose = () => {
    setFormData({
      name: '',
      contact_name: '',
      phone: '',
      emails: [],
      address_line_1: '',
      address_line_2: '',
      town: '',
      county: '',
      postcode: '',
      website: '',
      account_number: '',
      notes: '',
      manufacturer_associations: [],
    });
    setNewEmail('');
    setShowManufacturers(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="neomorph p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-700">
            {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
          </h2>
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
            <label className="block text-sm text-gray-600 mb-2">Email Addresses *</label>
            <div className="neomorph-inset p-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEmail();
                    }
                  }}
                  className="flex-1"
                  placeholder="Enter email address"
                />
                <Button
                  type="button"
                  onClick={handleAddEmail}
                  className="neomorph-flat px-4"
                >
                  Add
                </Button>
              </div>
              
              {formData.emails.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-border">
                  {formData.emails.map((email, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded bg-surface hover:bg-surface-hover">
                      <span className="text-sm">{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {formData.emails.length === 0 && (
                <p className="text-xs text-gray-500">At least one email address is required</p>
              )}
            </div>
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

          <div>
            <label className="block text-sm text-gray-600 mb-2">Manufacturer Associations</label>
            <div className="neomorph-inset p-3">
              <Button
                type="button"
                onClick={() => setShowManufacturers(!showManufacturers)}
                className="w-full flex items-center justify-between mb-2 neomorph-flat"
              >
                <span className="text-sm">
                  {formData.manufacturer_associations?.length > 0
                    ? `${formData.manufacturer_associations.length} manufacturer(s) selected`
                    : 'Select manufacturers...'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showManufacturers ? 'rotate-180' : ''}`} />
              </Button>

              {showManufacturers && (
                <div className="max-h-48 overflow-y-auto space-y-2 border border-border rounded-lg p-2">
                  {VEHICLE_MANUFACTURERS.map((manufacturer) => (
                    <label
                      key={manufacturer}
                      className="flex items-center gap-2 p-2 hover:bg-surface-hover rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={formData.manufacturer_associations?.includes(manufacturer)}
                        onCheckedChange={() => handleManufacturerToggle(manufacturer)}
                      />
                      <span className="text-sm">{manufacturer}</span>
                    </label>
                  ))}
                </div>
              )}

              {formData.manufacturer_associations?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {formData.manufacturer_associations.map((mfr) => (
                    <span
                      key={mfr}
                      className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent flex items-center gap-1"
                    >
                      {mfr}
                      <button
                        type="button"
                        onClick={() => handleManufacturerToggle(mfr)}
                        className="hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Select which vehicle manufacturers this supplier can supply parts for</p>
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
                editingSupplier ? 'Update Supplier' : 'Create Supplier'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}