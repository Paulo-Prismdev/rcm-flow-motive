import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import ClaimBodyshopMapModal from './ClaimBodyshopMapModal';
import BodyshopAllocationWizard from './BodyshopAllocationWizard';

/**
 * Renders the "Find Repairer on Map" button directly in the bodyshop section
 * display (no edit mode required). Opens the map modal, then the allocation
 * wizard with the selected bodyshop pre-selected.
 */
export default function ClaimBodyshopAllocateButton({ claim, onAllocated }) {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [preSelectedBodyshop, setPreSelectedBodyshop] = useState(null);

  const handleMapSelect = (bodyshop) => {
    setIsMapOpen(false);
    setPreSelectedBodyshop(bodyshop);
    setIsWizardOpen(true);
  };

  const handleWizardComplete = (bodyshop) => {
    setIsWizardOpen(false);
    setPreSelectedBodyshop(null);
    if (onAllocated) {
      onAllocated({
        bodyshop: bodyshop.name,
        bodyshop_id: bodyshop.id,
        bodyshop_email: bodyshop.email || '',
        bs_instructed: new Date().toISOString().split('T')[0],
      });
    }
  };

  return (
    <>
      <ClaimBodyshopMapModal
        claim={claim}
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onSelectBodyshop={handleMapSelect}
      />

      <BodyshopAllocationWizard
        claim={claim}
        isOpen={isWizardOpen}
        onClose={() => { setIsWizardOpen(false); setPreSelectedBodyshop(null); }}
        onAllocationComplete={handleWizardComplete}
        preSelectedBodyshop={preSelectedBodyshop}
        startStep={preSelectedBodyshop ? 1 : 0}
      />

      <Button
        type="button"
        onClick={() => setIsMapOpen(true)}
        className="w-full neomorph-flat py-3 text-accent hover:bg-accent/10 border-accent/30"
      >
        <MapPin className="w-4 h-4 mr-2" />
        Find Repairer on Map
      </Button>
    </>
  );
}