import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Settings2 } from "lucide-react";

const BODYSHOP_SECTIONS = ["Claims", "Estimates", "Parts", "Engineering", "Invoices", "Messages"];
const REFERRER_SECTIONS = ["Claims", "Estimates", "Engineering", "Invoices", "Messages"];
const DEFAULT_SECTIONS = ["Claims", "Estimates", "Parts", "Engineering", "Invoices", "Messages"];

export default function CompanyPortalSections({ company, companyType, canEdit }) {
  const queryClient = useQueryClient();

  const availableSections = companyType === 'bodyshop'
    ? BODYSHOP_SECTIONS
    : companyType === 'referrer'
    ? REFERRER_SECTIONS
    : DEFAULT_SECTIONS;

  const currentSections = company.portal_sections || availableSections;
  const [isEditing, setIsEditing] = useState(false);
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

  return (
    <div>
      {!isEditing ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Portal:</span>
          {currentSections.map(s => (
            <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-success-bg text-success-fg">{s}</span>
          ))}
          {canEdit && (
            <button
              onClick={() => { setSelected([...currentSections]); setIsEditing(true); }}
              className="text-xs px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1"
            >
              <Settings2 className="w-3 h-3" /> Edit
            </button>
          )}
        </div>
      ) : (
        <div className="mt-1.5 p-2.5 bg-muted rounded-lg space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Select sections</p>
          <div className="flex flex-wrap gap-1">
            {availableSections.map(section => {
              const enabled = selected.includes(section);
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => toggle(section)}
                  className={`px-2 py-1 text-xs font-medium rounded border transition-all ${
                    enabled
                      ? 'bg-success text-on-solid border-success'
                      : 'bg-card text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {section}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-2 py-1 text-xs rounded text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => updateMutation.mutate(selected)}
              disabled={updateMutation.isPending}
              className="px-2 py-1 text-xs rounded bg-success text-on-solid hover:bg-success transition-colors disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}