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
    <div className="neomorph-flat p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Monitor className="w-4 h-4 text-accent flex-shrink-0" />
        <p className="text-sm font-semibold text-foreground">Internal Navigation Sections</p>
        <span className="text-xs text-foreground-muted">— controls which modules internal staff can see</span>
      </div>

      {!isEditing ? (
        <div className="flex items-center gap-2 flex-wrap">
          {currentSections.map(s => (
            <span key={s} className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">{s}</span>
          ))}
          {canEdit && (
            <button
              onClick={() => { setSelected([...currentSections]); setIsEditing(true); }}
              className="text-xs px-2 py-0.5 rounded border border-border text-foreground-muted hover:text-foreground hover:border-foreground-muted transition-colors flex items-center gap-1"
            >
              <Settings2 className="w-3 h-3" /> Edit
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {ALL_NAV_SECTIONS.map(section => {
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
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-xs rounded-lg neomorph-flat text-foreground-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate(selected)}
              disabled={saveMutation.isPending}
              className="px-3 py-1 text-xs rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}