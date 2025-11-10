import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export default function InsurerCombobox({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: insurers = [] } = useQuery({
    queryKey: ["insurers"],
    queryFn: () => base44.entities.Insurer.list(),
  });

  const createInsurer = useMutation({
    mutationFn: (name) => base44.entities.Insurer.create({ name }),
    onSuccess: (newInsurer) => {
      queryClient.invalidateQueries({ queryKey: ["insurers"] });
      onChange(newInsurer.name);
      setOpen(false);
    },
  });

  const handleSelect = (currentValue) => {
    onChange(currentValue === value ? "" : currentValue);
    setOpen(false);
  };
  
  const handleCreate = (inputValue) => {
    if (inputValue && !insurers.some(i => i.name.toLowerCase() === inputValue.toLowerCase())) {
      createInsurer.mutate(inputValue);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between neomorph-inset text-gray-700 border-0 focus:ring-0"
        >
          {value || "Select or add insurer..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput 
            placeholder="Search or add insurer..."
            onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value) {
                    handleCreate(e.target.value);
                    e.preventDefault();
                }
            }}
          />
          <CommandList>
            <CommandEmpty>
                No insurer found. Press Enter to add.
            </CommandEmpty>
            <CommandGroup>
              {insurers.map((insurer) => (
                <CommandItem
                  key={insurer.id}
                  value={insurer.name}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === insurer.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {insurer.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}