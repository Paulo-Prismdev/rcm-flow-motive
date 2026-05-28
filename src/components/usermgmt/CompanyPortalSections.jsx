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
          <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Portal:</span>
          {currentSections.map(s => (
            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">{s}</span>
          ))}
          {canEdit && (
            <button
              onClick={() => { setSelected([...currentSections]); setIsEditing(true); }}
              className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
            >
              <Settings2 className="w-3 h-3" /> Edit
            </button>
          )}
        </div>
      ) : (
        <div className="mt-1.5 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-1.5">
          <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Select sections</p>
          <div className="flex flex-wrap gap-1">
            {availableSections.map(section => {
              const enabled = selected.includes(section);
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => toggle(section)}
                  className={`px-2 py-1 text-[10px] font-medium rounded border transition-all ${
                    enabled
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
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
              className="px-2 py-1 text-xs rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => updateMutation.mutate(selected)}
              disabled={updateMutation.isPending}
              className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}