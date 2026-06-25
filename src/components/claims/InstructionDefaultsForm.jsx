import React, { useState } from 'react';
import { Button } from "@/components/ui/button";

export default function InstructionDefaultsForm({ claim, onSave, onCancel }) {
  const [lastContactSource, setLastContactSource] = useState(claim.last_contact_source || 'Client');
  const [authorisedBy, setAuthorisedBy] = useState(claim.authorised_by || 'Client Insurer');

  const handleSave = () => {
    onSave({ last_contact_source: lastContactSource, authorised_by: authorisedBy });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Default Instruction Contact</label>
        <select
          value={lastContactSource}
          onChange={(e) => setLastContactSource(e.target.value)}
          className="w-full input"
        >
          <option value="Client">Client</option>
          <option value="Driver">Driver</option>
          <option value="Custom">Custom</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">Pre-selects the contact type when allocating jobs</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Authorised By</label>
        <select
          value={authorisedBy}
          onChange={(e) => setAuthorisedBy(e.target.value)}
          className="w-full input"
        >
          <option value="Client Insurer">Client Insurer</option>
          <option value="Third Party Insurer">Third Party Insurer</option>
          <option value="Uninsured">Uninsured</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">Pre-selects the authorising insurer when allocating jobs</p>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button onClick={onCancel} variant="outline">Cancel</Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
}