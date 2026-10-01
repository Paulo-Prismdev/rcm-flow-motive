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
import { sortAlphaNumeric } from "./sortAlphaNumeric";

export default function WorkProviderCombobox({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const { data: workProviders = [], isLoading } = useQuery({
    queryKey: ["workProviders"],
    queryFn: () => base44.entities.WorkProvider.list(),
  });
  const sortedWorkProviders = sortAlphaNumeric(workProviders, 'name');

  const handleSelect = (currentValue) => {
    const selected = workProviders.find(wp => wp.name.toLowerCase() === currentValue.toLowerCase());
    if (selected) {
      onChange(selected);
    }
    setOpen(false);
  };

  const selectedName = typeof value === 'string' ? value : (value?.name || "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between neomorph-inset text-gray-700 border-0 focus:ring-0"
        >
          {selectedName || "Select work provider..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search work providers..." />
          <CommandList>
            {isLoading ? (
              <CommandEmpty>Loading work providers...</CommandEmpty>
            ) : (
              <CommandEmpty>No work provider found.</CommandEmpty>
            )}
            <CommandGroup>
              {sortedWorkProviders.map((wp) => (
                <CommandItem
                  key={wp.id}
                  value={wp.name}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedName === wp.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {wp.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}