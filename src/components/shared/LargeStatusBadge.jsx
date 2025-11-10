import React from 'react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from 'lucide-react';

export default function LargeStatusBadge({ status, onStatusChange, availableStatuses, customStatuses = [] }) {
  const getStatusColor = () => {
    const statusLower = status?.toLowerCase() || '';
    
    // Check if there's a custom status config for this status
    const customStatus = customStatuses.find(s => s.status_name.toLowerCase() === statusLower);
    if (customStatus && customStatus.is_active) {
      return customStatus.color;
    }
    
    // Default status colors
    if (statusLower.includes('complete')) return 'green';
    if (statusLower === 'quoted') return 'blue';
    if (statusLower === 'ordered') return 'blue';
    if (statusLower.includes('waiting') || statusLower.includes('payment')) return 'orange';
    if (statusLower.includes('need to order')) return 'orange';
    if (statusLower === 'new request') return 'purple';
    if (statusLower.includes('cancelled')) return 'red';
    if (statusLower.includes('refund')) return 'red';
    if (statusLower.includes('credit')) return 'yellow';
    
    return 'gray';
  };

  const color = getStatusColor();
  
  const colorClasses = {
    green: 'bg-green-500 text-white border-green-600 hover:bg-green-600',
    blue: 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600',
    orange: 'bg-orange-500 text-white border-orange-600 hover:bg-orange-600',
    red: 'bg-red-500 text-white border-red-600 hover:bg-red-600',
    purple: 'bg-purple-500 text-white border-purple-600 hover:bg-purple-600',
    yellow: 'bg-yellow-500 text-white border-yellow-600 hover:bg-yellow-600',
    gray: 'bg-gray-500 text-white border-gray-600 hover:bg-gray-600'
  };

  if (!onStatusChange || !availableStatuses) {
    // Read-only mode
    return (
      <div className={`neomorph-flat px-8 py-4 text-lg font-bold inline-flex items-center gap-2 ${colorClasses[color]} shadow-lg`}>
        <div className={`w-3 h-3 rounded-full bg-white animate-pulse`}></div>
        {status}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`neomorph-flat px-8 py-4 text-lg font-bold inline-flex items-center gap-3 ${colorClasses[color]} shadow-lg transition-all cursor-pointer`}>
          <div className={`w-3 h-3 rounded-full bg-white animate-pulse`}></div>
          {status}
          <ChevronDown className="w-5 h-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="neomorph min-w-[250px]">
        {availableStatuses.map((statusOption) => (
          <DropdownMenuItem
            key={statusOption}
            onClick={() => onStatusChange(statusOption)}
            className="cursor-pointer text-base py-3 px-4"
          >
            {statusOption}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}