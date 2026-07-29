import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

export default function NetworkCodesEditor({ value = [], onChange }) {
  const [input, setInput] = useState("");

  const addCode = () => {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput("");
  };

  const removeCode = (code) => onChange(value.filter((c) => c !== code));

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-medium"
            >
              {code}
              <button
                type="button"
                onClick={() => removeCode(code)}
                className="hover:text-red-600 transition-colors"
                title="Remove code"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCode();
            }
          }}
          placeholder="Type a network code and press Enter"
          className="neomorph-inset"
        />
        <Button type="button" variant="outline" size="sm" onClick={addCode}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
    </div>
  );
}