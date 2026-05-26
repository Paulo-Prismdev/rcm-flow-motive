import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import AddReferrerModal from "./AddReferrerModal";

export default function ReferrerCombobox({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingReferrerName, setPendingReferrerName] = useState('');

  const { data: referrers = [], isLoading } = useQuery({
    queryKey: ["referrers"],
    queryFn: () => base44.entities.Referrer.list(),
  });

  const handleSelect = (referrerName) => {
    const selectedReferrer = referrers.find(r => r.name === referrerName);
    if (selectedReferrer) {
      onChange(selectedReferrer); // Pass the full referrer object including id
    }
    setOpen(false); // Preserve closing behavior
  };
  
  const handleCreateNew = (inputValue) => {
    if (inputValue && !referrers.some(r => r.name.toLowerCase() === inputValue.toLowerCase())) {
      setPendingReferrerName(inputValue);
      setShowAddModal(true);
      setOpen(false);
    }
  };

  const handleReferrerCreated = (newReferrer) => {
    onChange(newReferrer);
    setPendingReferrerName('');
    setShowAddModal(false);
  };

  const selectedReferrerName = typeof value === 'string' ? value : (value?.name || "");

  return (
    <>
      <AddReferrerModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setPendingReferrerName('');
        }}
        onSuccess={handleReferrerCreated}
        initialName={pendingReferrerName}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between neomorph-inset text-gray-700 border-0 focus:ring-0"
          >
            {selectedReferrerName || "Select a referrer..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput 
              placeholder="Search or add referrer..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value) {
                  handleCreateNew(e.target.value);
                  e.preventDefault();
                }
              }}
            />
            <CommandList>
              {isLoading ? (
                <CommandEmpty>Loading referrers...</CommandEmpty>
              ) : (
                <CommandEmpty>
                  No referrer found. Press Enter to add.
                </CommandEmpty>
              )}
              <CommandGroup>
                {referrers.map((referrer) => (
                  <CommandItem
                    key={referrer.id}
                    value={referrer.name}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedReferrerName === referrer.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {referrer.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}