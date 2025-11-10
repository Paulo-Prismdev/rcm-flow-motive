
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

export default function BodyshopCombobox({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const { data: bodyshops = [], isLoading } = useQuery({
    queryKey: ["bodyshops"],
    queryFn: () => base44.entities.Bodyshop.list(),
  });

  const handleSelect = (bodyshopName) => {
    const selectedBodyshop = bodyshops.find(b => b.name === bodyshopName);
    if (selectedBodyshop) {
      onChange(selectedBodyshop); // Pass the full bodyshop object including id
    }
    setOpen(false);
  };

  const selectedBodyshopName = typeof value === 'string' ? value : (value?.name || "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between neomorph-inset text-gray-700 border-0 focus:ring-0"
        >
          {selectedBodyshopName || "Select bodyshop..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search bodyshops..." />
          <CommandList>
            {isLoading ? (
              <CommandEmpty>Loading bodyshops...</CommandEmpty>
            ) : (
              <CommandEmpty>No bodyshop found.</CommandEmpty>
            )}
            <CommandGroup>
              {bodyshops.map((bodyshop) => (
                <CommandItem
                  key={bodyshop.id}
                  value={bodyshop.name}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedBodyshopName === bodyshop.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {bodyshop.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
