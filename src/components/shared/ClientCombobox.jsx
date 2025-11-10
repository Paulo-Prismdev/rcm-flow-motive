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

export default function ClientCombobox({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const handleSelect = (clientName) => {
    const selectedClient = clients.find(c => c.name === clientName);
    if (selectedClient) {
      onChange(selectedClient);
    }
    setOpen(false);
  };

  const selectedClientName = typeof value === 'string' ? value : (value?.name || "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between glass-inset border-0 focus:ring-0"
        >
          {selectedClientName || "Select client..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 glass-elevated">
        <Command className="bg-transparent">
          <CommandInput placeholder="Search clients..." className="text-foreground" />
          <CommandList>
            {isLoading ? (
              <CommandEmpty className="text-foreground-muted">Loading clients...</CommandEmpty>
            ) : (
              <CommandEmpty className="text-foreground-muted">No client found.</CommandEmpty>
            )}
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.name}
                  onSelect={handleSelect}
                  className="text-foreground"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedClientName === client.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {client.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}