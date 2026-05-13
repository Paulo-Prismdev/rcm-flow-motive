import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus, Search, FileText } from 'lucide-react';

export default function WidgetQuickActions({ config, isEditMode }) {
  const actions = [
    { label: 'New Claim', icon: Plus, link: createPageUrl('Claims'), color: 'text-blue-600' },
    { label: 'Reports', icon: FileText, link: createPageUrl('Reports'), color: 'text-green-600' },
  ];

  return (
    <div className="glass p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-bold mb-4">Quick Actions</h2>
      <div className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          const button = (
            <button className="glass-flat w-full p-3 flex items-center gap-3 hover:scale-[1.02] transition-all">
              <Icon className={`w-5 h-5 ${action.color}`} />
              <span className="font-medium text-sm">{action.label}</span>
            </button>
          );

          if (isEditMode) {
            return <div key={action.label}>{button}</div>;
          }

          return (
            <Link key={action.label} to={action.link}>
              {button}
            </Link>
          );
        })}
      </div>
    </div>
  );
}