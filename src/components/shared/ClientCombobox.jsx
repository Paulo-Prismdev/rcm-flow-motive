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
import { sortAlphaNumeric } from "./sortAlphaNumeric";
import { isClientTagged, ensureDirectoryTag } from "./directoryTags";
import AddClientModal from "./AddClientModal";

// Searches the one Clients & Third Parties directory. Anyone in it can be the
// client; the records already tagged as clients are listed first, and picking an
// untagged one adds the Client tag.
export default function ClientCombobox({ value, onChange, placeholder = "Select client...", allowClear = false, onAddNew }) {
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list('-created_date', 1000),
  });

  const sorted = sortAlphaNumeric(records, 'name');
  const clientRecords = sorted.filter(isClientTagged);
  const otherRecords = sorted.filter((r) => !isClientTagged(r));

  const selectedName = typeof value === 'string' ? value : (value?.name || "");

  const handleSelect = async (record) => {
    const tagged = await ensureDirectoryTag(record, 'client');
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    onChange(tagged);
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

  const renderItem = (record) => (
    <CommandItem key={record.id} value={record.name} onSelect={() => handleSelect(record)}>
      <Check className={cn("mr-2 h-4 w-4", selectedName === record.name ? "opacity-100" : "opacity-0")} />
      {record.client_type === 'Company'
        ? <Building2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
        : <User className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
      }
      <span>{record.name}</span>
    </CommandItem>
  );

  return (
    <>
      <AddClientModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={handleAddSuccess} />
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
                <CommandInput placeholder="Search the directory..." />
                <CommandList>
                  {isLoading
                    ? <CommandEmpty>Loading...</CommandEmpty>
                    : <CommandEmpty>Nothing found in the directory.</CommandEmpty>
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
                  {clientRecords.length > 0 && (
                    <CommandGroup heading="Clients">
                      {clientRecords.map(renderItem)}
                    </CommandGroup>
                  )}
                  {otherRecords.length > 0 && (
                    <CommandGroup heading="Also in the directory — picking one tags them a client">
                      {otherRecords.map(renderItem)}
                    </CommandGroup>
                  )}
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
        {onAddNew && (
          <Button type="button" onClick={onAddNew} variant="outline" size="sm" className="whitespace-nowrap">
            <Plus className="w-4 h-4" /> Add New
          </Button>
        )}
      </div>
    </>
  );
}