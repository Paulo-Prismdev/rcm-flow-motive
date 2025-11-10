
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Loader, X } from 'lucide-react';
import AddressLookupInput from './AddressLookupInput'; // New import

export default function AddBodyshopModal({ isOpen, onClose, onSuccess, initialName = '' }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: initialName || '',
    contact_name: '',
    phone: '',
    email: '',
    address_line_1: '',
    address_line_2: '',
    town: '',
    county: '',
    postcode: '',
    latitude: null, // Added latitude to formData
    longitude: null  // Added longitude to formData
  });

  // isGeocoding state is removed as geocoding is now handled by AddressLookupInput
  // and latitude/longitude are directly added to formData.

  useEffect(() => {
    if (initialName) {
      setFormData(prev => ({ ...prev, name: initialName }));
    }
  }, [initialName]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log("[AddBodyshopModal] createMutation starting with data:", data);
      
      // Geocoding logic is removed from here as AddressLookupInput should provide latitude/longitude
      // The data object should already contain latitude and longitude if an address was selected via lookup.
      
      const newBodyshop = await base44.entities.Bodyshop.create(data); // Pass data directly, including lat/lng
      console.log("[AddBodyshopModal] Bodyshop created successfully:", newBodyshop);
      return newBodyshop;
    },
    onSuccess: (newBodyshop) => {
      console.log("[AddBodyshopModal] onSuccess called with:", newBodyshop);
      queryClient.invalidateQueries({ queryKey: ['bodyshops'] });
      onSuccess(newBodyshop);
      handleClose();
    },
    onError: (error) => {
      console.error("[AddBodyshopModal] Mutation error:", error);
      alert("Failed to add bodyshop: " + error.message);
    },
  });

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
    console.log("[AddBodyshopModal] handleSubmit called");
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("[AddBodyshopModal] Validating form data:", formData);
    
    if (!formData.name || !formData.contact_name || !formData.phone || !formData.email) {
      console.log("[AddBodyshopModal] Validation failed");
      alert('Please fill in all required fields: Name, Contact Name, Phone, Email.');
      return;
    }

    console.log("[AddBodyshopModal] Validation passed, calling mutation");
    createMutation.mutate(formData);
  };

  const handleClose = () => {
    console.log("[AddBodyshopModal] handleClose called");
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
      latitude: null,
      longitude: null
    });
    onClose();
  };

  if (!isOpen) {
    console.log("[AddBodyshopModal] Not rendering - isOpen is false");
    return null;
  }

  console.log("[AddBodyshopModal] Rendering modal");

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" // z-index changed
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div 
        className="neomorph p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" // width and height changes
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-700">Add New Bodyshop</h2>
          <Button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }} 
            variant="ghost" 
            size="icon" 
            type="button"
            className="neomorph-flat p-2" // New class
            disabled={createMutation.isPending} // isGeocoding removed
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form 
          onSubmit={handleSubmit}
          onClick={(e) => e.stopPropagation()}
          className="space-y-4" // Added space-y-4 here
        >
          <div>
            <label className="block text-sm text-gray-600 mb-2">Bodyshop Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="neomorph-inset px-4 py-3 text-gray-700 border-0" // Updated class
              required
              autoFocus
              disabled={createMutation.isPending} // isGeocoding removed
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Contact Name *</label>
            <Input
              value={formData.contact_name}
              onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
              className="neomorph-inset px-4 py-3 text-gray-700 border-0" // Updated class
              required
              disabled={createMutation.isPending} // isGeocoding removed
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Grid layout for phone/email */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">Phone *</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="neomorph-inset px-4 py-3 text-gray-700 border-0" // Updated class
                required
                disabled={createMutation.isPending} // isGeocoding removed
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="neomorph-inset px-4 py-3 text-gray-700 border-0" // Updated class
                required
                disabled={createMutation.isPending} // isGeocoding removed
              />
            </div>
          </div>

          {/* New Address Lookup Input */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">Address Lookup</label>
            <AddressLookupInput
              value={formData.address_line_1} // Assuming this is used to pre-fill the search if needed
              onChange={handleAddressChange}
              placeholder="Start typing address or postcode..."
              className="neomorph-inset"
              disabled={createMutation.isPending} // isGeocoding removed
            />
            <p className="text-xs text-gray-500 mt-1">Start typing to search, or fill in fields manually below</p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Address Line 1</label>
            <Input
              value={formData.address_line_1}
              onChange={(e) => setFormData({...formData, address_line_1: e.target.value})}
              className="neomorph-inset px-4 py-3 text-gray-700 border-0" // Updated class
              disabled={createMutation.isPending} // isGeocoding removed
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Address Line 2</label>
            <Input
              value={formData.address_line_2}
              onChange={(e) => setFormData({...formData, address_line_2: e.target.value})}
              className="neomorph-inset px-4 py-3 text-gray-700 border-0" // Updated class
              disabled={createMutation.isPending} // isGeocoding removed
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Grid layout for town/county/postcode */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">Town</label>
              <Input
                value={formData.town}
                onChange={(e) => setFormData({...formData, town: e.target.value})}
                className="neomorph-inset px-4 py-3 text-gray-700 border-0" // Updated class
                disabled={createMutation.isPending} // isGeocoding removed
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">County</label>
              <Input
                value={formData.county}
                onChange={(e) => setFormData({...formData, county: e.target.value})}
                className="neomorph-inset px-4 py-3 text-gray-700 border-0" // Updated class
                disabled={createMutation.isPending} // isGeocoding removed
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Postcode</label>
              <Input
                value={formData.postcode}
                onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                className="neomorph-inset px-4 py-3 text-gray-700 border-0" // Updated class
                disabled={createMutation.isPending} // isGeocoding removed
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6">
            <Button 
              type="button" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClose();
              }}
              className="neomorph-flat px-6 py-3"
              disabled={createMutation.isPending} // isGeocoding removed
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="neomorph-flat px-6 py-3 text-blue-600" 
              disabled={createMutation.isPending} // isGeocoding removed
            >
              {createMutation.isPending ? ( // Removed isGeocoding condition
                <><Loader className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                'Create Bodyshop'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
