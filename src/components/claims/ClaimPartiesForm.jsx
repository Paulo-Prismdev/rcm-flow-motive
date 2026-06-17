import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ClientCombobox from '../shared/ClientCombobox';
import BrokerCombobox from '../shared/BrokerCombobox';
import InsurerCombobox from '../shared/InsurerCombobox';
import CustomSelect from '../shared/CustomSelect';

const VAT_OPTIONS = [
  { value: 'VAT Registered', label: 'VAT Registered' },
  { value: 'Non-VAT', label: 'Non-VAT' },
  { value: 'Unknown', label: 'Unknown' },
];

// Simple toggle switch
function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </label>
  );
}

function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 border-t border-border" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

// mode: 'client' | 'driver' | 'thirdParty'
// When mode is set, only the relevant fields are shown and only those fields are saved.
export default function ClaimPartiesForm({ claim, onSave, onCancel, mode }) {
  const [data, setData] = useState({
    // Client fields
    client_id: claim.client_id || '',
    client_name: claim.client_name || '',
    client_phone: claim.client_phone || '',
    client_email: claim.client_email || '',
    client_address_line_1: claim.client_address_line_1 || '',
    client_address_line_2: claim.client_address_line_2 || '',
    client_town: claim.client_town || '',
    client_county: claim.client_county || '',
    client_postcode: claim.client_postcode || '',
    client_vat_status: claim.client_vat_status || 'Unknown',
    business_division: claim.business_division || '',
    broker_id: claim.broker_id || '',
    broker_name: claim.broker_name || '',
    insurer: claim.insurer || '',
    claim_ref: claim.claim_ref || '',
    policy_number: claim.policy_number || '',
    policy_excess: claim.policy_excess || 0,
    // Driver fields
    driver_same_as_client: claim.driver_same_as_client !== false,
    driver_contact_name: claim.driver_contact_name || '',
    driver_contact_phone: claim.driver_contact_phone || '',
    driver_contact_email: claim.driver_contact_email || '',
    driver_contact_address_line_1: claim.driver_contact_address_line_1 || '',
    driver_contact_address_line_2: claim.driver_contact_address_line_2 || '',
    driver_contact_town: claim.driver_contact_town || '',
    driver_contact_county: claim.driver_contact_county || '',
    driver_contact_postcode: claim.driver_contact_postcode || '',
    client_driving_license: claim.client_driving_license || '',
    // Third party fields
    has_third_party: !!(claim.tp_name || claim.tp_reg),
    tp_name: claim.tp_name || '',
    tp_phone: claim.tp_phone || '',
    tp_email: claim.tp_email || '',
    tp_address_line_1: claim.tp_address_line_1 || '',
    tp_address_line_2: claim.tp_address_line_2 || '',
    tp_town: claim.tp_town || '',
    tp_county: claim.tp_county || '',
    tp_postcode: claim.tp_postcode || '',
    tp_driver_contact: claim.tp_driver_contact || '',
    tp_broker_id: claim.tp_broker_id || '',
    tp_broker_name: claim.tp_broker_name || '',
    tp_insurer: claim.tp_insurer || '',
    tp_claim_ref: claim.tp_claim_ref || '',
    tp_policy_number: claim.tp_policy_number || '',
    tp_reg: claim.tp_reg || '',
    tp_make_model: claim.tp_make_model || '',
  });

  const set = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  const handleClientSelect = (client) => {
    if (!client) { set('client_id', ''); set('client_name', ''); return; }
    setData(prev => ({
      ...prev,
      client_id: client.id,
      client_name: client.name,
      client_phone: client.phone || prev.client_phone,
      client_email: client.email || prev.client_email,
      client_address_line_1: client.address_line_1 || prev.client_address_line_1,
      client_address_line_2: client.address_line_2 || prev.client_address_line_2,
      client_town: client.town || prev.client_town,
      client_county: client.county || prev.client_county,
      client_postcode: client.postcode || prev.client_postcode,
    }));
  };

  const handleTPClientSelect = (client) => {
    if (!client) { set('tp_name', ''); return; }
    setData(prev => ({
      ...prev,
      tp_name: client.name,
      tp_phone: client.phone || prev.tp_phone,
      tp_email: client.email || prev.tp_email,
      tp_address_line_1: client.address_line_1 || prev.tp_address_line_1,
      tp_address_line_2: client.address_line_2 || prev.tp_address_line_2,
      tp_town: client.town || prev.tp_town,
      tp_county: client.county || prev.tp_county,
      tp_postcode: client.postcode || prev.tp_postcode,
    }));
  };

  const handleBrokerSelect = (broker) => {
    if (!broker) { set('broker_id', ''); set('broker_name', ''); return; }
    setData(prev => ({ ...prev, broker_id: broker.id, broker_name: broker.name }));
  };

  const handleTPBrokerSelect = (broker) => {
    if (!broker) { set('tp_broker_id', ''); set('tp_broker_name', ''); return; }
    setData(prev => ({ ...prev, tp_broker_id: broker.id, tp_broker_name: broker.name }));
  };

  const handleSave = () => {
    if (mode === 'client') {
      onSave({
        client_id: data.client_id,
        client_name: data.client_name,
        client_phone: data.client_phone,
        client_email: data.client_email,
        client_address_line_1: data.client_address_line_1,
        client_address_line_2: data.client_address_line_2,
        client_town: data.client_town,
        client_county: data.client_county,
        client_postcode: data.client_postcode,
        client_vat_status: data.client_vat_status,
        business_division: data.business_division,
        broker_id: data.broker_id,
        broker_name: data.broker_name,
        insurer: data.insurer,
        claim_ref: data.claim_ref,
        policy_number: data.policy_number,
        policy_excess: data.policy_excess,
      });
    } else if (mode === 'driver') {
      onSave({
        driver_same_as_client: data.driver_same_as_client,
        driver_contact_name: data.driver_contact_name,
        driver_contact_phone: data.driver_contact_phone,
        driver_contact_email: data.driver_contact_email,
        driver_contact_address_line_1: data.driver_contact_address_line_1,
        driver_contact_address_line_2: data.driver_contact_address_line_2,
        driver_contact_town: data.driver_contact_town,
        driver_contact_county: data.driver_contact_county,
        driver_contact_postcode: data.driver_contact_postcode,
        client_driving_license: data.client_driving_license,
      });
    } else if (mode === 'thirdParty') {
      onSave({
        tp_name: data.tp_name,
        tp_phone: data.tp_phone,
        tp_email: data.tp_email,
        tp_address_line_1: data.tp_address_line_1,
        tp_address_line_2: data.tp_address_line_2,
        tp_town: data.tp_town,
        tp_county: data.tp_county,
        tp_postcode: data.tp_postcode,
        tp_driver_contact: data.tp_driver_contact,
        tp_broker_id: data.tp_broker_id,
        tp_broker_name: data.tp_broker_name,
        tp_insurer: data.tp_insurer,
        tp_claim_ref: data.tp_claim_ref,
        tp_policy_number: data.tp_policy_number,
        tp_reg: data.tp_reg,
        tp_make_model: data.tp_make_model,
      });
    } else {
      // No mode — save everything (legacy / full form)
      onSave(data);
    }
  };

  // ── CLIENT mode ──────────────────────────────────────────────
  if (mode === 'client') {
    return (
      <div className="space-y-4 pt-2">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Client</label>
          <ClientCombobox value={data.client_name} onChange={handleClientSelect} allowClear />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Phone</label>
            <Input value={data.client_phone} onChange={(e) => set('client_phone', e.target.value)} className="neomorph-inset" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Email</label>
            <Input type="email" value={data.client_email} onChange={(e) => set('client_email', e.target.value)} className="neomorph-inset" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 md:col-span-1">
            <label className="block text-xs text-muted-foreground mb-1">Address Line 1</label>
            <Input value={data.client_address_line_1} onChange={(e) => set('client_address_line_1', e.target.value)} className="neomorph-inset" />
          </div>
          <div className="col-span-3 md:col-span-2">
            <label className="block text-xs text-muted-foreground mb-1">Address Line 2</label>
            <Input value={data.client_address_line_2} onChange={(e) => set('client_address_line_2', e.target.value)} className="neomorph-inset" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Town</label>
            <Input value={data.client_town} onChange={(e) => set('client_town', e.target.value)} className="neomorph-inset" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">County</label>
            <Input value={data.client_county} onChange={(e) => set('client_county', e.target.value)} className="neomorph-inset" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Postcode</label>
            <Input value={data.client_postcode} onChange={(e) => set('client_postcode', e.target.value)} className="neomorph-inset" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Business Division</label>
          <Input value={data.business_division} onChange={(e) => set('business_division', e.target.value)} className="neomorph-inset" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">VAT Status</label>
          <CustomSelect value={data.client_vat_status} onChange={(v) => set('client_vat_status', v)} options={VAT_OPTIONS} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button onClick={onCancel} variant="outline">Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground">Save Changes</Button>
        </div>
      </div>
    );
  }

  // ── DRIVER (Repair Contact) mode ────────────────────────────
  if (mode === 'driver') {
    return (
      <div className="space-y-4 pt-2">
        <p className="text-xs text-muted-foreground mb-1">This is the person the repairer will contact for vehicle drop-off, updates, and collection.</p>
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
          <div>
            <span className="text-sm font-medium">Same as the Client?</span>
            <p className="text-xs text-muted-foreground mt-0.5">If yes, the client details will be used as the repair contact</p>
          </div>
          <Toggle checked={data.driver_same_as_client} onChange={(v) => set('driver_same_as_client', v)} />
        </div>
        {!data.driver_same_as_client && (
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Driver Name</label>
                <Input value={data.driver_contact_name} onChange={(e) => set('driver_contact_name', e.target.value)} className="neomorph-inset" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Driver Phone</label>
                <Input value={data.driver_contact_phone} onChange={(e) => set('driver_contact_phone', e.target.value)} className="neomorph-inset" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Driver Email</label>
                <Input type="email" value={data.driver_contact_email} onChange={(e) => set('driver_contact_email', e.target.value)} className="neomorph-inset" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Driving License No.</label>
                <Input value={data.client_driving_license} onChange={(e) => set('client_driving_license', e.target.value)} className="neomorph-inset" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3 md:col-span-1">
                <label className="block text-xs text-muted-foreground mb-1">Address Line 1</label>
                <Input value={data.driver_contact_address_line_1} onChange={(e) => set('driver_contact_address_line_1', e.target.value)} className="neomorph-inset" />
              </div>
              <div className="col-span-3 md:col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Address Line 2</label>
                <Input value={data.driver_contact_address_line_2} onChange={(e) => set('driver_contact_address_line_2', e.target.value)} className="neomorph-inset" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Town</label>
                <Input value={data.driver_contact_town} onChange={(e) => set('driver_contact_town', e.target.value)} className="neomorph-inset" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">County</label>
                <Input value={data.driver_contact_county} onChange={(e) => set('driver_contact_county', e.target.value)} className="neomorph-inset" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Postcode</label>
                <Input value={data.driver_contact_postcode} onChange={(e) => set('driver_contact_postcode', e.target.value)} className="neomorph-inset" />
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button onClick={onCancel} variant="outline">Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground">Save Changes</Button>
        </div>
      </div>
    );
  }

  // ── THIRD PARTY mode ─────────────────────────────────────────
  if (mode === 'thirdParty') {
    return (
      <div className="space-y-4 pt-2">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Third Party Name</label>
          <ClientCombobox value={data.tp_name} onChange={handleTPClientSelect} placeholder="Select or add TP client..." allowClear />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Phone</label>
            <Input value={data.tp_phone} onChange={(e) => set('tp_phone', e.target.value)} className="neomorph-inset" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Email</label>
            <Input type="email" value={data.tp_email} onChange={(e) => set('tp_email', e.target.value)} className="neomorph-inset" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 md:col-span-1">
            <label className="block text-xs text-muted-foreground mb-1">Address Line 1</label>
            <Input value={data.tp_address_line_1} onChange={(e) => set('tp_address_line_1', e.target.value)} className="neomorph-inset" />
          </div>
          <div className="col-span-3 md:col-span-2">
            <label className="block text-xs text-muted-foreground mb-1">Address Line 2</label>
            <Input value={data.tp_address_line_2} onChange={(e) => set('tp_address_line_2', e.target.value)} className="neomorph-inset" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Town</label>
            <Input value={data.tp_town} onChange={(e) => set('tp_town', e.target.value)} className="neomorph-inset" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">County</label>
            <Input value={data.tp_county} onChange={(e) => set('tp_county', e.target.value)} className="neomorph-inset" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Postcode</label>
            <Input value={data.tp_postcode} onChange={(e) => set('tp_postcode', e.target.value)} className="neomorph-inset" />
          </div>
        </div>
        <SectionDivider label="TP Driver" />
        <div className="p-3 bg-muted/30 rounded-lg border border-border">
          <label className="block text-xs text-muted-foreground mb-1">TP Driver/Contact Name</label>
          <Input value={data.tp_driver_contact} onChange={(e) => set('tp_driver_contact', e.target.value)} className="neomorph-inset" />
        </div>
        <SectionDivider label="TP Broker" />
        <div>
          <label className="block text-xs text-muted-foreground mb-1">TP Broker</label>
          <BrokerCombobox value={data.tp_broker_name} onChange={handleTPBrokerSelect} placeholder="Select TP broker..." />
        </div>
        <SectionDivider label="TP Insurance & Vehicle" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">TP Insurer</label>
            <InsurerCombobox value={data.tp_insurer} onChange={(v) => set('tp_insurer', v)} placeholder="Select TP insurer..." />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">TP Claim Reference</label>
            <Input value={data.tp_claim_ref} onChange={(e) => set('tp_claim_ref', e.target.value)} className="neomorph-inset" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">TP Policy Number</label>
            <Input value={data.tp_policy_number} onChange={(e) => set('tp_policy_number', e.target.value)} className="neomorph-inset" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">TP Registration</label>
            <Input value={data.tp_reg} onChange={(e) => set('tp_reg', e.target.value.toUpperCase())} className="neomorph-inset" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-muted-foreground mb-1">TP Make / Model</label>
            <Input value={data.tp_make_model} onChange={(e) => set('tp_make_model', e.target.value)} className="neomorph-inset" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button onClick={onCancel} variant="outline">Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground">Save Changes</Button>
        </div>
      </div>
    );
  }

  // ── LEGACY full form (no mode) ────────────────────────────────
  return (
    <div className="space-y-6 pt-2">
      <div className="border border-border rounded-xl p-4 space-y-4 bg-muted/20">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">First Party — Client</h4>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Client *</label>
          <ClientCombobox value={data.client_name} onChange={handleClientSelect} allowClear />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="block text-xs text-muted-foreground mb-1">Phone</label><Input value={data.client_phone} onChange={(e) => set('client_phone', e.target.value)} className="neomorph-inset" /></div>
          <div><label className="block text-xs text-muted-foreground mb-1">Email</label><Input type="email" value={data.client_email} onChange={(e) => set('client_email', e.target.value)} className="neomorph-inset" /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 md:col-span-1"><label className="block text-xs text-muted-foreground mb-1">Address Line 1</label><Input value={data.client_address_line_1} onChange={(e) => set('client_address_line_1', e.target.value)} className="neomorph-inset" /></div>
          <div className="col-span-3 md:col-span-2"><label className="block text-xs text-muted-foreground mb-1">Address Line 2</label><Input value={data.client_address_line_2} onChange={(e) => set('client_address_line_2', e.target.value)} className="neomorph-inset" /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-xs text-muted-foreground mb-1">Town</label><Input value={data.client_town} onChange={(e) => set('client_town', e.target.value)} className="neomorph-inset" /></div>
          <div><label className="block text-xs text-muted-foreground mb-1">County</label><Input value={data.client_county} onChange={(e) => set('client_county', e.target.value)} className="neomorph-inset" /></div>
          <div><label className="block text-xs text-muted-foreground mb-1">Postcode</label><Input value={data.client_postcode} onChange={(e) => set('client_postcode', e.target.value)} className="neomorph-inset" /></div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">VAT Status</label>
          <CustomSelect value={data.client_vat_status} onChange={(v) => set('client_vat_status', v)} options={VAT_OPTIONS} />
        </div>
        <SectionDivider label="Repair Contact (Driver)" />
        <p className="text-xs text-muted-foreground -mt-2">The person the repairer should contact for vehicle drop-off, updates, and collection.</p>
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
          <div>
            <span className="text-sm font-medium">Same as the Client?</span>
            <p className="text-xs text-muted-foreground mt-0.5">If yes, the client details will be used as the repair contact</p>
          </div>
          <Toggle checked={data.driver_same_as_client} onChange={(v) => set('driver_same_as_client', v)} />
        </div>
        {!data.driver_same_as_client && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 p-3 bg-muted/30 rounded-lg border border-border">
            <div className="md:col-span-2"><label className="block text-xs text-muted-foreground mb-1">Driver/Contact Name</label><Input value={data.driver_contact_name} onChange={(e) => set('driver_contact_name', e.target.value)} className="neomorph-inset" /></div>
            <div><label className="block text-xs text-muted-foreground mb-1">Driving License No.</label><Input value={data.client_driving_license} onChange={(e) => set('client_driving_license', e.target.value)} className="neomorph-inset" /></div>
          </div>
        )}
        <SectionDivider label="Broker" />
        <div><label className="block text-xs text-muted-foreground mb-1">Broker</label><BrokerCombobox value={data.broker_name} onChange={handleBrokerSelect} /></div>
        <SectionDivider label="Insurance" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="block text-xs text-muted-foreground mb-1">Insurer</label><InsurerCombobox value={data.insurer} onChange={(v) => set('insurer', v)} /></div>
          <div><label className="block text-xs text-muted-foreground mb-1">Claim Reference</label><Input value={data.claim_ref} onChange={(e) => set('claim_ref', e.target.value)} className="neomorph-inset" /></div>
          <div><label className="block text-xs text-muted-foreground mb-1">Policy Number</label><Input value={data.policy_number} onChange={(e) => set('policy_number', e.target.value)} className="neomorph-inset" /></div>
          <div><label className="block text-xs text-muted-foreground mb-1">Policy Excess (£)</label><Input type="text" inputMode="decimal" value={data.policy_excess || ''} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) set('policy_excess', v === '' ? 0 : parseFloat(v) || 0); }} className="neomorph-inset" placeholder="0.00" /></div>
        </div>
      </div>
      <div className="border border-border rounded-xl p-4 space-y-4 bg-muted/20">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500" /><h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Third Party</h4></div>
          <Toggle checked={data.has_third_party} onChange={(v) => set('has_third_party', v)} label="Third party involved?" />
        </div>
        {data.has_third_party && (
          <div className="space-y-4">
            <div><label className="block text-xs text-muted-foreground mb-1">Third Party Name</label><ClientCombobox value={data.tp_name} onChange={handleTPClientSelect} placeholder="Select or add TP client..." allowClear /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-xs text-muted-foreground mb-1">Phone</label><Input value={data.tp_phone} onChange={(e) => set('tp_phone', e.target.value)} className="neomorph-inset" /></div>
              <div><label className="block text-xs text-muted-foreground mb-1">Email</label><Input type="email" value={data.tp_email} onChange={(e) => set('tp_email', e.target.value)} className="neomorph-inset" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs text-muted-foreground mb-1">Town</label><Input value={data.tp_town} onChange={(e) => set('tp_town', e.target.value)} className="neomorph-inset" /></div>
              <div><label className="block text-xs text-muted-foreground mb-1">County</label><Input value={data.tp_county} onChange={(e) => set('tp_county', e.target.value)} className="neomorph-inset" /></div>
              <div><label className="block text-xs text-muted-foreground mb-1">Postcode</label><Input value={data.tp_postcode} onChange={(e) => set('tp_postcode', e.target.value)} className="neomorph-inset" /></div>
            </div>
            <SectionDivider label="TP Driver" />
            <div className="p-3 bg-muted/30 rounded-lg border border-border"><label className="block text-xs text-muted-foreground mb-1">TP Driver/Contact Name</label><Input value={data.tp_driver_contact} onChange={(e) => set('tp_driver_contact', e.target.value)} className="neomorph-inset" /></div>
            <SectionDivider label="TP Broker" />
            <div><label className="block text-xs text-muted-foreground mb-1">TP Broker</label><BrokerCombobox value={data.tp_broker_name} onChange={handleTPBrokerSelect} placeholder="Select TP broker..." /></div>
            <SectionDivider label="TP Insurance & Vehicle" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-xs text-muted-foreground mb-1">TP Insurer</label><InsurerCombobox value={data.tp_insurer} onChange={(v) => set('tp_insurer', v)} placeholder="Select TP insurer..." /></div>
              <div><label className="block text-xs text-muted-foreground mb-1">TP Claim Reference</label><Input value={data.tp_claim_ref} onChange={(e) => set('tp_claim_ref', e.target.value)} className="neomorph-inset" /></div>
              <div><label className="block text-xs text-muted-foreground mb-1">TP Policy Number</label><Input value={data.tp_policy_number} onChange={(e) => set('tp_policy_number', e.target.value)} className="neomorph-inset" /></div>
              <div><label className="block text-xs text-muted-foreground mb-1">TP Registration</label><Input value={data.tp_reg} onChange={(e) => set('tp_reg', e.target.value.toUpperCase())} className="neomorph-inset" /></div>
              <div className="md:col-span-2"><label className="block text-xs text-muted-foreground mb-1">TP Make / Model</label><Input value={data.tp_make_model} onChange={(e) => set('tp_make_model', e.target.value)} className="neomorph-inset" /></div>
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button onClick={onCancel} variant="outline">Cancel</Button>
        <Button onClick={handleSave} className="bg-primary text-primary-foreground">Save Changes</Button>
      </div>
    </div>
  );
}