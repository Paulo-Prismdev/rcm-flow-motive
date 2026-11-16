import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus, FileText, ArrowUpRight } from 'lucide-react';

export default function WidgetQuickActions({ config, isEditMode }) {
  const actions = [
    { label: 'New Claim', icon: Plus, link: createPageUrl('Claims'), bg: 'bg-info-bg', icon_color: 'text-info-fg' },
    { label: 'Reports', icon: FileText, link: createPageUrl('Reports'), bg: 'bg-success-bg', icon_color: 'text-success-fg' },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-5 h-full">
      <h2 className="text-sm font-bold text-foreground mb-4">Quick Actions</h2>
      <div className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          const button = (
            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors group cursor-pointer">
              <div className={`w-8 h-8 rounded-xl ${action.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${action.icon_color}`} />
              </div>
              <span className="text-sm font-medium text-foreground flex-1">{action.label}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/70 group-hover:text-muted-foreground transition-colors" />
            </div>
          );

          if (isEditMode) return <div key={action.label}>{button}</div>;
          return <Link key={action.label} to={action.link}>{button}</Link>;
        })}
      </div>
    </div>
  );
}