import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";

const BODYSHOP_SECTIONS = ["Claims", "Estimates", "Parts", "Engineering", "Invoices", "Messages"];
const REFERRER_SECTIONS = ["Claims", "Estimates", "Engineering", "Invoices", "Messages"];
const DEFAULT_SECTIONS = ["Claims", "Estimates", "Parts", "Engineering", "Invoices", "Messages"];

export default function CompanyPortalSections({ company, companyType, isSuperAdmin }) {
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const availableSections = companyType === 'bodyshop'
    ? BODYSHOP_SECTIONS
    : companyType === 'referrer'
    ? REFERRER_SECTIONS
    : DEFAULT_SECTIONS;

  const currentSections = company.portal_sections || availableSections;

  const [selected, setSelected] = useState(currentSections);

  const entityName = companyType === 'bodyshop' ? 'Bodyshop' : 'Referrer';

  const updateMutation = useMutation({
    mutationFn: (sections) => base44.entities[entityName].update(company.id, { portal_sections: sections }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityName] });
      setIsEditing(false);
    },
  });

  const toggle = (section) => {
    setSelected(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  if (!isSuperAdmin) {
    // Read-only display
    return (
      <div className="flex flex-wrap gap-1.5 mt-1">
        {currentSections.map(s => (
          <span key={s} className="text-xs px-2 py-0.5 rounded bg-surface border border-border text-foreground-muted">{s}</span>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-2">
      {!isEditing ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-foreground-muted font-medium">Portal access:</span>
          {currentSections.map(s => (
            <span key={s} className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">{s}</span>
          ))}
          <button
            onClick={() => { setSelected(currentSections); setIsEditing(true); }}
            className="text-xs px-2 py-0.5 rounded border border-border text-foreground-muted hover:text-foreground hover:border-foreground-muted transition-colors flex items-center gap-1"
          >
            <Settings2 className="w-3 h-3" /> Edit
          </button>
        </div>
      ) : (
        <div className="mt-2 p-3 neomorph-flat rounded-xl space-y-2">
          <p className="text-xs font-medium text-foreground-muted">Portal Sections</p>
          <div className="flex flex-wrap gap-1.5">
            {availableSections.map(section => {
              const enabled = selected.includes(section);
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => toggle(section)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                    enabled
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'bg-surface text-foreground-muted border-border hover:border-foreground-muted'
                  }`}
                >
                  {section}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              onClick={() => setIsEditing(false)}
              className="neomorph-flat px-3 py-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => updateMutation.mutate(selected)}
              disabled={updateMutation.isPending}
              className="neomorph-flat px-3 py-1 text-xs bg-accent/10 text-accent"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}