import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { X, GripVertical, Check, Lock } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import useEscapeToClose from '@/hooks/useEscapeToClose';
const DEFAULT_MANDATORY_FIELDS = ['client_name', 'make_model', 'loss_date', 'referrer'];

const AVAILABLE_FIELDS = [
  { id: 'client_name', label: 'Client Name' },
  { id: 'make_model', label: 'Vehicle Make/Model' },
  { id: 'loss_date', label: 'Loss Date' },
  { id: 'referrer', label: 'Referrer' },
  { id: 'insurer', label: 'Insurer' },
  { id: 'authorising_party', label: 'Authorising Party' },
  { id: 'bodyshop', label: 'Bodyshop' },
  { id: 'driver_contact_name', label: 'Driver Name' },
  { id: 'claim_type', label: 'Claim Type' },
  { id: 'booking_in_date', label: 'Booking In Date' },
  { id: 'ecd', label: 'ECD' },
  { id: 'authority_cost_gross', label: 'Authority Cost' },
  { id: 'final_repair_cost', label: 'Final Repair Cost' },
  { id: 'claim_ref', label: 'Claim Reference' },
  { id: 'policy_number', label: 'Policy Number' },
  { id: 'client_phone', label: 'Client Phone' },
  { id: 'business_division', label: 'Business Division' },
  { id: 'vehicle_location', label: 'Vehicle Location' },
  { id: 'documents', label: 'Documents' },
  { id: 'vehicle_damage', label: 'Vehicle Damage' },
  { id: 'referrer_ref', label: 'Referrer Ref' },
  { id: 'client_ref', label: 'Client Ref' },
];

export default function ClaimCardFieldsModal({ isOpen, onClose, selectedFields, onSave, mandatoryFields }) {
  useEscapeToClose(onClose, isOpen);
  const effectiveMandatory = mandatoryFields !== undefined ? mandatoryFields : DEFAULT_MANDATORY_FIELDS;
  // Ensure mandatory fields are always included
  const initialFields = selectedFields || [];
  const mergedFields = [...effectiveMandatory, ...initialFields.filter(f => !effectiveMandatory.includes(f))];
  const [fields, setFields] = useState(mergedFields);

  if (!isOpen) return null;

  const isMandatory = (fieldId) => effectiveMandatory.includes(fieldId);

  const toggleField = (fieldId) => {
    // Don't allow removing mandatory fields
    if (isMandatory(fieldId)) return;
    
    if (fields.includes(fieldId)) {
      setFields(fields.filter(f => f !== fieldId));
    } else {
      setFields([...fields, fieldId]);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setFields(items);
  };

  const handleSave = () => {
    onSave(fields);
    onClose();
  };

  const selectedFieldObjects = fields.map(id => AVAILABLE_FIELDS.find(f => f.id === id)).filter(Boolean);
  // Only show non-mandatory fields as available to add
  const unselectedFields = AVAILABLE_FIELDS.filter(f => !fields.includes(f.id) && !isMandatory(f.id));

  return (
    <div className="fixed inset-0 z-window fm-scrim flex items-center justify-center p-4" data-mobile-full-modal="true">
      <div className="fm-glass-window rounded-2xl text-foreground p-6 max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Customise Claim Card Fields</h2>
          <Button aria-label="Close" onClick={onClose} variant="ghost" size="icon">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Select and reorder the fields shown on claim cards. Drag to reorder selected fields.
        </p>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Selected Fields - Draggable */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-foreground">Selected Fields (drag to reorder)</h3>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="selected-fields">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-1.5"
                  >
                    {selectedFieldObjects.map((field, index) => (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`bg-muted border border-border rounded-lg px-3 py-2.5 flex items-center gap-3 ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500/30' : ''}`}
                          >
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                            </div>
                            <span className="flex-1 text-sm font-medium text-foreground">{field.label}</span>
                            {isMandatory(field.id) ? (
                              <Lock className="w-3 h-3 text-muted-foreground" title="Required field" />
                            ) : (
                              <Button
                                onClick={() => toggleField(field.id)}
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-danger-fg"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No fields selected</p>
            )}
          </div>

          {/* Available Fields */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-foreground">Available Fields</h3>
            <div className="space-y-1.5">
              {unselectedFields.map(field => (
                <button
                  key={field.id}
                  onClick={() => toggleField(field.id)}
                  className="bg-muted border border-border rounded-lg px-3 py-2.5 w-full flex items-center gap-3 hover:bg-info-bg hover:border-info/30 transition-colors"
                >
                  <Check className="w-4 h-4 text-transparent" />
                  <span className="flex-1 text-sm text-left text-muted-foreground">{field.label}</span>
                </button>
              ))}
              {unselectedFields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">All fields selected</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-[#1a2035] text-white hover:bg-[#243050]">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}