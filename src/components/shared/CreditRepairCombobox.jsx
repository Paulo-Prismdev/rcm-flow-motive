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
import AddCreditRepairCompanyModal from "./AddCreditRepairCompanyModal";
import { sortAlphaNumeric } from "./sortAlphaNumeric";

export default function CreditRepairCombobox({ value, onChange, placeholder = "Select credit repair company...", onAddNew }) {
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: companies = [] } = useQuery({
    queryKey: ["creditRepairCompanies"],
    queryFn: () => base44.entities.CreditRepairCompany.list('-created_date', 500),
  });
  const sortedCompanies = sortAlphaNumeric(companies, 'name');

  const selectedName = typeof value === 'string' ? value : (value?.name || "");

  const handleSelect = (company) => {
    onChange(company);
    setOpen(false);
  };

  const handleAddSuccess = (newCompany) => {
    queryClient.invalidateQueries({ queryKey: ["creditRepairCompanies"] });
    onChange(newCompany);
    setShowAddModal(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <>
      <AddCreditRepairCompanyModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={handleAddSuccess} />
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
                <CommandInput placeholder="Search credit repair companies..." />
                <CommandList>
                  <CommandEmpty>No credit repair company found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="__add_new__"
                      onSelect={() => { setOpen(false); setShowAddModal(true); }}
                      className="text-primary font-medium"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Credit Repair Company
                    </CommandItem>
                  </CommandGroup>
                  <CommandGroup heading="Existing Companies">
                    {sortedCompanies.map((company) => (
                      <CommandItem key={company.id} value={company.name} onSelect={() => handleSelect(company)}>
                        <Check className={cn("mr-2 h-4 w-4", selectedName === company.name ? "opacity-100" : "opacity-0")} />
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
              variant="ghost" size="sm" onClick={handleClear}
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