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
import AddClientModal from "./AddClientModal";

export default function ClientCombobox({ value, onChange, placeholder = "Select client...", allowClear = false }) {
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list('-created_date', 500),
  });

  const selectedClientName = typeof value === 'string' ? value : (value?.name || "");

  const handleSelect = (clientName) => {
    const selected = clients.find(c => c.name === clientName);
    if (selected) onChange(selected);
    setOpen(false);
  };

  const handleAddSuccess = (newClient) => {
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    onChange(newClient);
    setShowAddModal(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <>
      <AddClientModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={handleAddSuccess} />
      <div className="relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between neomorph-inset border-0 focus:ring-0 pr-10"
            >
              <span className="truncate">{selectedClientName || placeholder}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" style={{ zIndex: 9999 }}>
            <Command>
              <CommandInput placeholder="Search clients..." />
              <CommandList>
                {isLoading
                  ? <CommandEmpty>Loading...</CommandEmpty>
                  : <CommandEmpty>No client found.</CommandEmpty>
                }
                <CommandGroup>
                  <CommandItem
                    value="__add_new__"
                    onSelect={() => { setOpen(false); setShowAddModal(true); }}
                    className="text-primary font-medium"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Client
                  </CommandItem>
                </CommandGroup>
                <CommandGroup heading="Existing Clients">
                  {clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={client.name}
                      onSelect={handleSelect}
                    >
                      <Check className={cn("mr-2 h-4 w-4", selectedClientName === client.name ? "opacity-100" : "opacity-0")} />
                      {client.client_type === 'Company'
                        ? <Building2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                        : <User className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                      }
                      <span>{client.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {allowClear && selectedClientName && (
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
    </>
  );
}