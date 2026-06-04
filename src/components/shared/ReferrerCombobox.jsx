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
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReferrerCombobox({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies", "referrer"],
    queryFn: () => base44.entities.Company.filter({ company_type: "referrer", is_active: true }),
  });

  const handleSelect = (companyName) => {
    const selected = companies.find(c => c.name === companyName);
    if (selected) {
      // Return object in same shape the rest of the app expects
      onChange({
        id: selected.id,
        name: selected.name,
        email: selected.contact_email || '',
      });
    }
    setOpen(false);
  };

  const selectedName = typeof value === 'string' ? value : (value?.name || "");

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between neomorph-inset text-gray-700 border-0 focus:ring-0 pr-10"
          >
            {selectedName || "Select a referrer..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search referrers..." />
          <CommandList>
            {isLoading ? (
              <CommandEmpty>Loading...</CommandEmpty>
            ) : companies.length === 0 ? (
              <CommandEmpty>No referrer companies found.</CommandEmpty>
            ) : (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            <CommandGroup>
              {companies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.name}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedName === company.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {company.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    {selectedName && (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClear}
        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
        title="Clear referrer"
      >
        <X className="h-4 w-4" />
      </Button>
    )}
    </div>
  );
}