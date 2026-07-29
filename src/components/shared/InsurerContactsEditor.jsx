import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export default function InsurerContactsEditor({ value = [], onChange }) {
  const addContact = () => onChange([...value, { name: "", phone: "", email: "" }]);
  const updateContact = (idx, field, val) =>
    onChange(value.map((c, i) => (i === idx ? { ...c, [field]: val } : c)));
  const removeContact = (idx) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
          <span />
        </div>
      )}
      {value.map((c, idx) => (
        <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
          <Input
            placeholder="Contact name"
            value={c.name || ""}
            onChange={(e) => updateContact(idx, "name", e.target.value)}
            className="neomorph-inset"
          />
          <Input
            placeholder="Phone"
            value={c.phone || ""}
            onChange={(e) => updateContact(idx, "phone", e.target.value)}
            className="neomorph-inset"
          />
          <Input
            type="email"
            placeholder="Email"
            value={c.email || ""}
            onChange={(e) => updateContact(idx, "email", e.target.value)}
            className="neomorph-inset"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeContact(idx)}
            className="text-gray-400 hover:text-red-600"
            title="Remove contact"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addContact}>
        <Plus className="w-4 h-4" /> Add Contact
      </Button>
    </div>
  );
}