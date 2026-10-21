import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus, X, Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import AddThirdPartyModal from "./AddThirdPartyModal";
import { sortAlphaNumeric } from "./sortAlphaNumeric";

// Searchable list of third parties, kept separate from the client directory
// so repeat third parties can be reused without becoming clients.
export default function ThirdPartyCombobox({ value, onChange, placeholder = "Select third party...", allowClear = false }) {
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: thirdParties = [], isLoading } = useQuery({
    queryKey: ["thirdParties"],
    queryFn: () => base44.entities.ThirdParty.list('-created_date', 500),
  });
  const sorted = sortAlphaNumeric(thirdParties, 'name');

  const selectedName = typeof value === 'string' ? value : (value?.name || "");

  const handleSelect = (name) => {
    const selected = thirdParties.find((t) => t.name === name);
    if (selected) onChange(selected);
    setOpen(false);
  };

  const handleAddSuccess = (newThirdParty) => {
    queryClient.invalidateQueries({ queryKey: ["thirdParties"] });
    onChange(newThirdParty);
    setShowAddModal(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <>
      <AddThirdPartyModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={handleAddSuccess} />
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between neomorph-inset border-0 focus:ring-0 pr-10"
              >
                <span className="truncate">{selectedName || placeholder}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" style={{ zIndex: 9999 }}>
              <Command>
                <CommandInput placeholder="Search third parties..." />
                <CommandList>
                  {isLoading
                    ? <CommandEmpty>Loading...</CommandEmpty>
                    : <CommandEmpty>No third party found.</CommandEmpty>
                  }
                  <CommandGroup>
                    <CommandItem
                      value="__add_new__"
                      onSelect={() => { setOpen(false); setShowAddModal(true); }}
                      className="text-primary font-medium"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Third Party
                    </CommandItem>
                  </CommandGroup>
                  <CommandGroup heading="Existing Third Parties">
                    {sorted.map((tp) => (
                      <CommandItem key={tp.id} value={tp.name} onSelect={() => handleSelect(tp.name)}>
                        <Check className={cn("mr-2 h-4 w-4", selectedName === tp.name ? "opacity-100" : "opacity-0")} />
                        {tp.party_type === 'Company'
                          ? <Building2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                          : <User className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                        }
                        <span>{tp.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {allowClear && selectedName && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}