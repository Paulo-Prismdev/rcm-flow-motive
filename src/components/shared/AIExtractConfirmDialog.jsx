import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Sparkles, CheckSquare, Square, ArrowRight, Check, Link } from 'lucide-react';

// Fields owned by each linked entity type — these come from the database and should not be overridable
const LINKED_ENTITY_FIELDS = {
  client: ['client_name', 'client_phone', 'client_email', 'client_address_line_1', 'client_address_line_2', 'client_town', 'client_county', 'client_postcode'],
  referrer: ['referrer', 'referrer_email'],
  bodyshop: ['bodyshop', 'bodyshop_email'],
};

export default function AIExtractConfirmDialog({ isOpen, onClose, onConfirm, extractedData, existingData = {}, linkedEntityTypes = [], title = 'AI Data Extraction' }) {
  const [selectedFields, setSelectedFields] = useState(() => {
    const initial = {};
    const lockedFields = new Set(linkedEntityTypes.flatMap(t => LINKED_ENTITY_FIELDS[t] || []));
    
    Object.keys(extractedData || {}).forEach(key => {
      const extractedValue = extractedData[key];
      const existingValue = existingData[key];
      
      if (extractedValue !== null && extractedValue !== undefined && extractedValue !== '') {
        if (lockedFields.has(key)) {
          // Linked-entity field: always selected, always applied
          initial[key] = true;
        } else {
          const valuesMatch = String(existingValue) === String(extractedValue);
          initial[key] = !valuesMatch;
        }
      }
    });
    return initial;
  });

  if (!isOpen || !extractedData) return null;

  const fields = Object.entries(extractedData).filter(([_, value]) => 
    value !== null && value !== undefined && value !== ''
  );

  const lockedFields = new Set(linkedEntityTypes.flatMap(t => LINKED_ENTITY_FIELDS[t] || []));

  const getLinkedEntityLabel = (fieldName) => {
    for (const [entityType, fieldNames] of Object.entries(LINKED_ENTITY_FIELDS)) {
      if (fieldNames.includes(fieldName) && linkedEntityTypes.includes(entityType)) {
        return entityType.charAt(0).toUpperCase() + entityType.slice(1);
      }
    }
    return null;
  };

  const toggleField = (fieldName) => {
    if (lockedFields.has(fieldName)) return;
    setSelectedFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const toggleAll = () => {
    const toggleable = fields.filter(([key]) => !lockedFields.has(key));
    const allSelected = toggleable.every(([key]) => selectedFields[key]);
    const newState = { ...selectedFields };
    toggleable.forEach(([key]) => {
      newState[key] = !allSelected;
    });
    setSelectedFields(newState);
  };

  const handleConfirm = () => {
    // Pass selected fields to the parent — locked fields are always included
    const dataToApply = {};
    Object.keys(selectedFields).forEach(key => {
      if (selectedFields[key] || lockedFields.has(key)) {
        dataToApply[key] = extractedData[key];
      }
    });
    onConfirm(dataToApply);
    onClose();
  };

  const toggleableFields = fields.filter(([key]) => !lockedFields.has(key));
  const selectedCount = Object.values(selectedFields).filter(Boolean).length;
  const lockedCount = fields.length - toggleableFields.length;
  const allToggleableSelected = toggleableFields.length > 0 && toggleableFields.every(([key]) => selectedFields[key]);

  const formatFieldName = (key) => {
    // Convert snake_case to Title Case
    return key.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatValue = (value) => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return value;
  };

  const compareValues = (key, extractedValue) => {
    const existingValue = existingData[key];
    const hasExisting = existingValue !== null && existingValue !== undefined && existingValue !== '';
    const valuesMatch = hasExisting && String(existingValue) === String(extractedValue);

    return { hasExisting, existingValue, valuesMatch };
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="glass-elevated w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-glass-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{title}</h3>
              <p className="text-xs text-foreground-muted mt-1">
                Select which fields you want to auto-fill ({selectedCount} of {fields.length} selected{lockedCount > 0 ? `, ${lockedCount} from linked records` : ''})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="neomorph-flat p-2 hover:bg-surface-hover transition-colors rounded-lg"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        {/* Select All Toggle */}
        <div className="px-6 py-3 border-b border-glass-border bg-surface/50">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-sm font-medium text-foreground"
          >
            {allToggleableSelected ? (
              <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {allToggleableSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Fields List - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            {fields.map(([key, value]) => {
              const { hasExisting, existingValue, valuesMatch } = compareValues(key, value);
              const isLocked = lockedFields.has(key);
              const linkedEntity = getLinkedEntityLabel(key);
              
              return (
                <div
                  key={key}
                  onClick={() => toggleField(key)}
                  className={`neomorph-flat p-4 rounded-lg transition-all ${
                    isLocked ? 'cursor-default border-2 border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10' 
                    : `cursor-pointer hover:bg-surface-hover ${selectedFields[key] ? 'ring-2 ring-purple-500 dark:ring-purple-400' : ''}`
                  } ${valuesMatch && !isLocked ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {isLocked ? (
                        <Link className="w-5 h-5 text-blue-500" />
                      ) : selectedFields[key] ? (
                        <CheckSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <Square className="w-5 h-5 text-foreground-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-semibold text-sm ${isLocked ? 'text-blue-700 dark:text-blue-300' : 'text-foreground'}`}>
                          {formatFieldName(key)}
                        </span>
                        {isLocked && linkedEntity && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                            <Link className="w-3 h-3 mr-1" />
                            From linked {linkedEntity}
                          </span>
                        )}
                      </div>
                      
                      {isLocked ? (
                        <div className="space-y-1">
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-2">
                            🔒 Always applied — data from linked {linkedEntity} record
                          </div>
                          <div className="text-sm text-blue-800 dark:text-blue-200 font-medium break-words bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                            {formatValue(value)}
                          </div>
                        </div>
                      ) : hasExisting ? (
                        <div className="space-y-2">
                          {valuesMatch ? (
                            <div className="flex items-center gap-2 text-xs">
                              <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                              <span className="text-green-700 dark:text-green-400 font-semibold">
                                Values match - no change needed
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs font-semibold mb-2">
                              <span className="px-2 py-1 rounded-md bg-orange-500 dark:bg-orange-600 text-white">
                                ⚠️ Will overwrite existing data
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-start gap-2 text-xs">
                            <div className="flex-1 min-w-0 bg-gray-200 dark:bg-gray-800 rounded-lg p-3 border border-gray-300 dark:border-gray-700">
                              <div className="text-gray-900 dark:text-gray-100 font-bold mb-2 text-xs uppercase tracking-wide">Current:</div>
                              <div className={`break-words text-sm font-medium ${valuesMatch ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 line-through'}`}>
                                {formatValue(existingValue)}
                              </div>
                            </div>
                            
                            {!valuesMatch && (
                              <>
                                <ArrowRight className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-7" />
                                
                                <div className="flex-1 min-w-0 bg-purple-600 dark:bg-purple-700 rounded-lg p-3 border-2 border-purple-700 dark:border-purple-600">
                                  <div className="text-white font-bold mb-2 text-xs uppercase tracking-wide">AI Found:</div>
                                  <div className="text-white break-words font-semibold text-sm">
                                    {formatValue(value)}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-xs text-green-700 dark:text-green-400 font-bold mb-2">
                            ✨ New data
                          </div>
                          <div className="text-sm text-white font-medium break-words bg-purple-600 dark:bg-purple-700 rounded-lg p-3 border-2 border-purple-700 dark:border-purple-600">
                            {formatValue(value)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end p-6 border-t border-glass-border">
          <Button
            onClick={onClose}
            className="neomorph-flat px-6 py-2.5 text-sm font-medium hover:bg-surface-hover transition-colors text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className={`px-6 py-2.5 text-sm font-medium transition-colors rounded-xl ${
              selectedCount === 0 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            Apply Selected Fields ({selectedCount})
          </Button>
        </div>
      </div>
    </div>
  );
}