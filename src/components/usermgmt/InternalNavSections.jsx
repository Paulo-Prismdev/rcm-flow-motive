import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Settings2, Monitor } from "lucide-react";

const ALL_NAV_SECTIONS = ["Dashboard", "Claims", "Estimating", "Engineering", "Parts", "Invoicing", "Reports", "Map"];
const CONFIG_KEY = "internal_nav_sections";

export default function InternalNavSections({ canEdit }) {
  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ['AppConfig'],
    queryFn: () => base44.entities.AppConfig.list(),
  });

  const config = configs.find(c => c.config_key === CONFIG_KEY);
  const currentSections = config?.config_value
    ? JSON.parse(config.config_value)
    : ALL_NAV_SECTIONS;

  const [isEditing, setIsEditing] = useState(false);
  const [selected, setSelected] = useState(currentSections);

  // Sync if config loads after mount
  useEffect(() => {
    if (!isEditing) setSelected(currentSections);
  }, [configs]);

  const saveMutation = useMutation({
    mutationFn: async (sections) => {
      const value = JSON.stringify(sections);
      if (config) {
        return base44.entities.AppConfig.update(config.id, { config_value: value });
      } else {
        return base44.entities.AppConfig.create({ config_key: CONFIG_KEY, config_value: value });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['AppConfig'] });
      setIsEditing(false);
    },
  });

  const toggle = (section) => {
    setSelected(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3">
      <div className="flex items-start gap-2 mb-2">
        <Monitor className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 dark:text-white">Internal Navigation Sections</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Modules visible to internal staff</p>
        </div>
      </div>

      {!isEditing ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          {currentSections.map(s => (
            <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">{s}</span>
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
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {ALL_NAV_SECTIONS.map(section => {
              const enabled = selected.includes(section);
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => toggle(section)}
                  className={`px-2 py-1 text-[10px] font-medium rounded border transition-all ${
                    enabled
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
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
              className="px-2 py-1 text-xs rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate(selected)}
              disabled={saveMutation.isPending}
              className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}