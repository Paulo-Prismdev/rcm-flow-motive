import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import AddBrokerModal from "./AddBrokerModal";
import { sortAlphaNumeric } from "./sortAlphaNumeric";

export default function BrokerCombobox({ value, onChange, placeholder = "Select broker..." }) {
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: brokers = [], isLoading } = useQuery({
    queryKey: ["brokers"],
    queryFn: () => base44.entities.Broker.list('-created_date', 500),
  });
  const sortedBrokers = sortAlphaNumeric(brokers, 'name');

  const selectedName = typeof value === 'string' ? value : (value?.name || "");

  const handleSelect = (name) => {
    const selected = brokers.find(b => b.name === name);
    if (selected) onChange(selected);
    setOpen(false);
  };

  const handleAddSuccess = (newBroker) => {
    queryClient.invalidateQueries({ queryKey: ["brokers"] });
    onChange(newBroker);
    setShowAddModal(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <>
      <AddBrokerModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={handleAddSuccess} />
      <div className="relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
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
              <CommandInput placeholder="Search brokers..." />
              <CommandList>
                {isLoading ? <CommandEmpty>Loading...</CommandEmpty> : <CommandEmpty>No broker found.</CommandEmpty>}
                <CommandGroup>
                  <CommandItem
                    value="__add_new__"
                    onSelect={() => { setOpen(false); setShowAddModal(true); }}
                    className="text-primary font-medium"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Broker
                  </CommandItem>
                </CommandGroup>
                <CommandGroup heading="Existing Brokers">
                  {sortedBrokers.map((broker) => (
                    <CommandItem key={broker.id} value={broker.name} onSelect={handleSelect}>
                      <Check className={cn("mr-2 h-4 w-4", selectedName === broker.name ? "opacity-100" : "opacity-0")} />
                      {broker.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selectedName && (
          <Button
            variant="ghost" size="sm" onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </>
  );
}