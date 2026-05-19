import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function StatusMultiSelect({
  selectedStatuses = [],
  onStatusesChange,
  availableStatuses = [],
  placeholder = "Select statuses...",
  disabled = false,
}) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (status) => {
    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusesChange([...selectedStatuses, status]);
    }
  };

  const handleRemove = (statusToRemove, e) => {
    e.stopPropagation();
    onStatusesChange(selectedStatuses.filter((s) => s !== statusToRemove));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between min-h-[40px] h-auto py-2 px-3"
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedStatuses.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selectedStatuses.map((status) => (
                <Badge
                  key={status}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {status}
                  <button
                    onClick={(e) => handleRemove(status, e)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                    disabled={disabled}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search statuses..." />
          <CommandList>
            <CommandEmpty>No statuses found.</CommandEmpty>
            <CommandGroup>
              {availableStatuses.map((status) => (
                <CommandItem
                  key={status}
                  value={status}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedStatuses.includes(status)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {status}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}