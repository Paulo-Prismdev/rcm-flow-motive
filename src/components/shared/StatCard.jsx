import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = "gray" }) {
  const colorClasses = {
    blue: "text-blue-600",
    green: "text-green-600",
    orange: "text-orange-600",
    red: "text-red-600",
    purple: "text-purple-600",
    gray: "text-gray-600"
  };

  return (
    <div className="neomorph card-hover p-4 md:p-6">
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className="neomorph-flat p-2 md:p-3">
          <Icon className={`w-5 h-5 md:w-6 md:h-6 ${colorClasses[color]}`} />
        </div>
      </div>
      <div>
        <p className="text-xs md:text-sm text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl md:text-3xl font-bold text-gray-700 mb-1">{value}</h3>
        {subtitle && <p className="text-[10px] md:text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}