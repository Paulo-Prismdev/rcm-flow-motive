import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FileText, Calculator, Wrench, Package } from 'lucide-react';

const DEPARTMENTS = [
  { name: "Claims", url: createPageUrl("Claims"), icon: FileText, color: "text-blue-600" },
  { name: "Estimating", url: createPageUrl("Estimating"), icon: Calculator, color: "text-green-600" },
  { name: "Engineering", url: createPageUrl("Engineering"), icon: Wrench, color: "text-purple-600" },
  { name: "Parts", url: createPageUrl("Parts"), icon: Package, color: "text-orange-600" },
];

export default function WidgetDepartmentLinks({ config, isEditMode }) {
  return (
    <div className="glass p-4 md:p-6 col-span-1 md:col-span-2 lg:col-span-4">
      <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Quick Access</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {DEPARTMENTS.map((dept) => {
          const Icon = dept.icon;
          return (
            <Link key={dept.name} to={dept.url} className={isEditMode ? 'pointer-events-none' : ''}>
              <div className="glass card-hover p-4 md:p-6 text-center">
                <div className="glass-flat p-3 md:p-4 inline-flex mb-3">
                  <Icon className={`w-6 h-6 md:w-8 md:h-8 ${dept.color}`} />
                </div>
                <h3 className="font-bold text-sm md:text-base">{dept.name}</h3>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}