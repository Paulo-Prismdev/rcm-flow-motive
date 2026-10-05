import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ClientCombobox from '../shared/ClientCombobox';
import { base44 } from '@/api/base44Client';
import { Phone, Mail, Star, Users } from 'lucide-react';

export default function ClaimClientForm({ claim, onSave, onCancel }) {
  const [formData, setFormData] = useState(claim || {});
  const [linkedContacts, setLinkedContacts] = useState([]);

  const loadClientContacts = async (client) => {
    if (!client) { setLinkedContacts([]); return; }
    const contacts = client.contacts || [];
    setLinkedContacts(contacts);
    const primaryContact = contacts.find(c => c.is_primary) || contacts[0] || null;
    setFormData(prev => ({
      ...prev,
      client_phone: prev.client_phone || primaryContact?.phone || client.company_contact_phone || client.phone || '',
      client_email: prev.client_email || primaryContact?.email || client.company_contact_email || client.email || '',
    }));
  };

  // On mount, fetch from Client entity to fill in any missing contact details
  useEffect(() => {
    const fetchClient = async () => {
      let client = null;
      if (claim?.client_id) {
        client = await base44.entities.Client.get(claim.client_id).catch(() => null);
      } else if (claim?.client_name) {
        const results = await base44.entities.Client.filter({ name: claim.client_name }).catch(() => []);
        client = results?.[0] || null;
      }
      loadClientContacts(client);
    };
    fetchClient();
  }, []);

  const isRequiredEmpty = (value) => {
    return value === null || value === undefined || value === '';
  };

  // Check if field has required asterisk in label

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
    // For Company clients, phone/email may be stored on company_contact_* fields
    const contacts = client.contacts || [];
    const primaryContact = contacts.find(c => c.is_primary) || contacts[0] || null;
    const newClientData = {
      client_name: client.name,
      client_id: client.id,
      client_phone: client.phone || primaryContact?.phone || client.company_contact_phone || '',
      client_email: client.email || primaryContact?.email || client.company_contact_email || '',
      client_address_line_1: client.address_line_1 || '',
      client_address_line_2: client.address_line_2 || '',
      client_town: client.town || '',
      client_county: client.county || '',
      client_postcode: client.postcode || '',
      client_vat_status: client.vat_status || formData.client_vat_status || 'Unknown',
    };

    setFormData(prev => ({
      ...prev,
      ...newClientData,
      // client_lat: geocodedLat, // Removed as geocoding logic not present
      // client_lng: geocodedLng  // Removed as geocoding logic not present
    }));
    loadClientContacts(client);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-foreground-muted mb-2 flex items-center gap-1.5">
          <span>Client Name *</span>
          {isRequiredEmpty(formData.client_name) && <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" title="Required field"></span>}
        </label>
        <ClientCombobox
          value={formData.client_name}
          onChange={handleClientChange}
        />
      </div>

      {linkedContacts.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Users className="w-3.5 h-3.5" /> Contacts at this business
          </div>
          <div className="space-y-1.5">
            {linkedContacts.map((c, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{c.name || '—'}</span>
                  {c.position && <span className="text-xs text-muted-foreground">· {c.position}</span>}
                  {c.is_primary && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Primary
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                  {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                  {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-foreground-muted mb-2 flex items-center gap-1.5">
            <span>Client Phone *</span>
            {isRequiredEmpty(formData.client_phone) && <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" title="Required field"></span>}
          </label>
          <Input
            value={formData.client_phone || ''}
            onChange={(e) => handleChange('client_phone', e.target.value)}
            className="neomorph-inset px-4 py-3 border-0"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-foreground-muted mb-2 flex items-center gap-1.5">
            <span>Client Email *</span>
            {isRequiredEmpty(formData.client_email) && <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" title="Required field"></span>}
          </label>
          <Input
            type="email"
            value={formData.client_email || ''}
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
        <label className="block text-sm text-foreground-muted mb-2 flex items-center gap-1.5">
          <span>Address Line 1 *</span>
          {isRequiredEmpty(formData.client_address_line_1) && <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" title="Required field"></span>}
        </label>
        <Input
          value={formData.client_address_line_1 || ''}
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
          <label className="block text-sm text-foreground-muted mb-2 flex items-center gap-1.5">
            <span>Town *</span>
            {isRequiredEmpty(formData.client_town) && <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" title="Required field"></span>}
          </label>
          <Input
            value={formData.client_town || ''}
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
        <label className="block text-sm text-foreground-muted mb-2 flex items-center gap-1.5">
          <span>Postcode *</span>
          {isRequiredEmpty(formData.client_postcode) && <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" title="Required field"></span>}
        </label>
        <Input
          value={formData.client_postcode || ''}
          onChange={(e) => handleChange('client_postcode', e.target.value)}
          className="neomorph-inset px-4 py-3 border-0"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-foreground-muted mb-2">Client Reference</label>
        <Input
          value={formData.client_ref || ''}
          onChange={(e) => handleChange('client_ref', e.target.value)}
          className="neomorph-inset px-4 py-3 border-0"
          placeholder="e.g. fleet ref, account number..."
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