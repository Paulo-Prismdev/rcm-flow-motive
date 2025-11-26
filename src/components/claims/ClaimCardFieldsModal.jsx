import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { X, GripVertical, Check, Lock } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// These fields are always shown and cannot be removed
const MANDATORY_FIELDS = ['client_name', 'make_model', 'loss_date', 'referrer'];

const AVAILABLE_FIELDS = [
  { id: 'client_name', label: 'Client Name' },
  { id: 'make_model', label: 'Vehicle Make/Model' },
  { id: 'loss_date', label: 'Loss Date' },
  { id: 'referrer', label: 'Referrer' },
  { id: 'insurer', label: 'Insurer' },
  { id: 'bodyshop', label: 'Bodyshop' },
  { id: 'claim_type', label: 'Claim Type' },
  { id: 'booking_in_date', label: 'Booking In Date' },
  { id: 'ecd', label: 'ECD' },
  { id: 'authority_cost_gross', label: 'Authority Cost' },
  { id: 'final_repair_cost', label: 'Final Repair Cost' },
  { id: 'claim_ref', label: 'Claim Reference' },
  { id: 'policy_number', label: 'Policy Number' },
  { id: 'client_phone', label: 'Client Phone' },
  { id: 'vehicle_location', label: 'Vehicle Location' },
];

export default function ClaimCardFieldsModal({ isOpen, onClose, selectedFields, onSave }) {
  const [fields, setFields] = useState(selectedFields || ['client_name', 'make_model', 'insurer']);

  if (!isOpen) return null;

  const toggleField = (fieldId) => {
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
  const unselectedFields = AVAILABLE_FIELDS.filter(f => !fields.includes(f.id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="neomorph p-6 max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Customise Claim Card Fields</h2>
          <Button onClick={onClose} variant="ghost" size="icon">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-sm text-foreground-muted mb-4">
          Select and reorder the fields shown on claim cards. Drag to reorder selected fields.
        </p>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Selected Fields - Draggable */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Selected Fields (drag to reorder)</h3>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="selected-fields">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {selectedFieldObjects.map((field, index) => (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`neomorph-flat p-3 flex items-center gap-3 ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                          >
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="w-4 h-4 text-foreground-muted cursor-grab" />
                            </div>
                            <span className="flex-1 text-sm font-medium">{field.label}</span>
                            <Button
                              onClick={() => toggleField(field.id)}
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                            >
                              <X className="w-3 h-3" />
                            </Button>
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
              <p className="text-sm text-foreground-muted text-center py-4">No fields selected</p>
            )}
          </div>

          {/* Available Fields */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Available Fields</h3>
            <div className="space-y-2">
              {unselectedFields.map(field => (
                <button
                  key={field.id}
                  onClick={() => toggleField(field.id)}
                  className="neomorph-flat p-3 w-full flex items-center gap-3 hover:bg-accent/10 transition-colors"
                >
                  <Check className="w-4 h-4 text-transparent" />
                  <span className="flex-1 text-sm text-left">{field.label}</span>
                </button>
              ))}
              {unselectedFields.length === 0 && (
                <p className="text-sm text-foreground-muted text-center py-4">All fields selected</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
          <Button onClick={onClose} className="neomorph-flat">
            Cancel
          </Button>
          <Button onClick={handleSave} className="neomorph-flat bg-accent/10 text-accent">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}