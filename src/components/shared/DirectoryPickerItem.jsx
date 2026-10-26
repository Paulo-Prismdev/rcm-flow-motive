import React from "react";
import { Check, Building2, User } from "lucide-react";
import { CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import DirectoryTagPills from "@/components/directory/DirectoryTagPills";

// One record in a directory picker: name, person/company icon and the Client /
// Third Party tags it carries. Search matches on the name alone.
export default function DirectoryPickerItem({ record, selected, onSelect }) {
  return (
    <CommandItem value={record.name} onSelect={() => onSelect(record)}>
      <Check className={cn("mr-2 h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
      {record.client_type === 'Company'
        ? <Building2 className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        : <User className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      }
      <span className="truncate">{record.name}</span>
      <DirectoryTagPills record={record} className="ml-2 shrink-0" />
    </CommandItem>
  );
}