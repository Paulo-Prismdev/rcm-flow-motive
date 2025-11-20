import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ClientCombobox from '../shared/ClientCombobox';

export default function ClaimClientForm({ claim, onSave, onCancel }) {
  // Initialize formData directly from the 'claim' prop, or an empty object if 'claim' is null/undefined.
  // This assumes the 'claim' object can serve as the initial state structure.
  const [formData, setFormData] = useState(claim || {});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClientChange = async (client) => {
    // Note: The outline mentioned `geocodedLat` and `geocodedLng`.
    // As there's no geocoding logic present in the original file or provided in the outline,
    // these variables would be undefined, causing a runtime error.
    // To ensure a functional and valid file, we are omitting `client_lat` and `client_lng`
    // from the update until geocoding logic is explicitly provided.
    // The `client_id` field has been added as requested.
    const newClientData = {
      client_name: client.name,
      client_id: client.id, // Added client_id as per outline
      client_phone: client.phone || '',
      client_email: client.email || '',
      client_address_line_1: client.address_line_1 || '',
      client_address_line_2: client.address_line_2 || '',
      client_town: client.town || '',
      client_county: client.county || '',
      client_postcode: client.postcode || '',
    };

    setFormData(prev => ({
      ...prev,
      ...newClientData,
      // client_lat: geocodedLat, // Removed as geocoding logic not present
      // client_lng: geocodedLng  // Removed as geocoding logic not present
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-foreground-muted mb-2">Client Name *</label>
        <ClientCombobox
          value={formData.client_name}
          onChange={handleClientChange}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-foreground-muted mb-2">Client Phone *</label>
          <Input
            value={formData.client_phone || ''} // Ensure default to empty string
            onChange={(e) => handleChange('client_phone', e.target.value)}
            className="neomorph-inset px-4 py-3 border-0"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-foreground-muted mb-2">Client Email *</label>
          <Input
            type="email"
            value={formData.client_email || ''} // Ensure default to empty string
            onChange={(e) => handleChange('client_email', e.target.value)}
            className="neomorph-inset px-4 py-3 border-0"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-foreground-muted mb-2">Driver/Contact Name</label>
          <Input
            value={formData.driver_contact_name || ''} // Ensure default to empty string
            onChange={(e) => handleChange('driver_contact_name', e.target.value)}
            className="neomorph-inset px-4 py-3 border-0"
          />
        </div>
        <div>
          <label className="block text-sm text-foreground-muted mb-2">Driving License Number</label>
          <Input
            value={formData.client_driving_license || ''}
            onChange={(e) => handleChange('client_driving_license', e.target.value)}
            className="neomorph-inset px-4 py-3 border-0"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-foreground-muted mb-2">Address Line 1 *</label>
        <Input
          value={formData.client_address_line_1 || ''} // Ensure default to empty string
          onChange={(e) => handleChange('client_address_line_1', e.target.value)}
          className="neomorph-inset px-4 py-3 border-0"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-foreground-muted mb-2">Address Line 2</label>
        <Input
          value={formData.client_address_line_2 || ''} // Ensure default to empty string
          onChange={(e) => handleChange('client_address_line_2', e.target.value)}
          className="neomorph-inset px-4 py-3 border-0"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-foreground-muted mb-2">Town *</label>
          <Input
            value={formData.client_town || ''} // Ensure default to empty string
            onChange={(e) => handleChange('client_town', e.target.value)}
            className="neomorph-inset px-4 py-3 border-0"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-foreground-muted mb-2">County</label>
          <Input
            value={formData.client_county || ''} // Ensure default to empty string
            onChange={(e) => handleChange('client_county', e.target.value)}
            className="neomorph-inset px-4 py-3 border-0"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-foreground-muted mb-2">Postcode *</label>
        <Input
          value={formData.client_postcode || ''} // Ensure default to empty string
          onChange={(e) => handleChange('client_postcode', e.target.value)}
          className="neomorph-inset px-4 py-3 border-0"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-foreground-muted mb-2">VAT Status</label>
          <select
            value={formData.client_vat_status || 'Unknown'} // Ensure default
            onChange={(e) => handleChange('client_vat_status', e.target.value)}
            className="neomorph-inset w-full px-4 py-3 border-0 rounded-xl"
          >
            <option value="VAT Registered">VAT Registered</option>
            <option value="Non-VAT">Non-VAT</option>
            <option value="Unknown">Unknown</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-foreground-muted mb-2">Business Division</label>
          <Input
            value={formData.business_division || ''} // Ensure default to empty string
            onChange={(e) => handleChange('business_division', e.target.value)}
            className="neomorph-inset px-4 py-3 border-0"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" onClick={onCancel} className="neomorph-flat px-6 py-3">
          Cancel
        </Button>
        <Button type="submit" className="neomorph-flat px-6 py-3 text-accent">
          Save Changes
        </Button>
      </div>
    </form>
  );
}