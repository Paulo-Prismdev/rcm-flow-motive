
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

export default function SupplierCombobox({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const handleSelect = (supplierName) => {
    const selectedSupplier = suppliers.find(s => s.name === supplierName);
    if (selectedSupplier) {
      onChange(selectedSupplier); // Pass the full supplier object including id
    }
    setOpen(false); // Close the combobox after selection
  };

  const selectedSupplierName = typeof value === 'string' ? value : (value?.name || "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between neomorph-inset text-gray-700 border-0 focus:ring-0"
        >
          {selectedSupplierName || "Select supplier..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search suppliers..." />
          <CommandList>
            {isLoading ? (
              <CommandEmpty>Loading suppliers...</CommandEmpty>
            ) : (
              <CommandEmpty>No supplier found.</CommandEmpty>
            )}
            <CommandGroup>
              {suppliers.map((supplier) => (
                <CommandItem
                  key={supplier.id}
                  value={supplier.name}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedSupplierName === supplier.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {supplier.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
