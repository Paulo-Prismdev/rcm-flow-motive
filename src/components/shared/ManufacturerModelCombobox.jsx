import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { VEHICLE_MANUFACTURERS } from "./vehicleManufacturers";
import { VEHICLE_MODELS } from "./vehicleModels";
import { sortAlphaNumeric } from "./sortAlphaNumeric";

export default function ManufacturerModelCombobox({ value, onChange, placeholder = "Select make & model..." }) {
  const [openManufacturer, setOpenManufacturer] = useState(false);
  const [openModel, setOpenModel] = useState(false);
  
  // Parse the current value (e.g., "Ford Fiesta" -> manufacturer: "Ford", model: "Fiesta")
  const parseValue = (val) => {
    if (!val) return { manufacturer: '', model: '' };
    const parts = val.split(' ');
    const manufacturer = parts[0] || '';
    const model = parts.slice(1).join(' ') || '';
    return { manufacturer, model };
  };

  const [selectedManufacturer, setSelectedManufacturer] = useState(parseValue(value).manufacturer);
  const [selectedModel, setSelectedModel] = useState(parseValue(value).model);
  const [customManufacturer, setCustomManufacturer] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [showCustomManufacturer, setShowCustomManufacturer] = useState(false);
  const [showCustomModel, setShowCustomModel] = useState(false);

  // Update internal state when external value changes
  useEffect(() => {
    const parsed = parseValue(value);
    setSelectedManufacturer(parsed.manufacturer);
    setSelectedModel(parsed.model);
    
    // Check if it's a custom value (not in our lists)
    if (parsed.manufacturer && !VEHICLE_MANUFACTURERS.includes(parsed.manufacturer)) {
      setCustomManufacturer(parsed.manufacturer);
      setShowCustomManufacturer(true);
    }
    if (parsed.model && parsed.manufacturer && VEHICLE_MODELS[parsed.manufacturer] && !VEHICLE_MODELS[parsed.manufacturer].includes(parsed.model)) {
      setCustomModel(parsed.model);
      setShowCustomModel(true);
    }
  }, [value]);

  const handleManufacturerSelect = (manufacturer) => {
    if (manufacturer === "Other") {
      setShowCustomManufacturer(true);
      setSelectedManufacturer('');
      setSelectedModel('');
      setOpenManufacturer(false);
      return;
    }
    
    setSelectedManufacturer(manufacturer);
    setSelectedModel(''); // Reset model when manufacturer changes
    setShowCustomManufacturer(false);
    setShowCustomModel(false);
    setCustomManufacturer('');
    setCustomModel('');
    setOpenManufacturer(false);
    
    // Only update parent if we have both values, or just manufacturer
    onChange(manufacturer);
  };

  const handleModelSelect = (model) => {
    if (model === "Other") {
      setShowCustomModel(true);
      setSelectedModel('');
      setOpenModel(false);
      return;
    }
    
    setSelectedModel(model);
    setShowCustomModel(false);
    setCustomModel('');
    setOpenModel(false);
    
    // Update parent with combined value
    const manufacturerToUse = showCustomManufacturer ? customManufacturer : selectedManufacturer;
    onChange(`${manufacturerToUse} ${model}`.trim());
  };

  const handleCustomManufacturerSave = () => {
    if (customManufacturer.trim()) {
      setSelectedManufacturer(customManufacturer);
      setShowCustomManufacturer(false);
      onChange(customManufacturer);
    }
  };

  const handleCustomModelSave = () => {
    if (customModel.trim()) {
      setSelectedModel(customModel);
      setShowCustomModel(false);
      const manufacturerToUse = showCustomManufacturer ? customManufacturer : selectedManufacturer;
      onChange(`${manufacturerToUse} ${customModel}`.trim());
    }
  };

  const displayValue = () => {
    const manuf = showCustomManufacturer ? customManufacturer : selectedManufacturer;
    const mod = showCustomModel ? customModel : selectedModel;
    
    if (manuf && mod) return `${manuf} ${mod}`;
    if (manuf) return manuf;
    return placeholder;
  };

  const availableModels = sortAlphaNumeric(
    selectedManufacturer && VEHICLE_MODELS[selectedManufacturer]
      ? VEHICLE_MODELS[selectedManufacturer]
      : []
  );

  return (
    <div className="space-y-2">
      {/* Manufacturer Selection */}
      {showCustomManufacturer ? (
        <div className="flex gap-2">
          <Input
            placeholder="Enter manufacturer name..."
            value={customManufacturer}
            onChange={(e) => setCustomManufacturer(e.target.value)}
            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCustomManufacturerSave();
              }
            }}
          />
          <Button
            onClick={handleCustomManufacturerSave}
            className="neomorph-flat px-4 text-blue-600"
          >
            Save
          </Button>
          <Button
            onClick={() => {
              setShowCustomManufacturer(false);
              setCustomManufacturer('');
            }}
            className="neomorph-flat px-4"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Popover open={openManufacturer} onOpenChange={setOpenManufacturer}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openManufacturer}
              className="w-full justify-between neomorph-inset text-gray-700 border-0 focus:ring-0"
            >
              {selectedManufacturer || "Select manufacturer..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search manufacturer..." />
              <CommandList>
                <CommandEmpty>No manufacturer found.</CommandEmpty>
                <CommandGroup>
                  {sortAlphaNumeric(VEHICLE_MANUFACTURERS).map((manufacturer) => (
                    <CommandItem
                      key={manufacturer}
                      value={manufacturer}
                      onSelect={() => handleManufacturerSelect(manufacturer)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedManufacturer === manufacturer ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {manufacturer}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* Model Selection - only show if manufacturer is selected */}
      {(selectedManufacturer || showCustomManufacturer) && (
        <>
          {showCustomModel ? (
            <div className="flex gap-2">
              <Input
                placeholder="Enter model name..."
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomModelSave();
                  }
                }}
              />
              <Button
                onClick={handleCustomModelSave}
                className="neomorph-flat px-4 text-blue-600"
              >
                Save
              </Button>
              <Button
                onClick={() => {
                  setShowCustomModel(false);
                  setCustomModel('');
                }}
                className="neomorph-flat px-4"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Popover open={openModel} onOpenChange={setOpenModel}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openModel}
                  className="w-full justify-between neomorph-inset text-gray-700 border-0 focus:ring-0"
                  disabled={!selectedManufacturer && !showCustomManufacturer}
                >
                  {selectedModel || "Select model..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search model..." />
                  <CommandList>
                    <CommandEmpty>No model found.</CommandEmpty>
                    <CommandGroup>
                      {availableModels.map((model) => (
                        <CommandItem
                          key={model}
                          value={model}
                          onSelect={() => handleModelSelect(model)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedModel === model ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {model}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </>
      )}
    </div>
  );
}